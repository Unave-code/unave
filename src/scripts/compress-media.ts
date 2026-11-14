/**
 * Recompresses the images already in `public/media`, in place.
 *
 * New uploads are compressed by the Media collection itself (WebP, capped at
 * 2400px). This script is for everything uploaded before that: it rewrites each
 * JPEG, PNG and WebP file in its own format and at its own pixel size, so every
 * filename, URL and width/height the database holds stays true. Only files that
 * shrink by at least 10% are rewritten.
 *
 *   pnpm compress:media            dry run: report what would change, write nothing
 *   pnpm compress:media --write    rewrite the files
 *
 * The database's stored `filesize` is not updated; it only feeds the size shown
 * in the admin's upload details, never a URL or a layout.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp, { type Sharp } from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = path.resolve(dirname, '../../public/media')
const WRITE = process.argv.includes('--write')
const MIN_SAVING = 0.1

const encode = (image: Sharp, ext: string): Sharp | null => {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return image.jpeg({ mozjpeg: true, quality: 80 })
    case '.png':
      /* A palette PNG at high quality: photographs saved as PNG (most banners)
         shrink several times over with dithering hiding the banding. */
      return image.png({ compressionLevel: 9, dither: 1, effort: 10, palette: true, quality: 90 })
    case '.webp':
      return image.webp({ effort: 6, quality: 80 })
    default:
      return null
  }
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`

const main = async () => {
  const names = (await readdir(MEDIA_DIR)).sort()
  let before = 0
  let after = 0
  let changed = 0

  for (const name of names) {
    const file = path.join(MEDIA_DIR, name)
    const ext = path.extname(name).toLowerCase()
    if (!(await stat(file)).isFile()) continue

    const input = await readFile(file)
    const pipeline = encode(sharp(input, { animated: ext === '.webp' }), ext)
    if (!pipeline) continue

    let output: Buffer
    try {
      output = await pipeline.toBuffer()
    } catch (error) {
      console.warn(`skip  ${name}: ${(error as Error).message}`)
      continue
    }

    if (output.length > input.length * (1 - MIN_SAVING)) continue

    before += input.length
    after += output.length
    changed += 1
    console.log(`${WRITE ? 'wrote' : 'would'} ${name}: ${kb(input.length)} → ${kb(output.length)}`)
    if (WRITE) await writeFile(file, output)
  }

  console.log(
    `\n${changed} file(s) ${WRITE ? 'rewritten' : 'would be rewritten'}: ${kb(before)} → ${kb(after)} (saves ${kb(before - after)})`,
  )
  if (!WRITE && changed) console.log('Dry run only. Run again with --write to apply.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
