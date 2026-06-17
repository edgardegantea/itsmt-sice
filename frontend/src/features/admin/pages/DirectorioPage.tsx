import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface UsuarioSimple { id: string; name: string; email: string; roles: string[] }

interface Area {
  id: string; nombre: string; descripcion: string | null
  tipo: 'administracion' | 'academico' | 'departamento'
  orden: number; activo: boolean; personal_count?: number
}

interface Puesto {
  id: string; nombre: string; descripcion: string | null; funciones: string | null
  area_id: string | null; area: Area | null
  firma_documentos: boolean; orden: number; activo: boolean; personal_count?: number
}

interface PersonaDirectorio {
  id: string; user_id: string | null; nombre: string; cargo: string
  area: string | null; area_id: string | null; puesto_id: string | null
  email: string | null; telefono: string | null; extension: string | null
  orden: number; activo: boolean; firma_documentos: boolean
  user: UsuarioSimple | null
  directorio_area: Area | null
  puesto: Puesto | null
}

type PersonaForm = {
  user_id: string; nombre: string; cargo: string; area_id: string
  puesto_id: string; email: string; telefono: string; extension: string
  orden: number; activo: boolean; firma_documentos: boolean
}
type AreaForm    = { nombre: string; descripcion: string; tipo: string; orden: number; activo: boolean }
type PuestoForm  = { nombre: string; descripcion: string; funciones: string; area_id: string; firma_documentos: boolean; orden: number; activo: boolean }

const PERSONA_EMPTY: PersonaForm = { user_id:'', nombre:'', cargo:'', area_id:'', puesto_id:'', email:'', telefono:'', extension:'', orden:0, activo:true, firma_documentos:false }
const AREA_EMPTY: AreaForm       = { nombre:'', descripcion:'', tipo:'departamento', orden:0, activo:true }
const PUESTO_EMPTY: PuestoForm   = { nombre:'', descripcion:'', funciones:'', area_id:'', firma_documentos:false, orden:0, activo:true }

// ── API ───────────────────────────────────────────────────────────────────────

const api = {
  directorio:          () => apiClient.get('/admin/directorio').then(r => r.data.data as PersonaDirectorio[]),
  usuariosDisponibles: () => apiClient.get('/admin/directorio/usuarios-disponibles').then(r => r.data.data as UsuarioSimple[]),
  areas:               () => apiClient.get('/admin/directorio-areas').then(r => r.data.data as Area[]),
  puestos:             () => apiClient.get('/admin/directorio-puestos').then(r => r.data.data as Puesto[]),
  crearPersona:  (d: Partial<PersonaForm>) => apiClient.post('/admin/directorio', d).then(r => r.data.data),
  editarPersona: (id: string, d: Partial<PersonaForm>) => apiClient.patch(`/admin/directorio/${id}`, d).then(r => r.data.data),
  borrarPersona: (id: string) => apiClient.delete(`/admin/directorio/${id}`),
  crearArea:   (d: Partial<AreaForm>)   => apiClient.post('/admin/directorio-areas', d).then(r => r.data.data),
  editarArea:  (id: string, d: Partial<AreaForm>)   => apiClient.patch(`/admin/directorio-areas/${id}`, d).then(r => r.data.data),
  borrarArea:  (id: string) => apiClient.delete(`/admin/directorio-areas/${id}`),
  crearPuesto:  (d: Partial<PuestoForm>)  => apiClient.post('/admin/directorio-puestos', d).then(r => r.data.data),
  editarPuesto: (id: string, d: Partial<PuestoForm>) => apiClient.patch(`/admin/directorio-puestos/${id}`, d).then(r => r.data.data),
  borrarPuesto: (id: string) => apiClient.delete(`/admin/directorio-puestos/${id}`),
}

// ── Colores por tipo de área ──────────────────────────────────────────────────

const TIPO_STYLE = {
  administracion: { badge: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500',   label: 'Administración' },
  academico:      { badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', label: 'Académico' },
  departamento:   { badge: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400',   label: 'Departamento' },
}

function initials(nombre: string) {
  return nombre.replace(/^(MC\.|MCA\.|DR\.|DRA\.|ING\.|LIC\.|LCP\.|LAE\.|MTRA?\.|MTR\.)\s*/i, '')
    .split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { value: string | number }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...rest}
    />
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {children}
    </select>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

// ── Modal genérico ────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, onSave, saving, canSave, children }: {
  title: string; subtitle?: string; onClose: () => void; onSave: () => void
  saving: boolean; canSave: boolean; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={onSave} disabled={saving || !canSave}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Persona ─────────────────────────────────────────────────────────────

function PersonaModal({ persona, areas, puestos, usuarios, onClose }: {
  persona: PersonaDirectorio | null; areas: Area[]; puestos: Puesto[]
  usuarios: UsuarioSimple[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)

  const [form, setForm] = useState<PersonaForm>(() => persona ? {
    user_id: persona.user_id ?? '',
    nombre: persona.nombre, cargo: persona.cargo,
    area_id: persona.area_id ?? '', puesto_id: persona.puesto_id ?? '',
    email: persona.email ?? '', telefono: persona.telefono ?? '',
    extension: persona.extension ?? '', orden: persona.orden,
    activo: persona.activo, firma_documentos: persona.firma_documentos,
  } : { ...PERSONA_EMPTY })

  const set = <K extends keyof PersonaForm>(k: K, v: PersonaForm[K]) => setForm(f => ({ ...f, [k]: v }))

  // Al seleccionar usuario, auto-completar nombre y email
  const onSelectUser = (userId: string) => {
    set('user_id', userId)
    if (userId) {
      const u = usuarios.find(u => u.id === userId)
      if (u) {
        if (!form.nombre) set('nombre', u.name)
        if (!form.email)  set('email', u.email)
      }
    }
  }

  // Al seleccionar puesto, auto-completar cargo y firma_documentos
  const onSelectPuesto = (puestoId: string) => {
    set('puesto_id', puestoId)
    if (puestoId) {
      const p = puestos.find(p => p.id === puestoId)
      if (p) {
        if (!form.cargo || form.cargo === '') set('cargo', p.nombre)
        set('firma_documentos', p.firma_documentos)
        if (p.area_id && !form.area_id) set('area_id', p.area_id)
      }
    }
  }

  const mutation = useMutation({
    mutationFn: () => persona ? api.editarPersona(persona.id, form) : api.crearPersona(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio'] }); success(persona ? 'Persona actualizada.' : 'Persona agregada.'); onClose() },
    onError: () => error('Error al guardar.'),
  })

  const puestosFiltrados = form.area_id ? puestos.filter(p => p.area_id === form.area_id) : puestos

  return (
    <Modal title={persona ? 'Editar persona' : 'Agregar persona'} subtitle="Directorio institucional"
      onClose={onClose} onSave={() => mutation.mutate()} saving={mutation.isPending} canSave={!!form.nombre && !!form.cargo}>
      <div className="space-y-4">
        {/* Usuario del sistema */}
        <Field label="Usuario del sistema">
          <Select value={form.user_id} onChange={onSelectUser}>
            <option value="">— Sin vincular —</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.roles.join(', ')})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre completo *">
              <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: MC. JUAN PÉREZ HERNÁNDEZ" />
            </Field>
          </div>

          {/* Área primero para filtrar puestos */}
          <Field label="Área / Departamento">
            <Select value={form.area_id} onChange={v => { set('area_id', v); set('puesto_id', '') }}>
              <option value="">— Seleccionar área —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </Select>
          </Field>

          <Field label="Puesto">
            <Select value={form.puesto_id} onChange={onSelectPuesto}>
              <option value="">— Seleccionar puesto —</option>
              {puestosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </Field>

          <div className="col-span-2">
            <Field label="Cargo (texto libre)">
              <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Se autocompletará al elegir puesto" />
            </Field>
          </div>

          <Field label="Correo electrónico">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@itsmt.edu.mx" />
          </Field>
          <Field label="Teléfono">
            <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="225 253 0108" />
          </Field>
          <Field label="Extensión">
            <Input value={form.extension} onChange={e => set('extension', e.target.value)} placeholder="Ext. 101" />
          </Field>
          <Field label="Orden de aparición">
            <Input type="number" value={form.orden} onChange={e => set('orden', Number(e.target.value))} min={0} />
          </Field>
        </div>

        <div className="flex gap-6 pt-1 border-t">
          <Toggle checked={form.activo} onChange={v => set('activo', v)} label="Activo en directorio" />
          <Toggle checked={form.firma_documentos} onChange={v => set('firma_documentos', v)} label="Firma documentos oficiales" />
        </div>
      </div>
    </Modal>
  )
}

// ── Modal Área ────────────────────────────────────────────────────────────────

function AreaModal({ area, onClose }: { area: Area | null; onClose: () => void }) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)
  const [form, setForm] = useState<AreaForm>(area ? { nombre: area.nombre, descripcion: area.descripcion ?? '', tipo: area.tipo, orden: area.orden, activo: area.activo } : { ...AREA_EMPTY })
  const set = <K extends keyof AreaForm>(k: K, v: AreaForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => area ? api.editarArea(area.id, form) : api.crearArea(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio-areas'] }); success(area ? 'Área actualizada.' : 'Área creada.'); onClose() },
    onError: () => error('Error al guardar.'),
  })

  return (
    <Modal title={area ? 'Editar área' : 'Nueva área'} subtitle="Catálogo de áreas y departamentos"
      onClose={onClose} onSave={() => mutation.mutate()} saving={mutation.isPending} canSave={!!form.nombre}>
      <div className="space-y-4">
        <Field label="Nombre del área *">
          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Servicios Escolares" />
        </Field>
        <Field label="Tipo">
          <Select value={form.tipo} onChange={v => set('tipo', v)}>
            <option value="administracion">Administración</option>
            <option value="academico">Académico (Carrera)</option>
            <option value="departamento">Departamento</option>
          </Select>
        </Field>
        <Field label="Descripción">
          <Textarea value={form.descripcion} onChange={v => set('descripcion', v)} placeholder="Descripción del área o departamento…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Orden">
            <Input type="number" value={form.orden} onChange={e => set('orden', Number(e.target.value))} min={0} />
          </Field>
        </div>
        <Toggle checked={form.activo} onChange={v => set('activo', v)} label="Área activa" />
      </div>
    </Modal>
  )
}

// ── Modal Puesto ──────────────────────────────────────────────────────────────

function PuestoModal({ puesto, areas, onClose }: { puesto: Puesto | null; areas: Area[]; onClose: () => void }) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)
  const [form, setForm] = useState<PuestoForm>(puesto ? {
    nombre: puesto.nombre, descripcion: puesto.descripcion ?? '', funciones: puesto.funciones ?? '',
    area_id: puesto.area_id ?? '', firma_documentos: puesto.firma_documentos,
    orden: puesto.orden, activo: puesto.activo,
  } : { ...PUESTO_EMPTY })
  const set = <K extends keyof PuestoForm>(k: K, v: PuestoForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => puesto ? api.editarPuesto(puesto.id, form) : api.crearPuesto(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio-puestos'] }); success(puesto ? 'Puesto actualizado.' : 'Puesto creado.'); onClose() },
    onError: () => error('Error al guardar.'),
  })

  return (
    <Modal title={puesto ? 'Editar puesto' : 'Nuevo puesto'} subtitle="Catálogo de puestos institucionales"
      onClose={onClose} onSave={() => mutation.mutate()} saving={mutation.isPending} canSave={!!form.nombre}>
      <div className="space-y-4">
        <Field label="Nombre del puesto *">
          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Jefe del Departamento de Servicios Escolares" />
        </Field>
        <Field label="Área">
          <Select value={form.area_id} onChange={v => set('area_id', v)}>
            <option value="">— Sin área —</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Descripción del puesto">
          <Textarea value={form.descripcion} onChange={v => set('descripcion', v)} placeholder="Responsabilidades generales del puesto…" />
        </Field>
        <Field label="Funciones principales">
          <Textarea value={form.funciones} onChange={v => set('funciones', v)} rows={5} placeholder="- Función 1&#10;- Función 2&#10;- Función 3" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Orden">
            <Input type="number" value={form.orden} onChange={e => set('orden', Number(e.target.value))} min={0} />
          </Field>
        </div>
        <div className="flex gap-6 border-t pt-3">
          <Toggle checked={form.firma_documentos} onChange={v => set('firma_documentos', v)} label="Firma documentos oficiales" />
          <Toggle checked={form.activo} onChange={v => set('activo', v)} label="Puesto activo" />
        </div>
      </div>
    </Modal>
  )
}

// ── Tab: Personas ─────────────────────────────────────────────────────────────

function TabPersonas({ esAdmin, areas, puestos, usuarios }: { esAdmin: boolean; areas: Area[]; puestos: Puesto[]; usuarios: UsuarioSimple[] }) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)
  const [editando, setEditando] = useState<PersonaDirectorio | null | 'nuevo'>(null)
  const [busqueda, setBusqueda] = useState('')

  const { data: directorio = [], isLoading } = useQuery({ queryKey: ['directorio'], queryFn: api.directorio })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.borrarPersona(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio'] }); success('Persona eliminada.') },
    onError: () => error('Error al eliminar.'),
  })

  const sinUsuario = directorio.filter(p => !p.user_id).length

  const filtrado = directorio.filter(p => {
    const q = busqueda.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || p.cargo.toLowerCase().includes(q) ||
           (p.directorio_area?.nombre ?? p.area ?? '').toLowerCase().includes(q)
  })

  const grupos = filtrado.reduce<Record<string, PersonaDirectorio[]>>((acc, p) => {
    const key = p.directorio_area?.nombre ?? p.area ?? 'Sin área'
    ;(acc[key] ??= []).push(p)
    return acc
  }, {})

  return (
    <div>
      {/* Barra de acciones */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="search" placeholder="Buscar…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {esAdmin && (
          <button onClick={() => setEditando('nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Agregar persona
          </button>
        )}
      </div>

      {/* Alerta de usuarios sin vincular */}
      {esAdmin && sinUsuario > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span><strong>{sinUsuario}</strong> persona{sinUsuario !== 1 ? 's' : ''} sin usuario del sistema vinculado.</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Cargando directorio…
        </div>
      ) : (
        Object.entries(grupos).map(([areaName, personas]) => {
          const tipoArea = personas[0]?.directorio_area?.tipo ?? 'departamento'
          const style = TIPO_STYLE[tipoArea as keyof typeof TIPO_STYLE] ?? TIPO_STYLE.departamento
          return (
            <div key={areaName} className="mb-6">
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-opacity-50 border ${tipoArea === 'administracion' ? 'bg-blue-50 border-blue-200' : tipoArea === 'academico' ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`w-2 h-2 rounded-full ${style.dot}`}/>
                <span className={`text-sm font-semibold ${tipoArea === 'administracion' ? 'text-blue-800' : tipoArea === 'academico' ? 'text-indigo-800' : 'text-gray-700'}`}>{areaName}</span>
                <span className="ml-auto text-xs text-gray-400">{personas.length} persona{personas.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {personas.map(p => (
                  <div key={p.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${!p.activo ? 'opacity-50' : ''}`}>
                    <div className={`h-1 ${style.dot}`}/>
                    <div className="p-4">
                      <div className="flex gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${tipoArea === 'administracion' ? 'bg-blue-50 text-blue-800 border-blue-200' : tipoArea === 'academico' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {initials(p.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{p.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{p.cargo}</p>
                        </div>
                      </div>

                      {p.email && (
                        <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline truncate mb-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          <span className="truncate">{p.email}</span>
                        </a>
                      )}
                      {(p.telefono || p.extension) && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                          </svg>
                          {p.telefono}{p.extension && <span className="text-gray-400 ml-1">ext. {p.extension}</span>}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        {p.firma_documentos && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Firma docs.</span>
                        )}
                        {p.user_id ? (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                            Vinculado
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">Sin usuario</span>
                        )}
                      </div>
                    </div>
                    {esAdmin && (
                      <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-2">
                        <button onClick={() => setEditando(p)} className="flex-1 text-xs py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">Editar</button>
                        <button onClick={() => { if (confirm(`¿Eliminar a ${p.nombre}?`)) deleteMutation.mutate(p.id) }}
                          className="flex-1 text-xs py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium">Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {editando !== null && (
        <PersonaModal
          persona={editando === 'nuevo' ? null : editando}
          areas={areas} puestos={puestos} usuarios={usuarios}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}

// ── Tab: Áreas ────────────────────────────────────────────────────────────────

function TabAreas({ esAdmin }: { esAdmin: boolean }) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)
  const [editando, setEditando] = useState<Area | null | 'nuevo'>(null)

  const { data: areas = [], isLoading } = useQuery({ queryKey: ['directorio-areas'], queryFn: api.areas })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.borrarArea(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio-areas'] }); success('Área eliminada.') },
    onError: () => error('No se puede eliminar: puede tener personal o puestos asociados.'),
  })

  const grouped = { administracion: [] as Area[], academico: [] as Area[], departamento: [] as Area[] }
  areas.forEach(a => grouped[a.tipo]?.push(a))

  return (
    <div>
      {esAdmin && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setEditando('nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Nueva área
          </button>
        </div>
      )}

      {isLoading ? <p className="text-center text-gray-400 py-12">Cargando áreas…</p> : (
        Object.entries(grouped).map(([tipo, lista]) => lista.length === 0 ? null : (
          <div key={tipo} className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{TIPO_STYLE[tipo as keyof typeof TIPO_STYLE].label}</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {lista.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${TIPO_STYLE[a.tipo].dot}`}/>
                          <span className="font-medium text-gray-900">{a.nombre}</span>
                          {!a.activo && <span className="text-xs text-gray-400">(inactiva)</span>}
                        </div>
                        {a.descripcion && <p className="text-xs text-gray-500 ml-4 mt-0.5">{a.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_STYLE[a.tipo].badge}`}>{TIPO_STYLE[a.tipo].label}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {(a as Area & { personal_count?: number }).personal_count ?? 0} personas
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditando(a)} className="text-xs text-blue-600 hover:underline">Editar</button>
                            <button onClick={() => { if (confirm(`¿Eliminar "${a.nombre}"?`)) deleteMutation.mutate(a.id) }}
                              className="text-xs text-red-500 hover:underline">Eliminar</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editando !== null && (
        <AreaModal area={editando === 'nuevo' ? null : editando} onClose={() => setEditando(null)} />
      )}
    </div>
  )
}

// ── Tab: Puestos ──────────────────────────────────────────────────────────────

function TabPuestos({ esAdmin, areas }: { esAdmin: boolean; areas: Area[] }) {
  const qc = useQueryClient()
  const success = useToastStore(s => s.success)
  const error   = useToastStore(s => s.error)
  const [editando, setEditando] = useState<Puesto | null | 'nuevo'>(null)
  const [detalle, setDetalle] = useState<Puesto | null>(null)

  const { data: puestos = [], isLoading } = useQuery({ queryKey: ['directorio-puestos'], queryFn: api.puestos })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.borrarPuesto(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['directorio-puestos'] }); success('Puesto eliminado.') },
    onError: () => error('No se puede eliminar: hay personal asignado a este puesto.'),
  })

  return (
    <div>
      {esAdmin && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setEditando('nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Nuevo puesto
          </button>
        </div>
      )}

      {isLoading ? <p className="text-center text-gray-400 py-12">Cargando puestos…</p> : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Puesto</th>
                <th className="px-4 py-2 text-left">Área</th>
                <th className="px-4 py-2 text-center">Firma</th>
                <th className="px-4 py-2 text-center">Personal</th>
                {esAdmin && <th className="px-4 py-2"/>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {puestos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetalle(p)} className="font-medium text-gray-900 hover:text-blue-600 text-left">{p.nombre}</button>
                    {p.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.area?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {p.firma_documentos
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Sí</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{(p as Puesto & { personal_count?: number }).personal_count ?? 0}</td>
                  {esAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditando(p)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => { if (confirm(`¿Eliminar "${p.nombre}"?`)) deleteMutation.mutate(p.id) }}
                          className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando !== null && (
        <PuestoModal puesto={editando === 'nuevo' ? null : editando} areas={areas} onClose={() => setEditando(null)} />
      )}

      {/* Detalle del puesto */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{detalle.nombre}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detalle.area?.nombre ?? 'Sin área asignada'}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {detalle.descripcion && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-sm text-gray-700">{detalle.descripcion}</p>
                </div>
              )}
              {detalle.funciones && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Funciones principales</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{detalle.funciones}</pre>
                </div>
              )}
              {detalle.firma_documentos && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  ✓ Este puesto firma documentos oficiales
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

type Tab = 'personas' | 'areas' | 'puestos'

export default function DirectorioPage() {
  const user    = useAuthStore(s => s.user)
  const esAdmin = user?.roles?.some(r => ['admin', 'superadmin'].includes(r)) ?? false
  const [tab, setTab] = useState<Tab>('personas')

  const { data: areas   = [] } = useQuery({ queryKey: ['directorio-areas'],  queryFn: api.areas })
  const { data: puestos = [] } = useQuery({ queryKey: ['directorio-puestos'], queryFn: api.puestos })
  const { data: usuarios = [] } = useQuery({ queryKey: ['directorio-usuarios'], queryFn: api.usuariosDisponibles, enabled: esAdmin })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'personas', label: 'Personal' },
    { key: 'areas',    label: `Áreas (${areas.length})` },
    { key: 'puestos',  label: `Puestos (${puestos.length})` },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Directorio Institucional</h1>
        <p className="text-sm text-gray-500 mt-1">Instituto Tecnológico Superior de Martínez de la Torre</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'personas' && <TabPersonas esAdmin={esAdmin} areas={areas} puestos={puestos} usuarios={usuarios} />}
      {tab === 'areas'    && <TabAreas    esAdmin={esAdmin} />}
      {tab === 'puestos'  && <TabPuestos  esAdmin={esAdmin} areas={areas} />}
    </div>
  )
}
