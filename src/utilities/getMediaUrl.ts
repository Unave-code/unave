/**
 * Processes media resource URL to ensure proper formatting
 * @param url The original URL from the resource
 * @param cacheTag Optional cache tag to append to the URL
 * @returns Properly formatted URL with cache tag if provided
 *
 * Same site Payload media URLs become local paths so Next.js does not fetch
 * private IP addresses through the remote image optimizer.
 */
export const getMediaUrl = (url: string | null | undefined, cacheTag?: string | null): string => {
  if (!url) return ''

  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
  if (serverURL && !url.startsWith('/')) {
    const origin = new URL(serverURL).origin
    const mediaPrefix = `${origin}/api/media/file/`
    if (url.startsWith(mediaPrefix)) {
      url = url.slice(origin.length)
    }
  }

  if (cacheTag && cacheTag !== '') {
    cacheTag = encodeURIComponent(cacheTag)
  }

  return cacheTag ? `${url}?${cacheTag}` : url
}
