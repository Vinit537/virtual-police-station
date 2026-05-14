import { test, expect } from '@playwright/test'
import { registerUser, uniqueEmail } from './utils/api'

test('citizen can file FIR using wizard', async ({ page, request }) => {
  const email = uniqueEmail('citizen.fir')
  const aadhaar = '555566667777'
  await registerUser(request, {
    fullName: 'Citizen Wizard',
    email,
    aadhaarNumber: aadhaar,
    role: 'CITIZEN',
  })

  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill('Password@123')
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/citizen/)
  await page.getByTestId('citizen-file-fir').click()

  await page.getByTestId('wizard-title').fill('Lost wallet')
  await page.getByTestId('wizard-description').fill('Wallet lost near metro station.')
  await page.getByTestId('wizard-next').click()

  await page.getByTestId('wizard-location').fill('Indore')
  await page.getByTestId('wizard-next').click()

  await page.getByTestId('wizard-next').click()

  await page.getByTestId('wizard-aadhaar').fill(aadhaar)
  await page.getByTestId('wizard-next').click()

  await page.getByTestId('wizard-submit').click()
  await expect(page.getByText('FIR Receipt')).toBeVisible()
})
