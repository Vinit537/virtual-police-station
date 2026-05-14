import { useState, useEffect, useCallback } from 'react'
import { http } from '../api/http'

export function extractApiError(err, fallback) {
  return err?.response?.data?.message ?? err?.response?.data?.error ?? fallback
}

/**
 * useFirs - fetches and manages a citizen's FIR list.
 * Returns: { firs, loading, error, reload }
 */
export function useFirs() {
  const [firs, setFirs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await http.get('/citizen/fir')
      setFirs(data)
    } catch (err) {
      setError(extractApiError(err, 'Failed to load FIRs.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { firs, loading, error, reload: load }
}

/**
 * usePoliceFirs - fetches FIRs visible to a police officer.
 * Returns: { firs, loading, error, reload, updateStatus }
 */
export function usePoliceFirs() {
  const [firs, setFirs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await http.get('/police/fir')
      setFirs(data)
    } catch (err) {
      setError(extractApiError(err, 'Failed to load FIR queue.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = useCallback(async (id, status) => {
    await http.patch(`/police/fir/${id}`, { status })
    await load()
  }, [load])

  return { firs, loading, error, reload: load, updateStatus }
}

/**
 * useAdminData - fetches admin analytics, user list, and event log in parallel.
 */
export function useAdminData() {
  const [stats, setStats] = useState({ users: 0, officers: 0, firs: 0, activeCases: 0 })
  const [users, setUsers] = useState([])
  const [firByCategory, setFirByCategory] = useState([])
  const [firByStatus, setFirByStatus] = useState([])
  const [events, setEvents] = useState([])
  const [crimeTrend, setCrimeTrend] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [analyticsRes, usersRes, eventsRes, trendRes] = await Promise.all([
        http.get('/admin/analytics'),
        http.get('/admin/users'),
        http.get('/admin/events'),
        http.get('/admin/crime-trend'),
      ])
      setStats(analyticsRes.data.stats)
      setFirByCategory(analyticsRes.data.firByCategory || [])
      setFirByStatus(analyticsRes.data.firByStatus || [])
      setEvents(eventsRes.data || [])
      setUsers(usersRes.data)
      setCrimeTrend(trendRes.data || [])
    } catch (err) {
      setError(extractApiError(err, 'Failed to load admin data.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { stats, users, firByCategory, firByStatus, events, crimeTrend, loading, error, reload: load }
}

/**
 * useOtp - manages OTP generation and verification flow.
 */
export function useOtp() {
  const [state, setState] = useState({
    generated: false,
    verified: false,
    debugOtp: '',
    verifiedAadhaar: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async (aadhaarNumber) => {
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      setError('Please enter a valid 12-digit Aadhaar number.')
      return false
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await http.post('/auth/otp/generate', { aadhaarNumber })
      setState({ generated: true, verified: false, debugOtp: data.debugOtp, verifiedAadhaar: '' })
      return true
    } catch (err) {
      setError(extractApiError(err, 'Unable to generate OTP.'))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const verify = useCallback(async (aadhaarNumber, otp) => {
    if (!state.generated) { setError('Generate OTP first.'); return false }
    setLoading(true)
    setError('')
    try {
      const { data } = await http.post('/auth/otp/verify', { aadhaarNumber, otp })
      if (!data.verified) {
        setError('OTP is invalid or expired. Please try again.')
        setState((p) => ({ ...p, verified: false, verifiedAadhaar: '' }))
        return false
      }
      setState((p) => ({ ...p, verified: true, verifiedAadhaar: aadhaarNumber }))
      return true
    } catch (err) {
      setError(extractApiError(err, 'Unable to verify OTP.'))
      return false
    } finally {
      setLoading(false)
    }
  }, [state.generated])

  return { ...state, loading, error, generate, verify }
}
