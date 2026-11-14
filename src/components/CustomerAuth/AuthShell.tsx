import { ArrowLeft, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'

import { AUTH_BRAND } from './copy'

interface Props {
  children: React.ReactNode
}

/**
 * The frame every account screen sits in (design.md §6.13).
 *
 * Two halves: on the left (from `lg`), the kitchen photograph in an inset
 * rounded frame with the logo pinned to its corner and the account's promise
 * along its darkened lower edge as a line, a sentence and three small chips; on
 * the right, the form in a white card on the cream, so the one task on the
 * screen sits on its own surface. Only the lower part of the photo is tinted,
 * so the food reads as food rather than as a green wash.
 *
 * The account screens drop the site header and footer: signing in is a task, and a
 * nav bar full of menu links next to a password field competes with it. What the
 * header did that matters, a way back to the shop, survives as the logo and one
 * quiet link at the top of the form half.
 *
 * The screen is exactly one viewport tall (`h-dvh`) and the page itself never
 * scrolls. The photograph half is desktop only (`lg` and up): on a phone the form
 * needs the whole height, and a panel above it would push the submit button below
 * the fold. The form column still scrolls on its own if a short screen cannot fit
 * every line, and it centres itself only while there is room, so a scroll never
 * hides the top of the heading.
 *
 * The panel headline is a `p`, not a heading: each screen's real `h1` lives in
 * the form card, and putting a heading before it would read out of order.
 */
export const AuthShell: React.FC<Props> = ({ children }) => (
  <div className="bg-cream flex h-dvh flex-col overflow-hidden lg:flex-row">
    <aside className="relative hidden p-4 lg:block lg:w-1/2 lg:shrink-0 xl:w-[46%]">
      <div className="bg-green-900 text-cream relative isolate h-full overflow-hidden rounded-2xl">
        <Image
          alt=""
          className="object-cover object-center"
          fill
          priority
          quality={75}
          sizes="50vw"
          src="/images/gallery-3.jpg"
        />
        {/* Only the lower part darkens, so the food stays the picture and the
            words over it still read at full contrast. */}
        <div
          aria-hidden="true"
          className="from-green-900 via-green-900/80 absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t to-transparent"
        />

        <Link
          aria-label="UNAVE home"
          className="bg-cream/90 text-green-900 focus-visible:ring-gold-400 hover:bg-cream absolute top-6 left-6 inline-flex min-h-11 items-center rounded-pill px-4 shadow-sm backdrop-blur-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
          href="/"
        >
          <Logo />
        </Link>

        <div className="absolute inset-x-0 bottom-0 p-10 pb-11 short:p-8">
          <p className="text-cream max-w-[18ch] text-[30px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance">
            {AUTH_BRAND.title}
          </p>
          <p className="text-body text-cream/85 mt-3 max-w-[44ch]">{AUTH_BRAND.intro}</p>

          <ul className="mt-6 flex flex-wrap gap-2 short:mt-4">
            {AUTH_BRAND.points.map((point) => (
              <li
                className="bg-cream/10 text-cream ring-cream/20 inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm ring-1 backdrop-blur-sm"
                key={point}
              >
                <Check
                  aria-hidden="true"
                  className="text-gold-400 size-4 shrink-0"
                  strokeWidth={2.5}
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-5 sm:px-10 short:py-3 lg:justify-end">
        <Link
          aria-label="UNAVE home"
          className="text-green-900 focus-visible:ring-green-500 transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:outline-none lg:hidden motion-reduce:transition-none"
          href="/"
        >
          <Logo />
        </Link>
        <Link
          className="text-green-700 hover:bg-green-100 focus-visible:ring-green-500 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {AUTH_BRAND.backLink}
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-10 short:pb-3">
        <div className="m-auto w-full max-w-[28rem] rounded-2xl bg-white p-6 shadow-[0_18px_48px_-24px_rgb(15_46_33/0.35)] ring-1 ring-green-900/5 sm:p-9 short:p-7 shorter:p-5">
          {children}
        </div>
      </div>
    </div>
  </div>
)
