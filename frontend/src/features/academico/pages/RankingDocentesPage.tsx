import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../services/academico'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { useAuthStore } from '../../../store/authStore'

function colorScore(score: number) {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 70) return 'text-amber-600'
  return 'text-red-600'
}

const MEDALLA: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Reconocimiento en vez de solo señalamiento: mismo score de cumplimiento que el
 * pasaporte, pero en formato leaderboard con insignias — visible para todos los
 * docentes (no solo dirección), para que el incentivo sea público.
 */
export default function RankingDocentesPage() {
  const { user } = useAuthStore()
  const esDocente = !!user?.roles.includes('docente') && !user?.roles.some(r => ['superadmin', 'admin'].includes(r))
  const { data: periodoActivo } = usePeriodoActivo()

  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ['ranking-docentes', periodoActivo?.id],
    queryFn: () => academicoApi.getRankingDocentes({ periodo_id: periodoActivo!.id }),
    enabled: !!periodoActivo?.id,
  })

  const miPosicion = esDocente ? ranking.find(r => r.docente_id === user?.id) : undefined

  return (
    <div className={esDocente ? 'w-full px-4 sm:px-6 lg:px-8 py-8' : 'min-h-full bg-slate-50 p-6'}>
      <div className="space-y-5">
        <div>
          {!esDocente && (
            <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Gestión Académica
            </Link>
          )}
          <h1 className="text-xl font-bold text-slate-900">🏆 Ranking de Cumplimiento Docente</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Captura de calificaciones + asistencia registrada + incidencias de prefectura, en un solo puntaje.
            Periodo: <span className="font-medium text-slate-700">{periodoActivo?.nombre ?? '—'}</span>
          </p>
        </div>

        {esDocente && miPosicion && (
          <div className="bg-white rounded-xl border-2 border-brand-200 p-4 flex items-center gap-4">
            <span className="text-3xl">{MEDALLA[miPosicion.posicion] ?? `#${miPosicion.posicion}`}</span>
            <div>
              <p className="text-sm text-slate-500">Tu lugar en el ranking</p>
              <p className={`text-2xl font-bold ${colorScore(miPosicion.score)}`}>{miPosicion.score} pts · Posición {miPosicion.posicion} de {ranking.length}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!periodoActivo || isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando ranking…</div>
          ) : ranking.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">Sin datos suficientes este periodo.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ranking.map(r => (
                <div key={r.docente_id} className={`px-5 py-3.5 flex items-center gap-4 ${r.docente_id === user?.id ? 'bg-brand-50/50' : ''}`}>
                  <span className="w-10 text-center text-lg font-semibold text-slate-400">
                    {MEDALLA[r.posicion] ?? `#${r.posicion}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.nombre}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.insignias.map((ins, i) => (
                        <span key={i} title={ins.label} className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {ins.icono} {ins.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:flex gap-4 text-xs text-slate-400 shrink-0">
                    <span>Captura: {r.pct_captura ?? '—'}{r.pct_captura !== null ? '%' : ''}</span>
                    <span>Asistencia: {r.pct_asistencia ?? '—'}{r.pct_asistencia !== null ? '%' : ''}</span>
                  </div>
                  <span className={`text-xl font-bold w-14 text-right ${colorScore(r.score)}`}>{r.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
