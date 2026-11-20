import React from 'react'

import { Cta } from '@/components/Cta'
import { cn } from '@/utilities/ui'

/** The heading and one-line intro under the checkout steps on the cart and checkout pages. */
export const StorePageHeader: React.FC<{ heading: string; intro: string }> = ({ heading, intro }) => (
  <header className="mt-8 flex flex-col gap-2">
    <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] text-green-900 md:text-[34px]">
      {heading}
    </h1>
    <p className="text-body text-ink-600 max-w-[65ch]">{intro}</p>
  </header>
)

/**
 * The centred card a store page shows when there is nothing to act on: an
 * icon in a circle, one heading, one sentence and one way on.
 */
export const StoreEmptyState: React.FC<{
  body: string
  cta: { href: string; label: string }
  heading: string
  /** The page's own h1 when the card is all the page shows. */
  headingLevel?: 'h1' | 'h2'
  icon: React.ReactNode
  tone?: 'gold' | 'green'
}> = ({ body, cta, heading, headingLevel = 'h2', icon, tone = 'green' }) => {
  const Heading = headingLevel
  return (
    <div className="bg-card mx-auto mt-12 flex max-w-[30rem] flex-col items-center rounded-2xl p-10 text-center shadow-sm">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-16 place-items-center rounded-full',
          tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-gold-100 text-gold-600',
        )}
      >
        {icon}
      </span>
      <Heading className="mt-5 text-xl font-bold text-green-900">{heading}</Heading>
      <p className="text-body text-ink-600 mt-2">{body}</p>

      <div className="mt-6">
        <Cta href={cta.href} variant="primary">
          {cta.label}
        </Cta>
      </div>
    </div>
  )
}
