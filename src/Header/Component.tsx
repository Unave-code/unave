import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

export async function Header() {
  // The footer read is the same cached global the footer itself renders from.
  const [headerData, footerData] = await Promise.all([
    getCachedGlobal('header', 1)(),
    getCachedGlobal('footer', 1)(),
  ])

  // No environment read and no cookie read here, so the layout stays statically
  // renderable. The session itself is resolved by the client links after hydration.
  return <HeaderClient data={headerData} fallbackWhatsapp={footerData?.contact?.whatsapp ?? null} />
}
