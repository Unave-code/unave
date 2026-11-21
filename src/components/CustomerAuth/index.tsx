import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_VARIANTS, Cta } from '@/components/Cta'
import { FormGuardFields } from '@/components/FormGuardFields'
import { issueFormStamp } from '@/utilities/formGuard'
import { cn } from '@/utilities/ui'
import { isCustomerSignInConfigured } from '@/utilities/customerSession'
import { turnstileSiteKey } from '@/utilities/turnstile'

import { AuthShell } from './AuthShell'
import { PasswordForm } from './PasswordForm'
import { AuthField } from './fields'
import { GoogleIcon } from './icons'
import { AUTH_INLINE_LINK, AUTH_NOTICE, AUTH_PROBLEM } from './styles'
import {
  CUSTOMER_AUTH_CHOOSE_PASSWORD,
  CUSTOMER_AUTH_COPY,
  CUSTOMER_AUTH_CTA,
  CUSTOMER_AUTH_DIVIDER,
  CUSTOMER_AUTH_EMAIL_LABEL,
  CUSTOMER_AUTH_FORGOT,
  CUSTOMER_AUTH_NAME_LABEL,
  CUSTOMER_AUTH_PASSWORD_LABEL,
  CUSTOMER_AUTH_PHONE_LABEL,
  CUSTOMER_AUTH_PRIVACY,
  CUSTOMER_AUTH_RESEND,
  CUSTOMER_AUTH_UNAVAILABLE,
  customerAuthError,
  customerAuthNotice,
  type CustomerAuthMode,
} from './copy'

interface Props {
  /** Plain code from `?error=`, or undefined on a clean visit. */
  error?: string
  mode: CustomerAuthMode
  /** Plain code from `?registered=`, `?resent=` or `?verified=`. */
  notice?: string
  /** A checked path from `?return=`, carried through the password sign in. */
  returnTo?: string | null
}

/**
 * design.md §6.13: a utility screen, not a campaign page.
 *
 * The password form is the primary action and Google sits under the divider as a
 * secondary one, because the form is the path every visitor can take and the Google
 * button is a shortcut that needs an account they may not have. Two primary buttons
 * in one card would leave neither of them meaning much.
 *
 * Sign in and sign up share the card and the one primary action; they differ in
 * copy, in fields and in where the form posts: sign-in posts to Payload's login,
 * sign-up posts to the register route that creates the account first.
 */
/**
 * The sign-up card's extra fields, in reading order: who the customer is and how
 * the kitchen reaches them. Both are required, because they are the two things
 * the kitchen needs on every order. The delivery address is not here — it is the
 * account page's onboarding form, asked for right after the account exists.
 */
/** The two halves of the switch over the card, labelled with each screen's own action. */
const AUTH_TABS = [
  { href: '/sign-in', label: CUSTOMER_AUTH_COPY['sign-in'].submit, mode: 'sign-in' },
  { href: '/sign-up', label: CUSTOMER_AUTH_COPY['sign-up'].submit, mode: 'sign-up' },
] as const

const SIGN_UP_FIELDS = [
  {
    autoComplete: 'name',
    id: 'signup-name',
    label: CUSTOMER_AUTH_NAME_LABEL,
    name: 'name',
    required: true,
  },
  {
    autoComplete: 'tel',
    id: 'signup-phone',
    inputMode: 'tel' as const,
    label: CUSTOMER_AUTH_PHONE_LABEL,
    name: 'phone',
    required: true,
    type: 'tel' as const,
  },
]

export const CustomerAuth: React.FC<Props> = ({ error, mode, notice, returnTo }) => {
  const copy = CUSTOMER_AUTH_COPY[mode]
  const message = customerAuthError(error)
  const confirmation = customerAuthNotice(notice)
  const configured = isCustomerSignInConfigured()
  const stamp = issueFormStamp()
  const challenge = turnstileSiteKey()

  return (
    <AuthShell>
      {/* Sign in and sign up are two views of one card: a two-part switch
          over the heading says which one is open and moves to the other. */}
      <nav aria-label="Account" className="bg-green-50 grid grid-cols-2 gap-1 rounded-pill p-1">
        {AUTH_TABS.map((tab) => {
          const current = tab.mode === mode
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              className={cn(
                'focus-visible:ring-green-500 inline-flex min-h-11 items-center justify-center rounded-pill text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none',
                current
                  ? 'bg-white text-green-900 shadow-sm'
                  : 'text-green-700 hover:bg-white/60 hover:text-green-900',
              )}
              href={
                returnTo && tab.mode === 'sign-in'
                  ? `${tab.href}?return=${encodeURIComponent(returnTo)}`
                  : tab.href
              }
              key={tab.mode}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <h1 className="mt-7 text-[26px] leading-[1.2] font-extrabold tracking-[-0.01em] text-balance text-green-900 short:mt-4">
        {copy.title}
      </h1>
      <p className="text-body text-ink-600 mt-2 short:text-sm">{copy.intro}</p>

      {confirmation ? (
        <p className={cn(AUTH_NOTICE, 'mt-6 short:mt-4')} role="status">
          {confirmation}
        </p>
      ) : null}

      {message ? (
        <p className={cn(AUTH_PROBLEM, 'mt-6 short:mt-4')} role="alert">
          {message}
        </p>
      ) : null}

      {error === 'unverified' ? (
        <form
          action="/api/customers/resend-verification"
          className="mt-6 short:mt-4 flex flex-col gap-4 short:gap-2"
          method="post"
        >
          <AuthField
            autoComplete="email"
            id="resend-email"
            label={CUSTOMER_AUTH_EMAIL_LABEL}
            name="email"
          />
          <FormGuardFields challenge={challenge} idPrefix="resend" stamp={stamp} />
          <button className={cn(CTA_BASE, CTA_VARIANTS.secondary, 'w-full')} type="submit">
            {CUSTOMER_AUTH_RESEND}
          </button>
        </form>
      ) : null}

      <div className="mt-7 short:mt-3">
        <PasswordForm
          action={mode === 'sign-up' ? '/api/customers/register' : '/api/customers/login'}
          challenge={challenge}
          emailField
          fields={mode === 'sign-up' ? SIGN_UP_FIELDS : undefined}
          idPrefix={mode === 'sign-up' ? 'signup' : 'signin'}
          intent={mode}
          password={{
            action:
              mode === 'sign-in' ? (
                <Link
                  className={cn(AUTH_INLINE_LINK, 'inline-flex min-h-11 items-center text-sm')}
                  href="/forgot-password"
                >
                  {CUSTOMER_AUTH_FORGOT}
                </Link>
              ) : undefined,
            autoComplete: mode === 'sign-up' ? 'new-password' : 'current-password',
            hint: mode === 'sign-up' ? undefined : null,
            label:
              mode === 'sign-up' ? CUSTOMER_AUTH_CHOOSE_PASSWORD : CUSTOMER_AUTH_PASSWORD_LABEL,
          }}
          stamp={stamp}
          submit={copy.submit}
        >
          {mode === 'sign-in' && returnTo ? (
            <input name="return" type="hidden" value={returnTo} />
          ) : null}
        </PasswordForm>
      </div>

      {configured ? (
        <>
          <div className="my-6 flex items-center gap-3 short:my-4">
            <span className="bg-line h-px flex-1" />
            <span className="text-ink-600 text-sm">{CUSTOMER_AUTH_DIVIDER}</span>
            <span className="bg-line h-px flex-1" />
          </div>

          <Cta
            className="w-full"
            href={
              returnTo
                ? `/api/customers/oauth/google?return=${encodeURIComponent(returnTo)}`
                : '/api/customers/oauth/google'
            }
            variant="secondary"
          >
            <GoogleIcon />
            {CUSTOMER_AUTH_CTA}
          </Cta>
        </>
      ) : (
        <p className="text-ink-600 mt-4 text-sm leading-6 short:mt-3">
          {CUSTOMER_AUTH_UNAVAILABLE}
        </p>
      )}

      <p className="text-ink-600 border-line mt-6 border-t pt-5 text-sm leading-6 short:mt-4 short:pt-3">
        {CUSTOMER_AUTH_PRIVACY}
      </p>
    </AuthShell>
  )
}
