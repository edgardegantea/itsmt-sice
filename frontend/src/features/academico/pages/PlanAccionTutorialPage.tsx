import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type PlanAccionTutorial } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

type Estatus = 'borrador' | 'enviado' | 'aprobado'

function EstatusChip({ estatus }: { estatus: Estatus }) {
  const cfg: Record<Estatus, string> = {
    borrador: 'bg-slate-100 text-slate-600',
    enviado:  'bg-amber-100 text-amber-700',
    aprobado: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[estatus] ?? cfg.borrador}`}>
      {estatus.charAt(0).toUpperCase() + estatus.slice(1)}
    </span>
  )
}

export default function PlanAccionTutorialPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore((s) => s.success)
  const toastError   = useToastStore((s) => s.error)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ periodo_id: '', objetivo_general: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['planes-accion-tutorial'],
    queryFn: () => academicoApi.getPlanesAccionTutorial(),
  })

  const planes: PlanAccionTutorial[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: () => academicoApi.crearPlanAccionTutorial({
      periodo_id:       form.periodo_id,
      objetivo_general: form.objetivo_general,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes-accion-tutorial'] })
      toastSuccess('Plan de Acción Tutorial creado')
      setShowForm(false)
      setForm({ periodo_id: '', objetivo_general: '' })
    },
    onError: () => toastError('No se pudo crear el PAT'),
  })

  const estatusMut = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: Estatus }) =>
      academicoApi.actualizarEstatusPat(id, estatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes-accion-tutorial'] })
      toastSuccess('Estatus del PAT actualizado')
    },
    onError: () => toastError('No se pudo actualizar el estatus'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.periodo_id || !form.objetivo_general) return
    crearMut.mutate()
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Plan de Acción Tutorial (PAT)</h1>
            <p className="text-sm text-slate-500 mt-1">Crea y gestiona tu plan por periodo. Flujo: Borrador → Enviado → Aprobado</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nuevo PAT'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nuevo Plan de Acción Tutorial</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Periodo (UUID)</label>
                <input
                  type="text"
                  value={form.periodo_id}
                  onChange={e => setForm(f => ({ ...f, periodo_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del periodo académico"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo general</label>
                <textarea
                  value={form.objetivo_general}
                  onChange={e => setForm(f => ({ ...f, objetivo_general: e.target.value }))}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe el objetivo general del plan de tutoría para este periodo..."
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={crearMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {crearMut.isPending ? 'Guardando…' : 'Crear PAT'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Flujo de estatus */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Flujo de aprobación:</strong> Crea tu PAT en estado <strong>Borrador</strong> →
          Envíalo a revisión (estado <strong>Enviado</strong>) →
          La coordinación lo marca como <strong>Aprobado</strong>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Mis Planes de Acción Tutorial</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando planes...</div>
          ) : planes.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin planes registrados</p>
              <p className="text-sm mt-1">Crea tu primer Plan de Acción Tutorial</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {planes.map(plan => (
                <div key={plan.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <EstatusChip estatus={plan.estatus as Estatus} />
                        <span className="text-xs text-slate-400">Periodo: {plan.periodo?.nombre ?? plan.periodo_id}</span>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">{plan.objetivo_general}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Creado: {new Date(plan.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {plan.estatus === 'borrador' && (
                        <button
                          onClick={() => estatusMut.mutate({ id: plan.id, estatus: 'enviado' })}
                          disabled={estatusMut.isPending}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                        >
                          Enviar a revisión
                        </button>
                      )}
                      {plan.estatus === 'enviado' && (
                        <button
                          onClick={() => estatusMut.mutate({ id: plan.id, estatus: 'aprobado' })}
                          disabled={estatusMut.isPending}
                          className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                        >
                          Aprobar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
