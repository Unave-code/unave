'use client'

import { Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { cn } from '@/utilities/ui'
import { CART_LINK_LABEL } from '@/utilities/cartCopy'
import { whatsappHref } from '@/utilities/whatsapp'
import { AccountLinks } from './AccountLinks'
import { MobileMenu } from './MobileMenu'
import { HeaderNav } from './Nav'
import { CartNavLink } from './Nav/CartNavLink'
import { AnnouncementBar } from './AnnouncementBar'

interface HeaderClientProps {
  data: HeaderType
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  /* Past the top of the page the bar turns green and the logo gold (design.md §6.2) */
  const [scrolled, setScrolled] = useState(false)
  /* The announcement strip only shows at the very top of the page */
  const [stripHidden, setStripHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  /* `null` until the session check answers, so nothing is guessed and nothing flickers. */
  const [session, setSession] = useState<{ name: string | null; signedIn: boolean } | null>(null)
  const signedIn = session?.signedIn ?? null
  const barRef = useRef<HTMLElement>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const navItems = data?.navItems || []
  /* The cart is core commerce, not editorial. When staff add a `/cart` link in
     Site chrome it is lifted out of the menu and presented in the right-hand
     action group beside the search control, with its label and its drawer place
     (design.md §6.15). When no such item exists — a database built from
     migrations alone, for example — the control still renders with the default
     label and the drawer appends a row, so the site can never ship a store with
     no way to reach the basket. */
  const cartItem = navItems.find(({ link }) => link?.url === '/cart')
  const menuItems = navItems.filter(({ link }) => link?.url !== '/cart')
  const drawerItems: NonNullable<HeaderType['navItems']> = cartItem
    ? navItems
    : [
        ...navItems,
        { link: { type: 'custom', label: CART_LINK_LABEL, newTab: false, url: '/cart' } },
      ]
  const announcement = data?.announcement
  const whatsappNumber = data?.whatsapp?.number
  const whatsappMessage = data?.whatsapp?.message

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  /* The band that opens a page runs up behind the bar, so the page has to know how
     tall the bar really is: it changes with the breakpoint and with how many rows
     the menu links take. Publishing it beats guessing it in the stylesheet. */
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const publish = () => {
      document.documentElement.style.setProperty('--navbar-height', `${bar.offsetHeight}px`)
    }

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(bar)

    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--navbar-height')
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      /* The strip belongs to the top of the page only: once the visitor has
         scrolled away it stays tucked, whichever direction they move, and only
         coming back to the top brings it out again. */
      setStripHidden(y > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* One session check for the whole header, shared by the bar and the drawer.
     Doing it in the root layout instead would read a cookie during layout
     rendering and opt every marketing page out of static rendering. */
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetch('/api/customers/oauth/session', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { signedIn: false }))
      .then((data: { name?: string | null; signedIn?: boolean }) => {
        if (!active) return
        setSession({
          name: typeof data?.name === 'string' ? data.name : null,
          signedIn: Boolean(data?.signedIn),
        })
      })
      .catch(() => {
        if (active) setSession({ name: null, signedIn: false })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  /* Following a link closes the drawer. Same-page links do not change the pathname,
     so the click itself is the signal. */
  const closeMenu = () => {
    setMenuOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  /* While the drawer is open: lock the page behind it, focus the close button,
     keep Tab inside the drawer, and close on Escape. */
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <>
      {/* The announcement strip and the bar pin together, strip on top (design.md §6.2).
          The strip stays put at the top of the page but tucks away as soon as the
          visitor scrolls, so the navbar gets the whole screen; scrolling back to
          the top brings it out again. */}
      <div className="sticky top-0 z-20">
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
            stripHidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}
          inert={stripHidden}
        >
          <div className="min-h-0 overflow-hidden">
            <AnnouncementBar announcement={announcement} />
          </div>
        </div>

        <header
          className="site-header border-b border-border bg-background"
          data-scrolled={scrolled ? 'true' : 'false'}
          ref={barRef}
          {...(theme ? { 'data-theme': theme } : {})}
        >
          <div className="container grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 py-3 lg:flex lg:justify-between lg:gap-6">
            <Link
              aria-label="UNAVE home"
              className="text-primary col-start-1 row-start-1 shrink-0 lg:order-1"
              href="/"
            >
              <Logo />
            </Link>

            <nav aria-label="Main" className="hidden lg:order-2 lg:block">
              <HeaderNav items={menuItems} />
            </nav>

            <Link
              aria-label="Search meals and plans"
              className="text-primary border-current/25 hover:bg-current/10 col-span-2 row-start-2 inline-flex h-11 min-w-0 items-center gap-3 rounded-pill border px-4 transition-colors focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none lg:order-3 lg:col-auto lg:row-auto lg:w-48 lg:shrink-0 xl:w-56"
              href="/search"
            >
              <Search aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
              <span className="text-caption truncate">Search meals and plans</span>
            </Link>

            <div className="col-start-2 row-start-1 flex items-center gap-2 lg:order-4">
              <AccountLinks name={session?.name ?? null} signedIn={signedIn} />

              <CartNavLink
                active={pathname === '/cart'}
                label={cartItem?.link?.label ?? CART_LINK_LABEL}
                variant="bar"
              />

              <button
                aria-controls="mobile-menu"
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className="border-current/25 hover:bg-current/10 inline-flex size-11 items-center justify-center rounded-pill border transition-colors focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none lg:hidden motion-reduce:transition-none"
                onClick={() => setMenuOpen(true)}
                ref={triggerRef}
                type="button"
              >
                <Menu aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>
      </div>

      {menuOpen ? (
        <MobileMenu
          closeRef={closeRef}
          drawerRef={drawerRef}
          items={drawerItems}
          onClose={closeMenu}
          signedIn={signedIn}
        />
      ) : null}

      {whatsappNumber ? (
        <a
          aria-label="Message UNAVE on WhatsApp"
          className="whatsapp-fab bg-green-600 text-cream hover:bg-green-700 rounded-pill focus-visible:ring-gold-400 fixed right-4 bottom-4 z-30 inline-flex size-13 items-center justify-center shadow-md transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          href={whatsappHref(whatsappNumber, whatsappMessage || null)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <WhatsAppIcon className="size-6" />
        </a>
      ) : null}
    </>
  )
}
