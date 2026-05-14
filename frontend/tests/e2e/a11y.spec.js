import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { registerUser, uniqueEmail } from './utils/api'

test('login page has no critical a11y issues', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('citizen dashboard has no critical a11y issues', async ({ page, request }) => {
  const email = uniqueEmail('citizen.a11y')
  await registerUser(request, {
    fullName: 'Citizen A11y',
    email,
    aadhaarNumber: '222233334444',
    role: 'CITIZEN',
  })

  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill('Password@123')
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/citizen/)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(seriousViolations).toEqual([])
})
