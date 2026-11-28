/**
 * Where the kitchen delivers (admin → Website → Delivery areas).
 *
 * Staff keep a list of named areas, each with its pincodes. The checkout refuses
 * a pincode outside the list while "Check pincodes at checkout" is ticked; the
 * delivery areas page and the contact page show the names either way.
 *
 * Free of Payload and `node:` imports, so the checkout form, the order endpoint,
 * the page and the tests all read the same rules.
 */

export type DeliveryAreaRow = { name?: null | string; pincodes?: null | string }

export type DeliveryAreasSource = {
  areas?: DeliveryAreaRow[] | null
  enforce?: boolean | null
}

export type DeliveryArea = { name: string; pincodes: string[] }

export type DeliveryCheck = 'not-served' | 'served' | 'unchecked'

const PINCODE = /^\d{6}$/

/** Every 6-digit pincode in what staff typed, in order and once each. */
export const parsePincodes = (text: null | string | undefined): string[] =>
  Array.from(new Set((text ?? '').match(/\d+/g)?.filter((token) => PINCODE.test(token)) ?? []))

/** The tokens in what staff typed that are not a 6-digit pincode, so the admin can name them. */
export const invalidPincodeTokens = (text: null | string | undefined): string[] =>
  (text ?? '')
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !PINCODE.test(token))

/** The areas with a name, each with its parsed pincodes. */
export const readDeliveryAreas = (source: DeliveryAreasSource | null | undefined): DeliveryArea[] =>
  (source?.areas ?? []).flatMap((row) => {
    const name = row?.name?.trim()
    return name ? [{ name, pincodes: parsePincodes(row.pincodes) }] : []
  })

export const areaForPincode = (areas: DeliveryArea[], pincode: string): DeliveryArea | null => {
  const wanted = pincode.trim()
  return areas.find((area) => area.pincodes.includes(wanted)) ?? null
}

/**
 * Whether a pincode is served. "unchecked" while the check is off or no area has
 * a pincode yet, so an empty list can never block every order.
 */
export const deliveryCheck = (source: DeliveryAreasSource | null | undefined, pincode: string): DeliveryCheck => {
  const areas = readDeliveryAreas(source)
  if (!source?.enforce || !areas.some((area) => area.pincodes.length > 0)) return 'unchecked'
  return areaForPincode(areas, pincode) ? 'served' : 'not-served'
}

/** Pincodes listed under more than one area, with the areas that list them. */
export const duplicatePincodes = (rows: DeliveryAreaRow[] | null | undefined): { areas: string[]; pincode: string }[] => {
  const seen = new Map<string, string[]>()
  for (const row of rows ?? []) {
    const name = row?.name?.trim() || 'An unnamed area'
    for (const pincode of parsePincodes(row?.pincodes)) {
      seen.set(pincode, [...(seen.get(pincode) ?? []), name])
    }
  }
  return [...seen.entries()].filter(([, areas]) => areas.length > 1).map(([pincode, areas]) => ({ areas, pincode }))
}
