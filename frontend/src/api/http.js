import axios from 'axios'

export const http = axios.create({
  baseURL: 'http://localhost:8080/api',
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('vps_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
