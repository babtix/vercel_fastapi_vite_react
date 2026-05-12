/**
 * Frontend API integration layer for the FastAPI backend.
 *
 * This module configures an Axios instance with:
 *   - Base URL pointing to the FastAPI server (default: http://localhost:8008)
 *   - Request interceptor injecting the JWT Bearer token from localStorage
 *   - Response interceptor handling 401 Unauthorized by clearing credentials
 *
 * It also exports helpers for streaming fetch calls and static asset URL resolution.
 */

import axios from "axios"

/**
 * Base URL for all API requests.
 * Reads from the VITE_API_URL environment variable set in .env.
 * Falls back to '/api' in production (e.g., Vercel) or http://localhost:8008 locally.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8008")

/**
 * Configured Axios instance for communicating with the FastAPI backend.
 *
 * Typical usage:
 *   import api from "./lib/api"
 *   const res = await api.get("/conversations/")
 *   const res = await api.post("/conversations/", { title, agent_id })
 *
 * The instance automatically attaches the JWT access token to every request.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * Request interceptor: attach JWT token from localStorage on every outgoing request.
 *
 * The token is obtained from /auth/login (OAuth2PasswordRequestForm) and stored
 * in localStorage as "access_token". It is sent as an Authorization: Bearer header.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response interceptor: handle 401 Unauthorized globally.
 *
 * When the FastAPI backend returns 401 (e.g., expired or invalid JWT),
 * this interceptor clears the stored token and redirects to /login.
 * Auth pages (/login, /register) are excluded to avoid redirect loops.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Build a full URL for a backend-served static asset (e.g. agent logos uploaded to /static/logos).
 *
 * FastAPI serves static files via `app.mount("/static", StaticFiles(...))`.
 * This helper prepends the API base URL to relative static paths.
 *
 * @param {string|null} path - The relative asset path (e.g. "/static/logos/agent.png")
 * @returns {string|null} The fully qualified URL, or null if path is falsy.
 */
export const getAssetUrl = (path) => {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${API_BASE_URL}${path}`
}

/**
 * Streaming POST wrapper using native fetch() for SSE-style LLM responses.
 *
 * Used for endpoints that return a text/plain streaming response, such as:
 *   POST /conversations/{id}/chat  → yields token chunks from Ollama/LM Studio
 *
 * Reads the JWT token from localStorage (same source as the Axios interceptor)
 * so all auth logic stays consistent with regular api.* calls.
 *
 * @param {string} path       - Relative path, e.g. "/conversations/123/chat"
 * @param {object} body       - Request body (will be JSON-serialised), e.g. { message: "..." }
 * @param {AbortSignal} signal - AbortController signal for cancellation (stop generation)
 * @returns {Promise<Response>} The raw fetch Response (for ReadableStream access)
 */
export async function streamingFetch(path, body, signal) {
  const token = localStorage.getItem("access_token")
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  return response
}

/**
 * Streaming GET wrapper for authenticated binary downloads.
 *
 * Used for endpoints that return file blobs, such as:
 *   GET /tools/export/{conversation_id}?format=md  → returns Markdown file blob
 *
 * @param {string} path - Relative path with query params, e.g. "/tools/export/123?format=md"
 * @returns {Promise<Response>} Raw fetch Response containing the file blob
 */
export async function streamingGet(path) {
  const token = localStorage.getItem("access_token")
  return fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export { API_BASE_URL }
export default api
