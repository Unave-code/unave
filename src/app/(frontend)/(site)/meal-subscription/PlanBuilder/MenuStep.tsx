import React from 'react'

import type { PlanBuilderData } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import { MEAL_ICON, MEAL_LABEL } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

export function MenuStep({ data, state }: { data: PlanBuilderData; state: PlanBuilderState }) {
  const { meals, offered, times } = state
  const week = data.thisWeek
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-600 max-w-[52ch]">One balanced meal for each slot, set by our kitchen. The menu changes every week.</p>
        {week?.range && <p className="text-ink-900 text-sm font-bold">This week · {week.range}</p>}
      </div>
      <div className="border-line mt-5 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">Menu{week?.range ? ` for ${week.range}` : ''}</caption>
          <thead>
            <tr className="bg-green-50 text-green-900">
              <th className="w-20 px-4 py-3 font-extrabold" scope="col">
                Day
              </th>
              {offered.map((m) => {
                const Icon = MEAL_ICON[m]
                return (
                  <th className={cn('px-4 py-3', !meals[m] && 'opacity-50')} key={m} scope="col">
                    <span className="flex items-center gap-2 font-extrabold">
                      <Icon aria-hidden className="text-gold-600 size-4" /> {MEAL_LABEL[m]}
                    </span>
                    <span className="text-ink-600 block text-xs font-normal">{meals[m] ? times[m] : 'Not in your plan'}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-line divide-y bg-white">
            {week?.days.map((d) => (
              <tr className="align-top" key={d.day}>
                <th className="px-4 py-4 font-extrabold text-green-700" scope="row">
                  {d.day}
                </th>
                {offered.map((m) => {
                  const dish = d[m]
                  return (
                    <td className={cn('px-4 py-4', !meals[m] && 'opacity-50')} key={m}>
                      {dish ? (
                        <>
                          <p className="text-ink-900 font-extrabold">{dish.main}</p>
                          {dish.sides.length > 0 && <p className="text-ink-600 mt-1 text-xs leading-5">{dish.sides.join(' · ')}</p>}
                        </>
                      ) : (
                        <p className="text-ink-600 text-xs">To be announced</p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
