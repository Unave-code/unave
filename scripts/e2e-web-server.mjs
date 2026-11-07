import { spawn } from 'node:child_process'

/**
 * The Playwright webServer: the dev server with the Razorpay keys blanked.
 *
 * The store suite (spec 0007) is written for an unconfigured deployment: the
 * pay step stops at the gateway and answers with one plain sentence, so the
 * browser tests never depend on a real payment window or on the local .env
 * files carrying test keys. Blanking the keys before Next loads them keeps
 * the store suite deterministic, and normal `pnpm dev` still has the keys.
 */
for (const name of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
  process.env[name] = ''
}

const child = spawn('pnpm', ['dev'], { shell: true, stdio: 'inherit' })

child.on('exit', (code) => process.exit(code ?? 0))
