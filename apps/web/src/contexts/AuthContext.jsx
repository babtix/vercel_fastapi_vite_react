import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import api from "../lib/api"

const AuthContext = createContext(null)

/**
 * Decode the payload section of a JWT without verifying the signature.
 * Used exclusively for reading the `exp` claim client-side.
 * @param {string} token - A JWT string
 * @returns {object|null} The decoded payload, or null on failure
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Check whether a JWT has expired by reading its `exp` claim.
 * @param {string} token - A JWT string
 * @returns {boolean} true if the token is expired or unreadable
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true
  return Date.now() >= payload.exp * 1000
}

/**
 * AuthProvider wraps the app and provides authentication state + helpers.
 * It persists the access token in localStorage and fetches the current
 * user profile from /auth/me on mount (if a valid token exists).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("access_token"))
  const [loading, setLoading] = useState(true)

  /**
   * Fetch the currently authenticated user from the backend.
   * If the token is invalid or expired the user is logged out.
   */
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me")
      setUser(res.data)
    } catch {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount or token change, validate the token and fetch the user profile
  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        // Token has expired — clean up and skip the network call
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
        setToken(null)
        setUser(null)
        setLoading(false)
      } else {
        fetchUser()
      }
    } else {
      setLoading(false)
    }
  }, [token, fetchUser])

  /**
   * Log in with username/password. Stores the access token and fetches
   * the user profile from /auth/me.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} The authenticated user object
   */
  const login = useCallback(async (username, password) => {
    const formData = new URLSearchParams()
    formData.append("username", username)
    formData.append("password", password)

    const res = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    const { access_token } = res.data
    localStorage.setItem("access_token", access_token)
    setToken(access_token)

    // Fetch user profile using the new token
    const userRes = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    setUser(userRes.data)

    return userRes.data
  }, [])

  /**
   * Register a new account. Does NOT auto-login — the caller should
   * redirect to /login after a successful registration.
   * @param {string} email
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} The registration response data
   */
  const register = useCallback(async (email, username, password) => {
    const res = await api.post("/auth/register", { email, username, password })
    return res.data
  }, [])

  /**
   * Log out the current user by clearing all stored credentials.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      fetchUser,
      isAdmin: user?.is_admin || false,
      isAuthenticated: !!user,
    }),
    [user, token, loading, login, register, logout, fetchUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access the authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
