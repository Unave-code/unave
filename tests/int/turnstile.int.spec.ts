/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  confirmHuman,
  readTurnstileConfig,
  turnstilePassed,
  turnstileSiteKey,
  verifyTurnstile,
} from '@/utilities/turnstile'

const fetchMock = vi.fn()

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status })

const request = (ip?: string) => {
  const headers = new Headers()
  if (ip) headers.set('x-forwarded-for', `${ip}, 10.0.0.1`)
  return { headers, payload: { logger: { info: vi.fn(), warn: vi.fn() } } }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('turnstile, with no keys set', () => {
  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SITE_KEY', '')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
  })

  it('is off and never calls Cloudflare', async () => {
    expect(readTurnstileConfig()).toBeUndefined()
    expect(turnstileSiteKey()).toBeUndefined()
    expect(await verifyTurnstile(undefined, null, 'enquiry')).toBe('off')
    expect(await confirmHuman(request(), undefined, 'enquiry')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays off with only one of the two keys', () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site')
    expect(turnstileSiteKey()).toBeUndefined()
  })
})

describe('turnstile, with both keys set', () => {
  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site-key')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key')
    vi.stubEnv('TURNSTILE_HOSTNAMES', 'unave.in, www.unave.in')
  })

  it('hands the site key to the page', () => {
    expect(turnstileSiteKey()).toBe('site-key')
  })

  it('refuses a post with no token without calling Cloudflare', async () => {
    expect(await verifyTurnstile(undefined, null, 'enquiry')).toBe('missing')
    expect(await verifyTurnstile('', null, 'enquiry')).toBe('missing')
    expect(await confirmHuman(request(), undefined, 'enquiry')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes a token Cloudflare accepts, sending the secret and the first client address', async () => {
    fetchMock.mockResolvedValue(answer({ action: 'enquiry', hostname: 'unave.in', success: true }))

    expect(await confirmHuman(request('203.0.113.9'), 'token-1', 'enquiry')).toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    const sent = init.body as URLSearchParams
    expect(sent.get('secret')).toBe('secret-key')
    expect(sent.get('response')).toBe('token-1')
    expect(sent.get('remoteip')).toBe('203.0.113.9')
  })

  it('refuses a token made on another form or another site', async () => {
    fetchMock.mockResolvedValueOnce(answer({ action: 'customer_login', hostname: 'unave.in', success: true }))
    expect(await verifyTurnstile('token', null, 'enquiry')).toBe('failed')

    fetchMock.mockResolvedValueOnce(answer({ action: 'enquiry', hostname: 'evil.example', success: true }))
    expect(await verifyTurnstile('token', null, 'enquiry')).toBe('failed')

    fetchMock.mockResolvedValueOnce(answer({ action: 'enquiry', hostname: 'WWW.unave.in', success: true }))
    expect(await verifyTurnstile('token', null, 'enquiry')).toBe('ok')
  })

  it('falls back to the server address for the hostname when none are listed', async () => {
    vi.stubEnv('TURNSTILE_HOSTNAMES', '')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3000')
    fetchMock.mockResolvedValueOnce(answer({ action: 'enquiry', hostname: 'localhost', success: true }))
    expect(await verifyTurnstile('token', null, 'enquiry')).toBe('ok')
  })

  it('refuses a token Cloudflare rejects', async () => {
    fetchMock.mockResolvedValue(answer({ 'error-codes': ['invalid-input-response'], success: false }))
    expect(await verifyTurnstile('bad', null, 'enquiry')).toBe('failed')
  })

  it('lets the post through, and logs it, when Cloudflare cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network'))
    const req = request()
    expect(await confirmHuman(req, 'token', 'enquiry')).toBe(true)
    expect(req.payload.logger.warn).toHaveBeenCalledWith({ msg: 'enquiry_turnstile_unavailable' })

    fetchMock.mockResolvedValueOnce(new Response('down', { status: 502 }))
    expect(await verifyTurnstile('token', null, 'enquiry')).toBe('unavailable')
  })

  it('reads only ok, off and unavailable as a pass', () => {
    expect(turnstilePassed('ok')).toBe(true)
    expect(turnstilePassed('off')).toBe(true)
    expect(turnstilePassed('unavailable')).toBe(true)
    expect(turnstilePassed('missing')).toBe(false)
    expect(turnstilePassed('failed')).toBe(false)
  })
})
