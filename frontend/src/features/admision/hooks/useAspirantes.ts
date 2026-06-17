import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  admisionApi,
  type ActualizarEstatusPayload,
} from '../services/admision'

export function useAspirantes(filtros: { carrera_id?: string; periodo_id?: string; estatus?: string; puntaje_min?: number; page?: number }) {
  return useQuery({
    queryKey: ['aspirantes', filtros],
    queryFn: () => admisionApi.getAspirantes(filtros),
    enabled: true,
  })
}

export function useActualizarEstatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ActualizarEstatusPayload }) =>
      admisionApi.actualizarEstatus(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aspirantes'] }),
  })
}

export function useInscribir() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ aspiranteId, tipoIngreso }: { aspiranteId: string; tipoIngreso: string }) =>
      admisionApi.inscribir(aspiranteId, tipoIngreso),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aspirantes'] }),
  })
}
