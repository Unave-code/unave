import type { Payload } from 'payload'

import type { Customer, Footer, Order } from '@/payload-types'
import { loadEmailDesign } from '@/email/design'
import { renderOrder } from '@/email/templates/render'
import { sendOrderMail } from '@/email/send'
import { formatPaise } from '@/utilities/money'
import { addonsLabel } from '@/utilities/addons'
import { orderComponentsLabel, orderItemKind } from '@/utilities/orderDisplay'
import { cashDueLine, kitchenCashLine } from '@/utilities/orderPaymentView'

/**
 * The two emails a paid order sends (spec 0007, AC-7).
 *
 * The customer learns their product is booked; the kitchen learns who to cook
 * for and where to deliver. Both go through the transport spec 0002 already
 * runs, both log under the `order` key, and neither failure can fail the order —
 * the row is the record, the emails are the knock on the shoulder.
 *
 * The copy is admin editable in EmailSettings (the `orderCopy` group), and so
 * are the header image, extra content and footer (the `design` group). Blank
 * fields fall back to these defaults, so a fresh install mails sensible words
 * before anybody has opened the admin.
 */

export type OrderMailCopy = {
  confirmationIntro: string
  confirmationOutro: string
  confirmationSubject: string
  kitchenIntro: string
  kitchenSubject: string
}

export const ORDER_MAIL_DEFAULTS: OrderMailCopy = {
  confirmationIntro: 'Thank you. Your payment went through and the kitchen has your order.',
  confirmationOutro:
    'We will message you about when your deliveries begin. If anything looks wrong, reply to this email.',
  confirmationSubject: 'Your UNAVE order is confirmed',
  kitchenIntro: 'An order was paid on the website. The details are below.',
  kitchenSubject: 'New paid order from the website',
}

/**
 * A cash on delivery order has not been paid, so the editable copy above, which
 * speaks of a payment, is replaced for it (spec 2026-11-28 cash on delivery).
 */
export const CASH_ORDER_MAIL_COPY = {
  confirmationIntro: 'Thank you. The kitchen has your order. You pay in cash at your first delivery.',
  confirmationSubject: 'Your UNAVE order is placed',
  kitchenIntro: 'A cash on delivery order was placed on the website. The details are below.',
  kitchenSubject: 'New cash on delivery order from the website',
}

export const loadOrderMailCopy = async (payload: Payload): Promise<OrderMailCopy> => {
  try {
    const settings = await payload.findGlobal({ slug: 'email-settings', depth: 0 })
    const copy = settings.orderCopy

    return {
      confirmationIntro: copy?.confirmationIntro?.trim() || ORDER_MAIL_DEFAULTS.confirmationIntro,
      confirmationOutro: copy?.confirmationOutro?.trim() || ORDER_MAIL_DEFAULTS.confirmationOutro,
      confirmationSubject:
        copy?.confirmationSubject?.trim() || ORDER_MAIL_DEFAULTS.confirmationSubject,
      kitchenIntro: copy?.kitchenIntro?.trim() || ORDER_MAIL_DEFAULTS.kitchenIntro,
      kitchenSubject: copy?.kitchenSubject?.trim() || ORDER_MAIL_DEFAULTS.kitchenSubject,
    }
  } catch {
    return ORDER_MAIL_DEFAULTS
  }
}

export type PaymentAlert = {
  amount: null | number
  gatewayOrderId: string
  paymentId: string
  reason: 'amount_mismatch' | 'intent_missing' | 'write_failed'
}

const ALERT_REASONS: Record<PaymentAlert['reason'], string> = {
  amount_mismatch:
    'The amount Razorpay captured does not match what the checkout asked for, so no order was written.',
  intent_missing:
    'No checkout was stored for this Razorpay order, so the site does not know what was bought or where to deliver it.',
  write_failed:
    'The order could not be saved. Razorpay will retry the webhook, so it may still appear; check the Orders list.',
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * A customer paid and no order row exists for it. These cases are rare and
 * each one is money in Razorpay with nobody cooking for it, so the kitchen
 * inbox hears about it instead of a log line nobody reads. Never throws.
 */
export const sendPaymentAlertMail = async (payload: Payload, alert: PaymentAlert): Promise<void> => {
  try {
    const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 }).catch(() => null)) as
      | Footer
      | null
    const to = footer?.contact?.email?.trim() ?? ''

    if (!to) {
      payload.logger.warn({ msg: 'payment_alert_mail_no_recipient', ...alert })
      return
    }

    const lines = [
      ALERT_REASONS[alert.reason],
      '',
      `Razorpay order: ${alert.gatewayOrderId}`,
      `Razorpay payment: ${alert.paymentId}`,
      `Amount captured: ${alert.amount === null ? 'unknown' : formatPaise(alert.amount)}`,
      '',
      'Open the payment in the Razorpay dashboard, then contact the customer or refund it.',
    ]

    const result = await sendOrderMail(payload, {
      html: lines.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '')).join(''),
      subject: `Payment needs attention · ${alert.paymentId}`,
      text: lines.join('\n'),
      to,
    })

    if (result.status !== 'sent') {
      payload.logger.warn({ msg: 'payment_alert_mail_not_sent', status: result.status, ...alert })
    }
  } catch (error) {
    payload.logger.error({ err: String(error), msg: 'payment_alert_mail_failed', ...alert })
  }
}

const addressLabel = (order: Order): string => {
  const delivery = order.delivery ?? {}
  const parts = [
    delivery.addressLine1,
    delivery.addressLine2,
    [delivery.city, delivery.state].filter(Boolean).join(', '),
    delivery.pincode,
  ].filter((part) => typeof part === 'string' && part.trim().length > 0)

  return parts.join('\n')
}

export const sendOrderMails = async (payload: Payload, order: Order): Promise<void> => {
  const [loadedCopy, design] = await Promise.all([loadOrderMailCopy(payload), loadEmailDesign(payload)])
  const cash = order.paymentType === 'cash'
  const copy: OrderMailCopy = cash ? { ...loadedCopy, ...CASH_ORDER_MAIL_COPY } : loadedCopy
  const customerCashLine = cash ? cashDueLine(Number(order.total ?? 0)) : undefined
  const kitchenLine = cash ? kitchenCashLine(Number(order.total ?? 0)) : undefined

  // The line reads "2 × Phulka box · One-time purchase · ₹198": a quantity
  // more than one prefixes the title, and a one-time line names itself instead
  // of printing the reserved duration value.
  const lines = (order.items ?? []).map((item) => {
    const qty = typeof item.qty === 'number' && Number.isInteger(item.qty) && item.qty >= 1 ? item.qty : 1
    const unitPrice = Number(item.unitPrice ?? 0)

    return {
      addonsLabel: addonsLabel(item.addons) ?? undefined,
      amountLabel: formatPaise(unitPrice * qty),
      componentsLabel: orderComponentsLabel(item.components) ?? undefined,
      durationLabel: orderItemKind(item),
      title: qty > 1 ? `${qty} × ${item.productTitle ?? ''}` : (item.productTitle ?? ''),
    }
  })

  const totalLabel = formatPaise(Number(order.total ?? 0))
  const paymentId = order.gatewayPaymentId ?? ''
  const delivery = order.delivery ?? {}
  const name = delivery.name ?? ''

  let customer: Pick<Customer, 'email' | 'name'> | null = null

  try {
    customer = await payload.findByID({
      collection: 'customers',
      depth: 0,
      id: order.customer as number,
      overrideAccess: true,
      select: { email: true, name: true },
    })
  } catch {
    payload.logger.error({ msg: 'order_mail_customer_unreadable', order: order.id })
  }

  if (customer?.email) {
    const rendered = await renderOrder({
      cashLine: customerCashLine,
      design,
      intro: copy.confirmationIntro,
      lines,
      outro: copy.confirmationOutro,
      paymentId,
      recipientName: (customer.name ?? name) || undefined,
      totalLabel,
      variant: 'confirmation',
    })

    const result = await sendOrderMail(payload, {
      html: rendered.html,
      subject: copy.confirmationSubject,
      text: rendered.text,
      to: customer.email,
    })

    if (result.status !== 'sent') {
      payload.logger.warn({ msg: 'order_confirmation_mail_not_sent', order: order.id, status: result.status })
    }
  } else {
    payload.logger.warn({ msg: 'order_confirmation_mail_no_recipient', order: order.id })
  }

  const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 }).catch(() => null)) as
    | Footer
    | null
  const kitchen = footer?.contact?.email?.trim() ?? ''

  if (kitchen) {
    const rendered = await renderOrder({
      cashLine: kitchenLine,
      delivery: {
        addressLabel: addressLabel(order),
        name,
        note: delivery.note || undefined,
        phone: delivery.phone ?? '',
      },
      design: { headerImage: design.headerImage },
      intro: copy.kitchenIntro,
      lines,
      paymentId,
      totalLabel,
      variant: 'kitchenNotice',
    })

    const result = await sendOrderMail(payload, {
      html: rendered.html,
      subject: `${copy.kitchenSubject} · order ${order.id}`,
      text: rendered.text,
      to: kitchen,
    })

    if (result.status !== 'sent') {
      payload.logger.warn({ msg: 'order_kitchen_mail_not_sent', order: order.id, status: result.status })
    }
  } else {
    payload.logger.warn({ msg: 'order_kitchen_mail_no_recipient', order: order.id })
  }
}
