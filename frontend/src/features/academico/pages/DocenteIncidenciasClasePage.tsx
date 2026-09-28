import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, type EstatusIncidenciaClase, type IncidenciaClase } from '../services/academico'
import { selectCls } from './tabs/shared'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { formatFechaCorta } from '../../../utils/date'

const ESTATUS_LABEL: Record<EstatusIncidenciaClase, string> = {
  sin_novedad: 'Sin novedad',
  docente_ausente: 'Docente ausente',
  aula_vacia: 'Aula vacía',
  grupo_incorrecto: 'Grupo incorrecto',
  aula_incorrecta: 'Aula incorrecta',
  alumnos_incompletos: 'Alumnos incompletos',
  problema_infraestructura: 'Problema de infraestructura',
  otro: 'Otro',
}
const ESTATUS_CLASE: Record<EstatusIncidenciaClase, string> = {
  sin_novedad: 'bg-emerald-100 text-emerald-700',
  docente_ausente: 'bg-red-100 text-red-700',
  aula_vacia: 'bg-amber-100 text-amber-700',
  grupo_incorrecto: 'bg-orange-100 text-orange-700',
  aula_incorrecta: 'bg-orange-100 text-orange-700',
  alumnos_incompletos: 'bg-amber-100 text-amber-700',
  problema_infraestructura: 'bg-purple-100 text-purple-700',
  otro: 'bg-slate-100 text-slate-600',
}

/**
 * Vista de solo lectura para el docente: lo que prefectura reportó sobre SUS propias
 * clases durante el semestre. El backend (`IncidenciaClaseController::index`) ya
 * fuerza `docente_id = usuario autenticado` para el rol docente sin admin, así que
 * aquí no hace falta (ni se puede) pedir la bitácora de otra persona.
 */
export default function DocenteIncidenciasClasePage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const periodoId = periodoActivo?.id ?? ''
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null)

  const { data: incidencias = [], isLoading } = useQuery({
    queryKey: ['mis-incidencias-clase', periodoId, filtroEstatus],
    queryFn: () => academicoApi.getIncidenciasClase({ periodo_id: periodoId, estatus: filtroEstatus || undefined }),
    enabled: !!periodoId,
  })

  const totalRondas = incidencias.length
  const totalSinNovedad = incidencias.filter(i => i.estatus === 'sin_novedad').length
  const totalConIncidencia = totalRondas - totalSinNovedad
  const pctCumplimiento = totalRondas > 0 ? Math.round((totalSinNovedad / totalRondas) * 100) : null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Incidencias de Clase</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Rondas de prefectura reportadas sobre tus grupos durante el semestre{' '}
            <span className="font-medium text-slate-700">{periodoActivo?.nombre ?? '—'}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Rondas registradas</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{totalRondas}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">% Sin novedad</p>
            <p className={`text-3xl font-bold mt-1 ${pctCumplimiento === null ? 'text-slate-400' : pctCumplimiento >= 80 ? 'text-emerald-600' : pctCumplimiento >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {pctCumplimiento === null ? '—' : `${pctCumplimiento}%`}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Con incidencia</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalConIncidencia}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Resultado</label>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={`${selectCls} max-w-[200px]`}>
              <option value="">Todos</option>
              {(Object.keys(ESTATUS_LABEL) as EstatusIncidenciaClase[]).map(k => (
                <option key={k} value={k}>{ESTATUS_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!periodoId ? (
            <div className="py-16 text-center text-slate-400 text-sm">No hay un periodo activo.</div>
          ) : isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando…</div>
          ) : incidencias.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No hay rondas registradas sobre tus clases este semestre.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha / Hora</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Materia</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Aula</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidencias.map((inc: IncidenciaClase) => {
                    const expandida = filaExpandida === inc.id
                    return (
                      <Fragment key={inc.id}>
                        <tr onClick={() => setFilaExpandida(expandida ? null : inc.id)} className="cursor-pointer hover:bg-slate-50">
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatFechaCorta(inc.fecha)} · {inc.hora_revision?.slice(0, 5)}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800">{inc.grupo?.clave ?? '—'}</p>
                            <p className="text-xs text-slate-400">{inc.grupo?.carrera?.nombre} · {inc.grupo?.semestre}°</p>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{inc.carga_academica?.materia?.nombre ?? '—'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{inc.aula?.nombre ?? inc.carga_academica?.aula?.nombre ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_CLASE[inc.estatus]}`}>
                              {ESTATUS_LABEL[inc.estatus]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-slate-400 inline-block transition-transform ${expandida ? 'rotate-180' : ''}`}>⌄</span>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Docente presente</div>
                                  <div className="text-slate-700">{inc.docente_presente === null || inc.docente_presente === undefined ? 'Sin especificar' : inc.docente_presente ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Coincide horario</div>
                                  <div className="text-slate-700">{inc.coincide_horario ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Alumnos presentes</div>
                                  <div className="text-slate-700">{inc.alumnos_presentes ?? '—'}</div>
                                </div>
                                {inc.observaciones && (
                                  <div className="w-full">
                                    <div className="text-slate-400 uppercase tracking-wide text-[10px]">Observaciones</div>
                                    <div className="text-slate-700">{inc.observaciones}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
