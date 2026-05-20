import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { http } from '../api/http'

const AuthContext = createContext(null)

function toUser(data, fallback = {}) {
  return {
    role: data.role ?? fallback.role,
    name: data.name ?? fallback.name,
    email: data.email ?? fallback.email ?? '',
    aadhaarNumber: data.aadhaarNumber ?? fallback.aadhaarNumber ?? '',
    createdAt: data.createdAt ?? fallback.createdAt ?? '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vps_user')
    return raw ? JSON.parse(raw) : null
  })
  const navigate = useNavigate()

  const login = async (email, password) => {
    const { data } = await http.post('/auth/login', { email, password })
    const nextUser = toUser(data)
    localStorage.setItem('vps_token', data.token)
    localStorage.setItem('vps_user', JSON.stringify(nextUser))
    setUser(nextUser)
    navigate(`/${data.role.toLowerCase()}`)
  }

  const register = async (payload) => {
    const { data } = await http.post('/auth/register', payload)
    const nextUser = toUser(data, { aadhaarNumber: payload.aadhaarNumber, email: payload.email })
    localStorage.setItem('vps_token', data.token)
    localStorage.setItem('vps_user', JSON.stringify(nextUser))
    setUser(nextUser)
    navigate(`/${data.role.toLowerCase()}`)
  }

  const refreshProfile = async () => {
    const { data } = await http.get('/auth/me')
    const nextUser = toUser(data, user || {})
    localStorage.setItem('vps_user', JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }

  const logout = () => {
    localStorage.removeItem('vps_token')
    localStorage.removeItem('vps_user')
    setUser(null)
    navigate('/login')
  }

  const value = { user, login, register, logout, refreshProfile }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
