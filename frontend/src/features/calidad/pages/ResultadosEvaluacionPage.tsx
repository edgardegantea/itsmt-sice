import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { calidadApi, type ResultadoEvaluacion } from '../services/calidad'

const PREGUNTA_LABEL: Record<string, string> = {
  puntualidad:        'Puntualidad',
  dominio_tema:       'Dominio del tema',
  claridad:           'Claridad',
  disponibilidad:     'Disponibilidad',
  material_didactico: 'Material didáctico',
  evaluacion_justa:   'Evaluación justa',
  puntaje_global:     'Puntaje global',
}

function BarraPromedio({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-slate-400 text-xs">—</span>
  const pct = Math.round((valor / 5) * 100)
  const color = valor >= 4 ? 'bg-green-500' : valor >= 3 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-7 text-right">{valor.toFixed(1)}</span>
    </div>
  )
}

export default function ResultadosEvaluacionPage() {
  const [periodo, setPeriodo] = useState('')

  const { data: resultados = [], isLoading } = useQuery<ResultadoEvaluacion[]>({
    queryKey: ['evaluaciones-resultados', periodo],
    queryFn: () => calidadApi.getResultadosEvaluacion(periodo ? { periodo_id: periodo } : undefined),
  })

  const totalRespuestas = resultados.reduce((s, r) => s + r.total_respuestas, 0)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resultados de Evaluación Docente</h1>
        <p className="text-sm text-slate-500 mt-1">
          Estadísticas agregadas por grupo — sin exponer datos individuales de ningún alumno
        </p>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Grupos evaluados</p>
          <p className="text-2xl font-bold text-slate-800">{resultados.filter(r => r.total_respuestas > 0).length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Respuestas totales</p>
          <p className="text-2xl font-bold text-slate-800">{totalRespuestas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total grupos</p>
          <p className="text-2xl font-bold text-slate-800">{resultados.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando resultados…</div>
      ) : resultados.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          No hay resultados para mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {resultados.map(r => (
            <div key={r.grupo_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">Grupo {r.clave}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.carrera ?? '—'}
                      {r.docentes?.length > 0 && (
                        <> · {r.docentes.join(', ')}</>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                    {r.total_respuestas} respuesta{r.total_respuestas !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {r.total_respuestas === 0 ? (
                <div className="px-5 py-4 text-slate-400 text-sm">Sin respuestas aún.</div>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  {Object.entries(r.promedios).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-4">
                      <p className="text-sm text-slate-600 w-40 shrink-0">
                        {PREGUNTA_LABEL[key] ?? key}
                      </p>
                      <div className="flex-1">
                        <BarraPromedio valor={val} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
