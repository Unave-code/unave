'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import { CART_EVENT, cartCountInBrowser } from '@/utilities/cart'
import { CART_LINK_COUNT_MANY, CART_LINK_COUNT_ONE } from '@/utilities/cartCopy'
import { cn } from '@/utilities/ui'

/**
 * The header cart control (spec 0007, AC-2 and AC-12).
 *
 * The link itself is a Site chrome item staff add in the admin; this component
 * only makes it a cart: it reads the count from the cookie the same cookie the
 * add control writes, and updates the moment a line is added or removed. The
 * cookie is readable by JavaScript on purpose, and it carries nothing private,
 * so the count needs no request of its own.
 *
 * Three settings: `bar` renders it as an icon control in the desktop bar's
 * right-hand action group, beside the search control; `desktop` is the inline
 * nav presentation; `drawer` is the mobile drawer's row. In every one the
 * visible form is the icon with the live count badge — the label and count are
 * read by screen readers.
 *
 * Without JavaScript the label still links to the cart; only the number waits
 * for the page to hydrate. The count badge zooms in whenever it changes, so an
 * added line is felt as well as seen.
 */
export const CartNavLink: React.FC<{
  active?: boolean
  label: string
  onNavigate?: () => void
  variant: 'bar' | 'desktop' | 'drawer'
}> = ({ active = false, label, onNavigate, variant }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const read = () => setCount(cartCountInBrowser())

    read()
    window.addEventListener(CART_EVENT, read)
    window.addEventListener('focus', read)

    return () => {
      window.removeEventListener(CART_EVENT, read)
      window.removeEventListener('focus', read)
    }
  }, [])

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none',
        variant === 'bar' &&
          'text-primary hover:bg-current/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors motion-reduce:transition-none',
        variant === 'desktop'
          ? 'header-link text-primary inline-flex min-h-11 items-center px-3 text-sm'
          : variant === 'drawer' &&
              cn(
                'flex min-h-14 items-center px-1 transition-colors focus-visible:ring-current motion-reduce:transition-none',
                active ? 'bg-cream/10 text-cream' : 'text-gold-400 hover:text-cream',
              ),
      )}
      href="/cart"
      onClick={onNavigate}
    >
      <span aria-hidden="true" className="relative inline-flex">
        <ShoppingCart
          className={cn(
            'size-5 shrink-0',
            variant === 'drawer' && 'size-6',
          )}
          strokeWidth={2}
        />

        {count > 0 ? (
          <span
            className={cn(
              'absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-4',
              'bg-gold-400 text-green-900',
              'animate-in zoom-in-50 fill-mode-backwards duration-200 ease-out motion-reduce:animate-none',
            )}
            key={count}
          >
            {count}
          </span>
        ) : null}
      </span>

      <span className="sr-only">
        {count === 1 ? `${label}, ${CART_LINK_COUNT_ONE}` : `${label}, ${count} ${CART_LINK_COUNT_MANY}`}
      </span>
    </Link>
  )
}
