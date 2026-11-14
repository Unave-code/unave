import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

import { FAQ, FAQ_HEADING, FAQ_PHOTO, IMAGES } from '@/utilities/homeCopy'

import { Section } from './Section'

export interface FaqItem {
  question: string
  answer: string
}

interface Props {
  heading?: string
  /** The home page's questions by default; a page with its own questions passes its own. */
  items?: readonly FaqItem[]
  /** The photograph beside the questions. */
  image?: { alt: string; src: string }
}

/**
 * Native <details> rather than a scripted accordion: it is keyboard operable and
 * announced correctly with no JavaScript, which matters more than the exact
 * `aria-expanded` implementation in design.md §6.10. The first answer starts open,
 * and the shared `name` makes them an exclusive group: opening one closes the
 * one before, in browsers that support it.
 *
 * Each question is its own rounded tile. The open one takes the soft green wash
 * and its round plus control turns green and rotates into a close mark; the
 * answer eases open where the browser can animate `details` (globals.css,
 * `.faq-item`). Under the list, one quiet link to ask anything else.
 *
 * From large screens the questions sit in the right column with a photograph to
 * their left. Below that the questions come first and the photograph follows, so
 * the section still opens on its heading.
 */
export const Faq: React.FC<Props> = ({
  heading = FAQ_HEADING,
  image = { alt: FAQ_PHOTO, src: IMAGES.faq },
  items = FAQ,
}) => (
  <Section id="faq" tone="white">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="text-h2">{heading}</h2>

        <div className="mt-8 flex flex-col gap-3">
          {items.map((item, index) => (
            <details
              className="faq-item group border-line bg-card open:bg-green-50 rounded-lg border transition-colors duration-200 open:border-green-700/25 motion-reduce:transition-none"
              key={item.question}
              name="faq"
              open={index === 0}
            >
              <summary className="text-body text-ink-900 flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-3 font-bold focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800 transition-[background-color,color,transform] duration-200 group-open:rotate-45 group-open:bg-green-700 group-open:text-cream motion-reduce:transition-none"
                >
                  <Plus className="size-4" strokeWidth={2.25} />
                </span>
              </summary>

              <p className="text-body text-ink-600 max-w-[65ch] px-5 pb-5">{item.answer}</p>
            </details>
          ))}
        </div>

        <Link
          className="group/ask mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none rounded-sm"
          href="/contact"
        >
          Ask us a question
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 ease-out group-hover/ask:translate-x-1 motion-reduce:transition-none"
            strokeWidth={2}
          />
        </Link>
      </div>

      <div className="ring-green-900/10 relative aspect-[5/4] overflow-hidden rounded-lg shadow-md ring-1 lg:order-first">
        <Image
          alt={image.alt}
          className="object-cover"
          fill
          quality={75}
          sizes="(min-width: 1024px) 560px, 100vw"
          src={image.src}
        />
      </div>
    </div>
  </Section>
)
