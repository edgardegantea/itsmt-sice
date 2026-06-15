import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import { useAspirantes } from '../hooks/useAspirantes'
import { useListaAceptadosPorCarreraPdf } from '../hooks/useListaAceptadosPorCarreraPdf'
import { useListaAceptadosPdf } from '../hooks/useListaAceptadosPdf'
import { useInscripcionPdf } from '../hooks/useInscripcionPdf'
import FiltrosAspirantes from '../components/FiltrosAspirantes'
import EstatusModal from '../components/EstatusModal'
import InscribirModal from '../components/InscribirModal'
import EditarAspiranteModal from '../components/EditarAspiranteModal'
import Badge from '../../../components/ui/Badge'
import { useToastStore } from '../../../store/toastStore'
import type { Aspirante } from '../services/admision'

export default function AspirantesPage() {
  const [filtros, setFiltros]           = useState({ carrera_id: '', estatus: '', page: 1 })
  const [editando, setEditando]         = useState<Aspirante | null>(null)
  const [editandoDatos, setEditandoDatos] = useState<Aspirante | null>(null)
  const [inscribiendo, setInscribiendo] = useState<Aspirante | null>(null)
  const { error: toastError } = useToastStore()

  const { data, isLoading, isError } = useAspirantes(filtros)
  const { data: periodoActivo } = useQuery({ queryKey: ['periodo-activo'], queryFn: admisionApi.getPeriodoActivo, retry: false })

  const { descargar: descargarPorCarrera, generando: generandoPorCarrera } = useListaAceptadosPorCarreraPdf()
  const { descargar: descargarListaAceptados, generando: generandoListaAceptados } = useListaAceptadosPdf()
  const { descargar: descargarInscripcionPdf, generando: generandoInscripcionPdf } = useInscripcionPdf()

  const docInscripcion = (asp: Aspirante, tipo: Parameters<typeof descargarInscripcionPdf>[1]) => {
    const inscId = asp.inscripcion?.id
    if (!inscId) { toastError('El aspirante aún no tiene inscripción registrada.'); return }
    descargarInscripcionPdf(inscId, tipo)
  }

  const handleFiltro = (key: string, value: string) =>
    setFiltros((f) => ({ ...f, [key]: value, page: 1 }))

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Aspirantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de solicitudes de admisión</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:w-auto w-full">
          {periodoActivo && (
            <>
              <button
                onClick={() => descargarListaAceptados(periodoActivo.id, periodoActivo.nombre)}
                disabled={generandoListaAceptados}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {generandoListaAceptados
                  ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generando…</>
                  : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>Lista Aceptados (PDF)</>
                }
              </button>
              <button
                onClick={() => descargarPorCarrera(periodoActivo.id, periodoActivo.nombre)}
                disabled={generandoPorCarrera}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1a3a5c] border border-[#1a3a5c]/40 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {generandoPorCarrera ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Generando…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
                    Lista por Carrera (PDF)
                  </>
                )}
              </button>
            </>
          )}
          <a
            href="/registro"
            target="_blank"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors"
          >
            <span>+</span> Nueva solicitud
          </a>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {/* Filtros */}
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
          <FiltrosAspirantes
            carrera_id={filtros.carrera_id}
            estatus={filtros.estatus}
            onChange={handleFiltro}
          />
        </div>

        {/* Estados */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Cargando aspirantes…
          </div>
        )}
        {isError && (
          <div className="text-center py-16 text-sm text-red-500">Error al cargar los datos.</div>
        )}

        {data && (
          <>
            {data.data.length === 0 && (
              <p className="py-16 text-center text-sm text-slate-400">
                No hay aspirantes con los filtros seleccionados.
              </p>
            )}

            {/* ── Tabla (md+) ── */}
            {data.data.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Nombre completo', 'CURP', 'Carrera', 'Turno', 'Estatus', 'Acciones'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.map((asp) => (
                      <tr key={asp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{asp.nombres} {asp.apellido_paterno}</p>
                          <p className="text-xs text-slate-400">{asp.email}</p>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{asp.curp}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {asp.carrera.clave}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 capitalize">{asp.turno_preferido}</td>
                        <td className="px-5 py-3.5">
                          <Badge value={asp.estatus} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setEditandoDatos(asp)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setEditando(asp)}
                              className="px-3 py-1.5 text-xs font-medium text-[#1a3a5c] border border-[#1a3a5c]/25 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors"
                            >
                              Estatus
                            </button>
                            {asp.estatus === 'aceptado' && !asp.inscripcion && (
                              <button
                                onClick={() => setInscribiendo(asp)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                              >
                                Inscribir
                              </button>
                            )}
                            {asp.estatus === 'aceptado' && asp.inscripcion && (
                              <>
                                <button onClick={() => docInscripcion(asp, 'solicitud')}             disabled={generandoInscripcionPdf === 'solicitud'}             className="text-xs text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-40">Solicitud</button>
                                <button onClick={() => docInscripcion(asp, 'carta-compromiso')}      disabled={generandoInscripcionPdf === 'carta-compromiso'}      className="text-xs text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-40">Carta Comp.</button>
                                <button onClick={() => docInscripcion(asp, 'carta-compromiso-docs')} disabled={generandoInscripcionPdf === 'carta-compromiso-docs'} className="text-xs text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-40">Carta Docs</button>
                                <button onClick={() => docInscripcion(asp, 'contrato')}              disabled={generandoInscripcionPdf === 'contrato'}              className="text-xs text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-40">Contrato</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Tarjetas (móvil) ── */}
            {data.data.length > 0 && (
              <div className="md:hidden divide-y divide-slate-100">
                {data.data.map((asp) => (
                  <div key={asp.id} className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">
                          {asp.nombres} {asp.apellido_paterno}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{asp.email}</p>
                      </div>
                      <Badge value={asp.estatus} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1">{asp.carrera.clave}</span>
                        {asp.carrera.nombre}
                      </span>
                      <span className="capitalize">{asp.turno_preferido}</span>
                      <span className="font-mono">{asp.curp}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditandoDatos(asp)}
                        className="flex-1 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Editar datos
                      </button>
                      <button
                        onClick={() => setEditando(asp)}
                        className="flex-1 py-2 text-xs font-medium text-[#1a3a5c] border border-[#1a3a5c]/25 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors"
                      >
                        Estatus
                      </button>
                    </div>
                    {asp.estatus === 'aceptado' && !asp.inscripcion && (
                      <button
                        onClick={() => setInscribiendo(asp)}
                        className="w-full py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                      >
                        Inscribir
                      </button>
                    )}
                    {asp.estatus === 'aceptado' && asp.inscripcion && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => docInscripcion(asp, 'solicitud')}             disabled={generandoInscripcionPdf === 'solicitud'}             className="py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40">Solicitud</button>
                        <button onClick={() => docInscripcion(asp, 'carta-compromiso')}      disabled={generandoInscripcionPdf === 'carta-compromiso'}      className="py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40">Carta Comp.</button>
                        <button onClick={() => docInscripcion(asp, 'carta-compromiso-docs')} disabled={generandoInscripcionPdf === 'carta-compromiso-docs'} className="py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40">Carta Docs</button>
                        <button onClick={() => docInscripcion(asp, 'contrato')}              disabled={generandoInscripcionPdf === 'contrato'}              className="py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40">Contrato</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Paginación */}
            {data.last_page > 1 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Página {filtros.page} de {data.last_page} · {data.total} resultados
                </p>
                <div className="flex gap-1.5 justify-center">
                  <button
                    disabled={filtros.page === 1}
                    onClick={() => setFiltros((f) => ({ ...f, page: f.page - 1 }))}
                    className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    disabled={filtros.page === data.last_page}
                    onClick={() => setFiltros((f) => ({ ...f, page: f.page + 1 }))}
                    className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editandoDatos && <EditarAspiranteModal aspirante={editandoDatos} onClose={() => setEditandoDatos(null)} />}
      {editando      && <EstatusModal        aspirante={editando}      onClose={() => setEditando(null)}      />}
      {inscribiendo  && <InscribirModal      aspirante={inscribiendo}  onClose={() => setInscribiendo(null)}  />}
    </div>
  )
}
