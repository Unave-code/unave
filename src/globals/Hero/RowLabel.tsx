'use client'
import type { Hero } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Hero['slides']>[number]>()
  const index = data.rowNumber === undefined ? '' : ` ${data.rowNumber + 1}`

  return <div>{`Image${index}`}</div>
}
