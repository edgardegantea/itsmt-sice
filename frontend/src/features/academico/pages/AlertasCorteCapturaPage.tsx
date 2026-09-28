import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type AlertaCorteCaptura } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'

const PCT_COLOR = (pct: number) =>
  pct >= 100 ? 'text-green-700 bg-green-100' : pct >= 50 ? 'text-orange-700 bg-orange-100' : 'text-red-700 bg-red-100'

const fmtFecha = (s: string) => {
  if (!s) return '—'
  const iso = String(s).slice(0, 10)
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AlertasCorteCapturaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const { user } = useAuthStore()
  const [vista, setVista] = useViewMode('alertas-corte-captura')
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [detalle, setDetalle] = useState<AlertaCorteCaptura | null>(null)

  const esDocente = (user?.roles?.includes('docente') ?? false) && !user?.roles?.some(r => ['superadmin', 'admin', 'director_academico'].includes(r))

  const { data, isLoading } = useQuery({
    queryKey: ['alertas-corte-captura', soloPendientes],
    queryFn: () => academicoApi.getAlertasCorteCaptura({ pendiente: soloPendientes || undefined }),
  })

  const alertas: AlertaCorteCaptura[] = data?.data ?? []

  const mutLeer = useMutation({
    mutationFn: (id: string) => academicoApi.marcarLeidaAlertaCorteCaptura(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas-corte-captura'] })
      toastSuccess('Alerta marcada como leída.')
    },
    onError: () => toastError('Error al actualizar la alerta.'),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {esDocente ? 'Mis pendientes de captura' : 'Cumplimiento de captura de calificaciones'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {esDocente
                ? 'Materias con calificaciones pendientes en los cortes de revisión del periodo.'
                : 'Docentes con materias pendientes de captura en cada corte de revisión.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)}
                className="w-4 h-4 accent-[#1a3a5c]" />
              Solo pendientes
            </label>
            <ViewToggle value={vista} onChange={setVista} />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Cargando alertas…</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <svg className="w-10 h-10 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-slate-500 text-sm">
              {soloPendientes ? 'Sin pendientes. Todas las cargas están al corriente en su captura.' : 'No hay alertas registradas.'}
            </p>
          </div>
        ) : vista === 'lista' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {!esDocente && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Materia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Corte</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">% Capturado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Leída</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertas.map(a => {
                  const yoLei = esDocente ? a.leida_docente : (a.leida_director || a.leida_jefe)
                  return (
                    <tr key={a.id} className={`transition-colors ${yoLei ? 'bg-slate-50/50' : 'hover:bg-orange-50/50'}`}>
                      {!esDocente && (
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{a.docente?.name ?? '—'}</p>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{a.carga_academica?.materia?.nombre ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.corte_captura?.nombre ?? `Corte ${a.corte_captura?.numero ?? ''}`}
                        {a.unidades_esperadas != null && (
                          <p className="text-xs text-slate-400">Unidades esperadas: {a.unidades_esperadas}/{a.total_unidades_temario}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${PCT_COLOR(a.porcentaje_capturado)}`}>
                          {a.porcentaje_capturado.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className={a.leida_docente ? 'text-green-600' : 'text-slate-400'}>Docente {a.leida_docente ? '✓' : '○'}</span>
                          <span className={a.leida_jefe ? 'text-green-600' : 'text-slate-400'}>Jefe {a.leida_jefe ? '✓' : '○'}</span>
                          <span className={a.leida_director ? 'text-green-600' : 'text-slate-400'}>Director {a.leida_director ? '✓' : '○'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => mutLeer.mutate(a.id)}
                          disabled={mutLeer.isPending}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Marcar leída
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDetalle(a)} className="text-xs font-medium text-slate-500 hover:underline whitespace-nowrap">Ver detalle</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertas.map(a => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                {!esDocente && <p className="font-medium text-slate-800 truncate">{a.docente?.name ?? '—'}</p>}
                <p className="text-sm text-slate-700 truncate">{a.carga_academica?.materia?.nombre ?? '—'}</p>
                <p className="text-xs text-slate-500">{a.corte_captura?.nombre ?? `Corte ${a.corte_captura?.numero ?? ''}`}</p>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full self-start ${PCT_COLOR(a.porcentaje_capturado)}`}>
                  {a.porcentaje_capturado.toFixed(1)}%
                </span>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => mutLeer.mutate(a.id)} disabled={mutLeer.isPending} className="text-xs text-blue-600 hover:underline disabled:opacity-50">Marcar leída</button>
                  <button onClick={() => setDetalle(a)} className="text-xs font-medium text-slate-500 hover:underline">Ver detalle</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detalle && (
        <DetailModal
          title={detalle.carga_academica?.materia?.nombre ?? 'Alerta de captura'}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Docente', value: detalle.docente?.name },
            { label: 'Corte', value: detalle.corte_captura?.nombre ?? `Corte ${detalle.corte_captura?.numero ?? ''}` },
            { label: 'Fecha límite de captura', value: detalle.corte_captura?.fecha_limite_captura ? fmtFecha(detalle.corte_captura.fecha_limite_captura) : '—' },
            { label: '% Capturado', value: `${detalle.porcentaje_capturado.toFixed(1)}%` },
            { label: 'Unidades esperadas', value: detalle.unidades_esperadas != null ? `${detalle.unidades_esperadas}/${detalle.total_unidades_temario}` : '—' },
            { label: 'Leída por docente', value: detalle.leida_docente ? 'Sí' : 'No' },
            { label: 'Leída por jefe', value: detalle.leida_jefe ? 'Sí' : 'No' },
            { label: 'Leída por director', value: detalle.leida_director ? 'Sí' : 'No' },
          ]}
          footer={<button onClick={() => mutLeer.mutate(detalle.id)} disabled={mutLeer.isPending} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg disabled:opacity-50">Marcar leída</button>}
        />
      )}
    </div>
  )
}
