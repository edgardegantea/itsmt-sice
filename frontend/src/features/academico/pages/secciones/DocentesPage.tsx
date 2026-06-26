import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'
import { useToastStore } from '../../../../store/toastStore'
import { Field, SkeletonRows, icls, inputCls, selectCls, usePeriodos, mutationError, extractApiErrors } from '../tabs/shared'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Carrera { id: string; nombre: string; clave: string }

interface Docente {
  id: string
  name: string
  email: string
  clave_empleado?: string
  no_huella?: string
  nombramiento?: string
  tipo_horas?: string
  carrera_id?: string | null
  carrera?: Carrera | null
  roles?: { name: string }[]
}

interface HorarioCarga {
  id: string
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  carga_academica?: {
    id: string
    materia?: { nombre: string; clave: string }
    grupo?: { clave: string; semestre: number }
  }
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

const NOMBRAMIENTO_OPTS = [
  'Docente de Tiempo Completo',
  'Docente de Medio Tiempo',
  'Docente por Horas',
  'Docente Honorario',
  'Técnico Docente',
]

const TIPO_HORAS_OPTS = ['A', 'B', 'TC', 'Honorarios', 'Mixto']

const DIAS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const DIA_COLOR: Record<string, string> = {
  lunes: 'bg-blue-50 text-blue-700 border-blue-100',
  martes: 'bg-violet-50 text-violet-700 border-violet-100',
  miercoles: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  jueves: 'bg-amber-50 text-amber-700 border-amber-100',
  viernes: 'bg-rose-50 text-rose-700 border-rose-100',
  sabado: 'bg-orange-50 text-orange-700 border-orange-100',
}

// ── API ───────────────────────────────────────────────────────────────────────

function useDocentes() {
  return useQuery({
    queryKey: ['docentes-gestion'],
    queryFn: () => apiClient.get('/admin/docentes').then(r => r.data.data as Docente[]),
    staleTime: 30_000,
  })
}

function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as Carrera[]),
    staleTime: 60_000,
  })
}

function useHorariosDocente(docenteId: string | null, periodoId: string) {
  return useQuery({
    queryKey: ['horarios-docente', docenteId, periodoId],
    enabled: !!docenteId && !!periodoId,
    queryFn: () =>
      apiClient.get('/horarios', { params: { docente_id: docenteId, periodo_id: periodoId } })
        .then(r => r.data.data as HorarioCarga[]),
    staleTime: 15_000,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Panel de horario semanal ──────────────────────────────────────────────────

function HorarioSemanalPanel({ docenteId, periodoId }: { docenteId: string; periodoId: string }) {
  const { data: horarios = [], isLoading } = useHorariosDocente(docenteId, periodoId)

  const porDia = useMemo(() => {
    const map: Record<string, HorarioCarga[]> = {}
    for (const h of horarios) {
      if (!map[h.dia_semana]) map[h.dia_semana] = []
      map[h.dia_semana].push(h)
    }
    return map
  }, [horarios])

  const diasConClases = DIAS_ORDER.filter(d => porDia[d])

  if (isLoading) return <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando horario…</div>
  if (horarios.length === 0) return (
    <div className="py-10 text-center text-slate-400 text-sm">
      No hay horarios asignados en este periodo.
    </div>
  )

  // Calcular span por día
  const totalMin = horarios.reduce((s, h) => {
    const [hi, mi] = h.hora_inicio.split(':').map(Number)
    const [hf, mf] = h.hora_fin.split(':').map(Number)
    return s + (hf * 60 + mf) - (hi * 60 + mi)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{(totalMin / 60).toFixed(1)}h</span> / semana frente a grupo
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{diasConClases.length}</span> día{diasConClases.length !== 1 ? 's' : ''} con clases
        </div>
      </div>

      {diasConClases.map(dia => {
        const bloques = [...porDia[dia]].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        const inicioMin = bloques[0].hora_inicio.split(':').map(Number).reduce((h, m) => h * 60 + m)
        const finMax = Math.max(...bloques.map(b => {
          const [h, m] = b.hora_fin.split(':').map(Number)
          return h * 60 + m
        }))
        const span = finMax - inicioMin
        const spanExcede = span > 8 * 60

        return (
          <div key={dia} className={`border rounded-xl overflow-hidden ${spanExcede ? 'border-red-200' : 'border-slate-100'}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 ${DIA_COLOR[dia] ?? 'bg-slate-50 text-slate-700 border-slate-100'} border-b`}>
              <span className="text-xs font-bold uppercase tracking-wide">{DIA_LABEL[dia]}</span>
              <span className={`text-xs font-medium ${spanExcede ? 'text-red-600' : ''}`}>
                {fmt12(bloques[0].hora_inicio)} → {fmt12(bloques[bloques.length - 1].hora_fin)}
                {' '}· {(span / 60).toFixed(1)}h{spanExcede ? ' ⚠ excede 8h' : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {bloques.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition-colors">
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {fmt12(h.hora_inicio)}–{fmt12(h.hora_fin)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {h.carga_academica?.materia?.nombre ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {h.carga_academica?.materia?.clave} · {h.carga_academica?.grupo?.clave}
                      {h.carga_academica?.grupo?.semestre && ` · ${h.carga_academica.grupo.semestre}°`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Drawer detalle/edición de docente ────────────────────────────────────────

function DocenteDrawer({
  docente,
  carreras,
  periodoId,
  onClose,
  onSaved,
}: {
  docente: Docente
  carreras: Carrera[]
  periodoId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { toast: addToast } = useToastStore()
  const [tab, setTab] = useState<'perfil' | 'horario'>('perfil')
  const [form, setForm] = useState({
    name: docente.name,
    email: docente.email,
    clave_empleado: docente.clave_empleado ?? '',
    no_huella: docente.no_huella ?? '',
    nombramiento: docente.nombramiento ?? '',
    tipo_horas: docente.tipo_horas ?? '',
    carrera_id: docente.carrera_id ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () => apiClient.patch(`/admin/usuarios/${docente.id}`, {
      name: form.name,
      email: form.email,
      clave_empleado: form.clave_empleado || null,
      no_huella: form.no_huella || null,
      nombramiento: form.nombramiento || null,
      tipo_horas: form.tipo_horas || null,
      carrera_id: form.carrera_id || null,
    }),
    onSuccess: () => {
      addToast('Datos del docente actualizados.', 'success')
      onSaved()
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials(docente.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{docente.name}</p>
            <p className="text-xs text-slate-400 truncate">{docente.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['perfil', 'horario'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'perfil' ? 'Perfil docente' : 'Horario semanal'}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'perfil' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre completo *" full error={errors.name}>
                  <input className={icls(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} />
                </Field>
                <Field label="Correo electrónico *" full error={errors.email}>
                  <input className={icls(errors.email)} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos institucionales</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Clave de empleado" error={errors.clave_empleado}>
                    <input className={icls(errors.clave_empleado)} value={form.clave_empleado}
                      placeholder="Ej. EMP-001"
                      onChange={e => set('clave_empleado', e.target.value)} />
                  </Field>
                  <Field label="No. de huella" error={errors.no_huella}>
                    <input className={icls(errors.no_huella)} value={form.no_huella}
                      placeholder="ID biométrico"
                      onChange={e => set('no_huella', e.target.value)} />
                  </Field>
                  <Field label="Nombramiento" error={errors.nombramiento}>
                    <select className={icls(errors.nombramiento)} value={form.nombramiento}
                      onChange={e => set('nombramiento', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {NOMBRAMIENTO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo de horas" error={errors.tipo_horas}>
                    <select className={icls(errors.tipo_horas)} value={form.tipo_horas}
                      onChange={e => set('tipo_horas', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {TIPO_HORAS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Adscripción</p>
                <Field label="Carrera / Departamento" error={errors.carrera_id}>
                  <select className={icls(errors.carrera_id)} value={form.carrera_id}
                    onChange={e => set('carrera_id', e.target.value)}>
                    <option value="">— Sin adscripción —</option>
                    {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
                  </select>
                </Field>
              </div>

              {/* Roles (solo lectura) */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {(docente.roles ?? []).map(r => (
                    <span key={r.name} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{r.name}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Para cambiar roles, usa el módulo de Usuarios.</p>
              </div>
            </div>
          )}

          {tab === 'horario' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Horario del periodo actual. Para modificar, usa el módulo de Cargas Académicas.</p>
              <HorarioSemanalPanel docenteId={docente.id} periodoId={periodoId} />
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'perfil' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {save.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DocentesPage() {
  const qc = useQueryClient()
  const { data: docentes = [], isLoading } = useDocentes()
  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [drawer, setDrawer] = useState<Docente | null>(null)

  // Seleccionar periodo activo por defecto
  useMemo(() => {
    if (!periodoId && periodos.length) {
      const activo = periodos.find((p: { id: string; nombre: string; activo: boolean }) => p.activo)
      setPeriodoId(activo?.id ?? periodos[0].id)
    }
  }, [periodos, periodoId])

  const docentesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return docentes.filter(d => {
      if (filtroCarrera && d.carrera_id !== filtroCarrera) return false
      if (q && !d.name.toLowerCase().includes(q) &&
          !d.email.toLowerCase().includes(q) &&
          !(d.clave_empleado ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [docentes, busqueda, filtroCarrera])

  const sinDatos = docentes.filter(d => !d.clave_empleado || !d.nombramiento).length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Docentes</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestión de datos institucionales y horarios del personal docente</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Total docentes</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{docentes.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Con datos completos</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{docentes.length - sinDatos}</p>
          </div>
          <div className={`border rounded-xl px-4 py-3 ${sinDatos > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs ${sinDatos > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Datos incompletos</p>
            <p className={`text-2xl font-bold mt-0.5 ${sinDatos > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{sinDatos}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Carreras cubiertas</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{new Set(docentes.map(d => d.carrera_id).filter(Boolean)).size}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
              <input className={inputCls} placeholder="Nombre, correo, clave…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
              <select className={selectCls} value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
                <option value="">Todas las carreras</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo (para horario)</label>
              <select className={selectCls} value={periodoId} onChange={e => setPeriodoId(e.target.value)}>
                {periodos.map((p: { id: string; nombre: string; activo: boolean }) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><SkeletonRows cols={6} /></tbody></table>
          </div>
        ) : docentesFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400">
            <p className="text-sm">No hay docentes con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombramiento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo hrs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">No. huella</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docentesFiltrados.map(d => {
                  const incompleto = !d.clave_empleado || !d.nombramiento
                  return (
                    <tr key={d.id}
                      onClick={() => setDrawer(d)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials(d.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{d.name}</p>
                            <p className="text-xs text-slate-400 truncate">{d.email}</p>
                          </div>
                          {incompleto && (
                            <span className="ml-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                              incompleto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.clave_empleado ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{d.nombramiento ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {d.tipo_horas ? (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">{d.tipo_horas}</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.carrera?.clave ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.no_huella ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setDrawer(d) }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawer && (
        <DocenteDrawer
          docente={drawer}
          carreras={carreras}
          periodoId={periodoId}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['docentes-gestion'] })
            setDrawer(null)
          }}
        />
      )}
    </div>
  )
}
