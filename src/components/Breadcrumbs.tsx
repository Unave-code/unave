import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

export type Crumb = { href?: string; label: string }

/**
 * The trail above a store page's heading: every step but the last is a link,
 * and the last is the page itself (`aria-current`). `onDark` is for the deep
 * green opening bands, where the trail reads in cream and turns gold on hover.
 * Each link is at least 44px tall, so the trail is easy to tap.
 */
export const Breadcrumbs: React.FC<{
  className?: string
  items: Crumb[]
  tone?: 'light' | 'onDark'
}> = ({ className, items, tone = 'light' }) => {
  const dark = tone === 'onDark'

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn('text-caption flex flex-wrap items-center gap-x-1.5', dark ? 'text-cream/75' : 'text-ink-600')}>
        {items.map((item, index) => {
          const last = index === items.length - 1

          return (
            <li className="flex min-w-0 items-center gap-x-1.5" key={`${item.label}-${index}`}>
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('max-w-[28ch] truncate font-semibold', dark ? 'text-cream' : 'text-ink-900')}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none',
                    index === 0 && 'font-bold',
                    dark
                      ? 'hover:text-gold-400 focus-visible:ring-gold-400'
                      : 'hover:text-green-700 focus-visible:ring-green-500',
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              )}
              {last ? null : (
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-70" strokeWidth={2.25} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
