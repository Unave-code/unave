import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { PRODUCT_KIND_LABEL } from '@/utilities/productsCopy'
import { productHref } from '@/utilities/productsCategoryCopy'
import { cn } from '@/utilities/ui'

import { PRODUCT_PLACEHOLDER } from '../productPlaceholder'
import { type ComboItem, ColumnHeading, daysText, srcOf } from './shared'

/** What a combo holds, as small photo cards, shown before its price. */
export const ComboContents: React.FC<{ comboItems: ComboItem[] }> = ({ comboItems }) => (
  <section aria-labelledby="combo-contents-heading" className="mt-5">
    <ColumnHeading id="combo-contents-heading">
      Included in this combo ({comboItems.length})
    </ColumnHeading>

    <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {comboItems.map((item, index) => {
        const meta = [
          item.type ? PRODUCT_KIND_LABEL[item.type] : null,
          item.durationLabel
            ? [item.durationLabel, daysText(item.days)].filter(Boolean).join(', ')
            : null,
        ]
          .filter(Boolean)
          .join(' · ')

        const body = (
          <>
            <span className="relative block aspect-square overflow-hidden rounded-md bg-green-50">
              <Image
                alt={item.image ? item.image.alt?.trim() || item.title : ''}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
                fill
                sizes="(min-width: 64rem) 9vw, 30vw"
                src={item.image ? srcOf(item.image) : PRODUCT_PLACEHOLDER}
              />
            </span>
            <span className="mt-2 flex min-w-0 flex-col gap-0.5 px-1 pb-1">
              <span className="text-ink-900 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-green-700">
                {item.title}
              </span>
              {meta ? <span className="text-caption text-ink-600">{meta}</span> : null}
            </span>
          </>
        )
        const card = 'group border-line block h-full rounded-lg border bg-white p-1.5'

        return (
          <li className="min-w-0" key={`${item.title}-${index}`}>
            {item.slug ? (
              <Link
                className={cn(
                  card,
                  'transition-[border-color,box-shadow] hover:border-green-500 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
                )}
                href={productHref(item.slug)}
              >
                {body}
              </Link>
            ) : (
              <div className={card}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  </section>
)
