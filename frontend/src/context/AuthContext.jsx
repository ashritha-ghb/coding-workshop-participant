import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('acme_token'))
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('acme_token')
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [token, logout])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('acme_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }

  const hasRole = (minimum) => {
    const rank = { viewer: 0, contributor: 1, manager: 2, admin: 3 }
    return rank[user?.role] >= rank[minimum]
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
