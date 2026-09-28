import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import api from '@/services/api'

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

function getStoredUser() {
  const stored = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function storeAuth(token, keepLoggedIn, user) {
  const storage = keepLoggedIn ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function isAuthError(err) {
  return Boolean(err.response) && (err.response.status === 401 || err.response.status === 403)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = !!user

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
      setIsLoading(false)
    }

    const validate = (retried) => {
      api
        .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => {
          setUser(data.user)
          storeAuth(token, Boolean(localStorage.getItem(TOKEN_KEY)), data.user)
          setIsLoading(false)
        })
        .catch((err) => {
          if (isAuthError(err)) {
            clearAuth()
            setUser(null)
            setIsLoading(false)
            return
          }
          if (!retried) {
            setTimeout(() => validate(true), 4000)
            return
          }
          if (!storedUser) {
            setIsLoading(false)
          }
        })
    }

    validate(false)
  }, [])

  function login(token, keepLoggedIn, userData) {
    storeAuth(token, keepLoggedIn, userData)
    setUser(userData)
  }

  function logout() {
    clearAuth()
    setUser(null)
  }

  function refreshUser() {
    const token = getStoredToken()
    if (!token) return Promise.resolve()
    return api
      .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setUser(data.user)
        storeAuth(token, Boolean(localStorage.getItem(TOKEN_KEY)), data.user)
      })
      .catch(() => {})
  }

  const hasPermission = useCallback(
    (key) => {
      if (!user) return false
      if (user.isSuperAdmin === true) return true
      return user.permissions?.[key] === true
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, isAuthenticated, isLoading, login, logout, refreshUser, hasPermission }),
    [user, isAuthenticated, isLoading, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}