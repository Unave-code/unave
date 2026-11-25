import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('about and contact pages', () => {
  test('the about page tells the story and hands over to the kitchen', async ({ page }) => {
    await page.goto(`${BASE}/about`)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Healthy living. Made easy.' }),
    ).toBeVisible()

    await expect(page.locator('main img[src*="indian-meal"]').first()).toBeVisible()
    await expect(page.getByAltText('Cooking together at a home kitchen counter')).toBeVisible()

    await expect(
      page.getByRole('heading', { level: 2, name: 'Why should eating healthy be difficult?' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'What UNAVE means' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'What we bring to you' })).toBeVisible()

    await expect(page.getByRole('link', { name: 'Message us on WhatsApp' }).first()).toBeVisible()
  })

  test('the contact page offers WhatsApp, phone, email and the form', async ({ page }) => {
    await page.goto(`${BASE}/contact`)

    await expect(page.getByRole('heading', { level: 1, name: /Talk to us/ })).toBeVisible()

    // The hero photograph sits behind the copy under its scrim.
    await expect(page.locator('main img[src*="band-cta.jpg"]').first()).toBeVisible()

    // The hero's connect button goes straight to WhatsApp.
    const whatsapp = page.getByRole('link', { name: 'Message us on WhatsApp' }).first()
    await expect(whatsapp).toBeVisible()
    await expect(whatsapp).toHaveAttribute('href', /wa\.me\/\d+/)

    await expect(page.getByRole('heading', { level: 2, name: 'Ways to reach us' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Call the kitchen' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Email' })).toBeVisible()

    // The form is a plain post that works without JavaScript, plus the honeypot.
    await expect(page.getByLabel('Your name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Your message')).toBeVisible()
    await expect(page.locator('input[name="website"]')).toBeHidden()
  })

  test('the form posts without JavaScript and confirms on return', async ({ page }) => {
    await page.goto(`${BASE}/contact`)

    // Leaves one enquiry row behind in the dev database, named so it is easy to spot.
    await page.getByLabel('Your name').fill('E2E Enquiry')
    await page.getByLabel('Phone (optional)').fill('9876543210')
    await page.getByLabel('Email').fill('e2e-enquiry@unave.test')
    await page.getByLabel('Your message').fill('Sent by the automated end-to-end check of the contact form.')

    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page).toHaveURL(/\/contact\?sent=1/)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Thank you — we have it' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send message' })).toHaveCount(0)
  })

  test('the endpoint error lines render on return', async ({ page }) => {
    await page.goto(`${BASE}/contact?error=slow`)

    await expect(
      page.getByText('That was a few messages too quickly. Please try again in a little while.'),
    ).toBeVisible()
  })
})
