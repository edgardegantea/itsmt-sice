import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import apiClient from '../../../config/apiClient'

// Endpoint público — solo carreras activas (para páginas sin autenticación)
export function useCarreras() {
  return useQuery({
    queryKey: ['carreras'],
    queryFn: admisionApi.getCarreras,
    staleTime: 1000 * 60 * 10,
  })
}

// Endpoint admin — todas las carreras, activas e inactivas
export function useCarrerasAdmin() {
  return useQuery({
    queryKey: ['carreras-admin'],
    queryFn: () => apiClient.get('/admin/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string; activa: boolean }[]),
    staleTime: 1000 * 60 * 10,
  })
}
