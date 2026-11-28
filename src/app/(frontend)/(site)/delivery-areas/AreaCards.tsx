'use client'

import { MapPin } from 'lucide-react'
import React from 'react'

import type { DeliveryArea } from '@/utilities/deliveryArea'
import { DELIVERY_MAP_SHOW, DELIVERY_MAP_SHOWN, DELIVERY_STAT_PINCODES } from '@/utilities/deliveryAreaCopy'
import { cn } from '@/utilities/ui'

import { useDeliveryAreaSelection } from './DeliveryAreasContext'

/**
 * One card per delivery area, with its pincodes as chips. The cards render on
 * the server, so the list reads without JavaScript; a card's button chooses the
 * area on the map above.
 */
export const AreaCards: React.FC<{ areas: DeliveryArea[] }> = ({ areas }) => {
  const { select, selected } = useDeliveryAreaSelection()

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {areas.map((area) => {
        const active = area.name === selected

        return (
          <li
            className={cn(
              'bg-card flex flex-col rounded-2xl border p-5 transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
              active ? 'border-gold-500 shadow-md ring-2 ring-gold-400/60' : 'border-line hover:shadow-sm',
            )}
            key={area.name}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full',
                  active ? 'bg-gold-400 text-green-900' : 'bg-green-50 text-green-700',
                )}
              >
                <MapPin className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-ink-900 text-lg leading-tight font-bold break-words">{area.name}</h3>
                <p className="text-ink-600 mt-0.5 text-sm">{DELIVERY_STAT_PINCODES(area.pincodes.length)}</p>
              </div>
            </div>

            {area.pincodes.length > 0 ? (
              <ul aria-label={`Pincodes in ${area.name}`} className="mt-4 flex flex-wrap gap-2">
                {area.pincodes.map((pincode) => (
                  <li
                    className="rounded-pill bg-green-50 px-3 py-1 text-sm font-semibold text-green-800 tabular-nums"
                    key={pincode}
                  >
                    {pincode}
                  </li>
                ))}
              </ul>
            ) : null}

            {area.pin ? (
              <button
                aria-pressed={active}
                className={cn(
                  'rounded-pill mt-5 inline-flex min-h-11 items-center justify-center gap-2 self-start border-2 px-5 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
                  active
                    ? 'border-green-700 bg-green-700 text-cream'
                    : 'border-green-700 text-green-700 hover:bg-green-50',
                )}
                onClick={() => select(area.name, true)}
                type="button"
              >
                <MapPin aria-hidden="true" className="size-4" strokeWidth={2.25} />
                {active ? DELIVERY_MAP_SHOWN : DELIVERY_MAP_SHOW}
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
