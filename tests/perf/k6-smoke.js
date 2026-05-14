import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.K6_BASE_URL || 'http://localhost:8080/api'

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
}

function post(path, payload, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return http.post(`${baseUrl}${path}`, JSON.stringify(payload), { headers })
}

function login(email, password) {
  const res = post('/auth/login', { email, password })
  const ok = check(res, { 'login ok': (r) => r.status === 200 })
  if (!ok) throw new Error('Login failed')
  return res.json('token')
}

function registerUser(fullName, email, aadhaar, role) {
  const otpResp = post('/auth/otp/generate', { aadhaarNumber: aadhaar })
  check(otpResp, { 'otp gen ok': (r) => r.status === 200 })
  const otp = otpResp.json('debugOtp')
  const verifyResp = post('/auth/otp/verify', { aadhaarNumber: aadhaar, otp })
  check(verifyResp, { 'otp verify ok': (r) => r.status === 200 })
  const regResp = post('/auth/register', {
    fullName,
    email,
    password: 'Password@123',
    aadhaarNumber: aadhaar,
    role,
  })
  check(regResp, { 'register ok': (r) => r.status === 200 })
}

export function setup() {
  const stamp = Date.now()
  const citizenEmail = `citizen.${stamp}@test.local`
  const policeEmail = `police.${stamp}@test.local`
  const adminEmail = `admin.${stamp}@test.local`

  registerUser('K6 Citizen', citizenEmail, '700011112222', 'CITIZEN')
  registerUser('K6 Police', policeEmail, '700011112223', 'POLICE')
  registerUser('K6 Admin', adminEmail, '700011112224', 'ADMIN')

  const citizenToken = login(citizenEmail, 'Password@123')
  const policeToken = login(policeEmail, 'Password@123')
  const adminToken = login(adminEmail, 'Password@123')

  const firResp = post('/citizen/fir', {
    title: 'Load test FIR',
    description: 'Load test case description',
    location: 'Indore',
    aadhaarNumber: '700011112222',
    ocrExtractedText: '',
    ocrKeywords: 'fraud',
  }, citizenToken)
  check(firResp, { 'fir create ok': (r) => r.status === 200 })

  return { citizenToken, policeToken, adminToken }
}

export default function (data) {
  const loginRes = post('/auth/login', { email: 'unknown@test.local', password: 'wrong' })
  check(loginRes, { 'invalid login rejected': (r) => r.status === 401 })

  const firQueue = http.get(`${baseUrl}/police/fir/queue`, {
    headers: { Authorization: `Bearer ${data.policeToken}` },
  })
  check(firQueue, { 'police queue ok': (r) => r.status === 200 })

  const adminQueue = http.get(`${baseUrl}/admin/command/queue`, {
    headers: { Authorization: `Bearer ${data.adminToken}` },
  })
  check(adminQueue, { 'admin queue ok': (r) => r.status === 200 })

  sleep(1)
}
