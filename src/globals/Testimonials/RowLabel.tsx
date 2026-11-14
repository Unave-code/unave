'use client'
import type { Testimonial as TestimonialsGlobal } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<TestimonialsGlobal['items']>[number]>()
  const index = rowNumber === undefined ? '' : ` ${rowNumber + 1}`
  const kind = data?.kind === 'video' ? 'Video' : 'Text'
  const name = data?.name?.trim()

  return <div>{name ? `${kind}: ${name}` : `Testimonial${index}`}</div>
}
