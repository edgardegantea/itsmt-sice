import { useQuery } from '@tanstack/react-query'
import apiClient from '../config/apiClient'

export interface PeriodoActivo {
  id: string
  nombre: string
  codigo?: string
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  tipo?: string
  horarios_liberados: boolean
}

/** El periodo académico activo, gestionado globalmente y solo editable por superadmin. */
export function usePeriodoActivo() {
  return useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => apiClient.get('/periodos/activo').then(r => r.data.data as PeriodoActivo),
    staleTime: 1000 * 60 * 10,
  })
}
