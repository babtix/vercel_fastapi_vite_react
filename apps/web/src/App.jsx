/**
 * Root application router.
 *
 * Defines public routes (Home, Login, Register), protected dashboard routes
 * wrapped in AppLayout, and an admin-only settings route. Also provides
 * reusable LoadingSpinner, ProtectedRoute, and AdminRoute helpers.
 */

import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./contexts/AuthContext"
import AppLayout from "./components/layout/AppLayout"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Chat from "./pages/Chat"
import Conversations from "./pages/Conversations"
import Account from "./pages/Account"
import Settings from "./pages/Settings"
import NotFound from "./pages/NotFound"

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-background" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAdmin) return <Navigate to="/" replace />
  
  return children
}

export default function App() {

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes with layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="chat/:conversationId" element={<Chat />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="account" element={<Account />} />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
