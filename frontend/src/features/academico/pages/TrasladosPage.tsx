import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Traslado } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

type EstatusTraslado = 'solicitado' | 'aceptado' | 'rechazado'

function EstatusChip({ estatus }: { estatus: EstatusTraslado }) {
  const cfg: Record<EstatusTraslado, string> = {
    solicitado: 'bg-amber-100 text-amber-700',
    aceptado:   'bg-emerald-100 text-emerald-700',
    rechazado:  'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[estatus] ?? cfg.solicitado}`}>
      {estatus.charAt(0).toUpperCase() + estatus.slice(1)}
    </span>
  )
}

export default function TrasladosPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [gestionId, setGestionId] = useState<string | null>(null)
  const [gestionForm, setGestionForm] = useState({ estatus: 'aceptado' as 'aceptado' | 'rechazado', motivo_rechazo: '' })
  const [form, setForm] = useState({
    alumno_id: '', tipo: 'entrada' as 'entrada' | 'salida',
    instituto_origen: '', instituto_destino: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useQuery({
    queryKey: ['traslados', filtroEstatus, filtroTipo],
    queryFn: () => academicoApi.getTraslados({
      estatus: filtroEstatus || undefined,
      tipo: (filtroTipo as 'entrada' | 'salida') || undefined,
    }),
  })

  const traslados: Traslado[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: () => academicoApi.solicitarTraslado(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traslados'] })
      toastSuccess('Traslado registrado')
      setShowForm(false)
    },
    onError: () => toastError('Error al registrar traslado'),
  })

  const gestionarMut = useMutation({
    mutationFn: ({ id, estatus, motivo }: { id: string; estatus: 'aceptado' | 'rechazado'; motivo?: string }) =>
      academicoApi.gestionarTraslado(id, estatus, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traslados'] })
      toastSuccess('Traslado gestionado')
      setGestionId(null)
    },
    onError: () => toastError('Error al gestionar traslado'),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Traslados</h1>
            <p className="text-sm text-slate-500 mt-1">Solicitudes de traslado de entrada y salida — TecNM Cap. 6</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nuevo traslado'}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
          <strong>TecNM Cap. 6:</strong> El traslado procede independientemente de la situación académica. Al emitir documentos: NUNCA certificado incompleto, solo kardex o constancia de calificaciones.
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nuevo Traslado</h2>
            <form onSubmit={e => { e.preventDefault(); crearMut.mutate() }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Alumno (UUID)</label>
                <input type="text" value={form.alumno_id} onChange={e => setForm(f => ({ ...f, alumno_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del alumno" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'entrada' | 'salida' }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="entrada">Entrada (traslado al ITSMT)</option>
                  <option value="salida">Salida (traslado fuera del ITSMT)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Instituto Origen</label>
                <input type="text" value={form.instituto_origen} onChange={e => setForm(f => ({ ...f, instituto_origen: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del instituto de origen" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Instituto Destino</label>
                <input type="text" value={form.instituto_destino} onChange={e => setForm(f => ({ ...f, instituto_destino: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del instituto destino" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de solicitud</label>
                <input type="date" value={form.fecha_solicitud} onChange={e => setForm(f => ({ ...f, fecha_solicitud: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={crearMut.isPending}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {crearMut.isPending ? 'Guardando…' : 'Registrar traslado'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal gestión */}
        {gestionId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-xl">
              <h2 className="font-semibold text-slate-800 mb-4">Gestionar traslado</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Decisión</label>
                  <select value={gestionForm.estatus} onChange={e => setGestionForm(f => ({ ...f, estatus: e.target.value as 'aceptado' | 'rechazado' }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="aceptado">Aceptar traslado</option>
                    <option value="rechazado">Rechazar traslado</option>
                  </select>
                </div>
                {gestionForm.estatus === 'rechazado' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de rechazo</label>
                    <textarea value={gestionForm.motivo_rechazo} onChange={e => setGestionForm(f => ({ ...f, motivo_rechazo: e.target.value }))}
                      rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe el motivo del rechazo..." />
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setGestionId(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => gestionarMut.mutate({ id: gestionId, estatus: gestionForm.estatus, motivo: gestionForm.motivo_rechazo || undefined })}
                    disabled={gestionarMut.isPending}
                    className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
                      gestionForm.estatus === 'aceptado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                    }`}>
                    {gestionarMut.isPending ? 'Guardando…' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los tipos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
          <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los estatus</option>
            <option value="solicitado">Solicitado</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Solicitudes de traslado</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando traslados...</div>
          ) : traslados.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin solicitudes de traslado</p>
              <p className="text-sm mt-1">Registra la primera solicitud</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Alumno</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Instituto</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Fecha</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Estatus</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {traslados.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-5 text-slate-800">{t.alumno?.name ?? t.alumno_id}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.tipo === 'entrada' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {t.tipo === 'entrada' ? t.instituto_origen : t.instituto_destino}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 text-xs">{t.fecha_solicitud}</td>
                    <td className="py-3 px-4 text-center">
                      <EstatusChip estatus={t.estatus} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-1 justify-center">
                        {t.estatus === 'solicitado' && (
                          <button onClick={() => { setGestionId(t.id); setGestionForm({ estatus: 'aceptado', motivo_rechazo: '' }) }}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                            Gestionar
                          </button>
                        )}
                        {t.tipo === 'salida' && t.estatus === 'aceptado' && (
                          <a href={academicoApi.kardexTrasladoPdfUrl(t.id)} target="_blank" rel="noreferrer"
                            className="text-xs px-2 py-1 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                            Kardex PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
