import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test('coach uploads, reviews and approves outreach end to end', async ({ page, request }) => {
  const csv = await (await request.get('/api/v1/sample-data.csv')).body()

  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Upload student records' }),
  ).toBeVisible()
  await expectAccessible(page)

  await page.getByLabel('Your name').first().fill('Coach E2E')
  await page.getByRole('button', { name: 'Save' }).first().click()

  await page
    .getByLabel(/Choose a CSV file/)
    .setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: csv })
  await expect(page.getByText('All required columns found. Ready to run.')).toBeVisible()
  await page.getByRole('button', { name: 'Run My Path' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Review queue' })).toBeVisible()
  await expect(page.getByText(/Showing 25 of 25 flagged students/)).toBeVisible()
  await expectAccessible(page)

  await page
    .getByRole('list', { name: /Flagged students/ })
    .getByRole('link')
    .first()
    .click()
  const heading = page.getByRole('heading', { level: 2 })
  await expect(heading).toBeFocused()
  await expect(page.getByRole('region', { name: /was flagged/ })).toContainText('Drop date')
  await expectAccessible(page)

  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByText(/Nothing was sent to the student/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeFocused()

  await page.goto('/summary')
  await expect(page.getByRole('table', { name: 'Students by barrier and status' })).toBeVisible()
  await expectAccessible(page)
})

test('help page is accessible', async ({ page }) => {
  await page.goto('/help')
  await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible()
  await expectAccessible(page)
})

for (const path of ['/', '/help', '/queue', '/summary']) {
  test(`no horizontal scrolling on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
