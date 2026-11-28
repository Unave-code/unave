'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** The id of the map region, so a card can bring the map into view. */
export const DELIVERY_MAP_ID = 'delivery-map'

type Selection = {
  /** Chooses an area; `reveal` scrolls the map into view (from the cards). */
  select: (name: string, reveal?: boolean) => void
  selected: null | string
}

const SelectionContext = createContext<Selection>({ select: () => undefined, selected: null })

/**
 * The area chosen on the delivery areas page, shared by the map in the hero
 * and the cards below it, so choosing one in either shows it in both.
 */
export const DeliveryAreasProvider: React.FC<{ children: React.ReactNode; initial: null | string }> = ({
  children,
  initial,
}) => {
  const [selected, setSelected] = useState<null | string>(initial)

  const select = useCallback((name: string, reveal = false) => {
    setSelected(name)
    if (!reveal) return
    const map = document.getElementById(DELIVERY_MAP_ID)
    if (!map) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rect = map.getBoundingClientRect()
    // Only scroll when the map is out of sight, so a card click never jolts the page.
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      map.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }
  }, [])

  const value = useMemo(() => ({ select, selected }), [select, selected])

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export const useDeliveryAreaSelection = (): Selection => useContext(SelectionContext)
