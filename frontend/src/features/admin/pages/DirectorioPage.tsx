import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface PersonaDirectorio {
  id: string
  nombre: string
  cargo: string
  area: string | null
  email: string | null
  telefono: string | null
  extension: string | null
  orden: number
  activo: boolean
  firma_documentos: boolean
}

type PersonaForm = Omit<PersonaDirectorio, 'id'>

const EMPTY: PersonaForm = {
  nombre: '',
  cargo: '',
  area: '',
  email: '',
  telefono: '',
  extension: '',
  orden: 0,
  activo: true,
  firma_documentos: false,
}

// ── API ───────────────────────────────────────────────────────────────────────

const api = {
  list:    () => apiClient.get('/admin/directorio').then(r => r.data.data as PersonaDirectorio[]),
  create:  (d: PersonaForm) => apiClient.post('/admin/directorio', d).then(r => r.data.data as PersonaDirectorio),
  update:  (id: string, d: Partial<PersonaForm>) => apiClient.patch(`/admin/directorio/${id}`, d).then(r => r.data.data as PersonaDirectorio),
  destroy: (id: string) => apiClient.delete(`/admin/directorio/${id}`),
}

// ── Modal de edición/creación ─────────────────────────────────────────────────

function PersonaModal({
  persona,
  onClose,
}: {
  persona: PersonaDirectorio | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const [form, setForm] = useState<PersonaForm>(
    persona ? { ...persona } : { ...EMPTY }
  )

  const saveMutation = useMutation({
    mutationFn: () =>
      persona ? api.update(persona.id, form) : api.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directorio'] })
      toastSuccess(persona ? 'Persona actualizada.' : 'Persona agregada.')
      onClose()
    },
    onError: () => toastError('Error al guardar.'),
  })

  const set = (k: keyof PersonaForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b font-semibold text-lg">
          {persona ? 'Editar persona' : 'Agregar persona'}
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Nombre completo *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Cargo *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.cargo}
              onChange={e => set('cargo', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Área / Departamento</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.area ?? ''}
              onChange={e => set('area', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.telefono ?? ''}
              onChange={e => set('telefono', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Extensión</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.extension ?? ''}
              onChange={e => set('extension', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Orden</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.orden}
              onChange={e => set('orden', Number(e.target.value))}
            />
          </div>
          <div className="col-span-2 flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => set('activo', e.target.checked)}
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.firma_documentos}
                onChange={e => set('firma_documentos', e.target.checked)}
              />
              Firma documentos
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">
            Cancelar
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.nombre || !form.cargo}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function DirectorioPage() {
  const user = useAuthStore(s => s.user)
  const esAdmin = user?.roles?.some(r => ['admin', 'superadmin'].includes(r)) ?? false
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [editando, setEditando] = useState<PersonaDirectorio | null | 'nuevo'>(null)
  const [busqueda, setBusqueda] = useState('')

  const { data: directorio = [], isLoading } = useQuery({
    queryKey: ['directorio'],
    queryFn: api.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.destroy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directorio'] })
      toastSuccess('Persona eliminada.')
    },
    onError: () => toastError('Error al eliminar.'),
  })

  const filtrado = directorio.filter(p => {
    const q = busqueda.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.cargo.toLowerCase().includes(q) ||
      (p.area ?? '').toLowerCase().includes(q)
    )
  })

  const grupos = filtrado.reduce<Record<string, PersonaDirectorio[]>>((acc, p) => {
    const key = p.area ?? 'Sin área'
    ;(acc[key] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Directorio Institucional</h1>
          <p className="text-sm text-gray-500 mt-1">Personal del Instituto Tecnológico Superior de Martínez de la Torre</p>
        </div>
        {esAdmin && (
          <button
            onClick={() => setEditando('nuevo')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            + Agregar persona
          </button>
        )}
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, cargo o área…"
        className="w-full border rounded-lg px-4 py-2 text-sm mb-6"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      {isLoading ? (
        <p className="text-center text-gray-500 py-12">Cargando directorio…</p>
      ) : (
        Object.entries(grupos).map(([area, personas]) => (
          <div key={area} className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800 border-b-2 border-blue-200 pb-1 mb-3">
              {area}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-2 rounded-tl">Nombre</th>
                    <th className="px-4 py-2">Cargo</th>
                    <th className="px-4 py-2">Correo</th>
                    <th className="px-4 py-2">Teléfono / Ext.</th>
                    <th className="px-4 py-2">Firma docs.</th>
                    {esAdmin && <th className="px-4 py-2 rounded-tr">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {personas.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50 ${!p.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nombre}</td>
                      <td className="px-4 py-2 text-gray-700">{p.cargo}</td>
                      <td className="px-4 py-2 text-gray-600">{p.email ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {p.telefono ?? '—'}
                        {p.extension && <span className="text-xs text-gray-400 ml-1">ext. {p.extension}</span>}
                      </td>
                      <td className="px-4 py-2">
                        {p.firma_documentos ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Sí</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditando(p)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar a ${p.nombre}?`))
                                  deleteMutation.mutate(p.id)
                              }}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Eliminar
                            </button>
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
        <PersonaModal
          persona={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}
