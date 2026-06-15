import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  admisionApi,
  type ActualizarEstatusPayload,
} from '../services/admision'

export function useAspirantes(filtros: { carrera_id?: string; estatus?: string; page?: number }) {
  return useQuery({
    queryKey: ['aspirantes', filtros],
    queryFn: () => admisionApi.getAspirantes(filtros),
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
    mutationFn: (aspiranteId: string) => admisionApi.inscribir(aspiranteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aspirantes'] }),
  })
}
