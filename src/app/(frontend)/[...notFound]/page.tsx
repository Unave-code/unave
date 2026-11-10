import { notFound } from 'next/navigation'
import React from 'react'

/**
 * The catch-all for URLs no route claims.
 *
 * This app has two root layouts — `(frontend)` for the site and `(payload)` for
 * the admin — so no single root not-found boundary can compose, and a URL like
 * `/foo/bar` that matches nothing would otherwise land on Next's own default 404
 * with no brand and no chrome. Routing the miss here first means the notFound()
 * below throws inside the `(frontend)` tree and lands on the branded
 * `(frontend)/not-found.tsx` boundary, still with a real 404 status.
 *
 * Nothing existing changes address: static routes and `/[slug]` are more
 * specific than a catch-all, so pages, products and the admin resolve exactly
 * as before — this only catches what nothing else wanted.
 */
export default function CatchAllNotFound() {
  notFound()
}
