import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import { useAspirantes } from '../hooks/useAspirantes'
import { useListaAceptadosPorCarreraPdf } from '../hooks/useListaAceptadosPorCarreraPdf'
import { useListaAceptadosPdf } from '../hooks/useListaAceptadosPdf'
import { useInscripcionPdf, type TipoInscripcionPdf } from '../hooks/useInscripcionPdf'
import EstatusModal from '../components/EstatusModal'
import InscribirModal from '../components/InscribirModal'
import EditarAspiranteModal from '../components/EditarAspiranteModal'
import Badge from '../../../components/ui/Badge'
import { useToastStore } from '../../../store/toastStore'
import type { Aspirante } from '../services/admision'

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

// ── Fila expandible ───────────────────────────────────────────────────────────
function FilaAspirante({
  asp, expanded, onToggle, onEditar, onEstatus, onInscribir, onDoc, generandoPdf,
}: {
  asp: Aspirante
  expanded: boolean
  onToggle: () => void
  onEditar: () => void
  onEstatus: () => void
  onInscribir: () => void
  onDoc: (tipo: TipoInscripcionPdf) => void
  generandoPdf: TipoInscripcionPdf | null
}) {
  const docs: { tipo: TipoInscripcionPdf; label: string; icon: string }[] = [
    { tipo: 'solicitud',             label: 'Solicitud de inscripción', icon: '📋' },
    { tipo: 'carta-compromiso',      label: 'Carta compromiso',         icon: '✍️' },
    { tipo: 'carta-compromiso-docs', label: 'Carta compromiso docs',    icon: '📄' },
    { tipo: 'contrato',              label: 'Contrato estudiante',      icon: '📝' },
  ]

  const nombreCompleto = [asp.apellido_paterno, asp.apellido_materno, ',', asp.nombres]
    .filter(Boolean).join(' ').replace(', ,', ',')

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer select-none transition-colors ${
          expanded ? 'bg-[#1a3a5c]/10' : 'hover:bg-blue-50/60'
        }`}
      >
        <td className={`pl-4 pr-2 py-3.5 w-8 border-l-4 ${expanded ? 'border-[#1a3a5c]' : 'border-transparent'}`}>
          <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90 text-[#1a3a5c]' : 'text-slate-400'}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
          </svg>
        </td>
        <td className="px-3 py-3.5">
          <p className={`font-medium text-sm ${expanded ? 'text-[#1a3a5c]' : 'text-slate-800'}`}>{nombreCompleto}</p>
          <p className="text-xs text-slate-400 mt-0.5">{asp.email}</p>
        </td>
        <td className="px-3 py-3.5 hidden lg:table-cell">
          <span className="font-mono text-xs text-slate-500">{asp.curp}</span>
        </td>
        <td className="px-3 py-3.5 hidden md:table-cell">
          <span className="text-xs text-slate-500 capitalize">{asp.turno_preferido}</span>
        </td>
        <td className="px-3 py-3.5 hidden md:table-cell">
          {asp.puntaje_exani != null
            ? <span className="text-xs font-semibold text-slate-700">{asp.puntaje_exani} pts</span>
            : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className="px-3 py-3.5 pr-5 text-right">
          <Badge value={asp.estatus} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#1a3a5c]/[0.07]">
          <td colSpan={6} className="px-0 pb-0 border-l-4 border-[#1a3a5c]">
            <div className="mx-4 mb-4 mt-2 bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos del aspirante</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                  <div><p className="text-xs text-slate-400">Nombre completo</p><p className="font-medium text-slate-700 mt-0.5">{nombreCompleto}</p></div>
                  <div><p className="text-xs text-slate-400">CURP</p><p className="font-mono text-xs text-slate-600 mt-0.5">{asp.curp}</p></div>
                  <div><p className="text-xs text-slate-400">Correo electrónico</p><p className="text-slate-700 mt-0.5 text-xs">{asp.email}</p></div>
                  <div><p className="text-xs text-slate-400">Teléfono</p><p className="text-slate-700 mt-0.5">{asp.telefono ?? '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Turno</p><p className="text-slate-700 capitalize mt-0.5">{asp.turno_preferido}</p></div>
                  <div><p className="text-xs text-slate-400">Fecha de nacimiento</p><p className="text-slate-700 mt-0.5">{asp.fecha_nacimiento}</p></div>
                  <div><p className="text-xs text-slate-400">Municipio</p><p className="text-slate-700 mt-0.5">{asp.municipio_procedencia}</p></div>
                  <div><p className="text-xs text-slate-400">Bachillerato</p><p className="text-slate-700 mt-0.5 text-xs">{asp.escuela_bachillerato}</p></div>
                  <div><p className="text-xs text-slate-400">Promedio</p><p className="font-semibold text-slate-700 mt-0.5">{asp.promedio_bachillerato?.toFixed(1)}</p></div>
                  {asp.folio_preinscripcion_tecnm && (
                    <div><p className="text-xs text-slate-400">Folio TecNM</p><p className="font-mono text-xs text-slate-600 mt-0.5">{asp.folio_preinscripcion_tecnm}</p></div>
                  )}
                  {asp.puntaje_exani != null && (
                    <div><p className="text-xs text-slate-400">EXANI-II</p><p className="font-semibold text-slate-700 mt-0.5">{asp.puntaje_exani} pts</p></div>
                  )}
                  {asp.autorizacion_consulta_expediente && (
                    <div className={`col-span-2 p-2 rounded-lg text-xs ${asp.autorizacion_consulta_expediente === 'nadie' ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className="text-slate-400 font-medium uppercase tracking-wide mb-0.5">Autorización consulta de expediente</p>
                      <p className={`font-semibold capitalize ${asp.autorizacion_consulta_expediente === 'nadie' ? 'text-red-700' : 'text-slate-700'}`}>
                        {asp.autorizacion_consulta_expediente === 'nadie'
                          ? 'NADIE — No entregar documentos a terceros bajo ninguna circunstancia'
                          : asp.autorizacion_consulta_expediente}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-slate-50/60">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Acciones</span>

                <button onClick={(e) => { e.stopPropagation(); onEditar() }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
                  </svg>
                  Editar datos
                </button>

                <button onClick={(e) => { e.stopPropagation(); onEstatus() }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                  </svg>
                  Cambiar estatus
                </button>

                {asp.estatus === 'aceptado' && !asp.inscripcion && (
                  <button onClick={(e) => { e.stopPropagation(); onInscribir() }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                    Inscribir
                  </button>
                )}

                {asp.estatus === 'aceptado' && asp.inscripcion && (
                  <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-slate-200">
                    <span className="text-xs text-slate-400 mr-0.5">Documentos:</span>
                    {docs.map(({ tipo, label, icon }) => (
                      <button key={tipo} onClick={(e) => { e.stopPropagation(); onDoc(tipo) }}
                        disabled={generandoPdf === tipo} title={label}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-40 disabled:cursor-wait">
                        {generandoPdf === tipo ? <Spinner className="w-3 h-3" /> : <span className="text-sm leading-none">{icon}</span>}
                        <span className="hidden sm:inline">{label.split(' ').slice(0, 2).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AspirantesPage() {
  const [carreraId,  setCarreraId]  = useState('')
  const [periodoId,  setPeriodoId]  = useState('')
  const [estatus,    setEstatus]    = useState('')
  const [puntajeMin, setPuntajeMin] = useState('')
  const [page,       setPage]       = useState(1)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [editando,      setEditando]    = useState<Aspirante | null>(null)
  const [editandoDatos, setEditandoDatos] = useState<Aspirante | null>(null)
  const [inscribiendo,  setInscribiendo] = useState<Aspirante | null>(null)
  const { error: toastError } = useToastStore()

  const { data: carreras = [], isLoading: cargandoCarreras } = useQuery({
    queryKey: ['carreras'],
    queryFn: admisionApi.getCarreras,
  })

  const { data: periodos = [], isLoading: cargandoPeriodos } = useQuery({
    queryKey: ['admin-periodos'],
    queryFn: admisionApi.getPeriodos,
  })

  // Al cargar, pre-seleccionar el periodo activo
  useEffect(() => {
    if (periodos.length && !periodoId) {
      const activo = periodos.find((p) => p.activo)
      setPeriodoId(activo?.id ?? periodos[0]?.id ?? '')
    }
  }, [periodos])

  const { data, isLoading, isError } = useAspirantes({
    carrera_id: carreraId || undefined,
    periodo_id: periodoId || undefined,
    estatus,
    puntaje_min: puntajeMin ? Number(puntajeMin) : undefined,
    page,
  })

  const { descargar: descargarPorCarrera,     generando: generandoPorCarrera     } = useListaAceptadosPorCarreraPdf()
  const { descargar: descargarListaAceptados, generando: generandoListaAceptados } = useListaAceptadosPdf()
  const { descargar: descargarInscripcionPdf, generando: generandoInscripcionPdf } = useInscripcionPdf()

  const docInscripcion = (asp: Aspirante, tipo: TipoInscripcionPdf) => {
    const inscId = asp.inscripcion?.id
    if (!inscId) { toastError('El aspirante aún no tiene inscripción registrada.'); return }
    descargarInscripcionPdf(inscId, tipo)
  }

  const periodoPDF = periodos.find((p) => p.id === periodoId)

  const handleCarrera    = (id: string) => { setCarreraId(id);   setPage(1); setExpandedId(null) }
  const handlePeriodo    = (id: string) => { setPeriodoId(id);   setPage(1); setExpandedId(null) }
  const handleEstatus    = (v: string)  => { setEstatus(v);      setPage(1); setExpandedId(null) }
  const handlePuntajeMin = (v: string)  => { setPuntajeMin(v);   setPage(1); setExpandedId(null) }

  const ESTATUSES = [
    { value: '',          label: 'Todos los estatus' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'aceptado',  label: 'Aceptado' },
    { value: 'rechazado', label: 'Rechazado' },
    { value: 'inscrito',  label: 'Inscrito' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Aspirantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de solicitudes de admisión</p>
        </div>
        <a href="/registro" target="_blank"
          className="self-start inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 rounded-lg transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          Nueva solicitud
        </a>
      </div>

      {/* ── Card principal ── */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">

        {/* ── Barra de filtros ── */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Filtro carrera */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Carrera
              </label>
              <div className="relative">
                <select
                  value={carreraId}
                  onChange={(e) => handleCarrera(e.target.value)}
                  disabled={cargandoCarreras}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]/60 disabled:opacity-50 disabled:cursor-wait transition"
                >
                  <option value="">Todas las carreras</option>
                  {carreras.filter((c) => c.activa).map((c) => (
                    <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {/* Filtro periodo */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Periodo escolar
              </label>
              <div className="relative">
                <select
                  value={periodoId}
                  onChange={(e) => handlePeriodo(e.target.value)}
                  disabled={cargandoPeriodos}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]/60 disabled:opacity-50 disabled:cursor-wait transition"
                >
                  <option value="">Todos los periodos</option>
                  {periodos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.activo ? ' (activo)' : ''}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {/* Filtro estatus */}
            <div className="sm:w-44">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Estatus
              </label>
              <div className="relative">
                <select
                  value={estatus}
                  onChange={(e) => handleEstatus(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]/60 transition"
                >
                  {ESTATUSES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {/* Filtro puntaje EXANI-II mínimo */}
            <div className="sm:w-36">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                EXANI-II mín.
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                value={puntajeMin}
                onChange={(e) => handlePuntajeMin(e.target.value)}
                placeholder="0 – 1000"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]/60 transition"
              />
            </div>

            {/* PDFs — solo cuando hay periodo */}
            {periodoPDF && (
              <div className="flex items-end gap-2 pb-px">
                <button
                  onClick={() => descargarListaAceptados(periodoPDF.id, periodoPDF.nombre)}
                  disabled={generandoListaAceptados}
                  title="Lista de aceptados (PDF)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {generandoListaAceptados ? <Spinner /> : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                    </svg>
                  )}
                  <span className="hidden sm:inline">Aceptados</span>
                </button>
                <button
                  onClick={() => descargarPorCarrera(periodoPDF.id, periodoPDF.nombre)}
                  disabled={generandoPorCarrera}
                  title="Lista por carrera (PDF)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {generandoPorCarrera ? <Spinner /> : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                    </svg>
                  )}
                  <span className="hidden sm:inline">Por carrera</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Cargando ── */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400 text-sm">
            <Spinner className="w-4 h-4" /> Cargando aspirantes…
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/>
            </svg>
            <p className="text-sm">Error al cargar los datos.</p>
          </div>
        )}

        {/* ── Vacío ── */}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
            </svg>
            <p className="text-sm">No hay aspirantes con los filtros seleccionados.</p>
          </div>
        )}

        {/* ── Tabla ── */}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-8 pl-4" />
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Aspirante</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">CURP</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Turno</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">EXANI-II</th>
                  <th className="text-right px-3 pr-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.data.map((asp) => (
                  <FilaAspirante
                    key={asp.id}
                    asp={asp}
                    expanded={expandedId === asp.id}
                    onToggle={() => setExpandedId((prev) => (prev === asp.id ? null : asp.id))}
                    onEditar={() => setEditandoDatos(asp)}
                    onEstatus={() => setEditando(asp)}
                    onInscribir={() => setInscribiendo(asp)}
                    onDoc={(tipo) => docInscripcion(asp, tipo)}
                    generandoPdf={generandoInscripcionPdf}
                  />
                ))}
              </tbody>
            </table>

            {/* Pie: total + paginación */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
              <p className="text-xs text-slate-400 text-center sm:text-left">
                <span className="font-medium text-slate-600">{data.total}</span> aspirante{data.total !== 1 ? 's' : ''}
                {data.last_page > 1 && (
                  <> · Página <span className="font-medium text-slate-600">{page}</span> de {data.last_page}</>
                )}
              </p>
              {data.last_page > 1 && (
                <div className="flex gap-1.5 justify-center">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
                    </svg>
                    Anterior
                  </button>
                  <button disabled={page === data.last_page} onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Siguiente
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editandoDatos && <EditarAspiranteModal aspirante={editandoDatos} onClose={() => setEditandoDatos(null)} />}
      {editando      && <EstatusModal        aspirante={editando}      onClose={() => setEditando(null)}      />}
      {inscribiendo  && <InscribirModal      aspirante={inscribiendo}  onClose={() => setInscribiendo(null)}  />}
    </div>
  )
}
