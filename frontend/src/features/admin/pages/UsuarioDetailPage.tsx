import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Carrera { id: string; nombre: string; clave: string }

interface Usuario {
  id: string
  name: string
  email: string
  roles: { name: string }[]
  carrera_id: string | null
  carrera: Carrera | null
  // Carreras en las que imparte clase (docente_carrera) — distinto de carrera_id,
  // que es la carrera que administra un jefe_carrera. Un docente puede dar
  // clases en varias; sin esto asignado no aparece al filtrar por carrera en
  // el constructor de horarios (Academico\CargaAcademicaController::docentes).
  carreras?: Array<Carrera & { pivot?: { horas_asignadas: number | null } }>
  created_at: string
  updated_at?: string
  activo: boolean
}

// Roles que puede tocar el filtro "por carrera" del constructor de horarios
// (coincide con User::role([...]) en CargaAcademicaController::docentes).
const ROLES_MULTI_CARRERA = ['docente', 'jefe_carrera', 'director_academico']

type ApiErr = { response?: { data?: { message?: string; errors?: Record<string, string | string[]> } } }

// ── API ───────────────────────────────────────────────────────────────────────

const usuariosApi = {
  get:     (id: string)                        => apiClient.get(`/admin/usuarios/${id}`).then(r => r.data.data as Usuario),
  roles:   ()                                  => apiClient.get('/admin/roles').then(r => r.data.data as string[]),
  carreras:()                                  => apiClient.get('/admin/carreras').then(r => r.data.data as Carrera[]),
  update:  (id: string, d: Record<string, unknown>) => apiClient.patch(`/admin/usuarios/${id}`, d).then(r => r.data.data as Usuario),
  destroy: (id: string)                        => apiClient.delete(`/admin/usuarios/${id}`).then(r => r.data),
  toggleActivo: (id: string, activo: boolean)  => apiClient.patch(`/admin/usuarios/${id}/activo`, { activo }).then(r => r.data.data as Usuario),
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  superadmin:              'Superadministrador',
  admin:                   'Administrador',
  director_academico:      'Director Académico',
  jefe_carrera:            'Jefe de Carrera',
  docente:                 'Docente',
  alumno:                  'Alumno',
  personal_administrativo: 'Personal Administrativo',
}

const ROLE_COLOR: Record<string, string> = {
  superadmin:              'bg-rose-100 text-rose-900',
  admin:                   'bg-red-100 text-red-800',
  director_academico:      'bg-purple-100 text-purple-800',
  jefe_carrera:            'bg-brand-100 text-brand-800',
  docente:                 'bg-cyan-100 text-cyan-800',
  alumno:                  'bg-green-100 text-green-800',
  personal_administrativo: 'bg-amber-100 text-amber-800',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${value ? 'text-slate-800' : 'text-slate-300'}`}>{value ?? '—'}</p>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
      {initials}
    </div>
  )
}

// ── Modal editar ──────────────────────────────────────────────────────────────

function EditModal({ usuario, roles, carreras, onClose }: { usuario: Usuario; roles: string[]; carreras: Carrera[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const [form, setForm] = useState({
    name:       usuario.name,
    email:      usuario.email,
    password:   '',
    carrera_id: usuario.carrera_id ?? '',
  })
  // Un usuario puede tener más de un rol (p. ej. personal_administrativo que
  // también da clases como docente).
  const [rolesSel, setRolesSel] = useState<string[]>(() => usuario.roles.map(r => r.name))
  function toggleRol(r: string) {
    setRolesSel(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }
  // id de carrera -> horas asignadas (null si no se especificó). Solo las
  // carreras presentes aquí quedan marcadas.
  const [carrerasImparte, setCarrerasImparte] = useState<Record<string, number | null>>(
    () => Object.fromEntries((usuario.carreras ?? []).map(c => [c.id, c.pivot?.horas_asignadas ?? null]))
  )
  const [errors, setErrors] = useState<Record<string, string | string[]>>({})

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, roles: rolesSel, carrera_id: form.carrera_id || null }
      if (form.password) payload.password = form.password
      if (rolesSel.some(r => ROLES_MULTI_CARRERA.includes(r))) {
        payload.carreras = Object.entries(carrerasImparte).map(([id, horas_asignadas]) => ({ id, horas_asignadas }))
      }
      return usuariosApi.update(usuario.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario', usuario.id] })
      addToast('Usuario actualizado.', 'success')
      onClose()
    },
    onError: (err: ApiErr) => {
      setErrors(err?.response?.data?.errors ?? {})
      addToast(err?.response?.data?.message ?? 'Error al actualizar.', 'error')
    },
  })

  const needsCarrera = rolesSel.includes('jefe_carrera')
  const puedeImpartirVariasCarreras = rolesSel.some(r => ROLES_MULTI_CARRERA.includes(r))

  function toggleCarreraImparte(id: string) {
    setCarrerasImparte(prev => {
      const next = { ...prev }
      if (id in next) delete next[id]
      else next[id] = null
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Editar usuario</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña (dejar en blanco para no cambiar)</label>
            <input className={inputCls} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Roles</label>
            <p className="text-xs text-slate-400 mb-2">Un usuario puede tener más de uno — p. ej. personal administrativo que también da clases.</p>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {roles.map(r => (
                <label key={r} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={rolesSel.includes(r)} onChange={() => toggleRol(r)} className="w-4 h-4 accent-brand-600" />
                  <span className="text-slate-700">{ROLE_LABEL[r] ?? r}</span>
                </label>
              ))}
            </div>
            {errors.roles && <p className="text-red-500 text-xs mt-1">{errors.roles}</p>}
            {rolesSel.length === 0 && <p className="text-xs text-red-500 mt-1">Selecciona al menos un rol.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera asignada {needsCarrera && <span className="text-red-500">*</span>}</label>
            <select className={inputCls} value={form.carrera_id} onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))}>
              <option value="">— Sin carrera asignada —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
            </select>
            {needsCarrera && <p className="text-xs text-slate-400 mt-1">El jefe de carrera solo verá los datos de esta carrera.</p>}
          </div>
          {puedeImpartirVariasCarreras && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Carreras en las que imparte clase</label>
              <p className="text-xs text-slate-400 mb-2">Distinto de la carrera asignada arriba — esto es lo que usa el constructor de horarios para filtrar docentes por carrera.</p>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {carreras.map(c => {
                  const marcada = c.id in carrerasImparte
                  return (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={marcada} onChange={() => toggleCarreraImparte(c.id)} className="w-4 h-4 accent-brand-600" />
                      <span className="flex-1 text-slate-700">{c.nombre} ({c.clave})</span>
                      {marcada && (
                        <input
                          type="number" min={0} max={80} placeholder="hrs"
                          value={carrerasImparte[c.id] ?? ''}
                          onChange={e => setCarrerasImparte(prev => ({ ...prev, [c.id]: e.target.value === '' ? null : Number(e.target.value) }))}
                          onClick={e => e.stopPropagation()}
                          className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-right"
                        />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button disabled={isPending || rolesSel.length === 0} onClick={() => mutate()} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function UsuarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const [modalEditar, setModalEditar] = useState(false)

  const { data: usuario, isLoading, isError } = useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosApi.get(id!),
    enabled: !!id,
  })

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: usuariosApi.roles, staleTime: Infinity })
  const { data: carreras = [] } = useQuery({ queryKey: ['carreras-select'], queryFn: usuariosApi.carreras, staleTime: 60_000 })

  const deleteMut = useMutation({
    mutationFn: () => usuariosApi.destroy(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario eliminado.', 'success')
      navigate('/admin/usuarios')
    },
    onError: (err: ApiErr) => addToast(err?.response?.data?.message ?? 'Error al eliminar.', 'error'),
  })

  const confirmarEliminar = () => {
    if (!window.confirm(`¿Eliminar a "${usuario?.name}"? Esta acción no se puede deshacer.`)) return
    deleteMut.mutate()
  }

  const toggleActivoMut = useMutation({
    mutationFn: (activo: boolean) => usuariosApi.toggleActivo(id!, activo),
    onSuccess: (_, activo) => {
      qc.invalidateQueries({ queryKey: ['usuario', id] })
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast(activo ? 'Usuario activado.' : 'Usuario desactivado.', 'success')
    },
    onError: (err: ApiErr) => addToast(err?.response?.data?.message ?? 'Error al cambiar el estado.', 'error'),
  })

  const confirmarToggleActivo = () => {
    const activar = !usuario?.activo
    if (!activar && !window.confirm(`¿Desactivar a "${usuario?.name}"? No podrá iniciar sesión hasta que lo reactives.`)) return
    toggleActivoMut.mutate(activar)
  }

  if (isLoading) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>

  if (isError || !usuario) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No se encontró el usuario.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-brand-600 hover:underline">← Volver</button>
      </div>
    )
  }

  const nombresRoles = usuario.roles.map(r => r.name)

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/usuarios')}
          className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar name={usuario.name} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{usuario.name}</h1>
              {nombresRoles.map(rol => (
                <span key={rol} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[rol] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABEL[rol] ?? rol}
                </span>
              ))}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${usuario.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                {usuario.activo ? 'Activo' : 'Desactivado'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{usuario.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalEditar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Editar
          </button>
          <button
            onClick={confirmarToggleActivo}
            disabled={toggleActivoMut.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg disabled:opacity-50 ${
              usuario.activo ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {toggleActivoMut.isPending ? 'Guardando…' : usuario.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={confirmarEliminar}
            disabled={deleteMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>

      {/* ── Información de cuenta ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Información de cuenta</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Campo label="Nombre completo" value={usuario.name} />
          <Campo label="Correo electrónico" value={usuario.email} />
          <Campo label="Roles" value={nombresRoles.length > 0 ? nombresRoles.map(r => ROLE_LABEL[r] ?? r).join(', ') : null} />
          <Campo label="Carrera asignada" value={usuario.carrera ? `${usuario.carrera.clave} — ${usuario.carrera.nombre}` : null} />
          <Campo label="Creado" value={new Date(usuario.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} />
        </div>
      </div>

      {modalEditar && (
        <EditModal
          usuario={usuario}
          roles={roles}
          carreras={carreras}
          onClose={() => setModalEditar(false)}
        />
      )}
    </div>
  )
}
