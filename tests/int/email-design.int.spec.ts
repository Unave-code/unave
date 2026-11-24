import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { emailImageFromMedia } from '../../src/email/design'
import { renderCustomerAuth, renderOrder } from '../../src/email/templates/render'

/**
 * Staff-written email content (Settings → Email settings → Images and extra
 * content): how the saved editor state and media turn into email markup.
 */

const text = (value: string, format = 0) => ({ type: 'text', text: value, format })
const paragraph = (...children: object[]) => ({ type: 'paragraph', children })

const media = {
  alt: 'UNAVE logo',
  height: 400,
  mimeType: 'image/webp',
  sizes: { email: { height: 200, url: '/api/media/file/logo-912x200.png', width: 912 } },
  url: '/api/media/file/logo.webp',
  width: 1824,
}

const orderProps = {
  intro: 'Thanks.',
  lines: [{ amountLabel: '₹199', durationLabel: 'One-time purchase', title: 'Dal Khichdi' }],
  paymentId: 'pay_1',
  totalLabel: '₹199',
  variant: 'confirmation' as const,
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://unave.test')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('email images', () => {
  it('uses the PNG email size at the column width, on the public site', () => {
    expect(emailImageFromMedia(media)).toEqual({
      alt: 'UNAVE logo',
      height: 100,
      src: 'https://unave.test/api/media/file/logo-912x200.png',
      width: 456,
    })
  })

  it('falls back to the original when the upload has no email size', () => {
    expect(emailImageFromMedia({ ...media, sizes: {} })?.src).toBe('https://unave.test/api/media/file/logo.webp')
  })

  it('skips an image it cannot address publicly, and anything that is not an image', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')
    expect(emailImageFromMedia(media)).toBeNull()
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://unave.test')
    expect(emailImageFromMedia({ ...media, mimeType: 'video/mp4' })).toBeNull()
    expect(emailImageFromMedia(12)).toBeNull()
  })
})

describe('staff content in emails', () => {
  const content = {
    root: {
      children: [
        { type: 'heading', tag: 'h2', children: [text('What happens next')] },
        paragraph(text('We call you '), text('today', 1), text('.')),
        paragraph({ type: 'link', fields: { url: 'https://unave.in/products' }, children: [text('See the menu')] }),
        paragraph({ type: 'link', fields: { url: 'javascript:alert(1)' }, children: [text('Bad link')] }),
        { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [text('Fresh daily')] }] },
        { type: 'upload', relationTo: 'media', value: media, format: 'center' },
      ],
    },
  }

  it('renders headings, bold, safe links, lists and images in the confirmation', async () => {
    const { html, text: plain } = await renderOrder({
      ...orderProps,
      design: { headerImage: emailImageFromMedia(media)!, orderContent: content },
    })

    expect(html).toContain('What happens next')
    expect(html).toMatch(/<span style="font-weight:600">today<\/span>/)
    expect(html).toContain('href="https://unave.in/products"')
    expect(html).toContain('Bad link')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('Fresh daily')
    expect(html.match(/https:\/\/unave\.test\/api\/media\/file\/logo-912x200\.png/g)).toHaveLength(2)
    expect(html).toContain('alt="UNAVE logo"')
    expect(plain).toMatch(/what happens next/i)
    expect(plain).toContain('See the menu https://unave.in/products')
  })

  it('keeps the extra content and the footer out of the kitchen notice', async () => {
    const { html } = await renderOrder({
      ...orderProps,
      design: { footerContent: { root: { children: [paragraph(text('Call us'))] } }, orderContent: content },
      variant: 'kitchenNotice',
    })

    expect(html).not.toContain('What happens next')
    expect(html).not.toContain('Call us')
  })

  it('adds the header image and footer to the account emails', async () => {
    const { html } = await renderCustomerAuth({
      action: 'verify',
      design: {
        footerContent: { root: { children: [paragraph(text('Call us on 98408 21526'))] } },
        headerImage: emailImageFromMedia(media)!,
      },
      link: 'https://unave.test/verify-email?token=t',
    })

    expect(html).toContain('Call us on 98408 21526')
    expect(html).toContain('https://unave.test/api/media/file/logo-912x200.png')
  })

  it('escapes text the staff typed', async () => {
    const { html } = await renderOrder({
      ...orderProps,
      design: { orderContent: { root: { children: [paragraph(text('<b>hi</b>'))] } } },
    })

    expect(html).not.toContain('<b>hi</b>')
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;')
  })
})
