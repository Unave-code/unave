import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The cache is Next's; here every call runs the lookup, so each test counts its own requests.
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }))

import { placeDeliveryAreas, placeKitchen } from '@/utilities/deliveryAreaPlaces'

/**
 * Areas without a typed pin are placed from OpenStreetMap's Nominatim: by name
 * in Chennai first, then by pincode. A typed pin always wins, and a failed
 * lookup leaves the area off the map rather than breaking the page.
 */

const fetchMock = vi.fn()
const hit = (lat: number, lon: number) => new Response(JSON.stringify([{ lat: String(lat), lon: String(lon) }]))
const none = () => new Response('[]')

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('placeDeliveryAreas', () => {
  it('keeps a typed pin and asks nothing', async () => {
    const [area] = await placeDeliveryAreas([{ name: 'Adyar', pin: { lat: 13, lng: 80.25 }, pincodes: ['600020'] }])
    expect(area!.pin).toEqual({ lat: 13, lng: 80.25 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('places an area by its name in Chennai, as a named client', async () => {
    fetchMock.mockResolvedValueOnce(hit(12.9611, 80.2001))

    const [area] = await placeDeliveryAreas([{ name: 'Madipakkam', pin: null, pincodes: ['600091'] }])

    expect(area!.pin).toEqual({ lat: 12.9611, lng: 80.2001 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('q=Madipakkam%2C+Chennai%2C+Tamil+Nadu')
    expect(String(url)).toContain('countrycodes=in')
    expect(init.headers['User-Agent']).toMatch(/UNAVE/)
  })

  it('falls back to the first pincode when the name finds nothing', async () => {
    fetchMock.mockResolvedValueOnce(none()).mockResolvedValueOnce(hit(12.9678, 80.1955))

    const [area] = await placeDeliveryAreas([{ name: 'Zone 14', pin: null, pincodes: ['600091', '600117'] }])

    expect(area!.pin).toEqual({ lat: 12.9678, lng: 80.1955 })
    expect(String(fetchMock.mock.calls[1]![0])).toContain('postalcode=600091')
  })

  it('leaves the area off the map when the lookup fails', async () => {
    fetchMock.mockResolvedValue(new Response('busy', { status: 429 }))

    const [area] = await placeDeliveryAreas([{ name: 'Adyar', pin: null, pincodes: ['600020'] }])

    expect(area).toEqual({ name: 'Adyar', pin: null, pincodes: ['600020'] })
  })
})

describe('placeKitchen', () => {
  it('keeps a typed pin, else looks up the footer address', async () => {
    expect(await placeKitchen({ lat: 12.9, lng: 80.2 }, 'Perumbakkam, Chennai.')).toEqual({ lat: 12.9, lng: 80.2 })
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValueOnce(hit(12.8946, 80.2034))
    expect(await placeKitchen(null, 'Perumbakkam, Chennai.')).toEqual({ lat: 12.8946, lng: 80.2034 })
    expect(String(fetchMock.mock.calls[0]![0])).toContain('q=Perumbakkam%2C+Chennai&')
  })

  it('has no pin with no address', async () => {
    expect(await placeKitchen(null, '  ')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
