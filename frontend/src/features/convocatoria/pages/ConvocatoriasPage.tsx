import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi as academico } from '../../academico/services/academico'
import type { Convocatoria, ConvocatoriaTipo, ConvocatoriaEstatus } from '../../academico/services/academico'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

const TIPOS: { value: ConvocatoriaTipo; label: string }[] = [
  { value: 'beca', label: 'Beca' },
  { value: 'movilidad', label: 'Movilidad' },
  { value: 'ss', label: 'Servicio Social' },
  { value: 'curso_verano', label: 'Curso Verano' },
  { value: 'concurso', label: 'Concurso' },
  { value: 'bolsa_trabajo', label: 'Bolsa de Trabajo' },
  { value: 'otro', label: 'Otro' },
]

const ESTATUS_LABELS: Record<ConvocatoriaEstatus, string> = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
  resultados_publicados: 'Resultados Publicados',
}

const ESTATUS_COLORS: Record<ConvocatoriaEstatus, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  activa: 'bg-green-100 text-green-700',
  cerrada: 'bg-red-100 text-red-700',
  resultados_publicados: 'bg-blue-100 text-blue-700',
}

interface NuevoRequisito {
  descripcion: string
  tipo_documento: string
  obligatorio: boolean
}

interface FormData {
  titulo: string
  descripcion: string
  tipo: ConvocatoriaTipo
  fecha_apertura: string
  fecha_limite: string
  cupo_maximo: string
  roles: string[]
  requisitos: NuevoRequisito[]
}

const ROLES_DISPONIBLES = [
  { value: 'alumno', label: 'Alumnos' },
  { value: 'docente', label: 'Docentes' },
  { value: 'personal_administrativo', label: 'Personal Administrativo' },
]

export default function ConvocatoriasPage() {
  const { user } = useAuthStore()
  const toast = useToastStore()
  const qc = useQueryClient()
  const isAdmin = user?.roles?.some(r =>
    ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica'].includes(r)
  )

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<Convocatoria | null>(null)

  const [form, setForm] = useState<FormData>({
    titulo: '', descripcion: '', tipo: 'beca',
    fecha_apertura: '', fecha_limite: '', cupo_maximo: '',
    roles: [], requisitos: [],
  })

  const { data: convocatorias = [], isLoading } = useQuery({
    queryKey: ['convocatorias', filtroTipo, filtroEstatus],
    queryFn: () => academico.getConvocatorias({
      ...(filtroTipo ? { tipo: filtroTipo } : {}),
      ...(filtroEstatus ? { estatus: filtroEstatus } : {}),
    }),
  })

  const crearMutation = useMutation({
    mutationFn: () => academico.crearConvocatoria({
      titulo: form.titulo,
      descripcion: form.descripcion,
      tipo: form.tipo,
      fecha_apertura: form.fecha_apertura,
      fecha_limite: form.fecha_limite,
      ...(form.cupo_maximo ? { cupo_maximo: parseInt(form.cupo_maximo) } : {}),
      audiencia: form.roles.length ? { roles: form.roles } : undefined,
      requisitos: form.requisitos.filter(r => r.descripcion.trim()),
    }),
    onSuccess: () => {
      toast.success('Convocatoria creada correctamente.')
      qc.invalidateQueries({ queryKey: ['convocatorias'] })
      setShowModal(false)
      resetForm()
    },
    onError: () => toast.error('No se pudo crear la convocatoria.'),
  })

  const cambiarEstatusMutation = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: ConvocatoriaEstatus }) =>
      academico.actualizarEstatusConvocatoria(id, estatus),
    onSuccess: () => {
      toast.success('Estatus actualizado.')
      qc.invalidateQueries({ queryKey: ['convocatorias'] })
    },
    onError: () => toast.error('No se pudo actualizar el estatus.'),
  })

  const publicarResultadosMutation = useMutation({
    mutationFn: (id: string) => academico.publicarResultados(id),
    onSuccess: (data) => {
      toast.success(`Resultados publicados. ${data.notificados} postulante(s) notificados.`)
      qc.invalidateQueries({ queryKey: ['convocatorias'] })
    },
    onError: () => toast.error('No se pudieron publicar los resultados.'),
  })

  const postularMutation = useMutation({
    mutationFn: (id: string) => academico.postular(id),
    onSuccess: () => {
      toast.success('Postulación registrada correctamente.')
      setSelectedConvocatoria(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'No se pudo registrar la postulación.')
    },
  })

  function resetForm() {
    setForm({ titulo: '', descripcion: '', tipo: 'beca', fecha_apertura: '', fecha_limite: '', cupo_maximo: '', roles: [], requisitos: [] })
  }

  function addRequisito() {
    setForm(f => ({ ...f, requisitos: [...f.requisitos, { descripcion: '', tipo_documento: '', obligatorio: true }] }))
  }

  function updateRequisito(idx: number, field: keyof NuevoRequisito, value: string | boolean) {
    setForm(f => {
      const req = [...f.requisitos]
      req[idx] = { ...req[idx], [field]: value }
      return { ...f, requisitos: req }
    })
  }

  function removeRequisito(idx: number) {
    setForm(f => ({ ...f, requisitos: f.requisitos.filter((_, i) => i !== idx) }))
  }

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convocatorias Institucionales</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión del ciclo completo de convocatorias</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Nueva Convocatoria
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {isAdmin && (
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={filtroEstatus}
            onChange={e => setFiltroEstatus(e.target.value)}
          >
            <option value="">Todos los estatus</option>
            {Object.entries(ESTATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </div>

      {/* Listado */}
      {isLoading ? (
        <p className="text-gray-500">Cargando convocatorias…</p>
      ) : convocatorias.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay convocatorias disponibles.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {convocatorias.map(conv => (
            <div key={conv.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 leading-snug">{conv.titulo}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${ESTATUS_COLORS[conv.estatus]}`}>
                  {ESTATUS_LABELS[conv.estatus]}
                </span>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2">{conv.descripcion}</p>

              <div className="text-xs text-gray-600 space-y-0.5">
                <div><span className="font-medium">Tipo:</span> {TIPOS.find(t => t.value === conv.tipo)?.label ?? conv.tipo}</div>
                <div><span className="font-medium">Apertura:</span> {conv.fecha_apertura}</div>
                <div><span className="font-medium">Límite:</span> {conv.fecha_limite}</div>
                {conv.cupo_maximo && <div><span className="font-medium">Cupo:</span> {conv.cupo_maximo}</div>}
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {conv.estatus === 'activa' && !isAdmin && (
                  <button
                    onClick={() => setSelectedConvocatoria(conv)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                  >
                    Postularme
                  </button>
                )}
                {isAdmin && conv.estatus === 'borrador' && (
                  <button
                    onClick={() => cambiarEstatusMutation.mutate({ id: conv.id, estatus: 'activa' })}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                  >
                    Activar
                  </button>
                )}
                {isAdmin && conv.estatus === 'activa' && (
                  <button
                    onClick={() => cambiarEstatusMutation.mutate({ id: conv.id, estatus: 'cerrada' })}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                  >
                    Cerrar
                  </button>
                )}
                {isAdmin && conv.estatus === 'cerrada' && (
                  <button
                    onClick={() => publicarResultadosMutation.mutate(conv.id)}
                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
                  >
                    Publicar Resultados
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal postular */}
      {selectedConvocatoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-2">Confirmar Postulación</h2>
            <p className="text-sm text-gray-600 mb-4">
              ¿Deseas postularte a <strong>{selectedConvocatoria.titulo}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelectedConvocatoria(null)} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => postularMutation.mutate(selectedConvocatoria.id)}
                disabled={postularMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {postularMutation.isPending ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear convocatoria */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Nueva Convocatoria</h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ConvocatoriaTipo }))}
                  >
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cupo máximo</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.cupo_maximo}
                    onChange={e => setForm(f => ({ ...f, cupo_maximo: e.target.value }))}
                    placeholder="Sin límite"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha apertura *</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.fecha_apertura}
                    onChange={e => setForm(f => ({ ...f, fecha_apertura: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite *</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.fecha_limite}
                    onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audiencia (roles que pueden postular)</label>
                <div className="flex gap-4">
                  {ROLES_DISPONIBLES.map(r => (
                    <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(r.value)}
                        onChange={() => toggleRole(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Dejar vacío para todos los roles.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Requisitos</label>
                  <button onClick={addRequisito} className="text-xs text-blue-600 hover:underline">+ Agregar</button>
                </div>
                {form.requisitos.map((req, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <input
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Descripción del requisito"
                      value={req.descripcion}
                      onChange={e => updateRequisito(i, 'descripcion', e.target.value)}
                    />
                    <input
                      className="w-28 border rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Tipo doc."
                      value={req.tipo_documento}
                      onChange={e => updateRequisito(i, 'tipo_documento', e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap mt-2">
                      <input
                        type="checkbox"
                        checked={req.obligatorio}
                        onChange={e => updateRequisito(i, 'obligatorio', e.target.checked)}
                      />
                      Obl.
                    </label>
                    <button onClick={() => removeRequisito(i)} className="text-red-400 hover:text-red-600 mt-1.5">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => crearMutation.mutate()}
                disabled={crearMutation.isPending || !form.titulo || !form.descripcion || !form.fecha_apertura || !form.fecha_limite}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMutation.isPending ? 'Guardando…' : 'Crear Convocatoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
