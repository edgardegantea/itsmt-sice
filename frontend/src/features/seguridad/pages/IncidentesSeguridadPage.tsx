import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import { selectCls, mutationError } from '../../academico/pages/tabs/shared'

interface Incidente {
  id: string
  tipo: string
  ip_address?: string
  descripcion?: string
  severidad: 'baja' | 'media' | 'alta' | 'critica'
  estatus: 'abierto' | 'en_revision' | 'cerrado'
  detectado_en: string
  user?: { name: string }
}

const SEVERIDAD_CLS: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-yellow-100 text-yellow-700',
  critica: 'bg-red-100 text-red-700',
}

export default function IncidentesSeguridadPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [estatusFiltro, setEstatusFiltro] = useState('')

  const { data: incidentes } = useQuery<{ data: Incidente[] }>({
    queryKey: ['incidentes-seguridad', estatusFiltro],
    queryFn: () => apiClient.get('/incidentes-seguridad', { params: { estatus: estatusFiltro || undefined } }).then(r => r.data.data),
  })

  const mutActualizar = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) =>
      apiClient.patch(`/incidentes-seguridad/${id}/estatus`, { estatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidentes-seguridad'] })
      toastSuccess('Incidente actualizado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Incidentes de Seguridad</h1>
        <p className="text-sm text-slate-500 mt-0.5">Detección automática de fuerza bruta y otros eventos sospechosos</p>
      </div>

      <select value={estatusFiltro} onChange={e => setEstatusFiltro(e.target.value)} className={`${selectCls} max-w-xs`}>
        <option value="">Todos los estatus</option>
        <option value="abierto">Abiertos</option>
        <option value="en_revision">En revisión</option>
        <option value="cerrado">Cerrados</option>
      </select>

      <div className="space-y-3">
        {(incidentes?.data ?? []).length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Sin incidentes registrados</div>
        )}
        {(incidentes?.data ?? []).map(inc => (
          <div key={inc.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERIDAD_CLS[inc.severidad]}`}>{inc.severidad}</span>
                <span className="text-xs text-slate-400 capitalize">{inc.tipo.replace(/_/g, ' ')}</span>
                <span className="text-xs text-slate-400">· {new Date(inc.detectado_en).toLocaleString()}</span>
              </div>
              <p className="font-medium text-slate-800 mt-0.5">{inc.descripcion ?? 'Sin descripción'}</p>
              <p className="text-xs text-slate-400">IP: {inc.ip_address ?? '—'} {inc.user && `· Usuario: ${inc.user.name}`}</p>
            </div>
            {inc.estatus !== 'cerrado' && (
              <div className="flex gap-2 flex-shrink-0">
                {inc.estatus === 'abierto' && (
                  <button onClick={() => mutActualizar.mutate({ id: inc.id, estatus: 'en_revision' })} className="text-xs text-blue-600 hover:underline">En revisión</button>
                )}
                <button onClick={() => mutActualizar.mutate({ id: inc.id, estatus: 'cerrado' })} className="text-xs text-green-600 hover:underline">Cerrar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
