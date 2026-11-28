import { unstable_cache } from 'next/cache'

import type { DeliveryArea, MapPin } from './deliveryArea'

/**
 * Where an area sits on the map when staff have not typed a pin for it.
 *
 * Staff name an area and list its pincodes; asking them for coordinates too
 * left the map empty. So an area without a pin is looked up on OpenStreetMap's
 * Nominatim by its name in Chennai, then by its first pincode, and the answer
 * is cached for a month: a place does not move, and Nominatim's policy asks
 * for light use (at most one request a second, a named client). A typed pin
 * always wins.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'UNAVE delivery areas (https://unave.in)'
const MONTH_S = 60 * 60 * 24 * 30

/** Chennai and its suburbs, so a name search prefers the local place. */
const CHENNAI_VIEWBOX = '79.95,13.35,80.40,12.70'

type NominatimHit = { lat?: string; lon?: string }

const ask = async (params: Record<string, string>): Promise<MapPin | null> => {
  const url = `${NOMINATIM}?${new URLSearchParams({ countrycodes: 'in', format: 'jsonv2', limit: '1', ...params })}`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(5000),
  })
  // A refusal throws, so it is not cached and the next visit tries again.
  if (!response.ok) throw new Error(`nominatim_${response.status}`)
  const [hit] = (await response.json()) as NominatimHit[]
  const lat = Number(hit?.lat)
  const lng = Number(hit?.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) && hit ? { lat, lng } : null
}

/** One place, cached by what was asked; a failed lookup is not remembered. */
const lookUp = unstable_cache(
  async (query: string, pincode: string): Promise<MapPin | null> => {
    if (query) {
      const byName = await ask({ q: query, viewbox: CHENNAI_VIEWBOX })
      if (byName) return byName
    }
    return pincode ? ask({ postalcode: pincode }) : null
  },
  ['delivery-area-place-v1'],
  { revalidate: MONTH_S, tags: ['delivery-area-places'] },
)

const safeLookUp = async (query: string, pincode: string): Promise<MapPin | null> => {
  try {
    return await lookUp(query, pincode)
  } catch {
    return null
  }
}

/** Every area with a pin: the typed one, or one looked up from its name and pincode. */
export const placeDeliveryAreas = async (areas: DeliveryArea[]): Promise<DeliveryArea[]> => {
  const placed: DeliveryArea[] = []
  // One at a time, never in parallel, to stay inside Nominatim's rate.
  for (const area of areas) {
    if (area.pin) {
      placed.push(area)
      continue
    }
    const pin = await safeLookUp(`${area.name}, Chennai, Tamil Nadu`, area.pincodes[0] ?? '')
    placed.push({ ...area, pin })
  }
  return placed
}

/** The kitchen's pin: the typed one, or the footer's address looked up. */
export const placeKitchen = async (pin: MapPin | null, address: null | string | undefined): Promise<MapPin | null> => {
  if (pin) return pin
  const text = address?.trim().replace(/\.$/, '')
  return text ? safeLookUp(text, '') : null
}
