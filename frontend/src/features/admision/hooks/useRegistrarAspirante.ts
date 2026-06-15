import { useMutation } from '@tanstack/react-query'
import { admisionApi, type RegistrarAspirantePayload } from '../services/admision'

export function useRegistrarAspirante() {
  return useMutation({
    mutationFn: (payload: RegistrarAspirantePayload) => admisionApi.registrarAspirante(payload),
  })
}
