import { test, expect } from '@playwright/test'
import { createFir, login, registerUser, submitDispute, uniqueEmail, updateFirStatus } from './utils/api'

test('admin can apply priority override in command centre', async ({ page, request }) => {
  const citizenEmail = uniqueEmail('citizen.admin')
  const adminEmail = uniqueEmail('admin.user')
  const policeEmail = uniqueEmail('police.admin')
  const aadhaar = '121212121212'

  await registerUser(request, {
    fullName: 'Citizen Admin',
    email: citizenEmail,
    aadhaarNumber: aadhaar,
    role: 'CITIZEN',
  })
  await registerUser(request, {
    fullName: 'Admin User',
    email: adminEmail,
    aadhaarNumber: '131313131313',
    role: 'ADMIN',
  })
  await registerUser(request, {
    fullName: 'Officer Admin',
    email: policeEmail,
    aadhaarNumber: '141414141414',
    role: 'POLICE',
  })

  const citizenToken = await login(request, { email: citizenEmail })
  const policeToken = await login(request, { email: policeEmail })

  const fir = await createFir(request, citizenToken, {
    title: 'Admin case',
    description: 'Fraud report for admin flow',
    location: 'Delhi',
    aadhaarNumber: aadhaar,
    ocrExtractedText: '',
    ocrKeywords: 'fraud',
  })

  await updateFirStatus(request, policeToken, fir.id, { status: 'UNDER_REVIEW' })
  await updateFirStatus(request, policeToken, fir.id, { status: 'INVESTIGATING' })
  await submitDispute(request, citizenToken, fir.id, 'Need more investigation')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(adminEmail)
  await page.getByTestId('login-password').fill('Password@123')
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/admin/)
  await page.getByRole('button', { name: 'Disputed Review Watch' }).click()
  await page.getByTestId(`admin-inbox-${fir.id}`).click()

  await page.getByRole('button', { name: 'Interventions' }).click()
  await page.getByTestId('admin-priority-select').selectOption('HIGH')
  await page.getByTestId('admin-priority-reason').fill('Escalated by admin')
  await page.getByTestId('admin-priority-submit').click()

  await expect(page.getByText('Admin intervention saved.')).toBeVisible()
})
