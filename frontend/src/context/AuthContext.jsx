import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { http } from '../api/http'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vps_user')
    return raw ? JSON.parse(raw) : null
  })
  const navigate = useNavigate()

  const login = async (email, password) => {
    const { data } = await http.post('/auth/login', { email, password })
    const nextUser = { role: data.role, name: data.name }
    localStorage.setItem('vps_token', data.token)
    localStorage.setItem('vps_user', JSON.stringify(nextUser))
    setUser(nextUser)
    navigate(`/${data.role.toLowerCase()}`)
  }

  const register = async (payload) => {
    const { data } = await http.post('/auth/register', payload)
    const nextUser = { role: data.role, name: data.name }
    localStorage.setItem('vps_token', data.token)
    localStorage.setItem('vps_user', JSON.stringify(nextUser))
    setUser(nextUser)
    navigate(`/${data.role.toLowerCase()}`)
  }

  const logout = () => {
    localStorage.removeItem('vps_token')
    localStorage.removeItem('vps_user')
    setUser(null)
    navigate('/login')
  }

  const value = { user, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
