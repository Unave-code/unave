import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { CollectionBeforeOperationHook } from 'payload'

/** Videos smaller than this are left alone: re-encoding gains little. */
const MIN_BYTES = 1024 * 1024
/** The longer side of the picture is capped here; phones show no difference. */
const MAX_EDGE = 1280
/** A stuck encode must never hold an admin upload forever. */
const TIMEOUT_MS = 5 * 60 * 1000

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'

const run = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-2000)
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('ffmpeg timed out'))
    }, TIMEOUT_MS)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr}`))
    })
  })

/**
 * Re-encodes a video uploaded through the admin before Payload stores it:
 * H.264 at constant quality (CRF 28), the longer side capped at 1280px, AAC
 * audio at 96 kbps, and the index moved to the front (`+faststart`) so a
 * phone starts playing before the whole file arrives. The result is always an
 * MP4, which every browser plays.
 *
 * It is a best-effort step, never a gate: when ffmpeg is missing, fails, or
 * produces a file no smaller than the original, the original is stored as it
 * came and the reason is logged. ffmpeg comes from the PATH, or from
 * `FFMPEG_PATH`; the production image installs it (see the Dockerfile).
 *
 * Images need no hook: the Media collection's `resizeOptions` and
 * `formatOptions` have Payload's own sharp pipeline shrink and convert them.
 */
export const compressUploadedVideo: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== 'create' && operation !== 'update') return args

  const file = args.req?.file
  if (!file?.mimetype?.startsWith('video/') || file.size < MIN_BYTES) return args
  if (!file.data?.length && !file.tempFilePath) return args

  const logger = args.req.payload.logger
  const dir = await mkdtemp(path.join(os.tmpdir(), 'unave-video-'))
  const input = path.join(dir, 'input')
  const output = path.join(dir, 'output.mp4')

  try {
    await writeFile(input, file.tempFilePath ? await readFile(file.tempFilePath) : file.data)
    await run([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      input,
      '-vf',
      `scale='if(gt(iw,ih),min(${MAX_EDGE},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_EDGE},ih))'`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      output,
    ])

    const compressed = await readFile(output)
    if (compressed.length >= file.size) {
      logger.info(`Video ${file.name}: re-encode was not smaller, keeping the original`)
      return args
    }

    logger.info(
      `Video ${file.name}: ${(file.size / 1e6).toFixed(1)} MB → ${(compressed.length / 1e6).toFixed(1)} MB`,
    )
    file.data = compressed
    file.size = compressed.length
    file.mimetype = 'video/mp4'
    file.name = `${path.parse(file.name).name}.mp4`
    delete file.tempFilePath
  } catch (error) {
    logger.warn(
      `Video ${file.name}: compression skipped, storing the original (${(error as Error).message})`,
    )
  } finally {
    await rm(dir, { force: true, recursive: true })
  }

  return args
}
