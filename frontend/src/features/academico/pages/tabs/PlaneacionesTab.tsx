import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, type PlaneacionDocente, type EstatusPlaneacion } from '../../services/academico'
import { useAuthStore } from '../../../../store/authStore'
import { selectCls, usePeriodos, Th, EmptyRow, transicionesPlaneacion } from './shared'

const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada_da:   'bg-blue-100 text-blue-700',
  devuelta_da:  'bg-red-100 text-red-700',
  enviada_jc:   'bg-indigo-100 text-indigo-700',
  devuelta_jc:  'bg-red-100 text-red-700',
  liberada:     'bg-green-100 text-green-700',
}

const ESTATUS_LABEL: Record<EstatusPlaneacion, string> = {
  borrador:     'Borrador',
  enviada_da:   'Enviada a Desarrollo Académico',
  devuelta_da:  'Devuelta por Desarrollo Académico',
  enviada_jc:   'Enviada a Jefatura de Carrera',
  devuelta_jc:  'Devuelta por Jefatura de Carrera',
  liberada:     'Liberada',
}

function EstatusBadge({ estatus }: { estatus: EstatusPlaneacion }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus]}`}>
      {ESTATUS_LABEL[estatus]}
    </span>
  )
}

export default function PlaneacionesTab() {
  const roles = useAuthStore(s => s.user?.roles) ?? []
  const navigate = useNavigate()
  const { data: periodos = [] } = usePeriodos()
  const [periodoId, setPeriodoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')

  const params: Record<string, string> = {}
  if (periodoId)    params.periodo_id = periodoId
  if (filtroEstatus) params.estatus   = filtroEstatus

  const { data, isLoading } = useQuery({
    queryKey: ['planeaciones-admin', params],
    queryFn: () => academicoApi.getPlaneaciones(params),
  })

  const planeaciones: PlaneacionDocente[] = data?.data ?? []

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Estatus</label>
          <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            {(Object.keys(ESTATUS_LABEL) as EstatusPlaneacion[]).map(e => (
              <option key={e} value={e}>{ESTATUS_LABEL[e]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Docente</Th><Th>Materia</Th><Th>Grupo</Th><Th>Periodo</Th>
              <Th>Entregada</Th><Th>Estatus</Th><Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <EmptyRow cols={7} msg="Cargando…" />
            ) : planeaciones.length === 0 ? (
              <EmptyRow cols={7} msg="No hay planeaciones." />
            ) : (
              planeaciones.map(p => (
                <tr key={p.id} onClick={() => navigate(`/admin/gestion-academica/planeaciones/${p.id}`)} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.docente?.name}</td>
                  <td className="px-4 py-3 text-slate-700">{p.carga_academica?.materia?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.carga_academica?.grupos?.[0]?.clave ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.periodo?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3"><EstatusBadge estatus={p.estatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-blue-600 whitespace-nowrap">
                      {transicionesPlaneacion(p.estatus, roles).length > 0 ? 'Revisar' : 'Ver detalle'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
