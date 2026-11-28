'use client'

import 'leaflet/dist/leaflet.css'
import './delivery-map.css'

import type { Circle, DivIcon, Map as LeafletMap, Marker } from 'leaflet'
import React, { useEffect, useRef, useState } from 'react'

import type { DeliveryArea, MapPin } from '@/utilities/deliveryArea'
import { DELIVERY_MAP_EMPTY, DELIVERY_MAP_KITCHEN, DELIVERY_MAP_LABEL } from '@/utilities/deliveryAreaCopy'

import { DELIVERY_MAP_ID, useDeliveryAreaSelection } from './DeliveryAreasContext'

/** Chennai's centre, for a map with no pins yet. */
const CHENNAI: MapPin = { lat: 13.0827, lng: 80.2707 }

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

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Placed = { circle: Circle; marker: Marker }

/**
 * The delivery areas on a map: a pin and a soft circle for each area, the
 * kitchen as its own marker. Drawn after load (Leaflet needs the browser); the
 * cards below hold the same areas as text, so nothing is lost without it.
 */
export const DeliveryMap: React.FC<{ areas: DeliveryArea[]; kitchen: MapPin | null }> = ({ areas, kitchen }) => {
  const node = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const placed = useRef(new Map<string, Placed>())
  const pinIcon = useRef<((active: boolean) => DivIcon) | null>(null)
  const [ready, setReady] = useState(false)
  const { select, selected } = useDeliveryAreaSelection()

  const pinned = areas.filter((area) => area.pin)

  useEffect(() => {
    let cancelled = false
    const element = node.current
    const markers = placed.current
    if (!element) return

    void import('leaflet').then(({ default: L }) => {
      if (cancelled || map.current) return

      const instance = L.map(element, { scrollWheelZoom: false })
      instance.attributionControl.setPrefix(false)
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(instance)
      // A page scroll never turns into a zoom; a click on the map wakes the wheel.
      instance.on('click focus', () => instance.scrollWheelZoom.enable())
      instance.on('mouseout blur', () => instance.scrollWheelZoom.disable())

      pinIcon.current = (active) =>
        L.divIcon({
          className: '',
          html: `<span class="unave-map-pin${active ? ' is-active' : ''}" aria-hidden="true"></span>`,
          iconAnchor: [14, 14],
          iconSize: [28, 28],
        })

      for (const area of pinned) {
        const at: [number, number] = [area.pin!.lat, area.pin!.lng]
        const circle = L.circle(at, { className: 'unave-map-area', interactive: false, radius: AREA_RADIUS_M }).addTo(
          instance,
        )
        const marker = L.marker(at, { alt: area.name, icon: pinIcon.current(false), keyboard: true, title: area.name })
          .addTo(instance)
          .bindTooltip(escapeHtml(area.name), { direction: 'top', offset: [0, -14] })
          .on('click keypress', () => select(area.name))
        markers.set(area.name, { circle, marker })
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
        instance.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { maxZoom: 14, padding: [48, 48] })
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
      markers.clear()
    }
    // Built once: the areas come from the server and never change on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The chosen area's pin lifts, its circle turns gold, and the map moves to it.
  useEffect(() => {
    const instance = map.current
    const icon = pinIcon.current
    if (!ready || !instance || !icon) return

    for (const [name, { circle, marker }] of placed.current) {
      const active = name === selected
      marker.setIcon(icon(active))
      marker.setZIndexOffset(active ? 500 : 0)
      circle.getElement()?.classList.toggle('is-active', active)
      if (active) marker.openTooltip()
      else marker.closeTooltip()
    }

    const chosen = selected ? placed.current.get(selected) : undefined
    if (chosen) {
      instance.setView(chosen.marker.getLatLng(), Math.max(instance.getZoom(), 13), { animate: !reducedMotion() })
    }
  }, [ready, selected])

  return (
    <div className="relative isolate h-full overflow-hidden rounded-2xl bg-green-800 shadow-xl ring-1 ring-gold-400/25">
      <div
        aria-label={DELIVERY_MAP_LABEL}
        className="unave-map h-[20rem] w-full sm:h-[26rem] lg:h-full lg:min-h-[30rem]"
        id={DELIVERY_MAP_ID}
        ref={node}
        role="region"
      />
      {pinned.length === 0 ? (
        <p className="text-ink-600 bg-card/95 absolute inset-x-4 bottom-4 z-[500] rounded-xl p-4 text-sm leading-6 shadow-sm">
          {DELIVERY_MAP_EMPTY}
        </p>
      ) : null}
    </div>
  )
}
