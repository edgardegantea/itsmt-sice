import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { permanenciaApi, type Reinscripcion, type Baja, type Adeudo, type OrdenReinscripcion, type TipoBaja } from '../services/permanencia'
import { mutationError } from '../../academico/pages/tabs/shared'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const ESTATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}

type CarreraItem = { id: string; nombre: string; clave: string }
type PeriodoItem = { id: string; nombre: string; activo: boolean }

function useCarreras() {
  return useQuery<CarreraItem[]>({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data?.data ?? r.data.data),
  })
}

function usePeriodos() {
  return useQuery<PeriodoItem[]>({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data),
  })
}

// ── Tab: Reinscripciones ───────────────────────────────────────────────────────

function AccionModal({ r, onClose }: { r: Reinscripcion; onClose: () => void }) {
  const qc = useQueryClient()
  const [estatus, setEstatus] = useState<'aprobada' | 'rechazada'>('aprobada')
  const [observaciones, setObservaciones] = useState('')

  const mut = useMutation({
    mutationFn: () => permanenciaApi.actualizarEstatusReinscripcion(r.id, estatus, observaciones || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reinscripciones-admin'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Gestionar reinscripción</h3>
          <p className="text-sm text-slate-500 mt-0.5">{r.alumno?.user?.name} — NC: {r.alumno?.numero_control}</p>
        </div>

        <div className="flex gap-3">
          {(['aprobada', 'rechazada'] as const).map(e => (
            <button
              key={e}
              onClick={() => setEstatus(e)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                estatus === e
                  ? e === 'aprobada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-500'
              }`}
            >{e === 'aprobada' ? 'Aprobar' : 'Rechazar'}</button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]"
            placeholder="Motivo de rechazo o nota…"
          />
        </div>

        {mut.isError && <p className="text-xs text-red-600">{mutationError(mut.error)}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >{mut.isPending ? 'Guardando…' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

function TabReinscripciones() {
  const qc = useQueryClient()
  const [filtroEstatus,  setFiltroEstatus]  = useState('')
  const [filtroCarrera,  setFiltroCarrera]  = useState('')
  const [filtroPeriodo,  setFiltroPeriodo]  = useState('')
  const [seleccionada,   setSeleccionada]   = useState<Reinscripcion | null>(null)

  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus    = filtroEstatus
  if (filtroCarrera) params.carrera_id = filtroCarrera
  if (filtroPeriodo) params.periodo_id = filtroPeriodo

  const { data, isLoading } = useQuery({
    queryKey: ['reinscripciones-admin', params],
    queryFn: () => permanenciaApi.getReinscripciones(params),
  })

  const mutResello = useMutation({
    mutationFn: (id: string) => permanenciaApi.registrarResello(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reinscripciones-admin'] }),
  })

  const reinscripciones: Reinscripcion[] = data?.data ?? data ?? []

  const selectCls = "px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={selectCls}>
          <option value="">Todos los estatus</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)} className={selectCls}>
          <option value="">Todas las carreras</option>
          {carreras.map((c) => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
        </select>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className={selectCls}>
          <option value="">Todos los periodos</option>
          {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Cargando…</p>
      ) : reinscripciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No hay solicitudes de reinscripción.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Alumno', 'NC', 'Carrera', 'Periodo', 'Estatus', 'Resello', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reinscripciones.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.alumno?.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.alumno?.numero_control}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{r.alumno?.carrera?.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{r.periodo?.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge label={r.estatus} color={ESTATUS_COLOR[r.estatus]} />
                  </td>
                  <td className="px-4 py-3">
                    {r.resello_registrado
                      ? <span className="flex items-center gap-2">
                          <span className="text-xs text-green-700">✓ {r.fecha_resello ? new Date(r.fecha_resello + 'T12:00:00').toLocaleDateString('es-MX') : ''}</span>
                          {r.alumno?.inscripcion_id && (
                            <a
                              href={`${import.meta.env.VITE_API_URL ?? ''}/api/inscripciones/${r.alumno.inscripcion_id}/credencial/pdf`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-[#1a3a5c] hover:underline"
                            >Sticker</a>
                          )}
                        </span>
                      : r.estatus === 'aprobada'
                        ? <button onClick={() => mutResello.mutate(r.id)} disabled={mutResello.isPending}
                            className="text-xs text-[#1a3a5c] hover:underline disabled:opacity-50">Registrar</button>
                        : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.estatus === 'pendiente' && (
                      <button onClick={() => setSeleccionada(r)} className="text-xs font-medium text-[#1a3a5c] hover:underline">Gestionar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && <AccionModal r={seleccionada} onClose={() => setSeleccionada(null)} />}
    </div>
  )
}

// ── Tab: Orden de reinscripción ────────────────────────────────────────────────

function TabOrdenReinscripcion() {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const [periodoConsulta, setPeriodoConsulta] = useState('')
  const [form, setForm] = useState({
    periodo_id: '', carrera_id: '', semestre: '1',
    fecha_inicio_reinscripcion: '', fecha_fin_reinscripcion: '',
  })
  const [error, setError] = useState('')

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes-reinscripcion', periodoConsulta],
    queryFn: () => permanenciaApi.getOrdenReinscripcion(periodoConsulta),
    enabled: !!periodoConsulta,
  })

  const mut = useMutation({
    mutationFn: () => permanenciaApi.publicarOrden({
      periodo_id: form.periodo_id,
      carrera_id: form.carrera_id,
      semestre: parseInt(form.semestre),
      fecha_inicio_reinscripcion: form.fecha_inicio_reinscripcion,
      fecha_fin_reinscripcion: form.fecha_fin_reinscripcion,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordenes-reinscripcion'] })
      setForm({ periodo_id: '', carrera_id: '', semestre: '1', fecha_inicio_reinscripcion: '', fecha_fin_reinscripcion: '' })
      setError('')
    },
    onError: (e) => setError(mutationError(e)),
  })

  const inp = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"

  return (
    <div className="space-y-6">
      {/* Publicar nueva orden */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Publicar calendario de reinscripción</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select value={form.periodo_id} onChange={e => setForm(f => ({...f, periodo_id: e.target.value}))} className={inp}>
              <option value="">Seleccionar…</option>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select value={form.carrera_id} onChange={e => setForm(f => ({...f, carrera_id: e.target.value}))} className={inp}>
              <option value="">Seleccionar…</option>
              {carreras.map((c) => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestre</label>
            <select value={form.semestre} onChange={e => setForm(f => ({...f, semestre: e.target.value}))} className={inp}>
              {[1,2,3,4,5,6,7,8,9].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio</label>
            <input type="date" value={form.fecha_inicio_reinscripcion}
              onChange={e => setForm(f => ({...f, fecha_inicio_reinscripcion: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin</label>
            <input type="date" value={form.fecha_fin_reinscripcion}
              onChange={e => setForm(f => ({...f, fecha_fin_reinscripcion: e.target.value}))} className={inp} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.periodo_id || !form.carrera_id || !form.fecha_inicio_reinscripcion}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >{mut.isPending ? 'Publicando…' : 'Publicar orden'}</button>
        </div>
      </div>

      {/* Consultar órdenes publicadas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Calendarios publicados</h3>
        <div className="flex gap-3 mb-4">
          <select value={periodoConsulta} onChange={e => setPeriodoConsulta(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30">
            <option value="">Seleccionar periodo…</option>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        {!periodoConsulta ? (
          <p className="text-sm text-slate-400 text-center py-6">Selecciona un periodo para ver las órdenes publicadas.</p>
        ) : isLoading ? (
          <p className="text-sm text-slate-400 text-center py-6">Cargando…</p>
        ) : ordenes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin órdenes publicadas para este periodo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>{['Carrera', 'Semestre', 'Inicio reinscripción', 'Fin reinscripción'].map(h =>
                <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(ordenes as OrdenReinscripcion[]).map(o => (
                <tr key={o.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="py-2.5 pr-4 text-slate-700">{o.carrera?.nombre ?? o.carrera_id}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{o.semestre}°</td>
                  <td className="py-2.5 pr-4 text-slate-600">{o.fecha_inicio_reinscripcion ? new Date(o.fecha_inicio_reinscripcion + 'T12:00:00').toLocaleDateString('es-MX') : '—'}</td>
                  <td className="py-2.5 text-slate-600">{o.fecha_fin_reinscripcion ? new Date(o.fecha_fin_reinscripcion + 'T12:00:00').toLocaleDateString('es-MX') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab: Adeudos ───────────────────────────────────────────────────────────────

function NuevoAdeudoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [alumnoId, setAlumnoId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () => permanenciaApi.crearAdeudo({ alumno_id: alumnoId, concepto, monto: parseFloat(monto) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adeudos-admin'] }); onClose() },
    onError: (e) => setError(mutationError(e)),
  })

  const inp = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-800">Registrar adeudo</h3>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">ID del alumno (UUID)</label>
          <input value={alumnoId} onChange={e => setAlumnoId(e.target.value)} className={inp} placeholder="uuid del alumno…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Concepto</label>
          <input value={concepto} onChange={e => setConcepto(e.target.value)} className={inp} placeholder="Ej. Credencial, Biblioteca…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Monto ($)</label>
          <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} className={inp} placeholder="0.00" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !alumnoId || !concepto || !monto}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >{mut.isPending ? 'Guardando…' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  )
}

function TabAdeudos() {
  const qc = useQueryClient()
  const [filtroPagado, setFiltroPagado] = useState('false')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [showNuevo, setShowNuevo] = useState(false)

  const { data: carreras = [] } = useCarreras()

  const params: Record<string, string> = { pagado: filtroPagado }
  if (filtroCarrera) params.carrera_id = filtroCarrera

  const { data, isLoading } = useQuery({
    queryKey: ['adeudos-admin', params],
    queryFn: () => permanenciaApi.getAdeudosAdmin(params),
  })

  const mutPagar = useMutation({
    mutationFn: (id: string) => permanenciaApi.marcarAdeudoPagado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adeudos-admin'] }),
  })

  const mutEliminar = useMutation({
    mutationFn: (id: string) => permanenciaApi.eliminarAdeudo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adeudos-admin'] }),
  })

  const adeudos: Adeudo[] = data?.data ?? data ?? []

  const selectCls = "px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filtroPagado} onChange={e => setFiltroPagado(e.target.value)} className={selectCls}>
          <option value="false">Pendientes de pago</option>
          <option value="true">Pagados</option>
          <option value="">Todos</option>
        </select>
        <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)} className={selectCls}>
          <option value="">Todas las carreras</option>
          {carreras.map((c) => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
        </select>
        <button
          onClick={() => setShowNuevo(true)}
          className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primario)' }}
        >+ Registrar adeudo</button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
      ) : adeudos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No hay adeudos en este filtro.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Alumno', 'NC', 'Carrera', 'Concepto', 'Monto', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adeudos.map(a => (
                <tr key={a.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.alumno?.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.alumno?.numero_control}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{a.alumno?.carrera?.clave}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{a.concepto}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">${parseFloat(a.monto).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge label={a.pagado ? 'Pagado' : 'Pendiente'}
                      color={a.pagado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} />
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    {!a.pagado && (
                      <button onClick={() => mutPagar.mutate(a.id)}
                        disabled={mutPagar.isPending}
                        className="text-xs text-green-700 hover:underline disabled:opacity-50">Marcar pagado</button>
                    )}
                    <button onClick={() => { if (confirm('¿Eliminar este adeudo?')) mutEliminar.mutate(a.id) }}
                      disabled={mutEliminar.isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNuevo && <NuevoAdeudoModal onClose={() => setShowNuevo(false)} />}
    </div>
  )
}

// ── Tab: Bajas ─────────────────────────────────────────────────────────────────

const TIPO_BAJA_COLOR: Record<string, string> = {
  parcial:    'bg-blue-100 text-blue-700',
  temporal:   'bg-orange-100 text-orange-700',
  definitiva: 'bg-red-100 text-red-700',
}

function RegistrarBajaModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: periodos = [] } = usePeriodos()
  const [form, setForm] = useState({
    alumno_id: '', periodo_id: '', tipo_baja: 'temporal',
    motivo_texto: '', fecha_solicitud: new Date().toISOString().split('T')[0],
    numero_semestres_cursados: '', reingreso_posible: true,
  })
  const [busquedaNC, setBusquedaNC] = useState('')
  const [alumnoNombre, setAlumnoNombre] = useState('')
  const [error, setError] = useState('')

  const { data: alumnosResult = [], isFetching: buscandoAlumno } = useQuery<{ id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }[]>({
    queryKey: ['alumno-busqueda-baja', busquedaNC],
    queryFn: () => apiClient.get('/alumnos', { params: { numero_control: busquedaNC } }).then(r => r.data.data?.data ?? r.data.data),
    enabled: busquedaNC.length >= 3,
  })

  const mut = useMutation({
    mutationFn: () => permanenciaApi.registrarBaja({
      alumno_id: form.alumno_id,
      periodo_id: form.periodo_id,
      tipo_baja: form.tipo_baja as TipoBaja,
      motivo_texto: form.motivo_texto || undefined,
      fecha_solicitud: form.fecha_solicitud,
      numero_semestres_cursados: form.numero_semestres_cursados ? parseInt(form.numero_semestres_cursados) : undefined,
      reingreso_posible: form.reingreso_posible,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bajas-admin'] }); onClose() },
    onError: (e) => setError(mutationError(e)),
  })

  const inp = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
  const f = (k: keyof typeof form, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 my-8">
        <h3 className="text-base font-semibold text-slate-800">Registrar baja</h3>

        {/* Búsqueda por número de control */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Número de control del alumno</label>
          <input
            value={busquedaNC}
            onChange={e => { setBusquedaNC(e.target.value); setAlumnoNombre(''); f('alumno_id', '') }}
            className={inp}
            placeholder="Ej. 22200100"
          />
          {buscandoAlumno && <p className="text-xs text-slate-400">Buscando…</p>}
          {alumnosResult.length > 0 && !form.alumno_id && (
            <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-sm">
              {alumnosResult.slice(0, 5).map(a => (
                <li
                  key={a.id}
                  onClick={() => { f('alumno_id', a.id); setBusquedaNC(a.numero_control); setAlumnoNombre(a.user?.name ?? '') }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="font-mono text-slate-700">{a.numero_control}</span>
                  {' — '}<span className="text-slate-600">{a.user?.name}</span>
                  {a.carrera && <span className="text-slate-400 text-xs ml-1">({a.carrera.nombre})</span>}
                </li>
              ))}
            </ul>
          )}
          {form.alumno_id && (
            <p className="text-xs text-green-600 font-medium">✓ {alumnoNombre}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select value={form.periodo_id} onChange={e => f('periodo_id', e.target.value)} className={inp}>
              <option value="">Seleccionar…</option>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de baja</label>
            <select value={form.tipo_baja} onChange={e => f('tipo_baja', e.target.value)} className={inp}>
              <option value="parcial">Parcial</option>
              <option value="temporal">Temporal</option>
              <option value="definitiva">Definitiva</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de solicitud</label>
            <input type="date" value={form.fecha_solicitud} onChange={e => f('fecha_solicitud', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestres cursados</label>
            <input type="number" min="0" value={form.numero_semestres_cursados}
              onChange={e => f('numero_semestres_cursados', e.target.value)} className={inp} placeholder="0" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
            <textarea rows={2} value={form.motivo_texto} onChange={e => f('motivo_texto', e.target.value)}
              className={inp + ' resize-none'} placeholder="Descripción del motivo…" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="reingreso" checked={form.reingreso_posible}
              onChange={e => f('reingreso_posible', e.target.checked)} className="rounded" />
            <label htmlFor="reingreso" className="text-sm text-slate-700">Reingreso posible</label>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.alumno_id || !form.periodo_id || !form.fecha_solicitud}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >{mut.isPending ? 'Guardando…' : 'Registrar baja'}</button>
        </div>
      </div>
    </div>
  )
}

function TabBajas() {
  const [filtroTipo,    setFiltroTipo]    = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [showModal,     setShowModal]     = useState(false)

  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const params: Record<string, string> = {}
  if (filtroTipo)    params.tipo_baja  = filtroTipo
  if (filtroCarrera) params.carrera_id = filtroCarrera
  if (filtroPeriodo) params.periodo_id = filtroPeriodo

  const { data, isLoading } = useQuery({
    queryKey: ['bajas-admin', params],
    queryFn: () => permanenciaApi.getBajas(params),
  })

  const bajas: Baja[] = data?.data ?? data ?? []

  const selectCls = "px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={selectCls}>
          <option value="">Todos los tipos</option>
          <option value="parcial">Parcial</option>
          <option value="temporal">Temporal</option>
          <option value="definitiva">Definitiva</option>
        </select>
        <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)} className={selectCls}>
          <option value="">Todas las carreras</option>
          {carreras.map((c) => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
        </select>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className={selectCls}>
          <option value="">Todos los periodos</option>
          {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primario)' }}
        >+ Registrar baja</button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
      ) : bajas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No hay bajas registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Alumno', 'NC', 'Tipo', 'Periodo', 'F. Solicitud', 'Reingreso', 'Motivo'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bajas.map(b => (
                <tr key={b.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{b.alumno?.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.alumno?.numero_control}</td>
                  <td className="px-4 py-3">
                    <Badge label={b.tipo_baja} color={TIPO_BAJA_COLOR[b.tipo_baja]} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.periodo?.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{b.fecha_solicitud ? new Date(b.fecha_solicitud + 'T12:00:00').toLocaleDateString('es-MX') : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${b.reingreso_posible ? 'text-green-700' : 'text-slate-400'}`}>
                      {b.reingreso_posible ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate text-xs">{b.motivo_texto ?? b.motivo_enum ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <RegistrarBajaModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ── Root page ──────────────────────────────────────────────────────────────────

type Tab = 'reinscripciones' | 'orden' | 'adeudos' | 'bajas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'reinscripciones', label: 'Reinscripciones' },
  { id: 'orden',           label: 'Orden de reinscripción' },
  { id: 'adeudos',         label: 'Adeudos' },
  { id: 'bajas',           label: 'Bajas' },
]

export default function ReinscripcionesAdminPage() {
  const [tab, setTab] = useState<Tab>('reinscripciones')

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Permanencia</h1>
        <p className="text-sm text-slate-500 mt-0.5">Reinscripciones, adeudos, bajas y calendarios.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#1a3a5c] text-[#1a3a5c]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'reinscripciones' && <TabReinscripciones />}
      {tab === 'orden'           && <TabOrdenReinscripcion />}
      {tab === 'adeudos'         && <TabAdeudos />}
      {tab === 'bajas'           && <TabBajas />}
    </div>
  )
}
