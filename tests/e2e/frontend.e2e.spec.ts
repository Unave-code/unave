import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('keeps the homepage focused on shopping', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/UNAVE/)
    const pageHeading = page.getByRole('heading', { level: 1 })
    await expect(pageHeading).toHaveCount(1)
    await expect(pageHeading).toHaveText('Good food, cooked in our own kitchen.')
    await expect(page.locator('.hero-carousel').locator('xpath=following::h1[1]')).toHaveText(
      'Good food, cooked in our own kitchen.',
    )
    await expect(
      page.getByText('The 20% offer depends on portion size and product type.'),
    ).toBeVisible()
    const offerAction = page.getByRole('link', { name: 'Ask about the offer' })
    await expect(offerAction).toHaveAttribute('href', '/contact')
    await expect(page.locator('.hero-carousel').getByRole('link')).toHaveCount(0)
    await expect(offerAction.locator('xpath=following::h2[1]')).toHaveText(
      'Browse our current selection',
    )

    for (const heading of ['What makes us different', 'What we cook', 'How it works']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0)
    }

    await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What customers say' })).toHaveCount(0)
    await expect(page.getByText('[Customer quote goes here]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Common questions' })).toBeVisible()
    await expect(page.getByText(/^\d+ meal types? currently available\.$/)).toBeVisible()

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    const tabletWidths = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(tabletWidths.scrollWidth).toBeLessThanOrEqual(tabletWidths.clientWidth)

    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()

    await page.setViewportSize({ width: 375, height: 812 })
    const bannerBox = await page.locator('[data-hero-image-frame]').boundingBox()
    if (!bannerBox) {
      throw new Error('The hero banner has no layout box')
    }
    expect(bannerBox.width / bannerBox.height).toBeCloseTo(3, 1)

    const cards = page.locator('#best-sellers article')
    if (await cards.count()) {
      const card = cards.first()

      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await expect(card).toBeVisible()

        const cardBox = await card.boundingBox()
        const imageBox = await card.locator('a').first().boundingBox()
        if (!cardBox || !imageBox) {
          throw new Error('The featured product card or image has no layout box')
        }

        const imageShare = imageBox.height / cardBox.height
        expect(imageShare).toBeGreaterThan(0.74)
        expect(imageShare).toBeLessThan(0.76)
      }
    } else {
      await expect(
        page.locator('#best-sellers').getByRole('link', { name: 'See every product' }),
      ).toBeVisible()
    }
  })
})
