import type { Payload } from 'payload'

/**
 * The staff-editable images and content in customer emails (Settings → Email
 * settings → Images and extra content).
 *
 * An inbox fetches every image from the open web, so each one is given as an
 * absolute address on the public site. Media uploads are stored as WebP, which
 * Outlook for Windows cannot show, so the PNG `email` size is used when the
 * upload has one; an image uploaded before that size existed falls back to
 * its original.
 */

/** The width of the email's content column, in CSS pixels. */
export const EMAIL_CONTENT_WIDTH = 456

export type EmailImage = {
  alt: string
  height?: number
  src: string
  width: number
}

/** Lexical's saved state, read loosely: only the node shapes the email renders matter. */
export type RichContentNode = {
  children?: RichContentNode[]
  fields?: { linkType?: string; newTab?: boolean; url?: string } | null
  format?: number | string
  listType?: string
  tag?: string
  text?: string
  type?: string
  value?: unknown
}

export type RichContentState = { root?: { children?: RichContentNode[] } }

export type EmailDesign = {
  footerContent?: RichContentState
  headerImage?: EmailImage
  orderContent?: RichContentState
}

type MediaLike = {
  alt?: null | string
  height?: null | number
  mimeType?: null | string
  sizes?: { email?: { height?: null | number; url?: null | string; width?: null | number } | null } | null
  url?: null | string
  width?: null | number
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** A public site address for a stored path, or null when there is no public origin to put in front of it. */
export const absoluteUrl = (url: null | string | undefined): null | string => {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const server = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (!server || !url.startsWith('/')) return null
  try {
    return new URL(url, server).toString()
  } catch {
    return null
  }
}

/** A populated media document as an email image, sized to the content column. */
export const emailImageFromMedia = (media: unknown): EmailImage | null => {
  if (!isObject(media)) return null
  const doc = media as MediaLike
  if (doc.mimeType && !doc.mimeType.startsWith('image/')) return null

  const sized = doc.sizes?.email?.url ? doc.sizes.email : null
  const src = absoluteUrl(sized?.url ?? doc.url)
  if (!src) return null

  const naturalWidth = Number(sized?.width ?? doc.width) || EMAIL_CONTENT_WIDTH
  const naturalHeight = Number(sized?.height ?? doc.height) || 0
  const width = Math.min(EMAIL_CONTENT_WIDTH, naturalWidth)
  const height = naturalHeight ? Math.round((naturalHeight * width) / naturalWidth) : undefined

  return { alt: doc.alt?.trim() ?? '', height, src, width }
}

const hasContent = (state: unknown): state is RichContentState => {
  if (!isObject(state) || !isObject(state.root)) return false
  const children = (state.root as { children?: unknown }).children
  if (!Array.isArray(children)) return false
  // An emptied editor keeps one empty paragraph; that is no content.
  return children.some(
    (node) => isObject(node) && (node.type !== 'paragraph' || (Array.isArray(node.children) && node.children.length > 0)),
  )
}

/** Reads the email design from the settings global. Never throws: a failure mails without it. */
export const loadEmailDesign = async (payload: Payload): Promise<EmailDesign> => {
  try {
    const settings = (await payload.findGlobal({ slug: 'email-settings', depth: 1 })) as {
      design?: { footerContent?: unknown; headerImage?: unknown; orderContent?: unknown } | null
    }
    const design = settings.design ?? {}

    return {
      footerContent: hasContent(design.footerContent) ? design.footerContent : undefined,
      headerImage: emailImageFromMedia(design.headerImage) ?? undefined,
      orderContent: hasContent(design.orderContent) ? design.orderContent : undefined,
    }
  } catch {
    payload.logger.error({ msg: 'Could not read the email design. Mailing without it.' })
    return {}
  }
}
