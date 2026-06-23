import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import Modal from '../../../components/ui/Modal'
import { useToastStore } from '../../../store/toastStore'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Carrera {
  id: string
  nombre: string
  clave: string
  codigo_it: string
  plan_clave: string | null
  especialidad: string | null
  activa: boolean
  alumnos_count?: number
  aspirantes_count?: number
}

interface AlumnoPorSemestre { semestre_actual: number; total: number }
interface MallaItem { id: string; semestre: number; nombre_materia: string; horas_teoria: number; horas_practica: number; creditos: number }
interface PersonalDir { id: string; nombre: string; cargo: string; email: string | null; telefono: string | null; firma_documentos: boolean }

interface CarreraDetalle {
  carrera: Carrera
  jefe: { id: string; nombre: string; email: string } | null
  personal_directorio: PersonalDir[]
  alumnos_por_semestre: AlumnoPorSemestre[]
  mallas: MallaItem[]
}

// ── API ───────────────────────────────────────────────────────────────────────

const API = {
  list:         () => apiClient.get('/admin/carreras').then(r => r.data.data as Carrera[]),
  show:         (id: string) => apiClient.get(`/admin/carreras/${id}`).then(r => r.data.data as CarreraDetalle),
  create:       (d: Partial<Carrera>) => apiClient.post('/admin/carreras', d).then(r => r.data.data as Carrera),
  update:       (id: string, d: Partial<Carrera>) => apiClient.patch(`/admin/carreras/${id}`, d).then(r => r.data.data as Carrera),
  toggleActiva: (id: string) => apiClient.patch(`/admin/carreras/${id}/toggle-activa`).then(r => r.data.data as Carrera),
}

// ── Formulario ────────────────────────────────────────────────────────────────

const clsC = (e?: string) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 ${e ? 'border-red-400' : 'border-slate-300'}`
const FErr = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null

type CarreraApiError = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }

function CarreraForm({ inicial, onGuardar, onCancelar, cargando, errors = {} }: {
  inicial?: Partial<Carrera>; onGuardar: (d: Partial<Carrera>) => void
  onCancelar: () => void; cargando: boolean; errors?: Record<string, string>
}) {
  const [form, setForm] = useState<Partial<Carrera>>(inicial ?? { activa: true })
  const set = (k: keyof Carrera, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(form) }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la carrera *</label>
          <input required value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej. Ingeniería en Sistemas Computacionales" className={clsC(errors.nombre)} />
          <FErr msg={errors.nombre} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Clave * (siglas)</label>
          <input required value={form.clave ?? ''} onChange={e => set('clave', e.target.value.toUpperCase())}
            placeholder="Ej. ISC" maxLength={10} className={`${clsC(errors.clave)} font-mono`} />
          <FErr msg={errors.clave} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código TecNM (2–3 dígitos) *</label>
          <input required value={form.codigo_it ?? ''} onChange={e => set('codigo_it', e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Ej. 006" maxLength={3} className={`${clsC(errors.codigo_it)} font-mono`} />
          <FErr msg={errors.codigo_it} />
          <p className="text-xs text-slate-400 mt-1">Segmento NNN del número de control TecNM.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Clave plan de estudios</label>
          <input value={form.plan_clave ?? ''} onChange={e => set('plan_clave', e.target.value)}
            placeholder="Ej. ISIC-2010-227" className={`${clsC(errors.plan_clave)} font-mono`} />
          <FErr msg={errors.plan_clave} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Especialidad</label>
          <input value={form.especialidad ?? ''} onChange={e => set('especialidad', e.target.value)}
            placeholder="Opcional" className={clsC(errors.especialidad)} />
          <FErr msg={errors.especialidad} />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input type="checkbox" id="activa" checked={!!form.activa} onChange={e => set('activa', e.target.checked)}
            className="w-4 h-4 accent-[#1a3a5c]" />
          <label htmlFor="activa" className="text-sm text-slate-700">Carrera activa (visible en formularios)</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={cargando} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
          {cargando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function PanelDetalle({ carreraId, onClose, onEditar }: { carreraId: string; onClose: () => void; onEditar: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['carrera-detalle', carreraId],
    queryFn: () => API.show(carreraId),
  })

  const totalActivos = data?.alumnos_por_semestre.reduce((s, r) => s + r.total, 0) ?? 0

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="bg-[#1a3a5c] text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              {isLoading ? (
                <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm bg-white/20 px-2 py-0.5 rounded">{data?.carrera.clave}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${data?.carrera.activa ? 'bg-emerald-400/30 text-emerald-100' : 'bg-white/10 text-white/60'}`}>
                      {data?.carrera.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold leading-tight">{data?.carrera.nombre}</h2>
                  {data?.carrera.especialidad && <p className="text-sm text-white/70 mt-0.5">{data.carrera.especialidad}</p>}
                </>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Stats rápidas */}
          {!isLoading && data && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Alumnos totales', value: data.carrera.alumnos_count ?? 0 },
                { label: 'Alumnos activos', value: totalActivos },
                { label: 'Aspirantes',      value: data.carrera.aspirantes_count ?? 0 },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-lg px-3 py-2 text-center">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Cargando información…
            </div>
          ) : data ? (
            <div className="divide-y divide-gray-100">

              {/* Identificación */}
              <section className="px-6 py-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Identificación</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Código TecNM',       value: data.carrera.codigo_it },
                    { label: 'Clave plan',          value: data.carrera.plan_clave ?? '—' },
                  ].map(r => (
                    <div key={r.label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">{r.label}</p>
                      <p className="font-mono font-medium text-gray-800">{r.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Jefe de carrera */}
              <section className="px-6 py-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Jefe de Carrera</h3>
                {data.jefe ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 rounded-full bg-[#1a3a5c] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {data.jefe.nombre.split(' ').slice(0, 2).map(p => p[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{data.jefe.nombre}</p>
                      <a href={`mailto:${data.jefe.email}`} className="text-xs text-blue-600 hover:underline">{data.jefe.email}</a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin jefe de carrera asignado</p>
                )}
              </section>

              {/* Personal del directorio */}
              {data.personal_directorio.length > 0 && (
                <section className="px-6 py-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Personal del Directorio</h3>
                  <div className="space-y-2">
                    {data.personal_directorio.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                          <p className="text-xs text-gray-500 truncate">{p.cargo}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {p.firma_documentos && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Firma</span>
                          )}
                          {p.email && (
                            <a href={`mailto:${p.email}`} className="text-gray-400 hover:text-blue-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Distribución de alumnos por semestre */}
              {data.alumnos_por_semestre.length > 0 && (
                <section className="px-6 py-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Alumnos activos por semestre
                    <span className="ml-2 normal-case text-gray-400 font-normal">({totalActivos} total)</span>
                  </h3>
                  <div className="space-y-2">
                    {data.alumnos_por_semestre.map(r => {
                      const pct = totalActivos > 0 ? Math.round((r.total / totalActivos) * 100) : 0
                      return (
                        <div key={r.semestre_actual} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 flex-shrink-0">{r.semestre_actual}° semestre</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1a3a5c] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-10 text-right">{r.total}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Malla curricular */}
              {data.mallas.length > 0 && (
                <section className="px-6 py-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Malla curricular
                    <span className="ml-2 normal-case text-gray-400 font-normal">({data.mallas.length} materias)</span>
                  </h3>
                  {Array.from(new Set(data.mallas.map(m => m.semestre))).sort((a, b) => a - b).map(sem => (
                    <div key={sem} className="mb-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">{sem}° Semestre</p>
                      <div className="space-y-1">
                        {data.mallas.filter(m => m.semestre === sem).map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs px-3 py-1.5 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{m.nombre_materia}</span>
                            <span className="text-gray-400 font-mono flex-shrink-0 ml-3">{m.creditos} cr.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Pie con acciones */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
          <button onClick={onEditar}
            className="flex-1 py-2 rounded-xl bg-[#1a3a5c] text-white text-sm font-medium hover:bg-[#234d7a] transition-colors">
            Editar carrera
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function CarrerasPage() {
  const qc = useQueryClient()
  const [modal,      setModal]      = useState<'nueva' | Carrera | null>(null)
  const [detalle,    setDetalle]    = useState<Carrera | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { success, error: toastError } = useToastStore()

  const { data: carreras = [], isLoading } = useQuery({ queryKey: ['admin-carreras'], queryFn: API.list })

  const closeModal = () => { setModal(null); setFormErrors({}) }

  const guardar = useMutation({
    mutationFn: (d: Partial<Carrera>) =>
      modal === 'nueva' ? API.create(d) : API.update((modal as Carrera).id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carreras'] })
      if (detalle) qc.invalidateQueries({ queryKey: ['carrera-detalle', detalle.id] })
      success(modal === 'nueva' ? 'Carrera creada correctamente.' : 'Carrera actualizada correctamente.')
      closeModal()
    },
    onError: (err: CarreraApiError) => {
      const errs = err.response?.data?.errors
      if (errs) {
        setFormErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])))
      } else {
        toastError(err.response?.data?.message ?? 'Error al guardar la carrera.')
      }
    },
  })

  const toggleActiva = useMutation({
    mutationFn: (id: string) => API.toggleActiva(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-carreras'] })
      qc.invalidateQueries({ queryKey: ['carrera-detalle', data.id] })
      success(data.activa ? `Carrera "${data.clave}" activada.` : `Carrera "${data.clave}" desactivada.`)
    },
    onError: () => toastError('Error al cambiar el estado de la carrera.'),
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Carreras</h1>
          <p className="text-sm text-slate-500 mt-0.5">{carreras.length} carrera(s) registrada(s). Haz clic en una fila para ver su detalle.</p>
        </div>
        <button onClick={() => setModal('nueva')}
          className="shrink-0 px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
          + Nueva carrera
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      {/* Tabla escritorio */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cód. TecNM</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumnos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carreras.map(c => (
              <tr key={c.id}
                onClick={() => setDetalle(c)}
                className={`hover:bg-blue-50/60 transition-colors cursor-pointer ${detalle?.id === c.id ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.nombre}
                  {c.especialidad && <span className="text-xs text-slate-400 ml-1">· {c.especialidad}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">{c.clave}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{c.codigo_it}</td>
                <td className="px-4 py-3 text-slate-500">{c.alumnos_count ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => toggleActiva.mutate(c.id)} disabled={toggleActiva.isPending}
                      className="text-xs text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-60">
                      {c.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => { setDetalle(c); setModal(c) }}
                      className="text-xs text-[#1a3a5c] hover:underline font-medium">
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="md:hidden space-y-3">
        {carreras.map(c => (
          <div key={c.id} onClick={() => setDetalle(c)}
            className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-[#1a3a5c]/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-slate-800 text-sm">{c.nombre}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{c.clave} · Cód. {c.codigo_it}</p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => toggleActiva.mutate(c.id)} disabled={toggleActiva.isPending}
                className="flex-1 text-xs text-center border border-slate-300 rounded-lg py-1.5 hover:bg-slate-50 disabled:opacity-60">
                {c.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => setModal(c)}
                className="flex-1 text-xs text-center text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg py-1.5 hover:bg-[#1a3a5c]/5 font-medium">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal editar/crear */}
      {modal && (
        <Modal
          title={modal === 'nueva' ? 'Nueva carrera' : `Editar: ${(modal as Carrera).clave}`}
          onClose={closeModal}
        >
          <CarreraForm
            inicial={modal !== 'nueva' ? modal : undefined}
            onGuardar={d => guardar.mutate(d)}
            onCancelar={closeModal}
            cargando={guardar.isPending}
            errors={formErrors}
          />
        </Modal>
      )}

      {/* Panel de detalle */}
      {detalle && !modal && (
        <PanelDetalle
          carreraId={detalle.id}
          onClose={() => setDetalle(null)}
          onEditar={() => setModal(detalle)}
        />
      )}
    </div>
  )
}
