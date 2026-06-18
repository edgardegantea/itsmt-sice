import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'

export function useCarreras() {
  return useQuery({
    queryKey: ['carreras'],
    queryFn: admisionApi.getCarreras,
    staleTime: 1000 * 60 * 10, // 10 min — catálogo estático
  })
}
