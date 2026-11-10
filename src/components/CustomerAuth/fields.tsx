import { Mail } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

import {
  AUTH_FIELD_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_INVALID,
  AUTH_INPUT_LEADING,
  AUTH_LABEL,
} from './styles'

export interface TextFieldProps {
  autoComplete?: string
  /** Set by the client form's Zod pass. Announced, and it repaints the field. */
  error?: string
  hint?: string
  id: string
  inputMode?: 'numeric' | 'tel'
  label: string
  name: string
  /** The `required` attribute is semantics and autofill only; Zod is the check. */
  required?: boolean
  type?: 'tel' | 'text'
}

/**
 * A plain text input in the auth screens' style — the name, phone and address
 * fields of the sign-up card. No leading icon, because only the email field has
 * one, and everything else reads as the same quiet column of labelled inputs.
 */
export const AuthTextField: React.FC<TextFieldProps> = ({
  autoComplete,
  error,
  hint,
  id,
  inputMode,
  label,
  name,
  required = false,
  type = 'text',
}) => {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <label className={AUTH_LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className={cn(AUTH_INPUT, error && AUTH_INPUT_INVALID)}
        id={id}
        inputMode={inputMode}
        name={name}
        required={required}
        type={type}
      />
      {hint ? (
        <p className="text-ink-600 text-sm leading-6" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface Props {
  autoComplete: 'email'
  /** Set by the client form's Zod pass. Announced, and it repaints the field. */
  error?: string
  hint?: string
  id: string
  label: string
  name: string
  type?: 'email'
}

/**
 * The email input.
 *
 * A visible label rather than a placeholder, because a placeholder disappears
 * exactly when someone needs it most. The hint and the error are wired through
 * `aria-describedby`, so a screen reader reads them as part of the field, and the
 * error carries its own `role="alert"` so it is announced the moment it appears.
 */
export const AuthField: React.FC<Props> = ({
  autoComplete,
  error,
  hint,
  id,
  label,
  name,
  type = 'email',
}) => {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <label className={AUTH_LABEL} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Mail
          aria-hidden="true"
          className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={cn(AUTH_INPUT, AUTH_INPUT_LEADING, error && AUTH_INPUT_INVALID)}
          id={id}
          name={name}
          required
          type={type}
        />
      </div>
      {hint ? (
        <p className="text-ink-600 text-sm leading-6" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}