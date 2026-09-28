import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type EstatusTicketMantenimiento, type TicketMantenimiento } from '../../services/academico'
import { inputCls, mutationError } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'
import { formatFechaCorta } from '../../../../utils/date'
import { ChevronLeft } from 'lucide-react'

const ESTATUS_LABEL: Record<EstatusTicketMantenimiento, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  resuelto: 'Resuelto',
}
const ESTATUS_CLASE: Record<EstatusTicketMantenimiento, string> = {
  abierto: 'bg-red-100 text-red-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  resuelto: 'bg-emerald-100 text-emerald-700',
}

export default function TicketsMantenimientoPage() {
  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToastStore()
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusTicketMantenimiento | ''>('')
  const [notasPorTicket, setNotasPorTicket] = useState<Record<string, string>>({})

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets-mantenimiento', filtroEstatus],
    queryFn: () => academicoApi.getTicketsMantenimiento({ estatus: filtroEstatus || undefined }),
  })

  const mutActualizar = useMutation({
    mutationFn: ({ id, estatus, notas_resolucion }: { id: string; estatus: EstatusTicketMantenimiento; notas_resolucion?: string }) =>
      academicoApi.actualizarTicketMantenimiento(id, { estatus, notas_resolucion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-mantenimiento'] })
      toastSuccess('Ticket actualizado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const totalAbiertos = tickets.filter(t => t.estatus === 'abierto').length
  const totalEnProgreso = tickets.filter(t => t.estatus === 'en_progreso').length
  const totalResueltos = tickets.filter(t => t.estatus === 'resuelto').length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Mantenimiento de Aulas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tickets generados automáticamente cuando prefectura reporta un problema de infraestructura en su ronda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Abiertos</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalAbiertos}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <p className="text-sm text-slate-500 font-medium">En progreso</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{totalEnProgreso}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Resueltos</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totalResueltos}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Estatus</label>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value as EstatusTicketMantenimiento | '')} className={`${inputCls} max-w-[180px]`}>
              <option value="">Todos</option>
              <option value="abierto">Abierto</option>
              <option value="en_progreso">En progreso</option>
              <option value="resuelto">Resuelto</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">Sin tickets de mantenimiento.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((t: TicketMantenimiento) => (
                <div key={t.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{t.aula?.nombre ?? '—'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_CLASE[t.estatus]}`}>
                        {ESTATUS_LABEL[t.estatus]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{t.descripcion}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Reportado por {t.reportado_por?.name ?? '—'} · {formatFechaCorta(t.created_at)}
                      {t.atendido_por && <> · Atendido por {t.atendido_por.name}</>}
                    </p>
                    {t.notas_resolucion && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{t.notas_resolucion}"</p>
                    )}
                  </div>

                  {t.estatus !== 'resuelto' && (
                    <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Notas de resolución (opcional)"
                        value={notasPorTicket[t.id] ?? ''}
                        onChange={e => setNotasPorTicket(prev => ({ ...prev, [t.id]: e.target.value }))}
                        className={`${inputCls} w-full text-xs`}
                      />
                      <div className="flex gap-2 w-full sm:justify-end">
                        {t.estatus === 'abierto' && (
                          <button
                            onClick={() => mutActualizar.mutate({ id: t.id, estatus: 'en_progreso', notas_resolucion: notasPorTicket[t.id] })}
                            disabled={mutActualizar.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Marcar en progreso
                          </button>
                        )}
                        <button
                          onClick={() => mutActualizar.mutate({ id: t.id, estatus: 'resuelto', notas_resolucion: notasPorTicket[t.id] })}
                          disabled={mutActualizar.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Marcar resuelto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
