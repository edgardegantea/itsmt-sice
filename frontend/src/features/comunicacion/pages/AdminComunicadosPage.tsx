import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comunicadosApi, type ComunicadoItem } from '../services/comunicados'
import { Link } from 'react-router-dom'
import { IconPlus } from '../../../components/ui/Icons'

export default function AdminComunicadosPage() {
  const queryClient = useQueryClient()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState<Partial<ComunicadoItem>>({
    titulo: '',
    contenido: '',
    resumen: '',
    prioridad: 'normal',
    categoria: 'general',
    destinatario_rol: '',
    fijado: false,
    requiere_confirmacion: false,
  })

  const { data: indicadores } = useQuery({
    queryKey: ['comunicados-indicadores'],
    queryFn: comunicadosApi.getIndicadores,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['comunicados-admin-list'],
    queryFn: () => comunicadosApi.getComunicadosAdmin(),
  })

  const mutationCrear = useMutation({
    mutationFn: comunicadosApi.crearComunicado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['comunicados-indicadores'] })
      setModalAbierto(false)
      setForm({
        titulo: '', contenido: '', resumen: '',
        prioridad: 'normal', categoria: 'general', destinatario_rol: '',
        fijado: false, requiere_confirmacion: false,
      })
    },
  })

  const mutationEliminar = useMutation({
    mutationFn: comunicadosApi.eliminarComunicado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['comunicados-indicadores'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.contenido) return
    mutationCrear.mutate(form)
  }

  const items: ComunicadoItem[] = data?.data ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Encabezado y Acciones ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/comunicados" className="text-xs font-semibold text-brand-600 hover:underline">← Volver al Muro</Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Comunicados Internos</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Crea, administra y publica avisos institucionales para el personal docente y administrativo.
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <IconPlus className="w-4 h-4" /> Nuevo Comunicado
        </button>
      </div>

      {/* ── Métricas e Indicadores ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-400">Total Comunicados Activos</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{indicadores?.total_activos ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-400">Fijados en Portada</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{indicadores?.fijados ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-400">Avisos Urgentes</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{indicadores?.urgentes_activos ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-400">Confirmaciones de Lectura</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{indicadores?.lecturas_totales ?? 0}</p>
        </div>
      </div>

      {/* ── Tabla de Gestión ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Historial de Publicaciones</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando publicaciones...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Título / Resumen</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Prioridad</th>
                  <th className="p-3.5">Destinatarios</th>
                  <th className="p-3.5">Publicado por</th>
                  <th className="p-3.5">Lecturas</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">No hay comunicados registrados.</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{item.titulo}</div>
                        <div className="text-[11px] text-slate-400 truncate">{item.resumen || item.contenido}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          item.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                          item.prioridad === 'alta' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-700'
                        }`}>
                          {item.prioridad}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-600">
                        {item.destinatario_rol ? item.destinatario_rol : 'Todos los Empleados'}
                      </td>
                      <td className="p-3.5 font-medium text-slate-600">
                        {item.publicado_por?.name ?? '—'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {item.lecturas?.length ?? 0}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            if (confirm('¿Deseas eliminar este comunicado?')) {
                              mutationEliminar.mutate(item.id)
                            }
                          }}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Publicación ──────────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-brand-600">Publicar Nuevo Comunicado</h3>
              <button type="button" onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título del Comunicado *</label>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej. Reunión de Evaluación Académica Semestral"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="academico">Académico</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="sindical">Sindical</option>
                    <option value="urgente">Urgente</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridad *</label>
                  <select
                    value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destinatarios</label>
                <select
                  value={form.destinatario_rol ?? ''}
                  onChange={e => setForm(f => ({ ...f, destinatario_rol: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none"
                >
                  <option value="">Todos los Empleados</option>
                  <option value="docente">Sólo Docentes</option>
                  <option value="jefe_carrera">Sólo Jefes de Carrera</option>
                  <option value="personal_administrativo">Sólo Personal Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contenido / Mensaje *</label>
                <textarea
                  required
                  rows={4}
                  value={form.contenido}
                  onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                  placeholder="Detalles del aviso o mensaje oficial..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.fijado}
                    onChange={e => setForm(f => ({ ...f, fijado: e.target.checked }))}
                    className="rounded border-slate-300 text-brand-600"
                  />
                  <span>Fijar en portada del muro</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutationCrear.isPending}
                className="px-5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition-colors"
              >
                {mutationCrear.isPending ? 'Publicando...' : 'Publicar Ahora'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
