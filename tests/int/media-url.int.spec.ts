import { afterEach, describe, expect, it } from 'vitest'

import { getMediaUrl } from '@/utilities/getMediaUrl'

const originalServerURL = process.env.NEXT_PUBLIC_SERVER_URL

afterEach(() => {
  if (originalServerURL === undefined) {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_SERVER_URL')
  } else {
    process.env.NEXT_PUBLIC_SERVER_URL = originalServerURL
  }
})

describe('getMediaUrl', () => {
  it('uses a local path for uploaded media from the current site', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

    expect(getMediaUrl('http://localhost:3000/api/media/file/banner.png')).toBe(
      '/api/media/file/banner.png',
    )
  })

  it('keeps external media URLs unchanged', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

    expect(getMediaUrl('https://cdn.example.com/banner.png')).toBe(
      'https://cdn.example.com/banner.png',
    )
  })

  it('keeps local paths and cache tags', () => {
    expect(getMediaUrl('/api/media/file/banner.png', 'banner-v1')).toBe(
      '/api/media/file/banner.png?banner-v1',
    )
  })
})
