import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Carrera { id: string; nombre: string; clave: string }

interface Usuario {
  id: string
  name: string
  email: string
  roles: { name: string }[]
  carrera_id: string | null
  carrera: Carrera | null
  created_at: string
  updated_at?: string
}

type ApiErr = { response?: { data?: { message?: string; errors?: Record<string, string | string[]> } } }

// ── API ───────────────────────────────────────────────────────────────────────

const usuariosApi = {
  get:     (id: string)                        => apiClient.get(`/admin/usuarios/${id}`).then(r => r.data.data as Usuario),
  roles:   ()                                  => apiClient.get('/admin/roles').then(r => r.data.data as string[]),
  carreras:()                                  => apiClient.get('/admin/carreras').then(r => r.data.data as Carrera[]),
  update:  (id: string, d: Record<string, unknown>) => apiClient.patch(`/admin/usuarios/${id}`, d).then(r => r.data.data as Usuario),
  destroy: (id: string)                        => apiClient.delete(`/admin/usuarios/${id}`).then(r => r.data),
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
  jefe_carrera:            'bg-blue-100 text-blue-800',
  docente:                 'bg-cyan-100 text-cyan-800',
  alumno:                  'bg-green-100 text-green-800',
  personal_administrativo: 'bg-amber-100 text-amber-800',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

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
    <div className="w-16 h-16 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xl font-bold shrink-0">
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
    role:       usuario.roles[0]?.name ?? 'personal_administrativo',
    carrera_id: usuario.carrera_id ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string | string[]>>({})

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, carrera_id: form.carrera_id || null }
      if (form.password) payload.password = form.password
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

  const needsCarrera = form.role === 'jefe_carrera'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
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
            <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
            <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera asignada {needsCarrera && <span className="text-red-500">*</span>}</label>
            <select className={inputCls} value={form.carrera_id} onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))}>
              <option value="">— Sin carrera asignada —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
            </select>
            {needsCarrera && <p className="text-xs text-slate-400 mt-1">El jefe de carrera solo verá los datos de esta carrera.</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button disabled={isPending} onClick={() => mutate()} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
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

  if (isLoading) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>

  if (isError || !usuario) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No se encontró el usuario.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">← Volver</button>
      </div>
    )
  }

  const rol = usuario.roles[0]?.name

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/usuarios')}
          className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/>
          </svg>
        </button>

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar name={usuario.name} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{usuario.name}</h1>
              {rol && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[rol] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABEL[rol] ?? rol}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{usuario.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalEditar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
            </svg>
            Editar
          </button>
          <button
            onClick={confirmarEliminar}
            disabled={deleteMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
            </svg>
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
          <Campo label="Rol" value={rol ? (ROLE_LABEL[rol] ?? rol) : null} />
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
