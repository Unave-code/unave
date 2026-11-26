import React from 'react'

import type { TurnstileAction } from '@/utilities/turnstileActions'

import { TurnstileWidget } from './TurnstileWidget'

/** Kept in sync with `src/utilities/formGuard.ts`, which is server only. */
const HONEYPOT_FIELD = 'website'
const STAMP_FIELD = 'form_stamp'

/**
 * The hidden half of the form guard: a honeypot a person never sees, the
 * signed fill-time stamp the page was drawn with, and, when the page passes a
 * Turnstile site key (`turnstileSiteKey()`), the Cloudflare check.
 *
 * The honeypot sits off screen rather than `display: none`, because some
 * scripts skip fields the stylesheet hides outright. It is out of the tab order
 * and hidden from assistive technology, and `autoComplete="off"` keeps a
 * browser from filling it for a real person.
 */
export const FormGuardFields: React.FC<{
  challenge?: string
  /** The form's Turnstile action; its endpoint checks the token against it. The widget needs both. */
  challengeAction?: TurnstileAction
  idPrefix: string
  stamp?: string
}> = ({ challenge, challengeAction, idPrefix, stamp }) => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
    >
      <label htmlFor={`${idPrefix}-${HONEYPOT_FIELD}`}>Leave this field empty</label>
      <input
        autoComplete="off"
        id={`${idPrefix}-${HONEYPOT_FIELD}`}
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        type="text"
      />
    </div>
    {stamp ? <input name={STAMP_FIELD} type="hidden" value={stamp} /> : null}
    {challenge && challengeAction ? <TurnstileWidget action={challengeAction} siteKey={challenge} /> : null}
  </>
)
