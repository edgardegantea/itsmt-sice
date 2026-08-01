import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type PlaneacionDocente, type CargaAcademica } from '../services/academico'
import apiClient from '../../../config/apiClient'
import { ESTATUS_COLOR, ESTATUS_LABEL, SIN_INICIAR, PASOS, pasoCompletoPlaneacion, PasoBadge, selectCls } from './planeacionShared'

// Etiquetas cortas para la columna de cada fase en la tabla — el label completo de PASOS
// (p. ej. "Caracterización, intención y competencia") es demasiado largo para una columna
// angosta y forzaba el encabezado a envolver en 2-3 líneas, descuadrando toda la tabla.
const PASO_CORTO: Record<string, string> = {
  generales: 'Caract.',
  especificas: 'Compet.',
  dosificacion: 'Dosif.',
  calendarizacion: 'Calend.',
}

export default function PlaneacionDocentePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo') ?? ''
  const setPeriodoId = (id: string) => setSearchParams(id ? { periodo: id } : {})

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
    staleTime: 60_000,
  })

  const { data: misCargas = [] } = useQuery({
    queryKey: ['mis-cargas', periodoId, user?.id],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!periodoId && !!user?.id,
  })

  const { data: misPlaneaciones = [] } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!user?.id,
  })

  // El constructor de horarios crea una CargaAcademica independiente por cada bloque de
  // horario (día+hora), así que una misma materia+grupo puede tener varias filas. La
  // Instrumentación Didáctica es por materia+grupo+periodo (no por bloque de horario), así
  // que aquí se agrupan para mostrar una sola fila por combinación, prefiriendo como
  // representante la carga que ya tenga una planeación iniciada (si existe alguna).
  const misAsignaturas = (() => {
    const grupos = new Map<string, CargaAcademica>()
    for (const c of misCargas as CargaAcademica[]) {
      const clave = `${c.materia_id}|${(c.grupos ?? []).map(g => g.id).sort().join(',')}`
      const actual = grupos.get(clave)
      const tienePlaneacion = (id: string) => (misPlaneaciones as PlaneacionDocente[]).some(p => p.carga_academica_id === id)
      if (!actual || (!tienePlaneacion(actual.id) && tienePlaneacion(c.id))) {
        grupos.set(clave, c)
      }
    }
    return [...grupos.values()]
  })()

  const abrirCarga = (cargaId: string) => {
    navigate(`/docente/planeacion/${cargaId}?periodo=${periodoId}`)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Instrumentación didáctica (Planeación)</h1>
        <p className="text-sm text-slate-500 mt-0.5">Formato oficial TecNM-AC-PO-003 — registra y entrega tu planeación por materia asignada.</p>
      </div>

      {/* Filtro de periodo */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo *</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={selectCls}>
            <option value="">— Selecciona —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Mis asignaturas — una fila por materia asignada, una columna por cada fase de la instrumentación */}
      {periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis asignaturas</p>
          {misAsignaturas.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-slate-400">No tienes materias asignadas en este periodo.</p>
          ) : (
            <>
              {/* Pantallas pequeñas: lista de tarjetas — la tabla completa no cabe sin cortarse. */}
              <div className="sm:hidden divide-y divide-slate-100 border-t border-slate-100">
                {misAsignaturas.map(c => {
                  const p = (misPlaneaciones as PlaneacionDocente[]).find(pl => pl.carga_academica_id === c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => abrirCarga(c.id)}
                      className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{c.materia?.nombre ?? '—'}</p>
                          <p className="text-xs text-slate-400">{c.grupos?.[0]?.clave ?? '—'}</p>
                        </div>
                        <span className="text-xs text-blue-600 font-medium shrink-0">{p ? 'Abrir' : 'Iniciar'}</span>
                      </div>
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p ? ESTATUS_COLOR[p.estatus] : 'bg-slate-100 text-slate-500'}`}>
                        {p ? ESTATUS_LABEL[p.estatus] : SIN_INICIAR}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                        {PASOS.map(paso => {
                          const completo = pasoCompletoPlaneacion(paso.id, p)
                          return (
                            <div key={paso.id} className="flex items-center gap-1.5 min-w-0">
                              <PasoBadge completo={completo} />
                              <span className={`text-[11px] truncate ${completo ? 'text-slate-600' : 'text-slate-400'}`}>
                                {PASO_CORTO[paso.id]}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Pantallas medianas en adelante: tabla completa */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-slate-100 text-xs text-slate-500">
                      <th className="text-left font-medium px-5 py-2">Asignatura</th>
                      <th className="text-left font-medium px-3 py-2">Estatus</th>
                      {PASOS.map(p => (
                        <th key={p.id} className="text-center font-medium px-2 py-2 w-16" title={p.label}>{PASO_CORTO[p.id]}</th>
                      ))}
                      <th className="px-3 py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {misAsignaturas.map(c => {
                      const p = (misPlaneaciones as PlaneacionDocente[]).find(pl => pl.carga_academica_id === c.id)
                      return (
                        <tr
                          key={c.id}
                          onClick={() => abrirCarga(c.id)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-800">{c.materia?.nombre ?? '—'}</p>
                            <p className="text-xs text-slate-400">{c.grupos?.[0]?.clave ?? '—'}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p ? ESTATUS_COLOR[p.estatus] : 'bg-slate-100 text-slate-500'}`}>
                              {p ? ESTATUS_LABEL[p.estatus] : SIN_INICIAR}
                            </span>
                          </td>
                          {PASOS.map(paso => (
                            <td key={paso.id} className="text-center px-2 py-3">
                              <PasoBadge completo={pasoCompletoPlaneacion(paso.id, p)} />
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-blue-600 font-medium">{p ? 'Abrir' : 'Iniciar'}</span>
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
      )}
    </div>
    </div>
  )
}
