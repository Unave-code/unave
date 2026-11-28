'use client'

import { Mail, MapPin, Phone, X } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import {
  DELIVERY_AREAS_PATH,
  PINCODE_DIALOG_AREAS_LINK,
  PINCODE_DIALOG_BODY,
  PINCODE_DIALOG_CLOSE,
  PINCODE_DIALOG_HEADING,
} from '@/utilities/deliveryAreaCopy'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

export type KitchenContact = { email: null | string; phone: null | string; whatsapp: null | string }

const ROW =
  'text-ink-900 hover:bg-green-50 focus-visible:ring-green-500 flex min-h-11 items-center gap-3 rounded-sm px-2 text-base font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

/**
 * The alert shown when checkout refuses a pincode, whether the browser caught
 * it or the order endpoint did. A native `<dialog>` opened with `showModal`, so
 * focus moves in and stays in, Escape closes it and the page behind is inert.
 * WhatsApp is the one primary action; the phone and email sit below it.
 */
export const PincodeNotServedDialog: React.FC<{
  contact: KitchenContact
  onClose: () => void
  open: boolean
  pincode: string
}> = ({ contact, onClose, open, pincode }) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : null

  return (
    <dialog
      aria-describedby="pincode-dialog-body"
      aria-labelledby="pincode-dialog-heading"
      className="bg-card text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-green-900/60"
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose()
      }}
      onClose={onClose}
      ref={ref}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span aria-hidden="true" className="bg-gold-100 text-gold-600 grid size-11 shrink-0 place-items-center rounded-full">
            <MapPin className="size-5" strokeWidth={2} />
          </span>
          <button
            aria-label={PINCODE_DIALOG_CLOSE}
            className="text-ink-600 hover:bg-green-50 focus-visible:ring-green-500 -mt-1 -mr-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>

        <h2 className="text-h3 mt-4 text-green-900" id="pincode-dialog-heading">
          {PINCODE_DIALOG_HEADING}
        </h2>
        <p className="text-ink-600 mt-2 text-base leading-7" id="pincode-dialog-body">
          {PINCODE_DIALOG_BODY(pincode)}
        </p>

        {contact.whatsapp ? (
          <a
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'mt-6 w-full')}
            href={whatsappHref(contact.whatsapp, `Hi UNAVE, do you deliver to pincode ${pincode}?`)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsAppIcon className="size-5" />
            {WHATSAPP_CTA_LABEL}
          </a>
        ) : null}

        {phoneHref || contact.email ? (
          <ul className="mt-4 flex flex-col gap-1">
            {phoneHref ? (
              <li>
                <a className={ROW} href={phoneHref}>
                  <Phone aria-hidden="true" className="size-4 text-green-700" strokeWidth={2} />
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li>
                <a className={cn(ROW, 'min-w-0')} href={`mailto:${contact.email}`}>
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-green-700" strokeWidth={2} />
                  <span className="truncate">{contact.email}</span>
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}

        <Link
          className="text-green-700 focus-visible:ring-green-500 mt-4 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
          href={DELIVERY_AREAS_PATH}
        >
          {PINCODE_DIALOG_AREAS_LINK}
        </Link>
      </div>
    </dialog>
  )
}
