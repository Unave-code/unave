import { readFile } from 'node:fs/promises'
import path from 'node:path'

const read = async (name: string): Promise<Uint8Array | null> => {
  try {
    return await readFile(path.join(process.cwd(), 'public', 'brand', name))
  } catch {
    return null
  }
}

/**
 * The brand lockups the downloads carry, read from /public at run time (the
 * Docker image copies /public beside server.js). A missing file only drops the
 * logo, never the download.
 */
export const reportLogos = async () => {
  const [pdf, xlsx] = await Promise.all([read('lockup-horizontal.png'), read('lockup-stacked-green.png')])
  return { pdf, xlsx }
}
