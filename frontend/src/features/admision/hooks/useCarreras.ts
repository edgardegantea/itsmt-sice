import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import apiClient from '../../../config/apiClient'

export function useCarreras() {
  return useQuery({
    queryKey: ['carreras'],
    queryFn: admisionApi.getCarreras,
    staleTime: 1000 * 60 * 10,
  })
}

type CarreraItem = { id: string; nombre: string; clave: string; activa: boolean }

export function useCarrerasAdmin() {
  return useQuery<CarreraItem[]>({
    queryKey: ['carreras-admin'],
    queryFn: () =>
      apiClient.get('/admin/carreras').then(r => r.data.data as CarreraItem[]),
    staleTime: 1000 * 60 * 10,
  })
}
