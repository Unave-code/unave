'use client'

import { useAllFormFields } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'
import { reduceFieldsToValues } from 'payload/shared'

import type { Product } from '@/payload-types'
import { comboProblems, comboSeparatePrice } from '@/utilities/combos'
import { formatPaise } from '@/utilities/money'

import { hasComboItems } from '@/utilities/productKind'

import './ComboHealth.scss'

const relationId = (value: unknown): null | number | string => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

/**
 * The combo's health, in the product sidebar (design.md §6.15).
 *
 * A combo can only be bought while every item in it is open and every meal
 * plan in it still has the duration the combo names. When an item is paused or
 * renamed elsewhere, the combo quietly stops selling and the site shows it as
 * paused. This panel reads the combo as it stands in the form, looks up its
 * items, and says plainly whether it can be sold and, if not, why. It also
 * shows what the items would cost bought one by one, so the kitchen can see the
 * saving the combo offers.
 *
 * It renders nothing for a meal plan or a one-time product.
 */
export const ComboHealth: React.FC = () => {
  const [fields] = useAllFormFields()
  const values = useMemo(() => reduceFieldsToValues(fields, true) as Partial<Product>, [fields])
  const isCombo = hasComboItems(values)
  const rows = useMemo(
    () => (isCombo ? (values.components ?? []) : []),
    [isCombo, values.components],
  )
  const ids = rows.map((row) => relationId(row?.product)).filter((id) => id !== null)
  const idKey = ids.join(',')

  /* The last lookup, keyed by the item ids it answered for: while the form's ids
     differ from that key, a lookup is in flight. */
  const [lookup, setLookup] = useState<{ error: boolean; items: Map<string, Product>; key: string }>({
    error: false,
    items: new Map(),
    key: '',
  })

  useEffect(() => {
    if (!isCombo || !idKey) return

    const controller = new AbortController()
    const query = new URLSearchParams({ depth: '0', limit: '10' })
    idKey.split(',').forEach((id, index) => query.set(`where[id][in][${index}]`, id))

    fetch(`/api/products?${query.toString()}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((result: { docs?: Product[] }) => {
        setLookup({ error: false, items: new Map((result.docs ?? []).map((doc) => [String(doc.id), doc])), key: idKey })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('[ComboHealth] could not load combo items', error)
          setLookup((prev) => ({ error: true, items: prev.items, key: idKey }))
        }
      })

    return () => controller.abort()
  }, [isCombo, idKey])

  const items = lookup.items
  const state: 'error' | 'idle' | 'loading' =
    isCombo && idKey && lookup.key !== idKey ? 'loading' : lookup.error ? 'error' : 'idle'

  if (!isCombo) return null

  const populated = {
    ...values,
    components: rows.map((row) => {
      const id = relationId(row?.product)
      return { ...row, product: id === null ? null : (items.get(String(id)) ?? null) }
    }),
  } as Product

  const loading = state === 'loading'
  const problems = loading ? [] : comboProblems(populated)
  const separate = loading ? null : comboSeparatePrice(populated)
  const price = Number(values.price)
  const saving = separate !== null && Number.isFinite(price) && price >= 1 ? separate - price : null

  return (
    <div className="combo-health" role="status">
      <p className="combo-health__label">Combo status</p>

      {loading ? (
        <p className="combo-health__text">Checking the items…</p>
      ) : state === 'error' ? (
        <p className="combo-health__text">
          The items could not be checked. Reload the page to try again.
        </p>
      ) : problems.length === 0 ? (
        <p className="combo-health__ok">
          <span aria-hidden="true" className="combo-health__dot combo-health__dot--ok" />
          Ready to sell{values.available === false ? ' once Available is turned on' : ''}
        </p>
      ) : (
        <>
          <p className="combo-health__bad">
            <span aria-hidden="true" className="combo-health__dot combo-health__dot--bad" />
            Customers cannot buy this combo
          </p>
          <ul className="combo-health__list">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </>
      )}

      {separate !== null ? (
        <dl className="combo-health__value">
          <div>
            <dt>Items bought separately</dt>
            <dd>{formatPaise(separate)}</dd>
          </div>
          {saving !== null ? (
            <div>
              <dt>{saving > 0 ? 'Customer saves' : 'Combo costs more by'}</dt>
              <dd className={saving > 0 ? 'combo-health__save' : 'combo-health__warn'}>
                {formatPaise(Math.abs(saving))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  )
}
