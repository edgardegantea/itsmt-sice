import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../services/academico'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'

function colorPct(pct: number | null, bueno: number, regular: number) {
  if (pct === null) return 'text-slate-400'
  if (pct >= bueno) return 'text-emerald-600'
  if (pct >= regular) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Página que abre quien escanea el QR personal del docente — un expediente vivo de
 * cumplimiento del semestre (captura, asistencia, incidencias), sin tener que cruzar
 * tres pantallas distintas del sistema para armar el mismo panorama a mano.
 */
export default function PasaporteDocentePage() {
  const { docenteId } = useParams<{ docenteId: string }>()
  const { data: periodoActivo } = usePeriodoActivo()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pasaporte-docente', docenteId, periodoActivo?.id],
    queryFn: () => academicoApi.getPasaporteDocente(docenteId!, { periodo_id: periodoActivo!.id }),
    enabled: !!docenteId && !!periodoActivo?.id,
  })

  // Deduplicar materia+grupo (una carga académica repartida en varios días de horario
  // genera varias filas equivalentes) para no listar la misma clase varias veces.
  const materiasUnicas = data
    ? [...new Map(data.materias.map(m => [`${m.materia}|${m.grupo}`, m])).values()]
    : []

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-6 space-y-5">
        {!periodoActivo || isLoading ? (
          <p className="text-center text-sm text-slate-400 py-10">Cargando pasaporte…</p>
        ) : isError || !data ? (
          <p className="text-center text-sm text-red-500 py-10">No se pudo cargar el pasaporte de este docente.</p>
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Pasaporte de cumplimiento</p>
              <h1 className="text-xl font-bold text-slate-900">{data.docente.name}</h1>
              <p className="text-xs text-slate-400">{data.periodo.nombre}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500">Captura</p>
                <p className={`text-xl font-bold ${colorPct(data.captura.pct, 90, 60)}`}>
                  {data.captura.pct === null ? '—' : `${data.captura.pct}%`}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500">Asistencia</p>
                <p className={`text-xl font-bold ${colorPct(data.asistencia.pct, 90, 60)}`}>
                  {data.asistencia.pct === null ? '—' : `${data.asistencia.pct}%`}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500">Incidencias</p>
                <p className={`text-xl font-bold ${data.incidencias.con_novedad === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.incidencias.con_novedad}
                </p>
              </div>
            </div>

            {materiasUnicas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Materias este periodo</p>
                <div className="space-y-1">
                  {materiasUnicas.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                      <span className="text-slate-700">{m.materia}</span>
                      <span className="text-xs text-slate-400">{m.grupo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Asistencia: {data.asistencia.registradas}/{data.asistencia.esperadas} sesiones registradas ·
              Captura evaluada en {data.captura.total_cargas_evaluadas} carga(s) ·
              {data.incidencias.total} ronda(s) de prefectura este periodo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
