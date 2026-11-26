/**
 * The Turnstile action each protected form sends, safe to import in the browser.
 *
 * The widget stamps its action into the token, and the endpoint checks that the
 * token it gets was made for that form (`confirmHuman` in turnstile.ts), so a
 * token solved on one form cannot be spent on another. Each value is also the
 * scope the endpoint logs under. Cloudflare allows 1–32 letters, digits, "_" or "-".
 */
export const TURNSTILE_ACTIONS = {
  contact: 'enquiry',
  forgot: 'customer_forgot',
  form: 'form_submission',
  login: 'customer_login',
  register: 'customer_register',
  resend: 'customer_resend',
} as const

export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS]
