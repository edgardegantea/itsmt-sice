import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { permanenciaApi } from '../services/permanencia'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { inputCls, usePeriodos } from '../../academico/pages/tabs/shared'
import { openPdfPreview } from '../../../utils/pdfHelpers'

export default function ReporteAltasBajasPage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const { data: periodos = [] } = usePeriodos()

  const [periodoId, setPeriodoId] = useState('')
  useEffect(() => {
    if (!periodoId && periodoActivo?.id) setPeriodoId(periodoActivo.id)
  }, [periodoActivo, periodoId])
  const periodoSeleccionado = periodos.find(p => p.id === periodoId)

  const [generandoPdf, setGenerandoPdf] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-altas-bajas', periodoId],
    queryFn: () => permanenciaApi.getReporteAltasBajas(periodoId),
    enabled: !!periodoId,
  })

  async function descargarPdf() {
    if (!periodoId) return
    setGenerandoPdf(true)
    try {
      const blob = await permanenciaApi.getReporteAltasBajasPdfUrl(periodoId)
      openPdfPreview(new Blob([blob], { type: 'application/pdf' }), `reporte_altas_bajas_${periodoSeleccionado?.nombre ?? ''}.pdf`)
    } finally {
      setGenerandoPdf(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reporte de Altas y Bajas</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Nuevo ingreso, reingreso y bajas por carrera del periodo.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Periodo</label>
              <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={`${inputCls} max-w-[200px]`}>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>
                ))}
              </select>
            </div>
            <button
              onClick={descargarPdf}
              disabled={!periodoId || generandoPdf}
              className="px-4 py-2 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {generandoPdf ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
        </div>

        {!periodoId ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
            No hay un periodo activo.
          </div>
        ) : isLoading || !data ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
            Calculando…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-emerald-200 p-5">
                <p className="text-sm text-slate-500 font-medium">Altas totales</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{data.totales.altas}</p>
              </div>
              <div className="bg-white rounded-xl border border-red-200 p-5">
                <p className="text-sm text-slate-500 font-medium">Bajas totales</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{data.totales.bajas}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500 font-medium">Saldo neto de matrícula</p>
                <p className={`text-3xl font-bold mt-1 ${data.totales.saldo_neto >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {data.totales.saldo_neto >= 0 ? '+' : ''}{data.totales.saldo_neto}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Carrera</th>
                    <th className="text-right px-4 py-3 font-medium">Nuevo ingreso</th>
                    <th className="text-right px-4 py-3 font-medium">Reingreso</th>
                    <th className="text-right px-4 py-3 font-medium">Total altas</th>
                    <th className="text-right px-4 py-3 font-medium">Baja temporal</th>
                    <th className="text-right px-4 py-3 font-medium">Baja definitiva</th>
                    <th className="text-right px-4 py-3 font-medium">Baja parcial</th>
                    <th className="text-right px-4 py-3 font-medium">Total bajas</th>
                    <th className="text-right px-4 py-3 font-medium">Saldo neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.carreras.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Sin datos para este periodo.</td></tr>
                  ) : data.carreras.map(c => (
                    <tr key={c.carrera_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.carrera}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.altas.nuevo_ingreso}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.altas.reingreso}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{c.altas.total}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.bajas.temporal}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.bajas.definitiva}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.bajas.parcial}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-700">{c.bajas.total}</td>
                      <td className={`px-4 py-3 text-right font-medium ${c.saldo_neto >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {c.saldo_neto >= 0 ? '+' : ''}{c.saldo_neto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
