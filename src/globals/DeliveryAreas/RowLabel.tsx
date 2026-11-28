'use client'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

import { parsePincodes } from '@/utilities/deliveryArea'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<{ name?: null | string; pincodes?: null | string }>()
  const index = rowNumber === undefined ? '' : ` ${rowNumber + 1}`
  const name = data?.name?.trim()
  const count = parsePincodes(data?.pincodes).length

  if (!name) return <div>{`Area${index}`}</div>

  return <div>{`${name} (${count} pincode${count === 1 ? '' : 's'})`}</div>
}
