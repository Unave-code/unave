import { permanentRedirect } from 'next/navigation'

/**
 * The template's search looked only through blog posts, so a customer typing
 * "podi" found nothing. Products are searched on the shelf itself, which the
 * header search box now submits to; this keeps old /search links working by
 * carrying the query across (launch audit B2).
 */
type Args = {
  searchParams: Promise<{ q?: string | string[] }>
}

export default async function Page({ searchParams }: Args) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim()

  permanentRedirect(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
}
