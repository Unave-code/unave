import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * Pill buttons in the four combinations design.md §6.1 asks for: primary and
 * secondary on light surfaces, and the same pair for the dark green bands. One
 * primary per section. Two sizes: the 52px default, and a 44px small size for
 * tight surfaces such as a product card — 44px is the smallest pill the design
 * allows anywhere.
 */
export const CTA_BASE =
  'inline-flex h-13 items-center justify-center gap-2 rounded-pill px-7 text-button font-bold whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'

/** Height and padding overrides; `cn` merges these over CTA_BASE. */
export const CTA_SIZES = {
  default: '',
  small: 'h-11 px-5 text-sm',
} as const

export type CtaSize = keyof typeof CTA_SIZES

export const CTA_VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-green-600 focus-visible:ring-green-500',
  secondary:
    'border-2 border-green-700 text-green-700 hover:bg-green-50 focus-visible:ring-green-500',
  onDark: 'bg-gold-400 text-green-700 hover:bg-gold-500 focus-visible:ring-gold-400',
  onDarkSecondary:
    'border-2 border-gold-400 text-gold-400 hover:bg-gold-400/15 focus-visible:ring-gold-400',
} as const

export type CtaVariant = keyof typeof CTA_VARIANTS

interface Props {
  children: React.ReactNode
  className?: string
  href: string
  /** Passed through for links that leave the site, such as WhatsApp. */
  rel?: string
  target?: string
  variant?: CtaVariant
}

/** A call to action styled as a button. Everything on the site is a link. */
export const Cta: React.FC<Props> = ({ children, className, href, rel, target, variant = 'primary' }) => (
  <Link className={cn(CTA_BASE, CTA_VARIANTS[variant], className)} href={href} rel={rel} target={target}>
    {children}
  </Link>
)
