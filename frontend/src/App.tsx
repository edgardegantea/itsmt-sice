import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from './routes'
import Toaster from './components/ui/Toaster'
import ConfiguracionProvider from './components/ConfiguracionProvider'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfiguracionProvider />
      <Toaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
