import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import React from 'react'

import type { EmailDesign } from '../design'
import { EmailFooterContent, EmailHeaderImage, RichContent } from './RichContent'

export type OrderMailVariant = 'confirmation' | 'kitchenNotice'

export type OrderEmailLine = {
  amountLabel: string
  componentsLabel?: string
  durationLabel: string
  title: string
}

export type OrderEmailDelivery = {
  addressLabel: string
  name: string
  note?: string
  phone: string
}

export type OrderEmailProps = {
  delivery?: OrderEmailDelivery
  /** Staff-chosen images and content (Settings → Email settings). */
  design?: EmailDesign
  intro: string
  lines: OrderEmailLine[]
  outro?: string
  paymentId: string
  recipientName?: string
  totalLabel: string
  variant: OrderMailVariant
}

/**
 * The two order messages, sharing one layout.
 *
 * The confirmation tells the customer what they paid for and that the kitchen
 * has it. The kitchen notice tells the kitchen where to deliver and who to
 * cook for. Both carry the payment id, because that id is the receipt both
 * sides can match against the order row and the gateway dashboard.
 */
const COPY: Record<OrderMailVariant, { heading: string; preview: string }> = {
  confirmation: {
    heading: 'Your UNAVE order is confirmed',
    preview: 'Your payment went through. The kitchen has your order.',
  },
  kitchenNotice: {
    heading: 'New paid order from the website',
    preview: 'An order was paid on the website.',
  },
}

const body = {
  backgroundColor: '#faf7ef',
  color: '#1b2620',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '32px 16px',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  margin: '0 auto',
  borderTop: '4px solid #1a4b36',
  maxWidth: '520px',
  padding: '32px',
}

const greeting = {
  color: '#4a5a52',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
}

const heading = {
  color: '#1a4b36',
  fontSize: '22px',
  fontWeight: 600,
  lineHeight: '30px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#1b2620',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
  whiteSpace: 'pre-wrap' as const,
}

const lineRow = {
  color: '#1b2620',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px',
}

const totalRow = {
  color: '#0f2e21',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: '24px',
  margin: '0 0 24px',
}

const small = {
  color: '#4a5a52',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
}

const rule = {
  borderColor: '#e4e0d2',
  margin: '28px 0 20px',
}

export const OrderEmail: React.FC<OrderEmailProps> = ({
  delivery,
  design,
  intro,
  lines,
  outro,
  paymentId,
  recipientName,
  totalLabel,
  variant,
}) => {
  const copy = COPY[variant]

  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeaderImage image={design?.headerImage} />
          <Section>
            {recipientName ? <Text style={greeting}>Hi {recipientName},</Text> : null}
            <Heading style={heading}>{copy.heading}</Heading>
            <Text style={paragraph}>{intro}</Text>

            {lines.map((line, index) => (
              <React.Fragment key={index}>
                <Text style={lineRow}>
                  {`${line.title} · ${line.durationLabel} · ${line.amountLabel}`}
                </Text>
                {line.componentsLabel ? (
                  <Text style={small}>{`Includes: ${line.componentsLabel}`}</Text>
                ) : null}
              </React.Fragment>
            ))}

            <Text style={totalRow}>{`Total: ${totalLabel}`}</Text>

            {delivery ? (
              <>
                <Text style={lineRow}>{`${delivery.name}, ${delivery.phone}`}</Text>
                <Text style={small}>{delivery.addressLabel}</Text>
                {delivery.note ? <Text style={small}>{`Note: ${delivery.note}`}</Text> : null}
              </>
            ) : null}

            <Hr style={rule} />
            <Text style={small}>{`Payment id: ${paymentId}`}</Text>

            {outro ? <Text style={paragraph}>{outro}</Text> : null}
            {variant === 'confirmation' ? <RichContent state={design?.orderContent} /> : null}
            <Text style={small}>
              {variant === 'confirmation'
                ? 'This message came from UNAVE about an order placed on our site.'
                : 'This notice came from the UNAVE website. The order row in the admin is the record.'}
            </Text>
            {variant === 'confirmation' ? <EmailFooterContent state={design?.footerContent} /> : null}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OrderEmail
