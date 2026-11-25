import React from 'react'

import { jsonLdHtml } from '@/utilities/structuredData'

/** One JSON-LD script tag for a page's structured data (see utilities/structuredData). */
export const JsonLd: React.FC<{ data: unknown }> = ({ data }) => (
  <script dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} type="application/ld+json" />
)
