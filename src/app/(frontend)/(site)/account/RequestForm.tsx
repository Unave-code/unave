'use client'

import { Loader2 } from 'lucide-react'
import React, { useActionState, useRef, useState } from 'react'

import {
  AUTH_FIELD_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_INVALID,
  AUTH_LABEL,
} from '@/components/CustomerAuth/styles'
import { Button } from '@/components/ui/button'
import { type FieldErrors, toFieldErrors } from '@/utilities/fieldErrors'
import { type OrderRequestType, orderRequestSchema } from '@/utilities/orderRequest'
import { cn } from '@/utilities/ui'

import { sendOrderRequest, type SendOrderRequestState } from './actions'
import {
  ACCOUNT_REQUEST_CLOSE,
  ACCOUNT_REQUEST_INVALID,
  ACCOUNT_REQUEST_NOT_NOW,
  ACCOUNT_REQUEST_PAUSE_FROM_LABEL,
  ACCOUNT_REQUEST_PAUSE_TO_LABEL,
  ACCOUNT_REQUEST_REASON_HINT,
  ACCOUNT_REQUEST_REASON_LABEL,
  ACCOUNT_REQUEST_SEND,
  ACCOUNT_REQUEST_SENT_BODY,
  ACCOUNT_REQUEST_SENT_HEADING,
  ACCOUNT_SESSION_EXPIRED,
} from './copy'

const INITIAL: SendOrderRequestState = { status: 'idle' }

const SECONDARY =
  'text-ink-600 hover:text-green-800 focus-visible:ring-green-500 inline-flex h-11 items-center rounded-sm text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

/** One labelled field, in the same style as the account and auth forms. */
const Field: React.FC<{
  autoComplete?: string
  error?: string
  hint?: string
  id: string
  label: string
  name: string
  type?: 'date' | 'text'
}> = ({ autoComplete, error, hint, id, label, name, type = 'text' }) => (
  <div className="flex flex-col gap-2">
    <label className={AUTH_LABEL} htmlFor={id}>
      {label}
    </label>
    <input
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      aria-invalid={error ? true : undefined}
      autoComplete={autoComplete}
      className={cn(AUTH_INPUT, error && AUTH_INPUT_INVALID)}
      id={id}
      name={name}
      type={type}
    />
    {error ? (
      <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
        {error}
      </p>
    ) : hint ? (
      <p className="text-ink-600 text-sm leading-6" id={`${id}-hint`}>
        {hint}
      </p>
    ) : null}
  </div>
)

/** The pause or cancel form inside the dialog, and what it says once sent. */
export const RequestForm: React.FC<{
  introId: string
  onClose: () => void
  orderId: number | string
  type: OrderRequestType
}> = ({ introId, onClose, orderId, type }) => {
  const [state, formAction, isPending] = useActionState(sendOrderRequest, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FieldErrors>({})

  /** The browser pass is a courtesy; the server action is the gate. */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!formRef.current) return

    const result = orderRequestSchema.safeParse(
      Object.fromEntries(new FormData(formRef.current)),
    )

    if (!result.success) {
      event.preventDefault()
      setErrors(toFieldErrors(result.error))
      return
    }

    setErrors({})
  }

  const handleInput = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target
    const field = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.name
      : ''

    if (!field) return

    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const errorFor = (name: string): string | undefined =>
    (state.status === 'error' ? state.fieldErrors?.[name] : undefined) ?? errors[name]

  const reasonId = `request-${type}-${orderId}-reason`
  const reasonError = errorFor('reason')

  if (state.status === 'signed-out') {
    return (
      <p className="text-ink-600 mt-6 text-sm leading-6" role="alert">
        {ACCOUNT_SESSION_EXPIRED}
      </p>
    )
  }

  if (state.status === 'done') {
    return (
      <div className="mt-6 flex flex-col items-start gap-6">
        <p className="text-green-800 bg-green-50 border-green-500 rounded-sm border-l-4 p-4 text-sm leading-6" role="status">
          <span className="block font-bold">{ACCOUNT_REQUEST_SENT_HEADING}</span>
          {ACCOUNT_REQUEST_SENT_BODY}
        </p>

        <Button onClick={onClose} type="button">
          {ACCOUNT_REQUEST_CLOSE}
        </Button>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      aria-describedby={introId}
      className="mt-6 flex flex-col gap-5"
      noValidate
      onInput={handleInput}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="orderId" type="hidden" value={String(orderId)} />
      <input name="type" type="hidden" value={type} />

      {state.status === 'error' ? (
        <p className="text-error text-sm font-medium" role="alert">
          {state.message ?? ACCOUNT_REQUEST_INVALID}
        </p>
      ) : null}

      {type === 'pause' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            error={errorFor('from')}
            id={`request-${type}-${orderId}-from`}
            label={ACCOUNT_REQUEST_PAUSE_FROM_LABEL}
            name="from"
            type="date"
          />
          <Field
            error={errorFor('to')}
            id={`request-${type}-${orderId}-to`}
            label={ACCOUNT_REQUEST_PAUSE_TO_LABEL}
            name="to"
            type="date"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className={AUTH_LABEL} htmlFor={reasonId}>
          {ACCOUNT_REQUEST_REASON_LABEL}
        </label>
        <textarea
          aria-describedby={reasonError ? `${reasonId}-error` : `${reasonId}-hint`}
          aria-invalid={reasonError ? true : undefined}
          className={cn(AUTH_INPUT, 'h-auto min-h-24 py-3', reasonError && AUTH_INPUT_INVALID)}
          id={reasonId}
          name="reason"
          rows={3}
        />
        {reasonError ? (
          <p className={AUTH_FIELD_ERROR} id={`${reasonId}-error`} role="alert">
            {reasonError}
          </p>
        ) : (
          <p className="text-ink-600 text-sm leading-6" id={`${reasonId}-hint`}>
            {ACCOUNT_REQUEST_REASON_HINT}
          </p>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Button disabled={isPending} type="submit">
          {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {ACCOUNT_REQUEST_SEND}
        </Button>

        <button className={SECONDARY} onClick={onClose} type="button">
          {ACCOUNT_REQUEST_NOT_NOW}
        </button>
      </div>
    </form>
  )
}
