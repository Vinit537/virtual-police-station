import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { Layout } from './ui/Layout'
import { ToastProvider } from './ui/DesignSystem'
import { LoginPage } from './views/LoginPage'
import { RegisterPage } from './views/RegisterPage'
import { CitizenDashboard } from './views/CitizenDashboard'
import { PoliceDashboard } from './views/PoliceDashboard'
import { AdminDashboard } from './views/AdminDashboard'

function GuardedRoute({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={`/${user.role.toLowerCase()}`} replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role.toLowerCase()}`} replace />
}

function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/citizen"
          element={
            <GuardedRoute role="CITIZEN">
              <CitizenDashboard />
            </GuardedRoute>
          }
        />
        <Route
          path="/citizen/cases/:id"
          element={
            <GuardedRoute role="CITIZEN">
              <CitizenDashboard />
            </GuardedRoute>
          }
        />
        <Route
          path="/police"
          element={
            <GuardedRoute role="POLICE">
              <PoliceDashboard />
            </GuardedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <GuardedRoute role="ADMIN">
              <AdminDashboard />
            </GuardedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
