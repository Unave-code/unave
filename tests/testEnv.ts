/**
 * With TEST_DATABASE_URL set (CI, or the throwaway database in
 * docker-compose.test.yml) the integration suites use that database, and every
 * outside service is blanked before .env loads, so a test run can never send
 * real mail, reach Razorpay or Google, or ask Cloudflare. dotenv never
 * overrides a variable that is already set, even to an empty string.
 */
export const applyTestDatabase = (): boolean => {
  const testDatabase = process.env.TEST_DATABASE_URL
  if (!testDatabase) return false

  process.env.DATABASE_URL = testDatabase
  process.env.PAYLOAD_SECRET ||= 'integration-test-secret'
  process.env.NEXT_PUBLIC_SERVER_URL ||= 'http://localhost:3000'

  for (const name of [
    'ZEPTOMAIL_API_KEY',
    'ZEPTOMAIL_API_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'CRON_SECRET',
  ]) {
    process.env[name] = ''
  }
  return true
}
