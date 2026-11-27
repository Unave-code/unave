import { ArrowLeft, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'

import { AUTH_BRAND } from './copy'

interface Props {
  children: React.ReactNode
}

const BACK_LINK =
  'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

/**
 * The frame every account screen sits in (design.md §6.13).
 *
 * The kitchen's food is the backdrop and the form sits on a cream sheet in front
 * of it. From `lg` the photograph fills the whole viewport, darkened from the
 * left so the account's promise reads in cream along its lower edge, and the
 * sheet docks to the right with an inset, rounded edge. Below `lg` the photo
 * shrinks to a short strip carrying the logo and the way home, and the sheet
 * rises over its lower edge, so a phone still opens on food rather than on a
 * bare form.
 *
 * The account screens drop the site header and footer: signing in is a task, and
 * a nav bar full of menu links next to a password field competes with it. What
 * the header did that matters, a way back to the shop, survives as the logo and
 * one quiet link.
 *
 * The screen is exactly one viewport tall (`h-dvh`) and the page itself never
 * scrolls. The sheet scrolls on its own when a form is taller than the room
 * left, sign-up on a small phone. On a wide screen it centres its content only
 * while there is room, so a scroll never hides the top of the heading; on a
 * phone the form starts at the top of the sheet, under the photo.
 *
 * The brand line is a `p`, not a heading: each screen's real `h1` lives on
 * the sheet, and a heading before it would read out of order.
 */
export const AuthShell: React.FC<Props> = ({ children }) => (
  <div className="bg-green-900 relative isolate flex h-dvh flex-col overflow-hidden">
    <div className="relative shrink-0 max-lg:h-40 max-lg:short:h-36 max-lg:shorter:h-20 lg:absolute lg:inset-0">
      <Image
        alt=""
        className="object-cover object-center"
        fill
        priority
        quality={75}
        sizes="100vw"
        src="/images/hero-table.jpg"
      />
      {/* A phone darkens the strip from the top, so the logo reads; a wide
          screen darkens from the left, so the brand line reads and the food
          on the right, beside the sheet, stays the picture. */}
      <div
        aria-hidden="true"
        className="from-green-900/75 via-green-900/25 to-green-900/50 lg:from-green-900/95 lg:via-green-900/55 absolute inset-0 bg-linear-to-b lg:bg-linear-to-r lg:to-transparent"
      />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:px-6 lg:p-6">
        <Link
          aria-label="UNAVE home"
          className="bg-cream/90 text-green-900 focus-visible:ring-gold-400 hover:bg-cream inline-flex min-h-11 items-center rounded-pill px-4 shadow-sm backdrop-blur-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
          href="/"
        >
          <Logo />
        </Link>
        <Link
          className={`${BACK_LINK} text-cream hover:bg-cream/15 focus-visible:ring-gold-400 lg:hidden`}
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {AUTH_BRAND.backLink}
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 hidden max-w-[36rem] p-10 pb-12 short:p-8 lg:right-[34rem] lg:block xl:right-[37rem]">
        <p className="text-gold-400 text-xs font-bold tracking-[0.14em] uppercase">
          {AUTH_BRAND.eyebrow}
        </p>
        <p className="text-cream mt-3 max-w-[16ch] font-[family-name:var(--font-heading)] text-[40px] leading-[1.08] font-bold tracking-[-0.01em] text-balance short:text-[34px]">
          {AUTH_BRAND.title}
        </p>
        <p className="text-body text-cream/90 mt-4 max-w-[44ch]">{AUTH_BRAND.intro}</p>

        <ul className="mt-6 flex flex-wrap gap-2 short:mt-4">
          {AUTH_BRAND.points.map((point) => (
            <li
              className="bg-cream/10 text-cream ring-cream/20 inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm ring-1 backdrop-blur-sm"
              key={point}
            >
              <Check aria-hidden="true" className="text-gold-400 size-4 shrink-0" strokeWidth={2.5} />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="bg-cream relative -mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-3xl lg:absolute lg:top-4 lg:right-4 lg:bottom-4 lg:mt-0 lg:w-[32rem] lg:rounded-2xl lg:shadow-[-24px_0_64px_-28px_rgb(15_46_33/0.6)] xl:w-[35rem]">
      <div className="hidden shrink-0 justify-end px-6 pt-5 lg:flex">
        <Link
          className={`${BACK_LINK} text-green-700 hover:bg-green-100 focus-visible:ring-green-500`}
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {AUTH_BRAND.backLink}
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[26rem] px-6 pt-8 pb-10 sm:px-8 short:pt-6 short:pb-6 lg:my-auto lg:pt-4">
        {children}
      </div>
    </div>
  </div>
)
