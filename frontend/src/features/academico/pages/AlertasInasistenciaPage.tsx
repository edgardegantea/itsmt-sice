import { useConfiguracion } from '@/hooks/useConfiguracion'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type AlertaInasistencia } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'

const PCT_COLOR = (pct: number) =>
  pct >= 50 ? 'text-red-700 bg-red-100' : pct >= 25 ? 'text-orange-700 bg-orange-100' : 'text-yellow-700 bg-yellow-100'

export default function AlertasInasistenciaPage() {
  const { config } = useConfiguracion()
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const [vista, setVista] = useViewMode('alertas-inasistencia')
  const [detalle, setDetalle] = useState<AlertaInasistencia | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['alertas-inasistencia'],
    queryFn: () => academicoApi.getAlertasInasistencia(),
  })

  const alertas: AlertaInasistencia[] = data?.data ?? []

  const mutLeer = useMutation({
    mutationFn: (id: string) => academicoApi.marcarAlertaLeida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas-inasistencia'] })
      toastSuccess('Alerta marcada como leída.')
    },
    onError: () => toastError('Error al actualizar la alerta.'),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Alertas de Inasistencia</h1>
            <p className="text-sm text-slate-500 mt-0.5">Alumnos que han superado el 25% de inasistencias</p>
          </div>
          <ViewToggle value={vista} onChange={setVista} />
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
            <p className="text-slate-500 text-sm">Sin alertas activas. Todos los alumnos están dentro del rango aceptable.</p>
          </div>
        ) : vista === 'lista' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">% Inasistencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Leída</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertas.map(a => {
                  const yoLei = a.leida_director || a.leida_jefe || a.leida_docente
                  return (
                    <tr key={a.id} className={`transition-colors ${yoLei ? 'bg-slate-50/50' : 'hover:bg-orange-50/50'}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.alumno?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.alumno?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{a.grupo?.clave ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.grupo?.carrera?.nombre} — {a.grupo?.periodo?.nombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${PCT_COLOR(a.porcentaje_inasistencia)}`}>
                          {a.porcentaje_inasistencia.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className={a.leida_docente ? 'text-green-600' : 'text-slate-400'}>Docente {a.leida_docente ? '✓' : '○'}</span>
                          <span className={a.leida_jefe ? 'text-green-600' : 'text-slate-400'}>Jefe {a.leida_jefe ? '✓' : '○'}</span>
                          <span className={a.leida_director ? 'text-green-600' : 'text-slate-400'}>Director {a.leida_director ? '✓' : '○'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleDateString('es-MX')}
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
                <p className="font-medium text-slate-800 truncate">{a.alumno?.name ?? '—'}</p>
                <p className="text-xs text-slate-500">{a.grupo?.clave ?? '—'}</p>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full self-start ${PCT_COLOR(a.porcentaje_inasistencia)}`}>
                  {a.porcentaje_inasistencia.toFixed(1)}%
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
          title={detalle.alumno?.name ?? 'Alerta'}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Correo', value: detalle.alumno?.email },
            { label: 'Grupo', value: detalle.grupo?.clave },
            { label: 'Carrera', value: detalle.grupo?.carrera?.nombre },
            { label: 'Periodo', value: detalle.grupo?.periodo?.nombre },
            { label: '% Inasistencia', value: `${detalle.porcentaje_inasistencia.toFixed(1)}%` },
            { label: 'Leída por docente', value: detalle.leida_docente ? 'Sí' : 'No' },
            { label: 'Leída por jefe', value: detalle.leida_jefe ? 'Sí' : 'No' },
            { label: 'Leída por director', value: detalle.leida_director ? 'Sí' : 'No' },
            { label: 'Fecha', value: new Date(detalle.created_at).toLocaleDateString('es-MX') },
          ]}
          footer={
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const win = window.open('', '_blank')
                  if (!win) return
                  win.document.write(`
                    <html>
                      <head>
                        <title>Formato F-05-04 Reporte de Problemática para Tutoría - ${config.nombre_corto}</title>
                        <style>
                          body { font-family: sans-serif; padding: 35px; color: #1e293b; font-size: 12px; }
                          .header { text-align: center; border-bottom: 2px solid #1b396a; padding-bottom: 12px; margin-bottom: 20px; }
                          .title { font-size: 15px; font-weight: bold; color: #1b396a; text-transform: uppercase; }
                          .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
                          .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-between: 15px; background: #f8fafc; }
                          .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 6px 0; }
                          .label { font-weight: bold; color: #475569; }
                          .val { font-weight: 600; color: #0f172a; }
                          .alert-badge { bg-color: #fef2f2; background: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 6px; color: #991b1b; font-weight: bold; margin: 15px 0; text-align: center; }
                          .sigs { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
                          .sig { border-top: 1px solid #64748b; width: 40%; padding-top: 5px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="title">TECNOLÓGICO NACIONAL DE MÉXICO · ${config.nombre_corto}</div>
                          <div class="sub">FORMATO F-05-04: REPORTE DE LA PROBLEMÁTICA PARA TUTORÍA Y DESARROLLO ACADÉMICO</div>
                          <div class="sub">Conforme al Oficio Circular DET/ITSMT/DA/0041/2026</div>
                        </div>

                        <div class="alert-badge">
                          ⚠️ ALERTA DE CANALIZACIÓN POR INASISTENCIA REITERADA (&ge; 50%) / REZAGO ACADÉMICO
                        </div>

                        <div class="box">
                          <div class="row"><span class="label">Estudiante:</span><span class="val">${detalle.alumno?.name ?? '—'}</span></div>
                          <div class="row"><span class="label">Correo / Matrícula:</span><span class="val">${detalle.alumno?.email ?? '—'}</span></div>
                          <div class="row"><span class="label">Grupo / Clave:</span><span class="val">${detalle.grupo?.clave ?? '—'}</span></div>
                          <div class="row"><span class="label">Programa Educativo:</span><span class="val">${detalle.grupo?.carrera?.nombre ?? '—'}</span></div>
                          <div class="row"><span class="label">Porcentaje de Inasistencia Acumulado:</span><span class="val">${detalle.porcentaje_inasistencia.toFixed(1)}%</span></div>
                          <div class="row"><span class="label">Fecha de Emisión del Reporte:</span><span class="val">${new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</span></div>
                        </div>

                        <div style="margin-top: 20px;">
                          <strong>Motivo de la Canalización:</strong> Inasistencia reiterada observada durante el periodo, riesgo de no acreditación por ausentismo y necesidad de atención tutorial inmediata.
                        </div>

                        <div class="sigs">
                          <div class="sig">Docente del Grupo<br/>Firma y Sello</div>
                          <div class="sig">Coordinación de Tutorías / Desarrollo Académico<br/>Recepción de Canalización</div>
                        </div>
                      </body>
                    </html>
                  `)
                  win.document.close()
                  win.focus()
                  setTimeout(() => win.print(), 500)
                }}
                className="text-xs font-semibold text-[#1b396a] bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                📋 Imprimir Formato F-05-04 (Tutoría)
              </button>
              <button onClick={() => mutLeer.mutate(detalle.id)} disabled={mutLeer.isPending} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg disabled:opacity-50">Marcar leída</button>
            </div>
          }
        />
      )}
    </div>
  )
}
