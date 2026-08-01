import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { vinculacionApi, type ServicioSocial } from '../services/vinculacion'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'
import BulkActionBar, { SelectCheckbox, ToggleSelectionButton } from '../../../components/ui/BulkActionBar'

const ESTATUS_COLOR: Record<string, string> = {
  solicitado: 'bg-blue-100 text-blue-800',
  aprobado:   'bg-indigo-100 text-indigo-800',
  rechazado:  'bg-red-100 text-red-800',
  en_curso:   'bg-yellow-100 text-yellow-800',
  acreditado: 'bg-green-100 text-green-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace('_', ' ')}
    </span>
  )
}

const TRANSICIONES: Record<string, { label: string; to: string }[]> = {
  solicitado: [
    { label: 'Aprobar', to: 'aprobado' },
    { label: 'Rechazar', to: 'rechazado' },
  ],
  aprobado: [{ label: 'Iniciar', to: 'en_curso' }],
  en_curso:  [{ label: 'Acreditar', to: 'acreditado' }],
}

export default function ServicioSocialAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [vista, setVista] = useViewMode('servicio-social')
  const [detalle, setDetalle] = useState<ServicioSocial | null>(null)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const toggleSel = (id: string) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const { data: carreras = [] } = useQuery<{ id: string; nombre: string; clave: string }[]>({
    queryKey: ['carreras-select'],
    queryFn:  () => apiClient.get('/carreras').then(r => r.data.data?.data ?? r.data.data),
  })

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus    = filtroEstatus
  if (filtroCarrera) params.carrera_id = filtroCarrera

  const { data, isLoading } = useQuery({
    queryKey: ['servicio-social-admin', params],
    queryFn:  () => vinculacionApi.getServicioSocial(Object.keys(params).length ? params : undefined),
  })

  const mutEstatus = useMutation({
    mutationFn: ({ id, estatus, horas }: { id: string; estatus: string; horas?: number }) =>
      vinculacionApi.actualizarEstatusServicioSocial(id, {
        estatus: estatus as ServicioSocial['estatus'],
        horas_acumuladas: horas,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicio-social-admin'] })
      setActualizando(null)
    },
  })

  const mutEstatusBulk = useMutation({
    mutationFn: (to: string) => Promise.allSettled(
      [...seleccionados].map(id => vinculacionApi.actualizarEstatusServicioSocial(id, {
        estatus: to as ServicioSocial['estatus'],
        horas_acumuladas: to === 'acreditado' ? 480 : undefined,
      }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicio-social-admin'] })
      setSeleccionados(new Set())
      setModoSeleccion(false)
    },
  })

  const registros: ServicioSocial[] = data?.data ?? data ?? []
  const estatusesSeleccion = new Set(registros.filter(r => seleccionados.has(r.id)).map(r => r.estatus))
  const transicionesBulk = estatusesSeleccion.size === 1 ? (TRANSICIONES[[...estatusesSeleccion][0]] ?? []) : []

  function AccionesTransicion({ r }: { r: ServicioSocial }) {
    const transiciones = TRANSICIONES[r.estatus] ?? []
    return (
      <div className="flex gap-2 flex-wrap">
        {transiciones.map(t => (
          <button
            key={t.to}
            disabled={mutEstatus.isPending && actualizando === r.id}
            onClick={() => {
              setActualizando(r.id)
              const horas = t.to === 'acreditado' ? 480 : undefined
              mutEstatus.mutate({ id: r.id, estatus: t.to, horas })
            }}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-700 text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Servicio Social</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solicitudes y seguimiento de Servicio Social (TecNM-PO-004).</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleSelectionButton active={modoSeleccion} onClick={() => { setModoSeleccion(v => !v); setSeleccionados(new Set()) }} />
          <ViewToggle value={vista} onChange={setVista} />
        </div>
      </div>

      {modoSeleccion && seleccionados.size > 0 && (
        <BulkActionBar count={seleccionados.size} onCancel={() => { setSeleccionados(new Set()); setModoSeleccion(false) }}>
          {estatusesSeleccion.size > 1 ? (
            <span className="text-xs text-slate-300">Selecciona registros con el mismo estatus para aplicar una acción en lote.</span>
          ) : transicionesBulk.length === 0 ? (
            <span className="text-xs text-slate-300">Sin acciones disponibles para este estatus.</span>
          ) : (
            transicionesBulk.map(t => (
              <button
                key={t.to}
                onClick={() => mutEstatusBulk.mutate(t.to)}
                disabled={mutEstatusBulk.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {t.label}
              </button>
            ))
          )}
        </BulkActionBar>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
        >
          <option value="">Todos los estatus</option>
          <option value="solicitado">Solicitado</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
          <option value="en_curso">En curso</option>
          <option value="acreditado">Acreditado</option>
        </select>

        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Listado */}
      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : registros.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay registros.</p>
      ) : vista === 'lista' ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {modoSeleccion && <th className="w-8" />}
                {['Alumno', 'NC', 'Empresa', 'Estatus', 'Horas', 'Créditos', 'Acciones', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.map((r: ServicioSocial) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  {modoSeleccion && <td className="pl-4"><SelectCheckbox checked={seleccionados.has(r.id)} onChange={() => toggleSel(r.id)} /></td>}
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.alumno?.user?.name ?? '—'}
                    {r.alumno?.carrera && (
                      <div className="text-xs text-slate-400">{r.alumno.carrera.nombre}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.alumno?.numero_control ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.empresa}</td>
                  <td className="px-4 py-3"><Badge estatus={r.estatus} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.horas_acumuladas ?? 0}h</td>
                  <td className="px-4 py-3 text-slate-600">{r.creditos_otorgados ?? 0}</td>
                  <td className="px-4 py-3"><AccionesTransicion r={r} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetalle(r)} className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {registros.map((r: ServicioSocial) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {modoSeleccion && <SelectCheckbox checked={seleccionados.has(r.id)} onChange={() => toggleSel(r.id)} />}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{r.alumno?.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.alumno?.numero_control ?? '—'}</p>
                  </div>
                </div>
                <Badge estatus={r.estatus} />
              </div>
              <p className="text-sm text-slate-600 truncate">{r.empresa}</p>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>{r.horas_acumuladas ?? 0}h acumuladas</span>
                <span>{r.creditos_otorgados ?? 0} créditos</span>
              </div>
              <AccionesTransicion r={r} />
              <button onClick={() => setDetalle(r)} className="mt-1 text-xs font-medium text-blue-600 hover:underline self-start">Ver detalle</button>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <DetailModal
          title={detalle.alumno?.user?.name ?? 'Servicio social'}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Número de control', value: detalle.alumno?.numero_control },
            { label: 'Carrera', value: detalle.alumno?.carrera?.nombre },
            { label: 'Empresa', value: detalle.empresa },
            { label: 'Responsable', value: detalle.responsable },
            { label: 'Estatus', value: <Badge estatus={detalle.estatus} /> },
            { label: 'Fecha de inicio', value: detalle.fecha_inicio },
            { label: 'Fecha de fin', value: detalle.fecha_fin },
            { label: 'Horas acumuladas', value: `${detalle.horas_acumuladas ?? 0}h` },
            { label: 'Nivel de desempeño', value: detalle.nivel_desempeno },
            { label: 'Créditos otorgados', value: detalle.creditos_otorgados },
          ]}
          footer={<AccionesTransicion r={detalle} />}
        />
      )}
    </div>
  )
}
