import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'

export function usePeriodoActivo() {
  return useQuery({
    queryKey: ['periodo-activo'],
    queryFn: admisionApi.getPeriodoActivo,
    staleTime: 1000 * 60 * 10,
  })
}
