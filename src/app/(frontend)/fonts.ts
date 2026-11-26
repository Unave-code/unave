import { Fraunces, Inter } from 'next/font/google'

/**
 * The two site typefaces: Fraunces sets the headings, Inter the body and UI.
 *
 * Declared once so the root layout and the global 404 (which skips the layout
 * and draws its own <html>) load the same files under the same CSS variables.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
