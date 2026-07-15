import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, mutationError } from '../../academico/pages/tabs/shared'

interface Acervo {
  id: string
  isbn?: string
  titulo: string
  autor: string
  editorial?: string
  anio_edicion?: number
  categoria?: string
  total_ejemplares: number
  ejemplares_disponibles: number
  activo: boolean
}

interface Ejemplar {
  id: string
  codigo_barras: string
  estatus: 'disponible' | 'prestado' | 'baja'
  observaciones?: string
}

interface Prestamo {
  id: string
  estatus: 'activo' | 'devuelto' | 'vencido'
  fecha_prestamo: string
  fecha_devolucion_esperada: string
  fecha_devolucion_real?: string
  renovaciones: number
  multa_acumulada: number
  ejemplar?: { acervo?: Acervo }
}

interface Stats {
  total_titulos: number
  total_ejemplares: number
  prestamos_activos: number
  prestamos_vencidos: number
  reservas_activas: number
}

export default function BibliotecaPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const isAdmin = user?.roles?.some((r: string) => ['superadmin', 'admin', 'personal_administrativo'].includes(r))

  const [tab, setTab] = useState<'catalogo' | 'mis-prestamos' | 'admin' | 'stats'>('catalogo')
  const [busqueda, setBusqueda] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [acervoSeleccionado, setAcervoSeleccionado] = useState<Acervo | null>(null)
  const [prestamoModal, setPrestamoModal] = useState<Ejemplar | null>(null)
  const [prestamoForm, setPrestamoForm] = useState({ fecha_devolucion_esperada: '' })
  const [renewModal, setRenewModal] = useState<Prestamo | null>(null)
  const [nuevaFecha, setNuevaFecha] = useState('')

  const { data: catalogoData } = useQuery<{ data: Acervo[] }>({
    queryKey: ['acervo', debouncedQ],
    queryFn: () => apiClient.get('/acervo', { params: debouncedQ ? { q: debouncedQ } : {} }).then(r => r.data),
    staleTime: 30_000,
  })

  const { data: ejemplares = [] } = useQuery<Ejemplar[]>({
    queryKey: ['ejemplares', acervoSeleccionado?.id],
    queryFn: () => apiClient.get(`/acervo/${acervoSeleccionado!.id}/ejemplares`).then(r => r.data.data ?? []),
    enabled: !!acervoSeleccionado,
  })

  const { data: misPrestamos = [] } = useQuery<Prestamo[]>({
    queryKey: ['mis-prestamos', user?.id],
    queryFn: () => apiClient.get(`/usuarios/${user!.id}/prestamos`).then(r => r.data.data ?? []),
    enabled: !!user?.id && tab === 'mis-prestamos',
  })

  const { data: todosPrestamos } = useQuery<{ data: Prestamo[] }>({
    queryKey: ['todos-prestamos'],
    queryFn: () => apiClient.get('/prestamos', { params: { estatus: 'activo' } }).then(r => r.data),
    enabled: isAdmin && tab === 'admin',
  })

  const { data: stats } = useQuery<Stats>({
    queryKey: ['biblioteca-stats'],
    queryFn: () => apiClient.get('/biblioteca/estadisticas').then(r => r.data.data),
    enabled: tab === 'stats',
    staleTime: 60_000,
  })

  const mutPrestar = useMutation({
    mutationFn: (ejemplarId: string) => apiClient.post('/prestamos', {
      ejemplar_id: ejemplarId,
      user_id: user!.id,
      fecha_devolucion_esperada: prestamoForm.fecha_devolucion_esperada,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ejemplares', acervoSeleccionado?.id] })
      qc.invalidateQueries({ queryKey: ['mis-prestamos'] })
      qc.invalidateQueries({ queryKey: ['acervo'] })
      setPrestamoModal(null)
      toastSuccess('Préstamo registrado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutDevolver = useMutation({
    mutationFn: (prestamoId: string) => apiClient.patch(`/prestamos/${prestamoId}/devolver`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-prestamos'] })
      qc.invalidateQueries({ queryKey: ['todos-prestamos'] })
      toastSuccess('Devolución registrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutRenovar = useMutation({
    mutationFn: (prestamoId: string) => apiClient.patch(`/prestamos/${prestamoId}/renovar`, {
      nueva_fecha_devolucion: nuevaFecha,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-prestamos'] })
      setRenewModal(null)
      toastSuccess('Préstamo renovado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const handleBusqueda = (val: string) => {
    setBusqueda(val)
    clearTimeout((window as any).__biblTimer)
    ;(window as any).__biblTimer = setTimeout(() => setDebouncedQ(val), 400)
  }

  const tabs = [
    { key: 'catalogo', label: 'Catálogo' },
    { key: 'mis-prestamos', label: 'Mis préstamos' },
    ...(isAdmin ? [{ key: 'admin', label: 'Gestión préstamos' }] : []),
    { key: 'stats', label: 'Estadísticas' },
  ] as const

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Biblioteca</h1>
        <p className="text-sm text-slate-500 mt-0.5">Catálogo de acervo bibliográfico y gestión de préstamos</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Catálogo */}
      {tab === 'catalogo' && (
        <div className="space-y-4">
          <input
            value={busqueda}
            onChange={e => handleBusqueda(e.target.value)}
            placeholder="Buscar por título, autor o ISBN…"
            className={`${inputCls} max-w-md`}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(catalogoData?.data ?? []).map(libro => (
              <div
                key={libro.id}
                onClick={() => setAcervoSeleccionado(acervoSeleccionado?.id === libro.id ? null : libro)}
                className={`bg-white rounded-xl border cursor-pointer transition-all ${acervoSeleccionado?.id === libro.id ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 line-clamp-2">{libro.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{libro.autor}</p>
                  {libro.editorial && <p className="text-xs text-slate-400">{libro.editorial} {libro.anio_edicion && `(${libro.anio_edicion})`}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${libro.ejemplares_disponibles > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {libro.ejemplares_disponibles} disponibles
                    </span>
                    {libro.categoria && <span className="text-xs text-slate-400">{libro.categoria}</span>}
                  </div>
                </div>

                {acervoSeleccionado?.id === libro.id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Ejemplares</p>
                    {ejemplares.length === 0
                      ? <p className="text-xs text-slate-400">Sin ejemplares registrados</p>
                      : ejemplares.map(ej => (
                        <div key={ej.id} className="flex items-center justify-between py-1">
                          <span className="text-xs font-mono text-slate-600">{ej.codigo_barras}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ej.estatus === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {ej.estatus}
                            </span>
                            {ej.estatus === 'disponible' && (
                              <button
                                onClick={e => { e.stopPropagation(); setPrestamoModal(ej); setPrestamoForm({ fecha_devolucion_esperada: '' }) }}
                                className="text-xs text-blue-600 hover:underline"
                              >Pedir prestado</button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mis préstamos */}
      {tab === 'mis-prestamos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Libro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Préstamo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Devolución</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {misPrestamos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin préstamos activos</td></tr>
              ) : misPrestamos.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-800 font-medium">{p.ejemplar?.acervo?.titulo ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.fecha_prestamo}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.fecha_devolucion_esperada}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estatus === 'activo' ? 'bg-blue-100 text-blue-700' : p.estatus === 'devuelto' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.estatus === 'activo' && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => mutDevolver.mutate(p.id)} className="text-xs text-slate-600 hover:underline">Devolver</button>
                        {p.renovaciones < 1 && (
                          <button onClick={() => { setRenewModal(p); setNuevaFecha('') }} className="text-xs text-blue-600 hover:underline">Renovar</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin: todos los préstamos activos */}
      {tab === 'admin' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Libro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Devolución esperada</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Renovaciones</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(todosPrestamos?.data ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Sin préstamos activos</td></tr>
              ) : (todosPrestamos?.data ?? []).map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.ejemplar?.acervo?.titulo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.fecha_devolucion_esperada}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{p.renovaciones}/1</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => mutDevolver.mutate(p.id)} className="text-xs text-slate-600 hover:underline">Registrar devolución</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Títulos en acervo', value: stats.total_titulos, color: 'text-blue-700' },
            { label: 'Ejemplares',         value: stats.total_ejemplares, color: 'text-indigo-700' },
            { label: 'Préstamos activos',  value: stats.prestamos_activos, color: 'text-amber-700' },
            { label: 'Préstamos vencidos', value: stats.prestamos_vencidos, color: 'text-red-700' },
            { label: 'Reservas activas',   value: stats.reservas_activas, color: 'text-violet-700' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal préstamo */}
      {prestamoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Solicitar préstamo</h3>
            <p className="text-sm text-slate-500">Ejemplar: <span className="font-mono">{prestamoModal.codigo_barras}</span></p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de devolución esperada</label>
              <input
                type="date"
                value={prestamoForm.fecha_devolucion_esperada}
                onChange={e => setPrestamoForm(f => ({ ...f, fecha_devolucion_esperada: e.target.value }))}
                className={inputCls}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPrestamoModal(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => mutPrestar.mutate(prestamoModal.id)}
                disabled={mutPrestar.isPending || !prestamoForm.fecha_devolucion_esperada}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >{mutPrestar.isPending ? 'Guardando…' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal renovar */}
      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Renovar préstamo</h3>
            <p className="text-xs text-slate-400">Renovación {renewModal.renovaciones + 1}/1</p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nueva fecha de devolución</label>
              <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} className={inputCls} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRenewModal(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => mutRenovar.mutate(renewModal.id)}
                disabled={mutRenovar.isPending || !nuevaFecha}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >{mutRenovar.isPending ? 'Renovando…' : 'Renovar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
