import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import { inputCls, ModalWrap, mutationError } from '../../academico/pages/tabs/shared'

interface Actividad {
  no: number
  actividad: string
  fecha_inicio: string
  fecha_fin?: string
}

interface CalendarioEscolar {
  id: string
  periodo_id: string
  periodo_escolar: string
  actividades: Actividad[]
  elaboro_nombre?: string
  elaboro_fecha?: string
  autorizo_nombre?: string
  autorizo_fecha?: string
  autorizado: boolean
  autorizadoPor?: { name: string }
}

interface Periodo { id: string; nombre: string }

export default function CalendarioEscolarPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [periodoId, setPeriodoId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    periodo_escolar: '', elaboro_nombre: '', elaboro_fecha: '',
    autorizo_nombre: '', autorizo_fecha: '',
  })
  const [actividades, setActividades] = useState<Actividad[]>([
    { no: 1, actividad: '', fecha_inicio: '', fecha_fin: '' }
  ])

  const { data: periodos = [] } = useQuery<Periodo[]>({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data ?? []),
  })

  const { data: calendario, isLoading } = useQuery<CalendarioEscolar>({
    queryKey: ['calendario-escolar', periodoId],
    queryFn: () => apiClient.get(`/calendario-escolar/${periodoId}`).then(r => r.data.data),
    enabled: !!periodoId,
  })

  const mutGuardar = useMutation({
    mutationFn: () => apiClient.post('/calendario-escolar', {
      ...form,
      periodo_id: periodoId,
      actividades: actividades.filter(a => a.actividad && a.fecha_inicio),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendario-escolar', periodoId] })
      setShowModal(false)
      toastSuccess('Calendario guardado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutAutorizar = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/calendario-escolar/${id}/autorizar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendario-escolar', periodoId] })
      toastSuccess('Calendario autorizado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const openModal = () => {
    if (calendario) {
      setForm({
        periodo_escolar: calendario.periodo_escolar,
        elaboro_nombre:  calendario.elaboro_nombre ?? '',
        elaboro_fecha:   calendario.elaboro_fecha ?? '',
        autorizo_nombre: calendario.autorizo_nombre ?? '',
        autorizo_fecha:  calendario.autorizo_fecha ?? '',
      })
      setActividades(calendario.actividades.length > 0 ? calendario.actividades : [{ no: 1, actividad: '', fecha_inicio: '', fecha_fin: '' }])
    } else {
      setForm({ periodo_escolar: '', elaboro_nombre: '', elaboro_fecha: '', autorizo_nombre: '', autorizo_fecha: '' })
      setActividades([{ no: 1, actividad: '', fecha_inicio: '', fecha_fin: '' }])
    }
    setShowModal(true)
  }

  const addActividad = () => setActividades(prev => [...prev, { no: prev.length + 1, actividad: '', fecha_inicio: '', fecha_fin: '' }])
  const removeActividad = (i: number) => setActividades(prev => prev.filter((_, idx) => idx !== i))
  const updateActividad = (i: number, key: keyof Actividad, val: string | number) =>
    setActividades(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a))

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendario Escolar</h1>
          <p className="text-sm text-slate-500 mt-0.5">TecNM-AC-PO-002-01 — Calendario por periodo</p>
        </div>
        {periodoId && (
          <button onClick={openModal} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            {calendario ? 'Editar' : '+ Crear calendario'}
          </button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <select
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
          className={`${inputCls} max-w-xs`}
        >
          <option value="">Seleccionar periodo…</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {periodoId && isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Cargando…</div>
      )}

      {periodoId && !isLoading && !calendario && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 text-sm">No hay calendario para este periodo.</p>
          <button onClick={openModal} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Crear calendario</button>
        </div>
      )}

      {calendario && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{calendario.periodo_escolar}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Elaboró: {calendario.elaboro_nombre ?? '—'} {calendario.elaboro_fecha ? `(${calendario.elaboro_fecha})` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {calendario.autorizado ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  Autorizado por {calendario.autorizadoPor?.name ?? calendario.autorizo_nombre}
                </span>
              ) : (
                <button
                  onClick={() => mutAutorizar.mutate(calendario.id)}
                  disabled={mutAutorizar.isPending}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Autorizar
                </button>
              )}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actividad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha inicio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha fin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(calendario.actividades ?? []).map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-slate-600">{a.no}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{a.actividad}</td>
                  <td className="px-4 py-3 text-slate-600">{a.fecha_inicio}</td>
                  <td className="px-4 py-3 text-slate-400">{a.fecha_fin ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ModalWrap
          title={calendario ? 'Editar calendario escolar' : 'Nuevo calendario escolar'}
          onClose={() => setShowModal(false)}
          onSave={() => mutGuardar.mutate()}
          saving={mutGuardar.isPending}
        >
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Periodo escolar *</label>
              <input
                value={form.periodo_escolar}
                onChange={e => setForm(f => ({ ...f, periodo_escolar: e.target.value }))}
                placeholder="Ej. Ene-Jun 2027"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Elaboró</label>
              <input value={form.elaboro_nombre} onChange={e => setForm(f => ({ ...f, elaboro_nombre: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha elaboró</label>
              <input type="date" value={form.elaboro_fecha} onChange={e => setForm(f => ({ ...f, elaboro_fecha: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Autorizó</label>
              <input value={form.autorizo_nombre} onChange={e => setForm(f => ({ ...f, autorizo_nombre: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha autorizó</label>
              <input type="date" value={form.autorizo_fecha} onChange={e => setForm(f => ({ ...f, autorizo_fecha: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="col-span-2 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">Actividades del calendario</p>
              <button onClick={addActividad} className="text-xs text-blue-600 hover:underline">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {actividades.map((a, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg p-2">
                  <input
                    type="number"
                    value={a.no}
                    onChange={e => updateActividad(i, 'no', parseInt(e.target.value))}
                    className={`${inputCls} col-span-1 text-center`}
                    min={1}
                  />
                  <input
                    value={a.actividad}
                    onChange={e => updateActividad(i, 'actividad', e.target.value)}
                    placeholder="Actividad"
                    className={`${inputCls} col-span-5`}
                  />
                  <input
                    type="date"
                    value={a.fecha_inicio}
                    onChange={e => updateActividad(i, 'fecha_inicio', e.target.value)}
                    className={`${inputCls} col-span-2`}
                  />
                  <input
                    type="date"
                    value={a.fecha_fin ?? ''}
                    onChange={e => updateActividad(i, 'fecha_fin', e.target.value)}
                    className={`${inputCls} col-span-2`}
                  />
                  <button onClick={() => removeActividad(i)} className="col-span-2 text-xs text-red-400 hover:text-red-600">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </ModalWrap>
      )}
    </div>
  )
}
