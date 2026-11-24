import { Heading, Hr, Img, Link, Section, Text } from '@react-email/components'
import React from 'react'

import { emailImageFromMedia, type EmailImage, type RichContentNode, type RichContentState } from '../design'

/**
 * Staff-written content (Settings → Email settings) as email-safe markup.
 *
 * Every node the email editor offers (`src/fields/emailLexical.ts`) maps to a
 * React Email component with inline styles, so it lays out the same in Gmail,
 * Outlook and Apple Mail. Text is escaped by React like every other value in
 * these templates, and a link only keeps its address when it is a web, mail
 * or phone link. Anything unknown renders its children, or nothing.
 */

const IS_BOLD = 1
const IS_ITALIC = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE = 8

/** A non-breaking space, so an empty paragraph keeps its line. */
const NBSP = String.fromCharCode(160)

const paragraph = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const headings = {
  h2: { color: '#18181b', fontSize: '19px', fontWeight: 600, lineHeight: '26px', margin: '8px 0 12px' },
  h3: { color: '#18181b', fontSize: '16px', fontWeight: 600, lineHeight: '24px', margin: '8px 0 8px' },
}

const list = { color: '#3f3f46', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px', paddingLeft: '22px' }
const listItem = { margin: '0 0 4px' }
const link = { color: '#1a4b36', textDecoration: 'underline' }
const rule = { borderColor: '#e4e4e7', margin: '20px 0' }
const image = { border: 0, borderRadius: '8px', display: 'block', height: 'auto', maxWidth: '100%', outline: 'none' }

const ALIGN = new Set(['left', 'center', 'right', 'justify'])
const alignOf = (node: RichContentNode): React.CSSProperties =>
  typeof node.format === 'string' && ALIGN.has(node.format)
    ? { textAlign: node.format as React.CSSProperties['textAlign'] }
    : {}

/** Only web, mail and phone links survive; anything else is dropped to its text. */
export const safeHref = (url: unknown): null | string => {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  try {
    const parsed = new URL(trimmed)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? trimmed : null
  } catch {
    return null
  }
}

const renderText = (node: RichContentNode, key: number): React.ReactNode => {
  const format = typeof node.format === 'number' ? node.format : 0
  const style: React.CSSProperties = {}
  if (format & IS_BOLD) style.fontWeight = 600
  if (format & IS_ITALIC) style.fontStyle = 'italic'
  const lines = [format & IS_UNDERLINE ? 'underline' : '', format & IS_STRIKETHROUGH ? 'line-through' : '']
    .filter(Boolean)
    .join(' ')
  if (lines) style.textDecoration = lines

  return Object.keys(style).length ? (
    <span key={key} style={style}>
      {node.text}
    </span>
  ) : (
    <React.Fragment key={key}>{node.text}</React.Fragment>
  )
}

const renderInline = (nodes: RichContentNode[] = []): React.ReactNode[] =>
  nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return renderText(node, index)
      case 'linebreak':
        return <br key={index} />
      case 'tab':
        return ' '
      case 'link':
      case 'autolink': {
        const href = safeHref(node.fields?.url)
        const children = renderInline(node.children)
        return href ? (
          <Link
            href={href}
            key={index}
            style={link}
            {...(node.fields?.newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
          >
            {children}
          </Link>
        ) : (
          <React.Fragment key={index}>{children}</React.Fragment>
        )
      }
      default:
        return node.children ? <React.Fragment key={index}>{renderInline(node.children)}</React.Fragment> : null
    }
  })

const EmailContentImage: React.FC<{ align: React.CSSProperties; image: EmailImage }> = ({ align, image: img }) => (
  <Section style={{ margin: '0 0 16px', ...align }}>
    <Img
      alt={img.alt}
      height={img.height}
      src={img.src}
      style={{ ...image, ...(align.textAlign === 'center' ? { margin: '0 auto' } : {}) }}
      width={img.width}
    />
  </Section>
)

const renderBlock = (node: RichContentNode, key: number): React.ReactNode => {
  switch (node.type) {
    case 'paragraph': {
      const children = renderInline(node.children)
      return (
        <Text key={key} style={{ ...paragraph, ...alignOf(node) }}>
          {children.length ? children : NBSP}
        </Text>
      )
    }
    case 'heading': {
      const tag = node.tag === 'h3' ? 'h3' : 'h2'
      return (
        <Heading as={tag} key={key} style={{ ...headings[tag], ...alignOf(node) }}>
          {renderInline(node.children)}
        </Heading>
      )
    }
    case 'list': {
      const Tag = node.listType === 'number' ? 'ol' : 'ul'
      return (
        <Tag key={key} style={list}>
          {(node.children ?? []).map((item, index) => (
            <li key={index} style={listItem}>
              {renderInline(item.children)}
            </li>
          ))}
        </Tag>
      )
    }
    case 'horizontalrule':
      return <Hr key={key} style={rule} />
    case 'upload': {
      const img = emailImageFromMedia(node.value)
      return img ? <EmailContentImage align={alignOf(node)} image={img} key={key} /> : null
    }
    default:
      return node.children ? (
        <Text key={key} style={paragraph}>
          {renderInline(node.children)}
        </Text>
      ) : null
  }
}

export const RichContent: React.FC<{ state?: RichContentState }> = ({ state }) => {
  const nodes = state?.root?.children ?? []
  if (!nodes.length) return null
  return <Section>{nodes.map(renderBlock)}</Section>
}

/** The header image every email opens with, when staff have chosen one. */
export const EmailHeaderImage: React.FC<{ image?: EmailImage }> = ({ image: img }) =>
  img ? (
    <Section style={{ margin: '0 0 24px', textAlign: 'center' }}>
      <Img alt={img.alt} height={img.height} src={img.src} style={{ ...image, margin: '0 auto' }} width={img.width} />
    </Section>
  ) : null

/** The staff-written footer under a customer email, behind a hairline. */
export const EmailFooterContent: React.FC<{ state?: RichContentState }> = ({ state }) =>
  state ? (
    <>
      <Hr style={rule} />
      <RichContent state={state} />
    </>
  ) : null
