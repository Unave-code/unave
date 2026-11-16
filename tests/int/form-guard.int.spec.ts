/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
  checkFormGuard,
  FORM_MAX_AGE_MS,
  FORM_MIN_FILL_MS,
  issueFormStamp,
} from '@/utilities/formGuard'

const NOW = 1_800_000_000_000

describe('form guard', () => {
  it('passes a stamp drawn a few seconds ago with an empty honeypot', () => {
    const fields = { form_stamp: issueFormStamp(NOW - 5000), website: '' }
    expect(checkFormGuard(fields, { now: NOW })).toBe('ok')
  })

  it('catches a filled honeypot before anything else', () => {
    expect(checkFormGuard({ website: 'http://spam.example' }, { now: NOW })).toBe('honeypot')
    expect(
      checkFormGuard({ website: 'x' }, { now: NOW, requireStamp: false }),
    ).toBe('honeypot')
  })

  it('refuses a post with no stamp, or a forged one', () => {
    expect(checkFormGuard({}, { now: NOW })).toBe('stamp')
    expect(checkFormGuard({ form_stamp: `${NOW - 5000}.forged` }, { now: NOW })).toBe('stamp')

    // A real signature moved onto a different time is still a forgery.
    const [, signature] = issueFormStamp(NOW - 5000).split('.')
    expect(checkFormGuard({ form_stamp: `${NOW - 60_000}.${signature}` }, { now: NOW })).toBe(
      'stamp',
    )
  })

  it('refuses a form sent faster than a person can fill it', () => {
    const fields = { form_stamp: issueFormStamp(NOW - (FORM_MIN_FILL_MS - 100)) }
    expect(checkFormGuard(fields, { now: NOW })).toBe('too-fast')
  })

  it('refuses a stamp older than a day', () => {
    const fields = { form_stamp: issueFormStamp(NOW - FORM_MAX_AGE_MS - 1000) }
    expect(checkFormGuard(fields, { now: NOW })).toBe('expired')
  })

  it('skips the stamp when a form cannot carry one', () => {
    expect(checkFormGuard({}, { now: NOW, requireStamp: false })).toBe('ok')
  })
})
