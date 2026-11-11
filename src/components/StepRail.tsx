import { ChevronRight } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

export interface StepRailStep {
  body: string
  title: string
}

interface Props {
  /** The band the rail sits on, so an arrowhead can break the track cleanly. */
  surface?: 'cream' | 'tint'
  steps: readonly StepRailStep[]
}

/**
 * The how-it-works rail (design.md §6.6): one numbered timeline instead of a grid
 * of steps, so the section reads as a route rather than four loose cards.
 *
 * Each step is a gold circle carrying its number. On a wide screen the circles
 * sit on one dashed track that runs through them, with a chevron in every gap so
 * the eye is carried left to right; on a phone the rail turns vertical and the
 * track runs between the circles instead.
 *
 * Both tracks are positioned from the circle centres — half a column in from
 * each edge — so the rail takes any number of steps without a class per count:
 * four here, five on our-kitchen. The circles are opaque and drawn over the
 * track, and that is what hides the stub of line behind each one.
 */
export const StepRail: React.FC<Props> = ({ steps, surface = 'cream' }) => {
  const count = steps.length

  /** Half a column: where the centres of the first and last circle sit. */
  const inset = 50 / count

  return (
    <ol className="relative mt-12 flex flex-col md:mt-16 lg:flex-row lg:gap-6" role="list">
      <span
        aria-hidden="true"
        className="border-green-200 pointer-events-none absolute top-7 hidden border-t-2 border-dashed lg:block"
        style={{ left: `${inset}%`, right: `${inset}%` }}
      />

      {steps.map((step, index) => {
        const isLast = index === count - 1

        return (
          <li
            className={cn(
              'relative flex gap-5 lg:block lg:flex-1 lg:text-center',
              !isLast && 'pb-10 lg:pb-0',
            )}
            key={step.title}
          >
            {isLast ? null : (
              <span
                aria-hidden="true"
                className="border-green-200 absolute top-16 bottom-0 left-7 border-l-2 border-dashed lg:hidden"
              />
            )}

            <span
              aria-hidden="true"
              className="text-h3 bg-gold-400 text-green-900 relative z-10 inline-grid size-14 shrink-0 place-items-center rounded-full font-bold tabular-nums"
            >
              {index + 1}
            </span>

            <div className="lg:mt-6">
              <h3 className="text-h3">{step.title}</h3>
              <p className="text-body text-ink-600 mt-2 lg:mx-auto lg:max-w-[34ch]">{step.body}</p>
            </div>

            {isLast ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-7 left-full ml-3 hidden -translate-x-1/2 -translate-y-1/2 p-1.5 lg:block',
                  surface === 'tint' ? 'bg-green-50' : 'bg-background',
                )}
              >
                <ChevronRight
                  aria-hidden="true"
                  className="text-green-500 size-4"
                  strokeWidth={3}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
