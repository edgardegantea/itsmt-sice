import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useCargaAcademicaPdf } from '../hooks/useCargaAcademicaPdf'

type AlumnoItem = {
  id: string
  numero_control: string
  semestre_actual: number
  carrera?: { nombre: string; clave: string }
  user?: { name: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}

type GrupoItem = {
  id: string
  clave: string
  semestre: number
  alumnos_count: number
  carrera?: { clave: string }
}

const selectCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1)

export default function CargaAcademicaAdminPage() {
  const { descargar, descargarGrupo, generando } = useCargaAcademicaPdf()

  const [periodoId, setPeriodoId]   = useState('')
  const [carreraId, setCarreraId]   = useState('')
  const [semestre,  setSemestre]    = useState('')
  const [grupoId,   setGrupoId]     = useState('')
  const [busqueda,  setBusqueda]    = useState('')

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () =>
      apiClient.get('/admin/periodos').then(
        r => r.data.data as { id: string; nombre: string; activo: boolean }[]
      ),
  })

  const { data: carreras = [] } = useQuery({
    queryKey: ['carreras-select'],
    queryFn: () =>
      apiClient.get('/carreras').then(
        r => r.data.data as { id: string; nombre: string; clave: string }[]
      ),
  })

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-select', periodoId, carreraId, semestre],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (periodoId) p.periodo_id = periodoId
      if (carreraId) p.carrera_id = carreraId
      if (semestre)  p.semestre   = semestre
      return apiClient.get('/grupos', { params: p }).then(
        r => (r.data.data ?? []) as GrupoItem[]
      )
    },
    enabled: !!periodoId,
  })

  // ── Alumnos ────────────────────────────────────────────────────────────────
  const params: Record<string, string> = {}
  if (periodoId) params.periodo_id = periodoId
  if (carreraId) params.carrera_id = carreraId
  if (semestre)  params.semestre   = semestre
  if (grupoId)   params.grupo_id   = grupoId
  if (busqueda)  params.search      = busqueda

  const { data: alumnos = [], isLoading } = useQuery({
    queryKey: ['alumnos-carga', params],
    queryFn: () =>
      apiClient.get('/alumnos', { params }).then(r => {
        const d = r.data.data
        return (Array.isArray(d) ? d : d?.data ?? []) as AlumnoItem[]
      }),
    enabled: !!periodoId,
  })

  // Grupo seleccionado (para el botón de descarga por grupo)
  const grupoSeleccionado = grupos.find(g => g.id === grupoId) ?? null

  const keyAlumno = (alumnoId: string) => `${alumnoId}-${periodoId}`
  const keyGrupo  = (gId: string)      => `grupo-${gId}-${periodoId}`

  const handleReset = () => {
    setCarreraId('')
    setSemestre('')
    setGrupoId('')
    setBusqueda('')
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Carga Académica — PDF</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Genera el Formato de Carga Académica (TecNM-AC-PO-001) por alumno o por grupo completo.
          </p>
        </div>
        {grupoSeleccionado && periodoId && (
          <button
            onClick={() => descargarGrupo(grupoSeleccionado.id, grupoSeleccionado.clave, periodoId)}
            disabled={generando === keyGrupo(grupoSeleccionado.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >
            {generando === keyGrupo(grupoSeleccionado.id) ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                PDF grupo {grupoSeleccionado.clave}
                {grupoSeleccionado.alumnos_count > 0 && (
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                    {grupoSeleccionado.alumnos_count} alumnos
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Periodo */}
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo *</label>
            <select
              value={periodoId}
              onChange={e => { setPeriodoId(e.target.value); setGrupoId('') }}
              className={selectCls}
            >
              <option value="">— Selecciona —</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.activo ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Carrera */}
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select
              value={carreraId}
              onChange={e => { setCarreraId(e.target.value); setGrupoId('') }}
              className={selectCls}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Semestre */}
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestre</label>
            <select
              value={semestre}
              onChange={e => { setSemestre(e.target.value); setGrupoId('') }}
              className={selectCls}
            >
              <option value="">Todos</option>
              {SEMESTRES.map(s => (
                <option key={s} value={String(s)}>{s}°</option>
              ))}
            </select>
          </div>

          {/* Grupo */}
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Grupo
              {grupos.length > 0 && (
                <span className="ml-1 text-slate-400 font-normal">({grupos.length} disponibles)</span>
              )}
            </label>
            <select
              value={grupoId}
              onChange={e => setGrupoId(e.target.value)}
              className={selectCls}
              disabled={!periodoId || grupos.length === 0}
            >
              <option value="">Todos los grupos</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.clave} — {g.semestre}° sem
                  {g.alumnos_count > 0 ? ` (${g.alumnos_count})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Búsqueda */}
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar alumno</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre o número de control…"
                className={`${selectCls} pl-9`}
              />
            </div>
          </div>

          {/* Limpiar filtros */}
          {(carreraId || semestre || grupoId || busqueda) && (
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {!periodoId ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-16 text-center">
          <svg className="mx-auto w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-slate-400">Selecciona un periodo para listar alumnos.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Cargando alumnos…
        </div>
      ) : alumnos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-16 text-center">
          <p className="text-sm text-slate-400">No se encontraron alumnos con los filtros seleccionados.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''}</span>
            {grupoSeleccionado && (
              <span className="text-[#1a3a5c] font-medium">
                Grupo seleccionado: {grupoSeleccionado.clave} — {grupoSeleccionado.semestre}° semestre
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['#', 'Nombre', 'N/C', 'Carrera', 'Sem.', 'Carga Académica PDF'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alumnos.map((a, i) => {
                  const nombre = a.user?.name
                    ?? (a.inscripcion?.aspirante
                        ? `${a.inscripcion.aspirante.apellido_paterno} ${a.inscripcion.aspirante.apellido_materno ?? ''}, ${a.inscripcion.aspirante.nombres}`.trim()
                        : '—')
                  const cargando = generando === keyAlumno(a.id)

                  return (
                    <tr key={a.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{nombre}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.numero_control}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{a.carrera?.clave ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-center">{a.semestre_actual ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => descargar(a.id, periodoId)}
                          disabled={!!generando}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: cargando ? '#6b7280' : 'var(--color-primario)' }}
                        >
                          {cargando ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              Generando…
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              PDF
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
