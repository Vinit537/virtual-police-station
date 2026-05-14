import { test, expect } from '@playwright/test'
import { createFir, login, registerUser, uniqueEmail, updateFirStatus } from './utils/api'

test('police can resolve a submitted case', async ({ page, request }) => {
  const citizenEmail = uniqueEmail('citizen.police')
  const policeEmail = uniqueEmail('police.user')
  const aadhaar = '999988887777'

  await registerUser(request, {
    fullName: 'Citizen Police',
    email: citizenEmail,
    aadhaarNumber: aadhaar,
    role: 'CITIZEN',
  })
  await registerUser(request, {
    fullName: 'Officer Flow',
    email: policeEmail,
    aadhaarNumber: '999988887778',
    role: 'POLICE',
  })

  const citizenToken = await login(request, { email: citizenEmail })
  const policeToken = await login(request, { email: policeEmail })

  const fir = await createFir(request, citizenToken, {
    title: 'Mobile snatching',
    description: 'Phone snatched near bus stand',
    location: 'Indore',
    aadhaarNumber: aadhaar,
    ocrExtractedText: '',
    ocrKeywords: 'snatching',
  })

  await updateFirStatus(request, policeToken, fir.id, { status: 'UNDER_REVIEW' })
  await updateFirStatus(request, policeToken, fir.id, { status: 'INVESTIGATING' })

  await page.goto('/login')
  await page.getByTestId('login-email').fill(policeEmail)
  await page.getByTestId('login-password').fill('Password@123')
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/police/)
  await page.getByTestId(`police-open-${fir.id}`).click()

  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByTestId('police-resolve-closure').fill('Internal closure note')
  await page.getByTestId('police-resolve-citizen').fill('Case resolved and evidence verified')
  await page.getByTestId('police-resolve-officer').fill('Officer note')
  await page.getByTestId('police-resolve-evidence').check()
  await page.getByTestId('police-resolve-submit').click()

  await expect(page.getByText('Case moved to Awaiting Citizen Acknowledgement.')).toBeVisible()
})
