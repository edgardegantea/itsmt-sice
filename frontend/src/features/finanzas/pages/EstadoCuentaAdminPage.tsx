import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError } from '../../academico/pages/tabs/shared'

interface Pago {
  id: string
  concepto: string
  monto: string
  fecha_pago: string
  metodo_pago: string
  folio_cfdi?: string
}

interface Adeudo {
  id: string
  concepto: string
  monto: string
  pagado: boolean
  created_at: string
}

interface EstadoCuenta {
  alumno: { id: string; numero_control: string; user?: { name: string } }
  adeudos: Adeudo[]
  pagos: Pago[]
  total_adeudado: number
  total_pagado: number
}

interface Alumno {
  id: string
  numero_control: string
  user?: { name: string; email: string }
}

export default function EstadoCuentaAdminPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some((r: string) => ['superadmin', 'admin', 'control_escolar'].includes(r))

  const [alumnoId, setAlumnoId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagoModal, setPagoModal] = useState<Adeudo | null>(null)
  const [metodoPago, setMetodoPago] = useState('efectivo')

  const { data: alumnos = [] } = useQuery<Alumno[]>({
    queryKey: ['alumnos-lista'],
    queryFn: () => apiClient.get('/admin/alumnos').then(r => r.data.data?.data ?? r.data.data ?? []),
    enabled: isAdmin,
  })

  const { data: estadoCuenta, isLoading } = useQuery<EstadoCuenta>({
    queryKey: ['estado-cuenta', alumnoId],
    queryFn: () => apiClient.get(`/alumnos/${alumnoId}/estado-cuenta`).then(r => r.data.data),
    enabled: !!alumnoId,
  })

  const mutPagar = useMutation({
    mutationFn: (adeudoId: string) => apiClient.post(`/adeudos/${adeudoId}/pagar`, { metodo_pago: metodoPago }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estado-cuenta', alumnoId] })
      setPagoModal(null)
      toastSuccess('Pago registrado correctamente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const alumnosFiltrados = alumnos.filter(a =>
    !busqueda ||
    a.numero_control.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.user?.name ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Estado de Cuenta</h1>
        <p className="text-sm text-slate-500 mt-0.5">Adeudos y historial de pagos por alumno</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar alumno…"
          className={`${inputCls} max-w-xs`}
        />
        <select value={alumnoId} onChange={e => setAlumnoId(e.target.value)} className={`${selectCls} max-w-xs`}>
          <option value="">Seleccionar alumno…</option>
          {alumnosFiltrados.map(a => (
            <option key={a.id} value={a.id}>{a.numero_control} — {a.user?.name}</option>
          ))}
        </select>
      </div>

      {alumnoId && isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Cargando…</div>
      )}

      {estadoCuenta && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total adeudado', value: `$${Number(estadoCuenta.total_adeudado).toFixed(2)}`, color: 'text-red-700' },
              { label: 'Total pagado',   value: `$${Number(estadoCuenta.total_pagado).toFixed(2)}`, color: 'text-green-700' },
              { label: 'Adeudos pendientes', value: estadoCuenta.adeudos.filter(a => !a.pagado).length, color: 'text-amber-700' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Adeudos */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Adeudos</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Concepto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                    {isAdmin && <th />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estadoCuenta.adeudos.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Sin adeudos</td></tr>
                  ) : estadoCuenta.adeudos.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-800">{a.concepto}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">${Number(a.monto).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.pagado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {!a.pagado && (
                            <button onClick={() => setPagoModal(a)} className="text-xs text-blue-600 hover:underline">
                              Registrar pago
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Historial pagos */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Historial de pagos</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Concepto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Método</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estadoCuenta.pagos.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Sin pagos registrados</td></tr>
                  ) : estadoCuenta.pagos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-800">{p.concepto}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-700">${Number(p.monto).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{p.metodo_pago}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.fecha_pago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Modal pago */}
      {pagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Registrar pago</h3>
            <p className="text-sm text-slate-600">{pagoModal.concepto} — <span className="font-bold">${Number(pagoModal.monto).toFixed(2)}</span></p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Método de pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={selectCls}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPagoModal(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => mutPagar.mutate(pagoModal.id)}
                disabled={mutPagar.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {mutPagar.isPending ? 'Guardando…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
