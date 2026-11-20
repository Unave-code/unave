'use client'

import { X } from 'lucide-react'
import React, { useId, useRef, useState } from 'react'

import type { OrderRequestType } from '@/utilities/orderRequest'

import {
  ACCOUNT_REQUEST_CANCEL,
  ACCOUNT_REQUEST_CANCEL_HEADING,
  ACCOUNT_REQUEST_CANCEL_INTRO,
  ACCOUNT_REQUEST_CLOSE,
  ACCOUNT_REQUEST_OPEN_CANCEL,
  ACCOUNT_REQUEST_OPEN_PAUSE,
  ACCOUNT_REQUEST_PAUSE,
  ACCOUNT_REQUEST_PAUSE_HEADING,
  ACCOUNT_REQUEST_PAUSE_INTRO,
} from './copy'
import { RequestForm } from './RequestForm'

/**
 * The two asks a customer can make about a paid order, each in its own modal
 * (design.md §6.15).
 *
 * A native `<dialog>` rather than a hand built overlay: the browser gives us the
 * focus trap, the Escape key, the inert background and the focus returned to the
 * button afterwards. What it does not give us is the scrim, which lives in
 * `globals.css` as `.request-dialog::backdrop`.
 *
 * The dialog is rendered closed beside its trigger, so nothing is mounted into
 * the document when it is not in use, and the form posts through a server action,
 * so the row keeps working when the dialog is open across a re-render.
 */

const COPY: Record<
  OrderRequestType,
  { heading: string; intro: string; open: string; trigger: string }
> = {
  cancel: {
    heading: ACCOUNT_REQUEST_CANCEL_HEADING,
    intro: ACCOUNT_REQUEST_CANCEL_INTRO,
    open: ACCOUNT_REQUEST_OPEN_CANCEL,
    trigger: ACCOUNT_REQUEST_CANCEL,
  },
  pause: {
    heading: ACCOUNT_REQUEST_PAUSE_HEADING,
    intro: ACCOUNT_REQUEST_PAUSE_INTRO,
    open: ACCOUNT_REQUEST_OPEN_PAUSE,
    trigger: ACCOUNT_REQUEST_PAUSE,
  },
}

const TRIGGER =
  'border-line text-ink-900 hover:bg-green-50 focus-visible:ring-green-500 rounded-pill inline-flex h-11 items-center gap-2 border bg-white px-4 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

const DIALOG =
  'request-dialog border-line m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-2xl border bg-white p-0 text-ink-900 shadow-xl'

const CLOSE_BUTTON =
  'text-ink-600 hover:text-ink-900 focus-visible:ring-green-500 inline-flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

/** A request waiting on the kitchen. Not a control, so it needs no target size. */
const OPEN_PILL =
  'border-gold-300 bg-gold-100 text-green-900 rounded-pill inline-flex h-9 items-center border px-3 text-sm font-semibold'

export const OrderRequestDialog: React.FC<{
  /** The kitchen already has this ask, so the trigger becomes a quiet pill. */
  open: boolean
  orderId: number | string
  type: OrderRequestType
}> = ({ open, orderId, type }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const introId = useId()

  // Bumped on close so the form comes back empty next time it opens.
  const [round, setRound] = useState(0)

  const { heading, intro, open: openLabel, trigger } = COPY[type]

  const close = () => dialogRef.current?.close()

  /** Open, then put the cursor in the first thing worth filling in. */
  const openDialog = () => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()
    dialog.querySelector<HTMLInputElement>('input[name="from"], textarea[name="reason"]')?.focus()
  }

  return (
    <>
      {open ? (
        <span className={OPEN_PILL}>{openLabel}</span>
      ) : (
        <button className={TRIGGER} onClick={openDialog} type="button">
          {trigger}
        </button>
      )}

      <dialog
        aria-labelledby={headingId}
        className={DIALOG}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        onClose={() => setRound((current) => current + 1)}
        ref={dialogRef}
      >
        <div className="p-6 sm:p-8">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-h3" id={headingId}>
                {heading}
              </h2>
              <p className="text-ink-600 mt-2 text-sm leading-6" id={introId}>
                {intro}
              </p>
            </div>

            <button
              aria-label={ACCOUNT_REQUEST_CLOSE}
              className={CLOSE_BUTTON}
              onClick={close}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <RequestForm
            introId={introId}
            key={round}
            onClose={close}
            orderId={orderId}
            type={type}
          />
        </div>
      </dialog>
    </>
  )
}
