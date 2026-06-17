import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Catalogo = Record<string, string[]>
type RolPermisos = { name: string; permisos: string[] }
type Usuario = { id: string; name: string; email: string; roles: { name: string }[] }

// ── Catálogo de labels ─────────────────────────────────────────────────────────

const MODULO_LABEL: Record<string, string> = {
  alumnos: 'Alumnos', aspirantes: 'Aspirantes', periodos: 'Periodos',
  carreras: 'Carreras', catalogos: 'Catálogos', usuarios: 'Usuarios',
  constancias: 'Constancias', reinscripciones: 'Reinscripciones',
  bajas: 'Bajas', encuestas: 'Encuestas', reportes: 'Reportes',
  configuracion: 'Configuración',
}

const ACCION_LABEL: Record<string, string> = {
  ver: 'Ver', editar: 'Editar', eliminar: 'Eliminar',
  inscribir: 'Inscribir', crear: 'Crear',
}

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador', director_academico: 'Director Académico',
  jefe_carrera: 'Jefe de Carrera', docente: 'Docente',
  personal_administrativo: 'Personal Administrativo',
}

// ── API ────────────────────────────────────────────────────────────────────────

const api = {
  catalogo: () => apiClient.get('/admin/permisos/catalogo').then(r => r.data.data as Catalogo),
  roles:    () => apiClient.get('/admin/permisos/roles').then(r => r.data.data as RolPermisos[]),
  usuarios: (q?: string) => apiClient.get('/admin/usuarios', { params: q ? { q } : {} }).then(r => {
    const d = r.data.data; return (Array.isArray(d) ? d : d.data ?? []) as Usuario[]
  }),
  updateRol:     (rol: string, permisos: string[]) => apiClient.put(`/admin/permisos/roles/${rol}`, { permisos }).then(r => r.data),
  showUsuario:   (id: string) => apiClient.get(`/admin/permisos/usuarios/${id}`).then(r => r.data.data as { permisos_directos: string[]; permisos_por_rol: string[] }),
  updateUsuario: (id: string, permisos: string[]) => apiClient.put(`/admin/permisos/usuarios/${id}`, { permisos }).then(r => r.data),
}

// ── Componente: tabla de permisos ──────────────────────────────────────────────

function TablaPermisos({
  catalogo, activos, porRol = [], onChange, readOnly = false,
}: {
  catalogo: Catalogo
  activos: string[]
  porRol?: string[]
  onChange?: (p: string, v: boolean) => void
  readOnly?: boolean
}) {
  const set = new Set(activos)
  const heredado = new Set(porRol)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2 font-medium text-slate-600 w-40">Módulo</th>
            {['ver', 'editar', 'eliminar', 'crear', 'inscribir'].map(a => (
              <th key={a} className="text-center px-3 py-2 font-medium text-slate-600 w-24">{ACCION_LABEL[a]}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Object.entries(catalogo).map(([modulo, acciones]) => (
            <tr key={modulo} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 font-medium text-slate-700">{MODULO_LABEL[modulo] ?? modulo}</td>
              {['ver', 'editar', 'eliminar', 'crear', 'inscribir'].map(accion => {
                const permiso = `${modulo}.${accion}`
                const disponible = acciones.includes(accion)
                const marcado = set.has(permiso)
                const esHeredado = heredado.has(permiso) && !set.has(permiso)

                if (!disponible) return <td key={accion} className="text-center px-3 py-2.5 text-slate-200">—</td>

                return (
                  <td key={accion} className="text-center px-3 py-2.5">
                    {readOnly ? (
                      <span className={`inline-block w-5 h-5 rounded ${marcado ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={marcado || esHeredado}
                          disabled={esHeredado}
                          onChange={e => onChange?.(permiso, e.target.checked)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-default disabled:opacity-60"
                        />
                        {esHeredado && <span className="text-[10px] text-slate-400">rol</span>}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: permisos por rol ──────────────────────────────────────────────────────

function TabRoles({ catalogo }: { catalogo: Catalogo }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)

  const { data: roles = [] } = useQuery({ queryKey: ['permisos-roles'], queryFn: api.roles })

  const guardar = useMutation({
    mutationFn: () => api.updateRol(rolSeleccionado!, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permisos-roles'] })
      success('Permisos del rol actualizados.')
      setDirty(false)
    },
    onError: (e: any) => toastError(e?.response?.data?.message ?? 'Error al guardar.'),
  })

  function seleccionar(nombre: string) {
    const rol = roles.find(r => r.name === nombre)
    if (!rol) return
    setRolSeleccionado(nombre)
    setDraft([...rol.permisos])
    setDirty(false)
  }

  function toggle(permiso: string, activo: boolean) {
    setDraft(d => activo ? [...d, permiso] : d.filter(p => p !== permiso))
    setDirty(true)
  }

  return (
    <div className="flex gap-6">
      {/* Lista de roles */}
      <div className="w-56 shrink-0 space-y-1">
        {roles.filter(r => r.name !== 'superadmin' && r.name !== 'alumno').map(r => (
          <button
            key={r.name}
            onClick={() => seleccionar(r.name)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              rolSeleccionado === r.name
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {ROL_LABEL[r.name] ?? r.name}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-w-0">
        {!rolSeleccionado ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Selecciona un rol para configurar sus permisos
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-800">
                {ROL_LABEL[rolSeleccionado] ?? rolSeleccionado}
              </h3>
              {dirty && (
                <button
                  onClick={() => guardar.mutate()}
                  disabled={guardar.isPending}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <TablaPermisos catalogo={catalogo} activos={draft} onChange={toggle} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: permisos por usuario ──────────────────────────────────────────────────

function TabUsuarios({ catalogo }: { catalogo: Catalogo }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [busqueda, setBusqueda] = useState('')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)

  const { data: usuarios = [] } = useQuery({
    queryKey: ['permisos-usuarios-list', busqueda],
    queryFn: () => api.usuarios(busqueda || undefined),
    staleTime: 10_000,
  })

  const { data: permisos } = useQuery({
    queryKey: ['permisos-usuario', usuarioId],
    queryFn: () => api.showUsuario(usuarioId!),
    enabled: !!usuarioId,
  })

  const guardar = useMutation({
    mutationFn: () => api.updateUsuario(usuarioId!, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permisos-usuario', usuarioId] })
      success('Permisos del usuario actualizados.')
      setDirty(false)
    },
    onError: (e: any) => toastError(e?.response?.data?.message ?? 'Error al guardar.'),
  })

  function seleccionar(u: Usuario) {
    setUsuarioId(u.id)
    setDraft([])
    setDirty(false)
  }

  // Cuando llegan los permisos del usuario, inicializa el draft con permisos directos
  const prevUsuario = usuarioId
  if (permisos && !dirty && usuarioId === prevUsuario && draft.length === 0 && permisos.permisos_directos.length > 0) {
    setDraft([...permisos.permisos_directos])
  }

  function toggle(permiso: string, activo: boolean) {
    setDraft(d => activo ? [...d, permiso] : d.filter(p => p !== permiso))
    setDirty(true)
  }

  const usuarioActual = usuarios.find(u => u.id === usuarioId)

  return (
    <div className="flex gap-6">
      {/* Lista de usuarios */}
      <div className="w-64 shrink-0">
        <input
          type="text"
          placeholder="Buscar usuario…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full mb-2 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {usuarios.filter(u => !u.roles.some(r => r.name === 'superadmin') && !u.roles.some(r => r.name === 'alumno')).map(u => (
            <button
              key={u.id}
              onClick={() => seleccionar(u)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                usuarioId === u.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <p className="font-medium truncate">{u.name}</p>
              <p className={`text-xs truncate ${usuarioId === u.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {ROL_LABEL[u.roles[0]?.name] ?? u.roles[0]?.name ?? 'sin rol'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-w-0">
        {!usuarioId ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Selecciona un usuario para configurar permisos adicionales
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-slate-800">{usuarioActual?.name}</h3>
                <p className="text-xs text-slate-500">
                  Los permisos marcados como <span className="font-medium">"rol"</span> son heredados y no se pueden quitar aquí (edítalos en la pestaña de roles).
                </p>
              </div>
              {dirty && (
                <button
                  onClick={() => guardar.mutate()}
                  disabled={guardar.isPending}
                  className="shrink-0 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <TablaPermisos
                catalogo={catalogo}
                activos={draft}
                porRol={permisos?.permisos_por_rol ?? []}
                onChange={toggle}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PermisosPage() {
  const [tab, setTab] = useState<'roles' | 'usuarios'>('roles')

  const { data: catalogo } = useQuery({ queryKey: ['permisos-catalogo'], queryFn: api.catalogo, staleTime: Infinity })

  if (!catalogo) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Cargando módulo de permisos…
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Gestión de permisos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configura qué puede hacer cada rol y personaliza permisos por usuario.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {([['roles', 'Por rol'], ['usuarios', 'Por usuario']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'roles'    && <TabRoles    catalogo={catalogo} />}
      {tab === 'usuarios' && <TabUsuarios catalogo={catalogo} />}
    </div>
  )
}
