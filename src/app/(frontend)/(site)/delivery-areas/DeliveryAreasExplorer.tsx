'use client'

import 'leaflet/dist/leaflet.css'
import './delivery-map.css'

import type { Circle, Map as LeafletMap, Marker } from 'leaflet'
import { MapPin } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type { DeliveryArea, MapPin as Pin } from '@/utilities/deliveryArea'
import {
  DELIVERY_MAP_EMPTY,
  DELIVERY_MAP_KITCHEN,
  DELIVERY_MAP_LABEL,
  DELIVERY_MAP_SHOW,
  DELIVERY_MAP_SHOWN,
} from '@/utilities/deliveryAreaCopy'
import { cn } from '@/utilities/ui'

/** Chennai's centre, for a map with no pins yet. */
const CHENNAI: Pin = { lat: 13.0827, lng: 80.2707 }

/** OpenStreetMap's own tiles; attribution is required by its tile policy. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Lucide's utensils glyph, inlined because a Leaflet marker takes an HTML string. */
const KITCHEN_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>'

/** About how far one area reaches, drawn as a soft circle round its pin. */
const AREA_RADIUS_M = 1500

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '"': '&quot;', '&': '&amp;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[c]!)

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The delivery areas as a map and a list side by side (a map above the list on
 * a phone). The list is the content and renders on the server, so the page
 * reads fully without JavaScript; the map is drawn after load, on top of it, as
 * a picture of the same list. Choosing an area in either one shows it in both.
 */
export const DeliveryAreasExplorer: React.FC<{
  areas: DeliveryArea[]
  /** The area a checked pincode belongs to, chosen on load. */
  initial: null | string
  kitchen: null | Pin
}> = ({ areas, initial, kitchen }) => {
  const mapNode = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const markers = useRef(new Map<string, { circle: Circle; marker: Marker }>())
  const [selected, setSelected] = useState<null | string>(initial)
  const [ready, setReady] = useState(false)

  const pinned = areas.filter((area) => area.pin)

  useEffect(() => {
    let cancelled = false
    const node = mapNode.current
    const placed = markers.current
    if (!node) return

    void import('leaflet').then(({ default: L }) => {
      if (cancelled || map.current) return

      const instance = L.map(node, {
        // A page scroll should never turn into a zoom; a click on the map wakes the wheel.
        scrollWheelZoom: false,
        zoomControl: true,
      })
      instance.attributionControl.setPrefix(false)
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(instance)
      instance.on('click focus', () => instance.scrollWheelZoom.enable())
      instance.on('mouseout blur', () => instance.scrollWheelZoom.disable())

      const icon = (active: boolean) =>
        L.divIcon({
          className: '',
          html: `<span class="unave-map-pin${active ? ' is-active' : ''}" aria-hidden="true"></span>`,
          iconAnchor: [14, 14],
          iconSize: [28, 28],
        })

      for (const area of pinned) {
        const at: [number, number] = [area.pin!.lat, area.pin!.lng]
        const circle = L.circle(at, {
          className: 'unave-map-area',
          interactive: false,
          radius: AREA_RADIUS_M,
        }).addTo(instance)
        const marker = L.marker(at, { alt: area.name, icon: icon(area.name === initial), keyboard: true, title: area.name })
          .addTo(instance)
          .bindTooltip(escapeHtml(area.name), { direction: 'top', offset: [0, -14] })
          .on('click', () => setSelected(area.name))
        markers.current.set(area.name, { circle, marker })
      }

      if (kitchen) {
        L.marker([kitchen.lat, kitchen.lng], {
          alt: DELIVERY_MAP_KITCHEN,
          icon: L.divIcon({
            className: '',
            html: `<span class="unave-map-kitchen" aria-hidden="true">${KITCHEN_SVG}</span>`,
            iconAnchor: [18, 18],
            iconSize: [36, 36],
          }),
          keyboard: true,
          title: DELIVERY_MAP_KITCHEN,
          zIndexOffset: 1000,
        })
          .addTo(instance)
          .bindTooltip(DELIVERY_MAP_KITCHEN, { direction: 'top', offset: [0, -18], permanent: true })
      }

      const points = [...pinned.map((area) => area.pin!), ...(kitchen ? [kitchen] : [])]
      if (points.length > 1) {
        instance.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] })
      } else {
        const only = points[0] ?? CHENNAI
        instance.setView([only.lat, only.lng], points.length ? 13 : 11)
      }

      map.current = instance
      setReady(true)
    })

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      placed.clear()
    }
    // The map is built once; the areas come from the server and never change on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the map in step with the chosen area: its pin lifts and the map moves to it.
  useEffect(() => {
    if (!ready || !map.current) return
    void import('leaflet').then(({ default: L }) => {
      for (const [name, { circle, marker }] of markers.current) {
        const active = name === selected
        marker.setIcon(
          L.divIcon({
            className: '',
            html: `<span class="unave-map-pin${active ? ' is-active' : ''}" aria-hidden="true"></span>`,
            iconAnchor: [14, 14],
            iconSize: [28, 28],
          }),
        )
        marker.setZIndexOffset(active ? 500 : 0)
        circle.getElement()?.classList.toggle('is-active', active)
      }
      const chosen = selected ? markers.current.get(selected) : undefined
      if (chosen && map.current) {
        map.current.setView(chosen.marker.getLatLng(), Math.max(map.current.getZoom(), 13), {
          animate: !reducedMotion(),
        })
      }
    })
  }, [ready, selected])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="border-line relative isolate overflow-hidden rounded-2xl border bg-green-50 shadow-sm">
          <div
            aria-label={DELIVERY_MAP_LABEL}
            className="unave-map h-[20rem] w-full sm:h-[26rem] lg:h-[34rem]"
            ref={mapNode}
            role="region"
          />
          {pinned.length === 0 ? (
            <p className="text-ink-600 bg-card/95 absolute inset-x-4 bottom-4 z-[500] rounded-xl p-4 text-sm leading-6 shadow-sm">
              {DELIVERY_MAP_EMPTY}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {areas.map((area) => {
          const active = area.name === selected

          return (
            <li
              className={cn(
                'bg-card rounded-2xl border p-5 transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
                active ? 'border-green-700 shadow-md ring-1 ring-green-700' : 'border-line',
              )}
              key={area.name}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-ink-900 flex min-w-0 items-center gap-2 text-lg font-bold">
                  <MapPin aria-hidden="true" className="size-5 shrink-0 text-green-700" strokeWidth={2} />
                  <span className="min-w-0 break-words">{area.name}</span>
                </h3>

                {area.pin ? (
                  <button
                    aria-pressed={active}
                    className={cn(
                      'rounded-pill -my-1 inline-flex min-h-11 shrink-0 items-center px-4 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
                      active ? 'bg-green-700 text-cream' : 'text-green-700 hover:bg-green-50',
                    )}
                    onClick={() => setSelected(area.name)}
                    type="button"
                  >
                    {active ? DELIVERY_MAP_SHOWN : DELIVERY_MAP_SHOW}
                  </button>
                ) : null}
              </div>

              {area.pincodes.length > 0 ? (
                <ul aria-label={`Pincodes in ${area.name}`} className="mt-3 flex flex-wrap gap-2">
                  {area.pincodes.map((pincode) => (
                    <li
                      className="rounded-pill bg-green-50 px-3 py-1 text-sm font-medium text-green-800 tabular-nums"
                      key={pincode}
                    >
                      {pincode}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
