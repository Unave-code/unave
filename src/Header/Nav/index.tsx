'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'
import { CART_LINK_LABEL } from '@/utilities/cartCopy'

import { CartNavLink } from './CartNavLink'

type NavItem = NonNullable<HeaderType['navItems']>[number]

interface Props {
  items: NavItem[]
  /** Called when a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void
  variant?: 'desktop' | 'drawer'
}

/* How far into the drawer's entrance the first row waits, and the step between rows.
   MobileMenu reads these so the account rows and the button join the same cascade. */
export const DRAWER_STAGGER_START_MS = 140
export const DRAWER_STAGGER_STEP_MS = 45

const isInternalPath = (url?: string | null): url is string => Boolean(url?.startsWith('/'))

/**
 * The menu links. One list, rendered twice: inline on desktop and stacked in the
 * green mobile drawer, where every row is a 56px tap target (design.md §6.2).
 * (On the desktop bar the cart link is lifted out of this list by HeaderClient
 * and presented in the right-hand action group instead.)
 *
 * The colour comes from `--primary`, which the scrolled-header rule swaps to gold,
 * so the same markup stays legible on the cream bar and on the green one. On the
 * desktop bar the links carry the animated `.header-link` underline, which wipes
 * in on hover and stays on the link for the page you are on. In the drawer the
 * current page's row turns cream over a soft wash, and the rows cascade in.
 */
export const HeaderNav: React.FC<Props> = ({ items, onNavigate, variant = 'desktop' }) => {
  const pathname = usePathname()

  /* Exact match for the home page, prefix match for the rest, so /products also
     marks its category pages active. External and hash links are never active. */
  const isActive = (url?: string | null) => {
    if (!isInternalPath(url)) return false
    return url === '/' ? pathname === '/' : pathname === url || pathname.startsWith(`${url}/`)
  }

  if (!items.length) return null

  return (
    <ul className={cn(variant === 'desktop' ? 'flex items-center gap-1' : 'flex flex-col gap-1')}>
      {items.map(({ link }, index) => {
        const active = isActive(link?.url)

        return (
          <li
            className={cn(
              variant === 'drawer' && 'text-h3',
              variant === 'drawer' &&
                'animate-in fade-in slide-in-from-right-4 fill-mode-backwards duration-300 ease-out motion-reduce:animate-none',
            )}
            key={link?.label ?? index}
            onClick={onNavigate}
            style={
              variant === 'drawer'
                ? { animationDelay: `${DRAWER_STAGGER_START_MS + index * DRAWER_STAGGER_STEP_MS}ms` }
                : undefined
            }
          >
            {link?.url === '/cart' ? (
              <CartNavLink
                active={active}
                label={link.label ?? CART_LINK_LABEL}
                onNavigate={onNavigate}
                variant={variant}
              />
            ) : (
              <CMSLink
                {...link}
                appearance="inline"
                ariaCurrent={active}
                className={cn(
                  'rounded-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none',
                  variant === 'desktop'
                    ? 'header-link text-primary inline-flex min-h-11 items-center px-3 text-sm'
                    : cn(
                        'flex min-h-14 items-center px-1 transition-colors focus-visible:ring-current motion-reduce:transition-none',
                        active
                          ? 'bg-cream/10 text-cream'
                          : 'text-gold-400 hover:text-cream',
                      ),
                )}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
