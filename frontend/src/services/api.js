import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('acme_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('acme_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
