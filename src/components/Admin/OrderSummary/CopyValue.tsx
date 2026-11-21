'use client'

import React, { useState } from 'react'

/**
 * A gateway id as selectable text with a copy button beside it. The text stays
 * selectable, so copying still works where the clipboard API is refused.
 */
export function CopyValue({ label, value }: { label: string; value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }

  return (
    <span className="order-summary__copy">
      <code>{value}</code>
      <button aria-label={`Copy ${label}`} className="order-summary__copy-button" onClick={copy} type="button">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span aria-live="polite" className="order-summary__sr">
        {copied ? `${label} copied` : ''}
      </span>
    </span>
  )
}
