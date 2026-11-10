'use client'

import { useState, type FormEvent } from 'react'

import {
  CART_ADDED,
  CART_ADD_FAILED,
  CART_ALREADY_IN,
  CART_FULL,
} from '@/utilities/cartCopy'
import {
  CART_EVENT,
  CART_MAX_LINES,
  readCartFromHeaders,
  sameCartLine,
  type CartLineIdentity,
} from '@/utilities/cart'

/**
 * Adding one line to the cart from a POST form (spec 0007, AC-2).
 *
 * The one behaviour behind every Add to cart control, the card's button and the
 * product page's panel alike. The form still posts on its own without
 * JavaScript, so the control always adds a line. With JavaScript this runs
 * first: it reads the cart cookie, refuses a line that is already there or a
 * cart that is full in words, posts with fetch, dispatches the browser event the
 * header count listens for, and confirms in one polite line.
 *
 * A one-time product (`options.oneTime`) plays by the quantity rules: adding
 * what is already in the cart is not a duplicate — the endpoint bumps the
 * quantity — so the pre-checks stand aside and let the post through. The
 * header count sums quantities, so the number rises with every bump.
 *
 * The browser never sends a price or a day count: the endpoint resolves the
 * product slug and the duration label against the live record.
 */
export const useAddToCart = (line: CartLineIdentity, options?: { oneTime?: boolean }) => {
  const [message, setMessage] = useState<null | string>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return

    event.preventDefault()

    const cart = readCartFromHeaders(document.cookie)
    const alreadyIn = cart.some((existing) => sameCartLine(existing, line))

    // A one-time product already in the cart is a quantity bump, not a
    // refusal — and a bump adds no line, so the full-cart check waits too.
    if (!(options?.oneTime && alreadyIn)) {
      if (alreadyIn) {
        setMessage(CART_ALREADY_IN)
        return
      }

      if (cart.length >= CART_MAX_LINES) {
        setMessage(CART_FULL)
        return
      }
    }

    setPending(true)
    setMessage(null)

    try {
      const answer = await fetch(event.currentTarget.action, {
        body: new FormData(event.currentTarget),
        credentials: 'same-origin',
        method: 'POST',
      })

      // The route redirects on every outcome. A refusal carries a notice code
      // and is more honest on the cart page, where the whole basket is visible.
      if (answer.url) {
        const final = new URL(answer.url)

        if (final.searchParams.get('notice')) {
          window.location.assign(answer.url)
          return
        }
      }

      window.dispatchEvent(new Event(CART_EVENT))
      setMessage(CART_ADDED)
    } catch {
      setMessage(CART_ADD_FAILED)
    } finally {
      setPending(false)
    }
  }

  return { message, onSubmit, pending }
}
