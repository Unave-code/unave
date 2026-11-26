import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { hasStaffRole } from '@/access/isStaff'
import { isSameOriginRequest } from '@/utilities/formPost'
import { checkFormSubmissionIpLimit, getClientIp } from '@/utilities/rateLimit'
import { confirmHuman, TURNSTILE_HEADER } from '@/utilities/turnstile'

/** More fields than any form here has; past this the body is not a form. */
const MAX_FIELDS = 40
const MAX_NAME_LENGTH = 100
const MAX_VALUE_LENGTH = 5000

/**
 * The public door on `form-submissions` (the Form block on CMS pages).
 *
 * The form builder lets anyone create a submission, and each one writes a row
 * and sends an email, so an anonymous create is held to the same rules as the
 * contact form: same origin only, a rate limit per address, Cloudflare Turnstile
 * when its keys are set (the token arrives in a header, since the block posts
 * JSON), and a size cap on what it may store. Staff working in the admin are not limited.
 */
export const guardFormSubmission: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || hasStaffRole(req.user)) return data

  if (!req.headers || !isSameOriginRequest({ headers: req.headers })) {
    req.payload.logger.warn({ msg: 'form_submission_cross_site_rejected' })
    throw new APIError('This form can only be sent from this site.', 403, undefined, true)
  }

  if (checkFormSubmissionIpLimit(getClientIp(req.headers)).limited) {
    throw new APIError(
      'That was a few messages too quickly. Please try again in a little while.',
      429,
      undefined,
      true,
    )
  }

  if (!(await confirmHuman(req, req.headers.get(TURNSTILE_HEADER), 'form_submission'))) {
    throw new APIError(
      'We could not confirm this came from a person. Please try again.',
      403,
      undefined,
      true,
    )
  }

  const rows: unknown = data?.submissionData

  if (rows !== undefined && rows !== null) {
    const valid =
      Array.isArray(rows) &&
      rows.length <= MAX_FIELDS &&
      rows.every(
        (row) =>
          row &&
          typeof row === 'object' &&
          typeof (row as { field?: unknown }).field === 'string' &&
          (row as { field: string }).field.length <= MAX_NAME_LENGTH &&
          String((row as { value?: unknown }).value ?? '').length <= MAX_VALUE_LENGTH,
      )

    if (!valid) {
      throw new APIError('Please shorten your answers and try again.', 400, undefined, true)
    }
  }

  return data
}
