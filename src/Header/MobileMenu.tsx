'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { cn } from '@/utilities/ui'
import { AccountLinks } from './AccountLinks'
import { DRAWER_STAGGER_START_MS, DRAWER_STAGGER_STEP_MS, HeaderNav } from './Nav'

interface Props {
  items: NonNullable<HeaderType['navItems']>
  onClose: () => void
  drawerRef?: React.RefObject<HTMLDivElement | null>
  closeRef?: React.RefObject<HTMLButtonElement | null>
  signedIn?: boolean | null
}

/**
 * The full-height green drawer behind the hamburger (design.md §6.2): gold links
 * at 56px and the logo in gold.
 *
 * It slides in from the right once, and the rows join a short stagger behind it —
 * menu links first, then the account rows — so the drawer feels assembled rather
 * than dumped. `prefers-reduced-motion` receives the drawer instantly, with no
 * cascade.
 */
export const MobileMenu: React.FC<Props> = ({
  closeRef,
  drawerRef,
  items,
  onClose,
  signedIn = null,
}) => {
  const accountDelayMs = DRAWER_STAGGER_START_MS + items.length * DRAWER_STAGGER_STEP_MS + 60

  return (
    <div
      aria-label="Menu"
      aria-modal="true"
      className="bg-green-900 animate-in fade-in slide-in-from-right fixed inset-0 z-50 flex flex-col duration-300 ease-out lg:hidden motion-reduce:animate-none"
      id="mobile-menu"
      ref={drawerRef}
      role="dialog"
    >
      <div className="container flex items-center justify-between gap-6 py-3">
        <Link aria-label="UNAVE home" className="text-gold-400 shrink-0" href="/" onClick={onClose}>
          <Logo />
        </Link>
        <button
          aria-label="Close menu"
          className="text-cream hover:bg-cream/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none motion-reduce:transition-none"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <X aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
      </div>

      <nav aria-label="Main menu" className="container flex-1 overflow-y-auto py-6">
        <HeaderNav items={items} onNavigate={onClose} variant="drawer" />

        <div
          className={cn(
            'border-cream/15 mt-4 border-t pt-2',
            !items.length && 'mt-0 border-t-0 pt-0',
          )}
        >
          <AccountLinks
            delayMs={accountDelayMs}
            onNavigate={onClose}
            signedIn={signedIn}
            variant="drawer"
          />
        </div>
      </nav>
    </div>
  )
}
