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

const ESTADO_CHIP: Record<EstadoCarga, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente de confirmación', cls: 'bg-blue-100 text-blue-700' },
  confirmada: { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700' },
  conflicto:  { label: 'Con conflicto reportado', cls: 'bg-red-100 text-red-700' },
}

export default function MiHorarioDocentePage() {
  const { user } = useAuthStore()
  const { toast: addToast } = useToastStore()
  const qc = useQueryClient()

  const [periodoId, setPeriodoId] = useState('')
  const [reportandoId, setReportandoId] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')

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
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
          <p className="text-sm text-blue-800">
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
                          {carga.grupo?.clave ?? '—'}
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
