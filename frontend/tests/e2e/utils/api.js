const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8080/api'

export function uniqueEmail(prefix) {
  const stamp = Date.now()
  return `${prefix}.${stamp}@test.local`
}

export async function registerUser(request, { fullName, email, aadhaarNumber, role, password = 'Password@123' }) {
  const otpGen = await request.post(`${apiBase}/auth/otp/generate`, { data: { aadhaarNumber } })
  if (!otpGen.ok()) throw new Error('OTP generate failed')
  const otpJson = await otpGen.json()
  const otp = otpJson.debugOtp

  const otpVerify = await request.post(`${apiBase}/auth/otp/verify`, { data: { aadhaarNumber, otp } })
  if (!otpVerify.ok()) throw new Error('OTP verify failed')

  const register = await request.post(`${apiBase}/auth/register`, {
    data: { fullName, email, password, aadhaarNumber, role },
  })
  if (!register.ok()) throw new Error('Register failed')
}

export async function login(request, { email, password = 'Password@123' }) {
  const loginResp = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  })
  if (!loginResp.ok()) throw new Error('Login failed')
  const json = await loginResp.json()
  return json.token
}

export async function createFir(request, token, payload) {
  const resp = await request.post(`${apiBase}/citizen/fir`, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`Create FIR failed: ${body}`)
  }
  return resp.json()
}

export async function updateFirStatus(request, token, id, payload) {
  const resp = await request.patch(`${apiBase}/police/fir/${id}`, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`Update FIR failed: ${body}`)
  }
  return resp.json()
}

export async function submitDispute(request, token, id, reason) {
  const resp = await request.post(`${apiBase}/citizen/fir/${id}/dispute`, {
    data: { reason },
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`Dispute failed: ${body}`)
  }
  return resp.json()
}
