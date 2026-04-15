import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef(null)

  const clearAuth = useCallback(() => {
    localStorage.removeItem('acme_token')
    setUser(null)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    window.location.replace('/login')
  }, [clearAuth])

  // Schedule token refresh 5 minutes before expiry
  const scheduleRefresh = useCallback((token) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresIn = (payload.exp * 1000) - Date.now() - 5 * 60 * 1000
      if (expiresIn > 0) {
        refreshTimer.current = setTimeout(async () => {
          try {
            const res = await api.post('/auth/refresh')
            const newToken = res.data.token
            localStorage.setItem('acme_token', newToken)
            setUser(res.data.user)
            scheduleRefresh(newToken)
          } catch {
            clearAuth()
          }
        }, expiresIn)
      }
    } catch {
      // ignore parse errors
    }
  }, [clearAuth])

  // On mount — validate stored token
  useEffect(() => {
    const token = localStorage.getItem('acme_token')
    if (!token) {
      setLoading(false)
      return
    }

    // Check if token is already expired before making a request
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 < Date.now()) {
        clearAuth()
        setLoading(false)
        return
      }
    } catch {
      clearAuth()
      setLoading(false)
      return
    }

    api.get('/auth/me')
      .then(res => {
        setUser(res.data)
        scheduleRefresh(token)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => setLoading(false))

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [clearAuth, scheduleRefresh])

  const login = async (email, password) => {
    // Always clear any existing session first
    clearAuth()

    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    localStorage.setItem('acme_token', token)
    setUser(userData)
    scheduleRefresh(token)
    return userData
  }

  const hasRole = (minimum) => {
    const rank = { viewer: 0, contributor: 1, manager: 2, admin: 3 }
    return rank[user?.role] >= rank[minimum]
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
