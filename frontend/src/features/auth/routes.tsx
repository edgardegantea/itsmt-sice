import { lazy } from 'react'
import { Route } from 'react-router-dom'

const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))

export const authRoutes = (
  <>
        {/* Públicas */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
  </>
)
