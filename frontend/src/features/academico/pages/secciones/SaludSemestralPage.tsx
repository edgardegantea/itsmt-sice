import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, type SaludCarrera } from '../../services/academico'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'

function colorScore(score: number | null) {
  if (score === null) return { text: 'text-slate-400', bg: 'bg-slate-300' }
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500' }
  if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500' }
  return { text: 'text-red-600', bg: 'bg-red-500' }
}

/** Sparkline minúsculo en SVG puro — sin librería, solo para mostrar la tendencia
 * de las últimas semanas de un vistazo. */
function Sparkline({ puntos }: { puntos: number[] }) {
  if (puntos.length < 2) return <span className="text-[11px] text-slate-300">Sin histórico suficiente</span>
  const w = 100, h = 28
  const max = Math.max(...puntos, 100), min = Math.min(...puntos, 0)
  const rango = max - min || 1
  const coords = puntos.map((p, i) => {
    const x = (i / (puntos.length - 1)) * w
    const y = h - ((p - min) / rango) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-7">
      <polyline points={coords} fill="none" stroke="#1a3a5c" strokeWidth="2" />
    </svg>
  )
}

export default function SaludSemestralPage() {
  const { data: periodoActivo } = usePeriodoActivo()

  const { data: carreras = [], isLoading } = useQuery({
    queryKey: ['salud-semestral', periodoActivo?.id],
    queryFn: () => academicoApi.getSaludSemestral({ periodo_id: periodoActivo!.id }),
    enabled: !!periodoActivo?.id,
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">📊 Índice de Salud del Semestre</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Combina % aprobación + cumplimiento docente + incidencias sin novedad en un solo número por carrera, con tendencia semanal.
            Periodo: <span className="font-medium text-slate-700">{periodoActivo?.nombre ?? '—'}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!periodoActivo || isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando…</div>
          ) : carreras.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">Sin datos suficientes.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {carreras.map((c: SaludCarrera) => {
                const color = colorScore(c.score)
                return (
                  <div key={c.carrera_id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-48 shrink-0">
                        <p className="text-sm font-medium text-slate-800">{c.carrera}</p>
                        {c.tendencia !== null && (
                          <p className={`text-[11px] ${c.tendencia > 0 ? 'text-emerald-600' : c.tendencia < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {c.tendencia > 0 ? '↑' : c.tendencia < 0 ? '↓' : '→'} {Math.abs(c.tendencia)} pts vs. semana anterior
                          </p>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color.bg} rounded-full`} style={{ width: `${c.score ?? 0}%` }} />
                        </div>
                      </div>
                      <Sparkline puntos={c.historico.map(h => h.score)} />
                      <span className={`text-2xl font-bold w-16 text-right ${color.text}`}>{c.score ?? '—'}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] text-slate-400 pl-0 sm:pl-52">
                      <span>% Aprobación: {c.pct_aprobacion ?? '—'}</span>
                      <span>% Cumplimiento docente: {c.pct_cumplimiento_docente ?? '—'}</span>
                      <span>% Rondas sin novedad: {c.pct_sin_novedad ?? '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400">
          El histórico se construye automáticamente cada semana (lunes 06:00) — al principio del semestre habrá poco o ningún historial todavía.
        </p>
      </div>
    </div>
  )
}
