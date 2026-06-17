import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useCargaAcademicaPdf } from '../hooks/useCargaAcademicaPdf'

const selectCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'

export default function CargaAcademicaAdminPage() {
  const { descargar, generando } = useCargaAcademicaPdf()
  const [periodoId, setPeriodoId] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
  })

  const { data: carreras = [] } = useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
  })

  const params: Record<string, string> = {}
  if (periodoId)  params.periodo_id = periodoId
  if (carreraId)  params.carrera_id = carreraId
  if (busqueda)   params.q = busqueda

  const { data: alumnos = [], isLoading } = useQuery({
    queryKey: ['alumnos-carga', params],
    queryFn: () => apiClient.get('/alumnos', { params }).then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : d?.data ?? []) as any[]
    }),
    enabled: !!periodoId,
  })

  const key = (alumnoId: string) => `${alumnoId}-${periodoId}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Carga Académica — PDF</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Genera el Formato de Carga Académica (TecNM-AC-PO-001) por alumno.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo *</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={selectCls}>
            <option value="">— Selecciona —</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
          <select value={carreraId} onChange={e => setCarreraId(e.target.value)} className={selectCls}>
            <option value="">Todas</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">Buscar alumno</label>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre o número de control…"
            className={selectCls}
          />
        </div>
      </div>

      {!periodoId ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
          Selecciona un periodo para listar alumnos.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Cargando alumnos…</div>
      ) : alumnos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
          No se encontraron alumnos con los filtros seleccionados.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Nombre', 'N/C', 'Carrera', 'Semestre', 'Carga Académica PDF'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alumnos.map((a: any) => (
                <tr key={a.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {a.user?.name
                      ?? (a.inscripcion?.aspirante
                          ? `${a.inscripcion.aspirante.apellido_paterno} ${a.inscripcion.aspirante.apellido_materno ?? ''}, ${a.inscripcion.aspirante.nombres}`.trim()
                          : '—')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.numero_control}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{a.carrera?.clave ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.semestre_actual ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => descargar(a.id, periodoId)}
                      disabled={generando === key(a.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primario)' }}
                    >
                      {generando === key(a.id) ? 'Generando…' : 'Descargar PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
