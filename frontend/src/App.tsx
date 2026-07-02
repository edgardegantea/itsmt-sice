import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from './routes'
import Toaster from './components/ui/Toaster'
import PdfPreviewModal from './components/ui/PdfPreviewModal'
import ConfiguracionProvider from './components/ConfiguracionProvider'
import PreferenciasAplicador from './components/PreferenciasAplicador'
import { useAuthStore } from './store/authStore'
import { authApi } from './features/auth/services/auth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
})

function AuthInitializer() {
  const { token, setAuth } = useAuthStore()

  useEffect(() => {
    if (!token) return
    authApi.me().then(user => {
      setAuth(token, user)
    }).catch(() => {/* token expirado — ProtectedRoute redirigirá */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // sólo al montar

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <ConfiguracionProvider />
      <PreferenciasAplicador />
      <Toaster />
      <PdfPreviewModal />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
