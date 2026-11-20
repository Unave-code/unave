'use client'

import React, { useEffect } from 'react'

import { defaultTheme } from './ThemeSelector/types'

/**
 * The site is light-only: no OS preference, no stored preference, no toggle.
 * The admin panel keeps its own theming through Payload's admin UI.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', defaultTheme)
  }, [])

  return <>{children}</>
}
