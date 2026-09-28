import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { admisionApi, type Alumno, type EstatusAlumno } from '../services/admision'
import { useCarrerasAdmin } from '../hooks/useCarreras'
import { useLibroRegistroNcPdf } from '../hooks/useLibroRegistroNcPdf'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'

type PeriodoItem = { id: string; nombre: string; activo: boolean }

const ESTATUS_LABEL: Record<EstatusAlumno, string> = {
  activo:          'Activo',
  baja_temporal:   'Baja temporal',
  baja_definitiva: 'Baja definitiva',
  egresado:        'Egresado',
  titulado:        'Titulado',
}

const ESTATUS_STYLE: Record<EstatusAlumno, string> = {
  activo:          'bg-emerald-100 text-emerald-700',
  baja_temporal:   'bg-yellow-100 text-yellow-700',
  baja_definitiva: 'bg-red-100 text-red-700',
  egresado:        'bg-brand-100 text-brand-700',
  titulado:        'bg-purple-100 text-purple-700',
}

const TIPO_INGRESO_LABEL: Record<string, string> = {
  Licenciatura: 'Licenciatura (nuevo ingreso / reingreso)',
  Traslado:     'Traslado',
  Equivalencia: 'Equivalencia',
  Revalidacion: 'Revalidación',
}

const SELECT_CLS = 'border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 bg-white'

function apellidosNombre(a: Alumno): string {
  const asp = a.inscripcion?.aspirante
  if (!asp) return '—'
  return [asp.apellido_paterno, asp.apellido_materno, ',', asp.nombres]
    .filter(Boolean).join(' ').replace(', ,', ',')
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

export default function LibroRegistroNcPage() {
  const { descargar, generando } = useLibroRegistroNcPdf()
  const { data: carreras = [] } = useCarrerasAdmin()

  const [filtros, setFiltros] = useState({ periodo_id: '', carrera_id: '', tipo_ingreso_registro: '', search: '', page: 1 })
  const [vista, setVista] = useViewMode('libro-registro-nc')
  const [detalle, setDetalle] = useState<Alumno | null>(null)

  const { data: periodos = [] } = useQuery<PeriodoItem[]>({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data),
    staleTime: 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['libro-registro-nc', filtros],
    queryFn: () => admisionApi.getLibroRegistroNc({
      periodo_id:            filtros.periodo_id            || undefined,
      carrera_id:            filtros.carrera_id             || undefined,
      tipo_ingreso_registro: filtros.tipo_ingreso_registro  || undefined,
      search:                filtros.search                || undefined,
      page:                  filtros.page,
    }),
  })

  const alumnos      = data?.alumnos.data       ?? []
  const totalPaginas = data?.alumnos.last_page  ?? 1
  const resumen      = data?.resumen            ?? {}

  // Agrupar la página actual por tipo de ingreso, igual que en el PDF oficial
  const grupos = alumnos.reduce<Record<string, Alumno[]>>((acc, a) => {
    const tipo = a.inscripcion?.tipo_ingreso_registro ?? 'Licenciatura'
    ;(acc[tipo] ??= []).push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Libro de Registro NC</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro histórico e inmutable de números de control (TecNM-AC-PO-001) — incluye alumnos dados de baja.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={vista} onChange={setVista} />
          <button
            onClick={descargar}
            disabled={generando}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-[#234d7a] disabled:opacity-60 transition-colors"
          >
            {generando ? <Spinner /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"/>
              </svg>
            )}
            {generando ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Total en el libro</p>
          <p className="text-2xl font-bold text-slate-800">{data?.total ?? '—'}</p>
        </div>
        {['Licenciatura', 'Traslado', 'Equivalencia', 'Revalidacion'].map(tipo => (
          <div key={tipo} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{TIPO_INGRESO_LABEL[tipo].split(' (')[0]}</p>
            <p className="text-2xl font-bold text-slate-700">{resumen[tipo] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">

        {/* Filtros */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre o número de control…"
              value={filtros.search}
              onChange={e => setFiltros(f => ({ ...f, search: e.target.value, page: 1 }))}
              className="flex-1 min-w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30"
            />
            <select
              value={filtros.periodo_id}
              onChange={e => setFiltros(f => ({ ...f, periodo_id: e.target.value, page: 1 }))}
              className={SELECT_CLS}
            >
              <option value="">Todos los periodos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select
              value={filtros.carrera_id}
              onChange={e => setFiltros(f => ({ ...f, carrera_id: e.target.value, page: 1 }))}
              className={SELECT_CLS}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
            <select
              value={filtros.tipo_ingreso_registro}
              onChange={e => setFiltros(f => ({ ...f, tipo_ingreso_registro: e.target.value, page: 1 }))}
              className={SELECT_CLS}
            >
              <option value="">Todos los tipos de ingreso</option>
              {Object.entries(TIPO_INGRESO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400 text-sm">
            <Spinner /> Cargando libro de registro…
          </div>
        )}

        {!isLoading && alumnos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className="text-sm">Sin registros con los filtros seleccionados.</p>
          </div>
        )}

        {!isLoading && alumnos.length > 0 && (
          <>
            {Object.entries(grupos).map(([tipo, lista]) => (
              <div key={tipo}>
                <div className="px-4 sm:px-6 py-2 bg-brand-600/[0.06] border-b border-brand-600/10">
                  <h3 className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                    {TIPO_INGRESO_LABEL[tipo] ?? tipo} · {lista.length}
                  </h3>
                </div>
                {vista === 'lista' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 sm:px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">N° Control</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Alumno</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">CURP</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Carrera</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Periodo ingreso</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">F. Inscripción</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estatus</th>
                        <th className="text-right px-3 sm:pr-6 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {lista.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="px-4 sm:px-6 py-3 font-mono text-xs font-semibold text-slate-700">{a.numero_control}</td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-sm text-slate-800">{apellidosNombre(a)}</p>
                            <p className="text-xs text-slate-400 sm:hidden">{a.inscripcion?.aspirante?.curp}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-500 hidden sm:table-cell">{a.inscripcion?.aspirante?.curp ?? '—'}</td>
                          <td className="px-3 py-3 hidden md:table-cell">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-600">
                              {a.carrera?.clave ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500 hidden lg:table-cell">{a.periodo_ingreso?.nombre ?? '—'}</td>
                          <td className="px-3 py-3 text-xs text-slate-500 hidden lg:table-cell">
                            {a.inscripcion?.fecha_inscripcion ? new Date(a.inscripcion.fecha_inscripcion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_STYLE[a.estatus]}`}>
                              {ESTATUS_LABEL[a.estatus]}
                            </span>
                          </td>
                          <td className="px-3 sm:pr-6 py-3 text-right">
                            <button onClick={() => setDetalle(a)} className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap">Ver detalle</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
                    {lista.map(a => (
                      <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-slate-800">{apellidosNombre(a)}</p>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_STYLE[a.estatus]}`}>
                            {ESTATUS_LABEL[a.estatus]}
                          </span>
                        </div>
                        <p className="font-mono text-xs font-semibold text-slate-600">{a.numero_control}</p>
                        <p className="text-xs text-slate-500">{a.carrera?.clave ?? '—'} · {a.periodo_ingreso?.nombre ?? '—'}</p>
                        <button onClick={() => setDetalle(a)} className="mt-1 text-xs font-medium text-brand-600 hover:underline self-start">Ver detalle</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Página <span className="font-medium text-slate-600">{filtros.page}</span> de {totalPaginas}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-medium text-slate-600">{data?.total}</span> resultados
                </p>
                <div className="flex gap-1.5 justify-center">
                  <button
                    disabled={filtros.page <= 1}
                    onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={filtros.page >= totalPaginas}
                    onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detalle && (
        <DetailModal
          title={apellidosNombre(detalle)}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Número de control', value: detalle.numero_control },
            { label: 'CURP', value: detalle.inscripcion?.aspirante?.curp },
            { label: 'Carrera', value: detalle.carrera?.clave ? `${detalle.carrera.clave} — ${detalle.carrera.nombre}` : '—' },
            { label: 'Periodo de ingreso', value: detalle.periodo_ingreso?.nombre },
            { label: 'Tipo de ingreso', value: TIPO_INGRESO_LABEL[detalle.inscripcion?.tipo_ingreso_registro ?? ''] ?? detalle.inscripcion?.tipo_ingreso_registro },
            { label: 'Fecha de inscripción', value: detalle.inscripcion?.fecha_inscripcion ? new Date(detalle.inscripcion.fecha_inscripcion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Estatus', value: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_STYLE[detalle.estatus]}`}>{ESTATUS_LABEL[detalle.estatus]}</span> },
          ]}
        />
      )}
    </div>
  )
}
