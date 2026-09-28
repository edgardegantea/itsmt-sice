import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { Plus } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ApiErr = { response?: { data?: { message?: string; errors?: Record<string, string | string[]> } } }

interface Carrera { id: string; nombre: string; clave: string }

interface Usuario {
  id: string
  name: string
  email: string
  roles: { name: string }[]
  carrera_id: string | null
  carrera: Carrera | null
  // Carreras en las que imparte clase (docente_carrera) — distinto de carrera_id,
  // que es la carrera que administra un jefe_carrera. Sin esto asignado, el
  // docente no aparece al filtrar por carrera en el constructor de horarios.
  carreras?: Array<Carrera & { pivot?: { horas_asignadas: number | null } }>
  created_at: string
  activo: boolean
}

// Roles que puede tocar el filtro "por carrera" del constructor de horarios
// (coincide con User::role([...]) en CargaAcademicaController::docentes).
const ROLES_MULTI_CARRERA = ['docente', 'jefe_carrera', 'director_academico']

// ── API ───────────────────────────────────────────────────────────────────────

const usuariosApi = {
  list:    (params?: Record<string, string>) =>
    apiClient.get('/admin/usuarios', { params }).then(r => r.data.data),
  roles:   () =>
    apiClient.get('/admin/roles').then(r => r.data.data as string[]),
  carreras: () =>
    apiClient.get('/admin/carreras').then(r => r.data.data as Carrera[]),
  create:  (d: Record<string, unknown>) =>
    apiClient.post('/admin/usuarios', d).then(r => r.data.data as Usuario),
  update:  (id: string, d: Record<string, unknown>) =>
    apiClient.patch(`/admin/usuarios/${id}`, d).then(r => r.data.data as Usuario),
  destroy: (id: string) =>
    apiClient.delete(`/admin/usuarios/${id}`).then(r => r.data),
  toggleActivo: (id: string, activo: boolean) =>
    apiClient.patch(`/admin/usuarios/${id}/activo`, { activo }).then(r => r.data.data as Usuario),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  superadmin:              'Superadministrador',
  admin:                   'Administrador',
  director_academico:      'Director Académico',
  jefe_carrera:            'Jefe de Carrera',
  docente:                 'Docente',
  alumno:                  'Alumno',
  personal_administrativo: 'Personal Administrativo',
  control_escolar:         'Control Escolar',
  direccion_general:       'Dirección General',
  direccion_academica:     'Dirección Académica',
  subdireccion_academica:  'Subdirección Académica',
}

const ROLE_COLOR: Record<string, string> = {
  superadmin:              'bg-rose-100 text-rose-900 font-semibold',
  admin:                   'bg-red-100 text-red-800',
  director_academico:      'bg-purple-100 text-purple-800',
  jefe_carrera:            'bg-brand-100 text-brand-800',
  docente:                 'bg-cyan-100 text-cyan-800',
  alumno:                  'bg-green-100 text-green-800',
  personal_administrativo: 'bg-amber-100 text-amber-800',
  control_escolar:         'bg-teal-100 text-teal-800',
  direccion_general:       'bg-indigo-100 text-indigo-800',
  direccion_academica:     'bg-violet-100 text-violet-800',
  subdireccion_academica:  'bg-fuchsia-100 text-fuchsia-800',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

// ── Modal crear / editar ──────────────────────────────────────────────────────

interface ModalProps {
  usuario?: Usuario | null
  roles: string[]
  carreras: Carrera[]
  onClose: () => void
}

function UsuarioModal({ usuario, roles, carreras, onClose }: ModalProps) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const isEdit = !!usuario

  const [form, setForm] = useState({
    name:       usuario?.name       ?? '',
    email:      usuario?.email      ?? '',
    password:   '',
    carrera_id: usuario?.carrera_id ?? '',
  })
  // Un usuario puede tener más de un rol (p. ej. personal_administrativo que
  // también da clases como docente).
  const [rolesSel, setRolesSel] = useState<string[]>(
    () => usuario?.roles.map(r => r.name) ?? ['personal_administrativo']
  )
  function toggleRol(r: string) {
    setRolesSel(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }
  // id de carrera -> horas asignadas (null si no se especificó). Solo las
  // carreras presentes aquí quedan marcadas.
  const [carrerasImparte, setCarrerasImparte] = useState<Record<string, number | null>>(
    () => Object.fromEntries((usuario?.carreras ?? []).map(c => [c.id, c.pivot?.horas_asignadas ?? null]))
  )
  const [errors, setErrors] = useState<Record<string, string | string[]>>({})

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

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

  const carrerasPayload = () => puedeImpartirVariasCarreras
    ? Object.entries(carrerasImparte).map(([id, horas_asignadas]) => ({ id, horas_asignadas }))
    : undefined

  const createMut = useMutation({
    mutationFn: () => usuariosApi.create({
      ...form,
      roles: rolesSel,
      carrera_id: form.carrera_id || null,
      ...(carrerasPayload() ? { carreras: carrerasPayload() } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario creado correctamente.', 'success')
      onClose()
    },
    onError: (err: ApiErr) => {
      setErrors(err?.response?.data?.errors ?? {})
      addToast(err?.response?.data?.message ?? 'Error al crear usuario.', 'error')
    },
  })

  const updateMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name:       form.name,
        email:      form.email,
        roles:      rolesSel,
        carrera_id: form.carrera_id || null,
      }
      if (form.password) payload.password = form.password
      if (carrerasPayload()) payload.carreras = carrerasPayload()
      return usuariosApi.update(usuario!.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario actualizado.', 'success')
      onClose()
    },
    onError: (err: ApiErr) => {
      setErrors(err?.response?.data?.errors ?? {})
      addToast(err?.response?.data?.message ?? 'Error al actualizar.', 'error')
    },
  })

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre Apellido" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@itsmt.edu.mx" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isEdit ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
            </label>
            <input className={inputCls} type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
              autoComplete="new-password" />
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Carrera asignada {needsCarrera && <span className="text-red-500">*</span>}
            </label>
            <select className={inputCls} value={form.carrera_id} onChange={e => set('carrera_id', e.target.value)}>
              <option value="">— Sin carrera asignada —</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>
              ))}
            </select>
            {errors.carrera_id && <p className="text-red-500 text-xs mt-1">{errors.carrera_id}</p>}
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            Cancelar
          </button>
          <button
            disabled={isPending || rolesSel.length === 0}
            onClick={() => isEdit ? updateMut.mutate() : createMut.mutate()}
            className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal credenciales (solo superadmin) ──────────────────────────────────────

function CredencialesModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [email, setEmail]       = useState(usuario.email)
  const [password, setPassword] = useState('')
  const [errors, setErrors]     = useState<Record<string, string | string[]>>({})

  const mut = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {}
      if (email !== usuario.email) payload.email = email
      if (password) payload.password = password
      return apiClient.patch(`/admin/usuarios/${usuario.id}/credenciales`, payload).then(r => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Credenciales actualizadas. Las sesiones activas fueron cerradas.', 'success')
      onClose()
    },
    onError: (err: ApiErr) => {
      setErrors(err?.response?.data?.errors ?? {})
      addToast(err?.response?.data?.message ?? 'Error al actualizar credenciales.', 'error')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Cambiar credenciales</h2>
            <p className="text-xs text-slate-500 mt-0.5">{usuario.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@itsmt.edu.mx"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nueva contraseña <span className="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Al guardar se cerrarán todas las sesiones activas del usuario.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            Cancelar
          </button>
          <button
            disabled={mut.isPending || (email === usuario.email && !password)}
            onClick={() => mut.mutate()}
            className="px-5 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Guardando…' : 'Actualizar acceso'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const [busqueda, setBusqueda]           = useState('')
  const [filtroRol, setFiltroRol]         = useState('')
  const [modalUsuario, setModalUsuario]   = useState<Usuario | null | false>(false)
  const [modalCreds, setModalCreds]       = useState<Usuario | null>(null)

  const params: Record<string, string> = {}
  if (busqueda)  params.q    = busqueda
  if (filtroRol) params.role = filtroRol

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios', busqueda, filtroRol],
    queryFn: () => usuariosApi.list(params),
    placeholderData: (prev) => prev,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: usuariosApi.roles,
    staleTime: Infinity,
  })

  const { data: carreras = [] } = useQuery({
    queryKey: ['carreras-select'],
    queryFn: usuariosApi.carreras,
    staleTime: 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => usuariosApi.destroy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario eliminado.', 'success')
    },
    onError: (err: ApiErr) => addToast(err?.response?.data?.message ?? 'Error al eliminar.', 'error'),
  })

  const confirmarEliminar = (u: Usuario) => {
    if (!window.confirm(`¿Eliminar a "${u.name}"? Esta acción no se puede deshacer.`)) return
    deleteMut.mutate(u.id)
  }

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => usuariosApi.toggleActivo(id, activo),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      addToast(vars.activo ? 'Usuario activado.' : 'Usuario desactivado.', 'success')
    },
    onError: (err: ApiErr) => addToast(err?.response?.data?.message ?? 'Error al cambiar el estado.', 'error'),
  })

  const confirmarToggleActivo = (u: Usuario) => {
    const activar = !u.activo
    if (!activar && !window.confirm(`¿Desactivar a "${u.name}"? No podrá iniciar sesión hasta que lo reactives.`)) return
    toggleActivoMut.mutate({ id: u.id, activo: activar })
  }

  const usuarios: Usuario[] = data?.data ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crea, edita o elimina cuentas del sistema</p>
        </div>
        <button
          onClick={() => setModalUsuario(null)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Nuevo usuario
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {roles.map(r => (
            <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="text-slate-400 text-sm p-6">Cargando usuarios…</p>
        ) : usuarios.length === 0 ? (
          <p className="text-slate-400 text-sm p-6">No se encontraron usuarios.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Creado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} onClick={() => navigate(`/admin/usuarios/${u.id}`)} className="hover:bg-brand-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                        {u.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.roles.length > 0
                      ? <div className="flex flex-wrap gap-1">{u.roles.map(r => <RoleBadge key={r.name} role={r.name} />)}</div>
                      : <span className="text-slate-400 text-xs">Sin rol</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">
                    {u.carrera
                      ? <span title={u.carrera.nombre} className="font-mono text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{u.carrera.clave}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={e => { e.stopPropagation(); setModalUsuario(u) }} className="text-xs text-brand-600 hover:underline font-medium">Editar</button>
                      <button onClick={e => { e.stopPropagation(); setModalCreds(u) }} className="text-xs text-rose-600 hover:underline font-medium">Credenciales</button>
                      <button
                        onClick={e => { e.stopPropagation(); confirmarToggleActivo(u) }}
                        disabled={toggleActivoMut.isPending}
                        className={`text-xs hover:underline font-medium disabled:opacity-50 ${u.activo ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); confirmarEliminar(u) }} className="text-xs text-red-500 hover:underline font-medium">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalUsuario !== false && (
        <UsuarioModal
          usuario={modalUsuario}
          roles={roles}
          carreras={carreras}
          onClose={() => setModalUsuario(false)}
        />
      )}
      {modalCreds && (
        <CredencialesModal usuario={modalCreds} onClose={() => setModalCreds(null)} />
      )}
    </div>
  )
}
