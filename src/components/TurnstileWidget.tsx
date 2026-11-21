'use client'

import React, { useEffect, useRef } from 'react'

type TurnstileApi = {
  remove: (widgetId: string) => void
  render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading: Promise<TurnstileApi> | null = null

/** One script tag for the whole page, however many forms draw a widget. */
const loadTurnstile = (): Promise<TurnstileApi> => {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading

  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = SCRIPT_SRC
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    script.onerror = () => {
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(script)
  })

  return loading
}

/**
 * The Cloudflare Turnstile check inside a form. Most visitors never see it: it
 * only shows a box when Cloudflare wants an interaction. It writes its token
 * into a hidden `cf-turnstile-response` input inside this container, so a plain
 * HTML form posts it with everything else.
 */
export const TurnstileWidget: React.FC<{ siteKey: string }> = ({ siteKey }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId: string | undefined
    let cancelled = false

    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return
        widgetId = api.render(ref.current, {
          appearance: 'interaction-only',
          sitekey: siteKey,
          size: 'flexible',
          theme: 'light',
        })
      })
      .catch(() => {
        // Blocked or offline: the endpoint answers with the plain error line.
      })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey])

  return <div className="empty:hidden" ref={ref} />
}
