import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError, ModalWrap } from '../../academico/pages/tabs/shared'

interface Inventario {
  id: string
  clave: string
  nombre: string
  categoria: string
  estado: 'activo' | 'mantenimiento' | 'baja'
  aula?: { nombre: string }
  responsable?: { name: string }
}

interface PrestamoEquipo {
  id: string
  fecha_prestamo: string
  fecha_devolucion_prevista: string
  estatus: string
  inventario?: { nombre: string; clave: string }
  solicitante?: { name: string }
}

interface ReservaEspacio {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string
  estatus: string
  aula?: { nombre: string }
  solicitante?: { name: string }
}

interface SolicitudMantenimiento {
  id: string
  tipo: string
  descripcion: string
  prioridad: string
  estatus: string
  inventario?: { nombre: string }
  aula?: { nombre: string }
  reportador?: { name: string }
}

interface Indicadores {
  total_bienes: number
  bienes_por_categoria: Record<string, number>
  bienes_en_mantenimiento: number
  bienes_baja: number
  prestamos_activos: number
  prestamos_vencidos: number
  mantenimiento_abiertas: number
  mantenimiento_por_prioridad: Record<string, number>
}

const ESTADO_BIEN_CLS: Record<string, string> = {
  activo: 'bg-green-100 text-green-700',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-red-100 text-red-700',
}

const PRIORIDAD_CLS: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-yellow-100 text-yellow-700',
  urgente: 'bg-red-100 text-red-700',
}

export default function InfraestructuraPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const isGestion = user?.roles?.some((r: string) => ['superadmin', 'admin', 'personal_administrativo', 'direccion_academica'].includes(r))

  const [tab, setTab] = useState<'inventario' | 'prestamos' | 'reservas' | 'mantenimiento' | 'indicadores'>('inventario')
  const [showInventarioModal, setShowInventarioModal] = useState(false)
  const [showReservaModal, setShowReservaModal] = useState(false)
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false)

  const [inventarioForm, setInventarioForm] = useState({ clave: '', nombre: '', categoria: 'otro', descripcion: '' })
  const [reservaForm, setReservaForm] = useState({ aula_id: '', fecha: '', hora_inicio: '', hora_fin: '', motivo: '' })
  const [mantenimientoForm, setMantenimientoForm] = useState({ inventario_id: '', descripcion: '', prioridad: 'media' })

  const { data: inventario } = useQuery<{ data: Inventario[] }>({
    queryKey: ['inventario'],
    queryFn: () => apiClient.get('/inventario').then(r => r.data.data),
    enabled: tab === 'inventario',
  })

  const { data: prestamos } = useQuery<{ data: PrestamoEquipo[] }>({
    queryKey: ['prestamos-equipo'],
    queryFn: () => apiClient.get('/prestamos-equipo').then(r => r.data.data),
    enabled: tab === 'prestamos',
  })

  const { data: reservas } = useQuery<{ data: ReservaEspacio[] }>({
    queryKey: ['reservas-espacios'],
    queryFn: () => apiClient.get('/reservas-espacios').then(r => r.data.data),
    enabled: tab === 'reservas',
  })

  const { data: aulas = [] } = useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['aulas-lista'],
    queryFn: () => apiClient.get('/aulas').then(r => r.data.data ?? []),
    enabled: tab === 'reservas',
  })

  const { data: mantenimiento } = useQuery<{ data: SolicitudMantenimiento[] }>({
    queryKey: ['mantenimiento'],
    queryFn: () => apiClient.get('/mantenimiento').then(r => r.data.data),
    enabled: tab === 'mantenimiento',
  })

  const { data: indicadores } = useQuery<Indicadores>({
    queryKey: ['indicadores-infraestructura'],
    queryFn: () => apiClient.get('/indicadores/infraestructura').then(r => r.data.data),
    enabled: tab === 'indicadores',
  })

  const mutCrearInventario = useMutation({
    mutationFn: () => apiClient.post('/inventario', inventarioForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario'] })
      setShowInventarioModal(false)
      toastSuccess('Bien de inventario registrado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCrearReserva = useMutation({
    mutationFn: () => apiClient.post('/reservas-espacios', reservaForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-espacios'] })
      setShowReservaModal(false)
      toastSuccess('Reserva solicitada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutEstatusReserva = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) =>
      apiClient.patch(`/reservas-espacios/${id}/estatus`, { estatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-espacios'] })
      toastSuccess('Reserva actualizada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCrearMantenimiento = useMutation({
    mutationFn: () => apiClient.post('/mantenimiento', mantenimientoForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mantenimiento'] })
      setShowMantenimientoModal(false)
      toastSuccess('Solicitud de mantenimiento registrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutAtenderMantenimiento = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) =>
      apiClient.patch(`/mantenimiento/${id}/atender`, { estatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mantenimiento'] })
      toastSuccess('Solicitud actualizada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Infraestructura y Recursos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Inventario, préstamo de equipo, reservas de espacios y mantenimiento</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit flex-wrap">
        {[
          { key: 'inventario', label: 'Inventario' },
          { key: 'prestamos', label: 'Préstamos' },
          { key: 'reservas', label: 'Reservas de espacios' },
          { key: 'mantenimiento', label: 'Mantenimiento' },
          { key: 'indicadores', label: 'Indicadores' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Inventario */}
      {tab === 'inventario' && (
        <>
          {isGestion && (
            <div className="flex justify-end">
              <button
                onClick={() => { setInventarioForm({ clave: '', nombre: '', categoria: 'otro', descripcion: '' }); setShowInventarioModal(true) }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                + Registrar bien
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inventario?.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin bienes registrados</td></tr>
                ) : (inventario?.data ?? []).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.clave}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.nombre}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{item.categoria.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">{item.aula?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BIEN_CLS[item.estado]}`}>{item.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Préstamos */}
      {tab === 'prestamos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Bien</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Devolución prevista</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(prestamos?.data ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Sin préstamos registrados</td></tr>
              ) : (prestamos?.data ?? []).map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.inventario?.nombre} <span className="text-slate-400 font-mono text-xs">({p.inventario?.clave})</span></td>
                  <td className="px-4 py-3 text-slate-600">{p.solicitante?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.fecha_devolucion_prevista}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estatus === 'devuelto' ? 'bg-green-100 text-green-700' : p.estatus === 'dañado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.estatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reservas de espacios */}
      {tab === 'reservas' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setReservaForm({ aula_id: '', fecha: '', hora_inicio: '', hora_fin: '', motivo: '' }); setShowReservaModal(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Solicitar reserva
            </button>
          </div>

          <div className="space-y-3">
            {(reservas?.data ?? []).length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Sin reservas registradas</div>
            )}
            {(reservas?.data ?? []).map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{r.aula?.nombre} · {r.fecha} · {r.hora_inicio}–{r.hora_fin}</p>
                  <p className="text-xs text-slate-500">{r.motivo} · Solicitó: {r.solicitante?.name ?? '—'}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${r.estatus === 'aprobada' ? 'bg-green-100 text-green-700' : r.estatus === 'rechazada' || r.estatus === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.estatus}
                  </span>
                </div>
                {isGestion && r.estatus === 'pendiente' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => mutEstatusReserva.mutate({ id: r.id, estatus: 'aprobada' })} className="text-xs text-green-600 hover:underline">Aprobar</button>
                    <button onClick={() => mutEstatusReserva.mutate({ id: r.id, estatus: 'rechazada' })} className="text-xs text-red-600 hover:underline">Rechazar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mantenimiento */}
      {tab === 'mantenimiento' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setMantenimientoForm({ inventario_id: '', descripcion: '', prioridad: 'media' }); setShowMantenimientoModal(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Reportar falla
            </button>
          </div>

          <div className="space-y-3">
            {(mantenimiento?.data ?? []).length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Sin solicitudes de mantenimiento</div>
            )}
            {(mantenimiento?.data ?? []).map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORIDAD_CLS[m.prioridad]}`}>{m.prioridad}</span>
                    <span className="text-xs text-slate-400 capitalize">{m.tipo}</span>
                  </div>
                  <p className="font-medium text-slate-800 mt-0.5">{m.descripcion}</p>
                  <p className="text-xs text-slate-400">{m.inventario?.nombre ?? m.aula?.nombre ?? '—'} · Reportó: {m.reportador?.name ?? '—'}</p>
                </div>
                {isGestion && m.estatus !== 'resuelta' && m.estatus !== 'cancelada' && (
                  <div className="flex gap-2 flex-shrink-0">
                    {m.estatus === 'abierta' && (
                      <button onClick={() => mutAtenderMantenimiento.mutate({ id: m.id, estatus: 'en_proceso' })} className="text-xs text-blue-600 hover:underline">Tomar</button>
                    )}
                    <button onClick={() => mutAtenderMantenimiento.mutate({ id: m.id, estatus: 'resuelta' })} className="text-xs text-green-600 hover:underline">Resolver</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Indicadores */}
      {tab === 'indicadores' && indicadores && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total de bienes',          value: indicadores.total_bienes, color: 'text-slate-700' },
            { label: 'En mantenimiento',          value: indicadores.bienes_en_mantenimiento, color: 'text-yellow-700' },
            { label: 'De baja',                   value: indicadores.bienes_baja, color: 'text-red-700' },
            { label: 'Préstamos activos',         value: indicadores.prestamos_activos, color: 'text-blue-700' },
            { label: 'Préstamos vencidos',        value: indicadores.prestamos_vencidos, color: 'text-red-700' },
            { label: 'Mantenimiento pendiente',   value: indicadores.mantenimiento_abiertas, color: 'text-yellow-700' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal inventario */}
      {showInventarioModal && (
        <ModalWrap title="Registrar bien de inventario" onClose={() => setShowInventarioModal(false)} onSave={() => mutCrearInventario.mutate()} saving={mutCrearInventario.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Clave *</label>
            <input value={inventarioForm.clave} onChange={e => setInventarioForm(f => ({ ...f, clave: e.target.value }))} className={inputCls} placeholder="Ej. INV-0001" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Categoría</label>
            <select value={inventarioForm.categoria} onChange={e => setInventarioForm(f => ({ ...f, categoria: e.target.value }))} className={selectCls}>
              <option value="mobiliario">Mobiliario</option>
              <option value="equipo_computo">Equipo de cómputo</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="audiovisual">Audiovisual</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre *</label>
            <input value={inventarioForm.nombre} onChange={e => setInventarioForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción</label>
            <textarea value={inventarioForm.descripcion} onChange={e => setInventarioForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal reserva */}
      {showReservaModal && (
        <ModalWrap title="Solicitar reserva de espacio" onClose={() => setShowReservaModal(false)} onSave={() => mutCrearReserva.mutate()} saving={mutCrearReserva.isPending}>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Aula *</label>
            <select value={reservaForm.aula_id} onChange={e => setReservaForm(f => ({ ...f, aula_id: e.target.value }))} className={selectCls}>
              <option value="">Seleccionar…</option>
              {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha *</label>
            <input type="date" value={reservaForm.fecha} onChange={e => setReservaForm(f => ({ ...f, fecha: e.target.value }))} className={inputCls} />
          </div>
          <div />
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Hora inicio *</label>
            <input type="time" value={reservaForm.hora_inicio} onChange={e => setReservaForm(f => ({ ...f, hora_inicio: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Hora fin *</label>
            <input type="time" value={reservaForm.hora_fin} onChange={e => setReservaForm(f => ({ ...f, hora_fin: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Motivo *</label>
            <input value={reservaForm.motivo} onChange={e => setReservaForm(f => ({ ...f, motivo: e.target.value }))} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal mantenimiento */}
      {showMantenimientoModal && (
        <ModalWrap title="Reportar falla / solicitar mantenimiento" onClose={() => setShowMantenimientoModal(false)} onSave={() => mutCrearMantenimiento.mutate()} saving={mutCrearMantenimiento.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Prioridad</label>
            <select value={mantenimientoForm.prioridad} onChange={e => setMantenimientoForm(f => ({ ...f, prioridad: e.target.value }))} className={selectCls}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción *</label>
            <textarea value={mantenimientoForm.descripcion} onChange={e => setMantenimientoForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
        </ModalWrap>
      )}
    </div>
  )
}
