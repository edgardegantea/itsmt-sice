import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from './routes'
import Toaster from './components/ui/Toaster'
import PdfPreviewModal from './components/ui/PdfPreviewModal'
import ConfiguracionProvider from './components/ConfiguracionProvider'
import PreferenciasAplicador from './components/PreferenciasAplicador'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
