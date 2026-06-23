import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '../../../components/ui/Modal'
import { useToastStore } from '../../../store/toastStore'
import {
  catalogoAdmin,
  type Estado, type Municipio, type EscuelaBachillerato, type Turno,
} from '../../admision/services/catalogo'
import apiClient from '../../../config/apiClient'

type Tab = 'estados' | 'municipios' | 'escuelas' | 'turnos' | 'areas' | 'puestos'

const TAB_LABELS: Record<Tab, string> = {
  estados:    'Estados',
  municipios: 'Municipios',
  escuelas:   'Escuelas de bachillerato',
  turnos:     'Turnos',
  areas:      'Áreas / Departamentos',
  puestos:    'Puestos',
}

type DirectorioArea = { id: number; nombre: string; descripcion: string | null; tipo: string; orden: number; activo: boolean; personal_count: number }
type DirectorioPuesto = { id: number; nombre: string; descripcion: string | null; area_id: number | null; area?: { nombre: string } | null; firma_documentos: boolean; orden: number; activo: boolean; personal_count: number }

const directorioApi = {
  getAreas:    () => apiClient.get('/admin/directorio-areas').then(r => r.data.data as DirectorioArea[]),
  crearArea:   (d: object) => apiClient.post('/admin/directorio-areas', d),
  editarArea:  (id: number, d: object) => apiClient.patch(`/admin/directorio-areas/${id}`, d),
  borrarArea:  (id: number) => apiClient.delete(`/admin/directorio-areas/${id}`),
  getPuestos:  () => apiClient.get('/admin/directorio-puestos').then(r => r.data.data as DirectorioPuesto[]),
  crearPuesto: (d: object) => apiClient.post('/admin/directorio-puestos', d),
  editarPuesto:(id: number, d: object) => apiClient.patch(`/admin/directorio-puestos/${id}`, d),
  borrarPuesto:(id: number) => apiClient.delete(`/admin/directorio-puestos/${id}`),
}

const INPUT = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]'
const SELECT = INPUT + ' bg-white'
const inp = (e?: string) => `${INPUT} ${e ? 'border-red-400' : 'border-slate-300'}`
const sel = (e?: string) => `${SELECT} ${e ? 'border-red-400' : 'border-slate-300'}`
const FE = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null

type CatApiError = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
const extractCatErrors = (e: CatApiError) => {
  const errs = e.response?.data?.errors
  return errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])) : {}
}

const TIPOS_ESCUELA = [
  { value: 'preparatoria',    label: 'Preparatoria' },
  { value: 'cbtis',           label: 'CBTis' },
  { value: 'cetis',           label: 'CECyTE / CETis' },
  { value: 'cobach',          label: 'COBACH' },
  { value: 'cobaev',          label: 'COBAEV' },
  { value: 'cecyte',          label: 'CECyTE' },
  { value: 'telebachillerato',label: 'Telebachillerato' },
  { value: 'otra',            label: 'Otra' },
]

// ── Estados ────────────────────────────────────────────────────────────────────

function EstadosTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [modal, setModal] = useState<'nuevo' | Estado | null>(null)
  const [form, setForm]   = useState({ nombre: '', clave_curp: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: estados = [], isLoading } = useQuery({ queryKey: ['cat-estados'], queryFn: catalogoAdmin.getEstados })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => modal === 'nuevo'
      ? catalogoAdmin.crearEstado(d)
      : catalogoAdmin.actualizarEstado((modal as Estado).id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cat-estados'] })
      success(modal === 'nuevo' ? 'Estado creado.' : 'Estado actualizado.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar el estado.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => catalogoAdmin.eliminarEstado(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cat-estados'] }); success('Estado eliminado.') },
    onError: () => toastError('No se puede eliminar: tiene municipios asociados.'),
  })

  const abrirModal = (item: 'nuevo' | Estado) => {
    setForm(item === 'nuevo' ? { nombre: '', clave_curp: '' } : { nombre: item.nombre, clave_curp: item.clave_curp })
    setModal(item)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => abrirModal('nuevo')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
          + Nuevo estado
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Clave CURP</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Municipios</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {estados.map(e => (
              <tr key={e.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-slate-800 font-medium">{e.nombre}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{e.clave_curp}</td>
                <td className="px-4 py-3 text-slate-500">{e.municipios_count ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(e)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(e.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nuevo' ? 'Nuevo estado' : `Editar: ${(modal as Estado).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} />
              <FE msg={errors.nombre} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Clave CURP * (2 letras)</label>
              <input required maxLength={2} value={form.clave_curp}
                onChange={e => setForm(f => ({ ...f, clave_curp: e.target.value.toUpperCase() }))}
                className={inp(errors.clave_curp) + ' font-mono'} placeholder="VZ" />
              <FE msg={errors.clave_curp} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Municipios ─────────────────────────────────────────────────────────────────

function MunicipiosTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState<'nuevo' | Municipio | null>(null)
  const [form, setForm]   = useState({ nombre: '', estado_id: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: estados = [] } = useQuery({ queryKey: ['cat-estados'], queryFn: catalogoAdmin.getEstados })
  const { data: municipios = [], isLoading } = useQuery({
    queryKey: ['cat-municipios', filtroEstado],
    queryFn: () => catalogoAdmin.getMunicipios(filtroEstado ? Number(filtroEstado) : undefined),
  })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => modal === 'nuevo'
      ? catalogoAdmin.crearMunicipio({ ...d, estado_id: Number(d.estado_id) })
      : catalogoAdmin.actualizarMunicipio((modal as Municipio).id, { ...d, estado_id: Number(d.estado_id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cat-municipios'] })
      success(modal === 'nuevo' ? 'Municipio creado.' : 'Municipio actualizado.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar el municipio.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => catalogoAdmin.eliminarMunicipio(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cat-municipios'] }); success('Municipio eliminado.') },
    onError: () => toastError('Error al eliminar.'),
  })

  const abrirModal = (item: 'nuevo' | Municipio) => {
    setForm(item === 'nuevo'
      ? { nombre: '', estado_id: filtroEstado }
      : { nombre: item.nombre, estado_id: String(item.estado_id) })
    setModal(item)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={SELECT + ' sm:w-56'}>
          <option value="">Todos los estados</option>
          {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <button onClick={() => abrirModal('nuevo')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors shrink-0">
          + Nuevo municipio
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Municipio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Escuelas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {municipios.map(m => (
              <tr key={m.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-800">{m.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{m.estado?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{m.escuelas_count ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(m)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(m.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nuevo' ? 'Nuevo municipio' : `Editar: ${(modal as Municipio).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
              <select required value={form.estado_id} onChange={e => setForm(f => ({ ...f, estado_id: e.target.value }))} className={sel(errors.estado_id)}>
                <option value="">Selecciona…</option>
                {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <FE msg={errors.estado_id} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del municipio *</label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} />
              <FE msg={errors.nombre} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Escuelas ───────────────────────────────────────────────────────────────────

function EscuelasTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState<'nueva' | EscuelaBachillerato | null>(null)
  const [form, setForm]   = useState({ nombre: '', municipio_id: '', tipo: 'preparatoria', activa: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: estados = [] }    = useQuery({ queryKey: ['cat-estados'], queryFn: catalogoAdmin.getEstados })
  const { data: municipios = [] } = useQuery({
    queryKey: ['cat-municipios', filtroEstado],
    queryFn: () => catalogoAdmin.getMunicipios(filtroEstado ? Number(filtroEstado) : undefined),
    enabled: true,
  })
  const { data: escuelas = [], isLoading } = useQuery({
    queryKey: ['cat-escuelas', filtroEstado],
    queryFn: () => catalogoAdmin.getEscuelas(filtroEstado ? { estado_id: Number(filtroEstado) } : undefined),
  })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = { ...d, municipio_id: d.municipio_id ? Number(d.municipio_id) : null }
      return modal === 'nueva'
        ? catalogoAdmin.crearEscuela(payload)
        : catalogoAdmin.actualizarEscuela((modal as EscuelaBachillerato).id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cat-escuelas'] })
      success(modal === 'nueva' ? 'Escuela creada.' : 'Escuela actualizada.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => catalogoAdmin.eliminarEscuela(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cat-escuelas'] }); success('Escuela eliminada.') },
    onError: () => toastError('Error al eliminar.'),
  })

  const abrirModal = (item: 'nueva' | EscuelaBachillerato) => {
    setForm(item === 'nueva'
      ? { nombre: '', municipio_id: '', tipo: 'preparatoria', activa: true }
      : { nombre: item.nombre, municipio_id: String(item.municipio_id ?? ''), tipo: item.tipo, activa: item.activa })
    setModal(item)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={SELECT + ' sm:w-56'}>
          <option value="">Todos los estados</option>
          {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <button onClick={() => abrirModal('nueva')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors shrink-0">
          + Nueva escuela
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Escuela</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Municipio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {escuelas.map(e => (
              <tr key={e.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {e.nombre}
                  {!e.activa && <span className="ml-2 text-xs text-slate-400">(inactiva)</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 capitalize">{e.tipo}</td>
                <td className="px-4 py-3 text-slate-500">{e.municipio?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{e.municipio?.estado?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(e)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(e.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nueva' ? 'Nueva escuela' : `Editar: ${(modal as EscuelaBachillerato).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} />
              <FE msg={errors.nombre} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
                <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={sel(errors.tipo)}>
                  {TIPOS_ESCUELA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <FE msg={errors.tipo} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Municipio</label>
                <select value={form.municipio_id} onChange={e => setForm(f => ({ ...f, municipio_id: e.target.value }))} className={sel(errors.municipio_id)}>
                  <option value="">Sin asignar</option>
                  {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <FE msg={errors.municipio_id} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
              Escuela activa (visible en formularios)
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Turnos ─────────────────────────────────────────────────────────────────────

function TurnosTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [modal, setModal] = useState<'nuevo' | Turno | null>(null)
  const [form, setForm]   = useState({ nombre: '', clave: '', activo: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: turnos = [], isLoading } = useQuery({ queryKey: ['cat-turnos-admin'], queryFn: catalogoAdmin.getTurnos })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => modal === 'nuevo'
      ? catalogoAdmin.crearTurno(d)
      : catalogoAdmin.actualizarTurno((modal as Turno).id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cat-turnos-admin'] })
      success(modal === 'nuevo' ? 'Turno creado.' : 'Turno actualizado.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar el turno.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => catalogoAdmin.eliminarTurno(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cat-turnos-admin'] }); success('Turno eliminado.') },
    onError: () => toastError('Error al eliminar.'),
  })

  const abrirModal = (item: 'nuevo' | Turno) => {
    setForm(item === 'nuevo' ? { nombre: '', clave: '', activo: true } : { nombre: item.nombre, clave: item.clave, activo: item.activo })
    setModal(item)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => abrirModal('nuevo')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
          + Nuevo turno
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Turno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Clave</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {turnos.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-800">{t.nombre}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{t.clave}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(t)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(t.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nuevo' ? 'Nuevo turno' : `Editar: ${(modal as Turno).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} placeholder="Matutino" />
                <FE msg={errors.nombre} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clave * (sin espacios)</label>
                <input required value={form.clave}
                  onChange={e => setForm(f => ({ ...f, clave: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  className={inp(errors.clave) + ' font-mono'} placeholder="matutino" />
                <FE msg={errors.clave} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
              Turno activo
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Áreas / Departamentos ──────────────────────────────────────────────────────

const TIPOS_AREA = [
  { value: 'administracion', label: 'Administración' },
  { value: 'academico',      label: 'Académico' },
  { value: 'departamento',   label: 'Departamento' },
]

function AreasTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [modal, setModal] = useState<'nueva' | DirectorioArea | null>(null)
  const [form, setForm]   = useState({ nombre: '', descripcion: '', tipo: 'departamento', orden: 0, activo: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: areas = [], isLoading } = useQuery({ queryKey: ['dir-areas'], queryFn: directorioApi.getAreas })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => modal === 'nueva'
      ? directorioApi.crearArea(d)
      : directorioApi.editarArea((modal as DirectorioArea).id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dir-areas'] })
      success(modal === 'nueva' ? 'Área creada.' : 'Área actualizada.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar. Verifica que el nombre sea único.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => directorioApi.borrarArea(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dir-areas'] }); success('Área eliminada.') },
    onError: () => toastError('No se puede eliminar: tiene personal o puestos asociados.'),
  })

  const abrirModal = (item: 'nueva' | DirectorioArea) => {
    setForm(item === 'nueva'
      ? { nombre: '', descripcion: '', tipo: 'departamento', orden: 0, activo: true }
      : { nombre: item.nombre, descripcion: item.descripcion ?? '', tipo: item.tipo, orden: item.orden, activo: item.activo })
    setModal(item)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => abrirModal('nueva')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
          + Nueva área
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Personal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {areas.map(a => (
              <tr key={a.id} className="hover:bg-blue-50/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{TIPOS_AREA.find(t => t.value === a.tipo)?.label ?? a.tipo}</td>
                <td className="px-4 py-3 text-slate-500">{a.personal_count}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(a)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(a.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nueva' ? 'Nueva área / departamento' : `Editar: ${(modal as DirectorioArea).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} placeholder="Ej: Recursos Humanos" />
              <FE msg={errors.nombre} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={sel(errors.tipo)}>
                  {TIPOS_AREA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <FE msg={errors.tipo} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Orden de aparición</label>
                <input type="number" min={0} value={form.orden} onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))} className={inp(errors.orden)} />
                <FE msg={errors.orden} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className={inp(errors.descripcion)} />
              <FE msg={errors.descripcion} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
              Área activa
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Puestos ────────────────────────────────────────────────────────────────────

function PuestosTab() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [modal, setModal] = useState<'nuevo' | DirectorioPuesto | null>(null)
  const [form, setForm]   = useState({ nombre: '', descripcion: '', area_id: '', firma_documentos: false, orden: 0, activo: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: areas = [] }   = useQuery({ queryKey: ['dir-areas'], queryFn: directorioApi.getAreas })
  const { data: puestos = [], isLoading } = useQuery({ queryKey: ['dir-puestos'], queryFn: directorioApi.getPuestos })

  const guardar = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = { ...d, area_id: d.area_id ? Number(d.area_id) : null }
      return modal === 'nuevo'
        ? directorioApi.crearPuesto(payload)
        : directorioApi.editarPuesto((modal as DirectorioPuesto).id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dir-puestos'] })
      success(modal === 'nuevo' ? 'Puesto creado.' : 'Puesto actualizado.')
      setModal(null); setErrors({})
    },
    onError: (e: CatApiError) => {
      const extracted = extractCatErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else toastError(e.response?.data?.message ?? 'Error al guardar. Verifica que el nombre sea único.')
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => directorioApi.borrarPuesto(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dir-puestos'] }); success('Puesto eliminado.') },
    onError: () => toastError('No se puede eliminar: tiene personal asociado.'),
  })

  const abrirModal = (item: 'nuevo' | DirectorioPuesto) => {
    setForm(item === 'nuevo'
      ? { nombre: '', descripcion: '', area_id: '', firma_documentos: false, orden: 0, activo: true }
      : { nombre: item.nombre, descripcion: item.descripcion ?? '', area_id: item.area_id ? String(item.area_id) : '', firma_documentos: item.firma_documentos, orden: item.orden, activo: item.activo })
    setModal(item)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => abrirModal('nuevo')}
          className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
          + Nuevo puesto
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Puesto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Área</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Firma docs.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Personal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {puestos.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{p.area?.nombre ?? '—'}</td>
                <td className="px-4 py-3">
                  {p.firma_documentos
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Sí</span>
                    : <span className="text-xs text-slate-400">No</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.personal_count}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => abrirModal(p)} className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                    <button onClick={() => eliminar.mutate(p.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'nuevo' ? 'Nuevo puesto' : `Editar: ${(modal as DirectorioPuesto).nombre}`} onClose={() => { setModal(null); setErrors({}) }}>
          <form onSubmit={e => { e.preventDefault(); guardar.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del puesto *</label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp(errors.nombre)} placeholder="Ej: Director General" />
              <FE msg={errors.nombre} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Área / Departamento</label>
                <select value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))} className={sel(errors.area_id)}>
                  <option value="">Sin área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                <FE msg={errors.area_id} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Orden de aparición</label>
                <input type="number" min={0} value={form.orden} onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))} className={inp(errors.orden)} />
                <FE msg={errors.orden} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className={inp(errors.descripcion)} />
              <FE msg={errors.descripcion} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.firma_documentos} onChange={e => setForm(f => ({ ...f, firma_documentos: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
                Firma documentos oficiales
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
                Puesto activo
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardar.isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('estados')

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Catálogos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Administra los datos de referencia usados en el formulario de admisión.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-fit px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              tab === t ? 'bg-white text-[#1a3a5c] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'estados'    && <EstadosTab />}
      {tab === 'municipios' && <MunicipiosTab />}
      {tab === 'escuelas'   && <EscuelasTab />}
      {tab === 'turnos'     && <TurnosTab />}
      {tab === 'areas'      && <AreasTab />}
      {tab === 'puestos'    && <PuestosTab />}
    </div>
  )
}
