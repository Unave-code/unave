'use client'

import { FieldDescription, FieldError, FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'
import type { TextFieldClientComponent } from 'payload'

type ProductOption = {
  durations?: Array<{ label?: string }>
  id: number | string
  type: string
}

const relationId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

export const ComboDurationField: TextFieldClientComponent = ({ field, path }) => {
  const { setValue, showError, value } = useField<string>({ path })
  const productPath = path.replace(/\.durationLabel$/, '.product')
  const productId = relationId(useFormFields(([fields]) => fields[productPath]?.value))
  const previousProductId = useRef(productId)
  const [product, setProduct] = useState<null | ProductOption>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const labels = (product?.durations ?? [])
    .map((duration) => duration.label?.trim() ?? '')
    .filter(Boolean)
  const counts = new Map<string, number>()

  for (const label of labels) {
    const key = label.toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const options = labels.filter((label) => counts.get(label.toLowerCase()) === 1)
  const inputID = `field-${path.replace(/\./g, '__')}`
  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined

  useEffect(() => {
    if (previousProductId.current !== productId) {
      previousProductId.current = productId
      setValue('')
    }

    if (productId === null) {
      setProduct(null)
      setLoading(false)
      setLoadError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    fetch(`/api/products/${encodeURIComponent(String(productId))}?depth=0`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Product lookup failed with status ${response.status}.`)
        return (await response.json()) as ProductOption
      })
      .then((result) => setProduct(result))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setProduct(null)
        setLoadError(error instanceof Error ? error.message : 'Product lookup failed.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [productId, setValue])

  if (!productId || (!loading && product?.type !== 'plan')) return null

  return (
    <div className={['field-type', 'text', showError && 'error'].filter(Boolean).join(' ')}>
      <FieldLabel htmlFor={inputID} label={field.label} path={path} required={field.required} />

      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <select
          disabled={loading || Boolean(loadError)}
          id={inputID}
          name={path}
          onChange={(event) => setValue(event.target.value)}
          value={typeof value === 'string' && options.includes(value) ? value : ''}
        >
          <option value="">{loading ? 'Loading durations' : 'Choose a duration'}</option>
          {options.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <FieldDescription
          description={
            loadError ??
            (labels.length !== options.length
              ? 'Duplicate duration labels cannot be selected. Update the product labels first.'
              : description)
          }
          path={path}
        />
      </div>
    </div>
  )
}
