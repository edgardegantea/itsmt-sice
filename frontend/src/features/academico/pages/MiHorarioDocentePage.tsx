import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type EstadoCarga } from '../services/academico'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import { mutationError, selectCls, inputCls } from './tabs/shared'
import { usePeriodos } from './tabs/shared'

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const DIA_LABEL_CORTO: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

const ESTADO_CHIP: Record<EstadoCarga, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente de confirmación', cls: 'bg-brand-100 text-brand-700' },
  confirmada: { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700' },
  conflicto:  { label: 'Con conflicto reportado', cls: 'bg-red-100 text-red-700' },
}

const ESTADO_RING: Record<EstadoCarga, string> = {
  pendiente:  'ring-2 ring-brand-400',
  confirmada: '',
  conflicto:  'ring-2 ring-red-500',
}

/** Paleta de colores por asignatura, igual criterio que el constructor de horarios. */
const MATERIA_PALETTE = [
  'bg-brand-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600',
  'bg-cyan-600', 'bg-fuchsia-600', 'bg-lime-600', 'bg-orange-600', 'bg-teal-600',
  'bg-indigo-600', 'bg-pink-600', 'bg-sky-600', 'bg-violet-600', 'bg-green-600',
]

function colorPorMateria(clave: string): string {
  let hash = 0
  for (let i = 0; i < clave.length; i++) hash = (hash * 31 + clave.charCodeAt(i)) >>> 0
  return MATERIA_PALETTE[hash % MATERIA_PALETTE.length]
}

type VistaHorario = 'lista' | 'calendario'

export default function MiHorarioDocentePage() {
  const { user } = useAuthStore()
  const { toast: addToast } = useToastStore()
  const qc = useQueryClient()

  const [periodoId, setPeriodoId] = useState('')
  const [reportandoId, setReportandoId] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  const [vista, setVista] = useState<VistaHorario>(() => {
    const saved = localStorage.getItem('mi-horario-docente:vista')
    return saved === 'calendario' || saved === 'lista' ? saved : 'lista'
  })
  function cambiarVista(v: VistaHorario) {
    setVista(v)
    localStorage.setItem('mi-horario-docente:vista', v)
  }

  const { data: periodos = [] } = usePeriodos()

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['mi-horario', user?.id, periodoId],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!user?.id && !!periodoId,
    staleTime: 60_000,
  })

  const confirmarMut = useMutation({
    mutationFn: (id: string) => academicoApi.confirmarCarga(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-horario'] })
      addToast('Carga confirmada.', 'success')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const reportarMut = useMutation({
    mutationFn: ({ id, comentario }: { id: string; comentario: string }) =>
      academicoApi.reportarConflictoCarga(id, comentario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-horario'] })
      addToast('Conflicto reportado. Control Escolar será notificado.', 'success')
      setReportandoId(null)
      setComentario('')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  // Agrupar cargas por día ordenado
  const cargasPorDia = DIAS_ORDEN.reduce((acc, dia) => {
    const enEste = cargas.filter((c: any) =>
      c.horarios?.some((h: any) => h.dia_semana === dia)
    ).sort((a: any, b: any) => {
      const ha = a.horarios?.find((h: any) => h.dia_semana === dia)?.hora_inicio ?? '00:00'
      const hb = b.horarios?.find((h: any) => h.dia_semana === dia)?.hora_inicio ?? '00:00'
      return ha.localeCompare(hb)
    })
    if (enEste.length > 0) acc[dia] = enEste
    return acc
  }, {} as Record<string, any[]>)

  const pendientes = cargas.filter((c: any) => !c.estado || c.estado === 'pendiente')

  // ── Datos para la vista de calendario semanal ──────────────────────────────
  type EventoCalendario = {
    carga: any
    dia_semana: string
    hora_inicio: string
    hora_fin: string
    estado: EstadoCarga
  }

  const eventos: EventoCalendario[] = cargas.flatMap((c: any) =>
    (c.horarios ?? []).map((h: any) => ({
      carga: c,
      dia_semana: h.dia_semana,
      hora_inicio: (h.hora_inicio ?? '07:00').slice(0, 5),
      hora_fin: (h.hora_fin ?? '08:00').slice(0, 5),
      estado: c.estado ?? 'pendiente',
    }))
  )

  const horaMin = eventos.length
    ? Math.min(...eventos.map(e => parseInt(e.hora_inicio.slice(0, 2), 10)))
    : 7
  const horaMax = eventos.length
    ? Math.max(...eventos.map(e => {
        const h = parseInt(e.hora_fin.slice(0, 2), 10)
        const m = parseInt(e.hora_fin.slice(3, 5), 10)
        return m > 0 ? h + 1 : h
      }))
    : 21
  const horasCalendario = Array.from({ length: Math.max(horaMax - horaMin, 1) }, (_, i) => horaMin + i)

  // Para cada día, rastrea hasta qué fila (hora) ya está cubierta por un evento con rowSpan.
  const cubiertoHasta: Record<string, number> = {}
  DIAS_ORDEN.forEach(d => { cubiertoHasta[d] = -1 })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mi horario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revisa tus cargas asignadas y confírmalas o reporta conflictos.</p>
      </div>

      {/* Selector de periodo */}
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
          className={selectCls}
        >
          <option value="">Selecciona un periodo</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        {periodoId && (
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => cambiarVista('lista')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${vista === 'lista' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => cambiarVista('calendario')}
              className={`px-3 py-2 text-xs font-medium border-l border-slate-300 transition-colors ${vista === 'calendario' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Calendario
            </button>
          </div>
        )}

        {periodoId && pendientes.length > 0 && (
          <button
            onClick={() => pendientes.forEach((c: any) => confirmarMut.mutate(c.id))}
            disabled={confirmarMut.isPending}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Confirmar todas ({pendientes.length})
          </button>
        )}
      </div>

      {/* Banner de pendientes */}
      {pendientes.length > 0 && periodoId && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-3">
          <p className="text-sm text-brand-800">
            Tienes <strong>{pendientes.length}</strong> carga{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''} de confirmar.
            Revisa el horario y confírmalas o reporta cualquier conflicto.
          </p>
        </div>
      )}

      {/* Cargas por día */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Cargando…</div>
      ) : !periodoId ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Selecciona un periodo.</div>
      ) : Object.keys(cargasPorDia).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center text-slate-400 text-sm">
          Sin cargas académicas asignadas en este periodo.
        </div>
      ) : vista === 'calendario' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 px-5 py-3 border-b border-slate-100">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600 ring-2 ring-brand-400" />Pendiente de confirmación</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600" />Confirmada (color por asignatura)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600 ring-2 ring-red-500" />Con conflicto reportado</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-slate-500 font-medium w-16">Hora</th>
                  {DIAS_ORDEN.map(dia => (
                    <th key={dia} className="px-1 py-2 text-center text-slate-700 font-semibold">{DIA_LABEL_CORTO[dia]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horasCalendario.map((hora, rowIdx) => (
                  <tr key={hora} className="border-b border-slate-50">
                    <td className="px-3 py-1 text-slate-400 font-mono tabular-nums align-top">{String(hora).padStart(2, '0')}:00</td>
                    {DIAS_ORDEN.map(dia => {
                      if (cubiertoHasta[dia] >= rowIdx) return null // cubierto por rowSpan de un evento previo

                      const evento = eventos.find(e =>
                        e.dia_semana === dia && parseInt(e.hora_inicio.slice(0, 2), 10) === hora
                      )

                      if (!evento) {
                        return <td key={dia} className="px-0.5 py-0.5 border-l border-slate-50 h-9" />
                      }

                      const finHora = parseInt(evento.hora_fin.slice(0, 2), 10) + (parseInt(evento.hora_fin.slice(3, 5), 10) > 0 ? 1 : 0)
                      const span = Math.max(finHora - hora, 1)
                      cubiertoHasta[dia] = rowIdx + span - 1

                      const color = colorPorMateria(evento.carga.materia_id ?? evento.carga.materia?.nombre ?? '')

                      return (
                        <td key={dia} rowSpan={span} className="px-0.5 py-0.5 border-l border-slate-50 align-top">
                          <div
                            className={`rounded p-1.5 text-white h-full ${color} ${ESTADO_RING[evento.estado]}`}
                            title={`${evento.carga.materia?.nombre ?? ''} · ${evento.carga.grupos?.map((g: { clave: string }) => g.clave).join(', ') ?? ''}${evento.carga.aula?.nombre ? ` · ${evento.carga.aula.nombre}` : ''}\n${evento.hora_inicio}–${evento.hora_fin}`}
                          >
                            <p className="font-medium truncate">{evento.carga.materia?.nombre ?? '—'}</p>
                            <p className="opacity-80 text-[10px] truncate">
                              {evento.carga.grupos?.map((g: { clave: string }) => g.clave).join(', ') ?? '—'}
                            </p>
                            <p className="opacity-70 text-[10px] font-mono">{evento.hora_inicio}–{evento.hora_fin}</p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {DIAS_ORDEN.filter(d => cargasPorDia[d]).map(dia => (
            <div key={dia} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h2 className="font-semibold text-slate-800 text-sm">{DIA_LABEL[dia]}</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {cargasPorDia[dia].map((carga: any) => {
                  const horarioDia = carga.horarios?.find((h: any) => h.dia_semana === dia)
                  const estado: EstadoCarga = carga.estado ?? 'pendiente'
                  const chip = ESTADO_CHIP[estado]

                  return (
                    <div key={carga.id} className="px-5 py-3 flex items-start gap-4 flex-wrap">
                      {/* Hora */}
                      <div className="w-20 shrink-0">
                        {horarioDia ? (
                          <div className="text-sm font-mono text-slate-700">
                            {horarioDia.hora_inicio?.slice(0, 5)}
                            <span className="text-slate-400">–</span>
                            {horarioDia.hora_fin?.slice(0, 5)}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </div>

                      {/* Materia y datos */}
                      <div className="flex-1 min-w-48">
                        <p className="font-medium text-slate-900 text-sm">{carga.materia?.nombre ?? '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {carga.grupos?.map((g: { clave: string }) => g.clave).join(", ") ?? '—'}
                          {carga.aula?.nombre && ` · ${carga.aula.nombre}`}
                        </p>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.cls}`}>
                          {chip.label}
                        </span>

                        {estado !== 'confirmada' && (
                          <button
                            onClick={() => confirmarMut.mutate(carga.id)}
                            disabled={confirmarMut.isPending}
                            className="text-xs text-emerald-700 hover:underline"
                          >
                            Confirmar
                          </button>
                        )}

                        {estado !== 'conflicto' && (
                          <button
                            onClick={() => { setReportandoId(carga.id); setComentario('') }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Reportar conflicto
                          </button>
                        )}
                      </div>

                      {/* Panel de reporte de conflicto */}
                      {reportandoId === carga.id && (
                        <div className="w-full mt-2 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-red-800">Describe el conflicto:</p>
                          <textarea
                            rows={2}
                            value={comentario}
                            onChange={e => setComentario(e.target.value)}
                            placeholder="Ej: el aula ya está ocupada por otro grupo, hay traslape con otra materia…"
                            className={`${inputCls} resize-none`}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => reportarMut.mutate({ id: carga.id, comentario })}
                              disabled={!comentario.trim() || reportarMut.isPending}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
                            >
                              {reportarMut.isPending ? 'Enviando…' : 'Enviar reporte'}
                            </button>
                            <button
                              onClick={() => setReportandoId(null)}
                              className="px-3 py-1 border border-slate-300 text-slate-600 text-xs rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Comentario de conflicto existente */}
                      {estado === 'conflicto' && carga.comentario_docente && (
                        <div className="w-full text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                          <span className="font-medium">Conflicto reportado:</span> {carga.comentario_docente}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
