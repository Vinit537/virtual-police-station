import { test, expect } from '@playwright/test'
import { registerUser, uniqueEmail } from './utils/api'

test('citizen is redirected away from admin routes', async ({ page, request }) => {
  const email = uniqueEmail('citizen')
  await registerUser(request, {
    fullName: 'Citizen Role',
    email,
    aadhaarNumber: '111122223334',
    role: 'CITIZEN',
  })

  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill('Password@123')
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/citizen/)

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/citizen/)
})
