import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../config/apiClient'
import { academicoApi } from './services/academico'

type TipoIa = Parameters<typeof academicoApi.mejorarTextoIa>[1]

export interface DisponibilidadIa {
  habilitada: boolean
  ambito: 'global' | 'carrera' | 'docente' | 'grupo' | 'predeterminado'
  motivo: string | null
}

interface IaValor {
  habilitada: boolean
  motivo: string | null
  ambito: DisponibilidadIa['ambito'] | null
  /** Igual que academicoApi.mejorarTextoIa, pero con la planeación del contexto para que el
   * backend aplique las reglas por grupo/carrera. */
  mejorar: (texto: string, tipo: TipoIa, contexto?: string) => ReturnType<typeof academicoApi.mejorarTextoIa>
}

// Fuera del editor (sin proveedor) la IA se comporta como antes; el backend sigue validando.
const IaContext = createContext<IaValor>({
  habilitada: true, motivo: null, ambito: null,
  mejorar: (texto, tipo, contexto) => academicoApi.mejorarTextoIa(texto, tipo, contexto),
})

/**
 * Consulta si el superadministrador permite el asistente de IA para esta planeación
 * (reglas por institución, carrera, docente o grupo) y lo expone a los botones de IA.
 */
export function IaProvider({ planeacionId, children }: { planeacionId?: string; children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['ia-disponibilidad', planeacionId ?? null],
    queryFn: () => apiClient.get('/ia/disponibilidad', { params: planeacionId ? { planeacion_id: planeacionId } : {} })
      .then(r => r.data.data as DisponibilidadIa),
    staleTime: 60_000,
  })

  const valor = useMemo<IaValor>(() => ({
    // Mientras carga se muestra como activa para no hacer parpadear los botones; si al
    // final está desactivada, el backend de todos modos rechaza la petición.
    habilitada: data?.habilitada ?? true,
    motivo: data?.motivo ?? null,
    ambito: data?.ambito ?? null,
    mejorar: (texto, tipo, contexto) => academicoApi.mejorarTextoIa(texto, tipo, contexto, planeacionId),
  }), [data, planeacionId])

  return <IaContext.Provider value={valor}>{children}</IaContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- el hook va junto a su proveedor
export const useIa = () => useContext(IaContext)

const AMBITO_TEXTO: Record<string, string> = {
  global: 'para toda la institución',
  carrera: 'para tu carrera',
  docente: 'para tu cuenta',
  grupo: 'para este grupo',
}

/** Aviso en el editor cuando el superadministrador desactivó el asistente de IA. */
export function AvisoIaDesactivada() {
  const ia = useIa()
  if (ia.habilitada) return null
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span aria-hidden="true" className="mt-0.5 inline-block w-2 h-2 rounded-full bg-slate-400 shrink-0" />
      <span>
        El asistente de IA está desactivado {AMBITO_TEXTO[ia.ambito ?? ''] ?? ''} por la administración del sistema.
        {ia.motivo && <> Motivo: <em>{ia.motivo}</em></>}
      </span>
    </div>
  )
}
