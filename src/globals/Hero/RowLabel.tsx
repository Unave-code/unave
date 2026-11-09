'use client'
import type { Hero } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Hero['slides']>[number]>()

  const label = data?.data?.headline
    ? `Slide ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.headline.replace(/\*/g, '')}`
    : 'Slide'

  return <div>{label}</div>
}
