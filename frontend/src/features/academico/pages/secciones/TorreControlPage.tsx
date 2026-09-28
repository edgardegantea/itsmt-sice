import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'

const ESTATUS_LABEL: Record<string, string> = {
  sin_novedad: 'Sin novedad',
  docente_ausente: 'Docente ausente',
  aula_vacia: 'Aula vacía',
  grupo_incorrecto: 'Grupo incorrecto',
  aula_incorrecta: 'Aula incorrecta',
  alumnos_incompletos: 'Alumnos incompletos',
  problema_infraestructura: 'Problema de infraestructura',
  otro: 'Otro',
}

function colorAula(a: { ocupada: boolean; ultima_incidencia_estatus?: string }) {
  if (a.ultima_incidencia_estatus && a.ultima_incidencia_estatus !== 'sin_novedad') {
    return 'border-red-300 bg-red-50'
  }
  if (a.ocupada) return 'border-blue-300 bg-blue-50'
  return 'border-slate-200 bg-white'
}

/**
 * Dashboard en vivo del campus — se refresca solo cada 30s (sin que el usuario tenga
 * que recargar) para que dirección vea "qué está pasando ahora", no un histórico.
 */
export default function TorreControlPage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const periodoId = periodoActivo?.id ?? ''

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['torre-control', periodoId],
    queryFn: () => academicoApi.getTorreControl({ periodo_id: periodoId }),
    enabled: !!periodoId,
    refetchInterval: 30_000,
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">Torre de Control</h1>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Estado del campus ahora mismo ({data?.dia_semana} · {data?.hora}) — se actualiza solo cada 30 segundos.
            {dataUpdatedAt ? <span className="text-slate-400"> · Última actualización: {new Date(dataUpdatedAt).toLocaleTimeString('es-MX')}</span> : null}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Aulas ocupadas ahora</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{data ? `${data.aulas_ocupadas}/${data.aulas_total}` : '…'}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">% Asistencia registrada hoy</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              {data?.asistencia_hoy.pct === null || data?.asistencia_hoy.pct === undefined ? '—' : `${data.asistencia_hoy.pct}%`}
            </p>
            <p className="text-xs text-slate-400 mt-1">{data?.asistencia_hoy.registradas ?? 0} de {data?.asistencia_hoy.esperadas ?? 0} sesiones esperadas</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Incidencias hoy</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{data?.incidencias_hoy.con_novedad ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1">{data?.incidencias_hoy.total ?? 0} rondas registradas en total</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Mapa de aulas */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Mapa de aulas</h2>
            {!periodoId ? (
              <p className="text-sm text-slate-400 py-8 text-center">No hay un periodo activo.</p>
            ) : isLoading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Cargando…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {data?.aulas.map(a => (
                  <div key={a.id} className={`rounded-lg border p-2.5 ${colorAula(a)}`}>
                    <p className="text-sm font-semibold text-slate-800">{a.nombre}</p>
                    {a.ocupada ? (
                      <>
                        <p className="text-xs text-slate-600 truncate">{a.materia}</p>
                        <p className="text-xs text-slate-400 truncate">{a.grupo} · {a.docente}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Libre</p>
                    )}
                    {a.incidencias_hoy > 0 && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">⚠ {a.incidencias_hoy} incidencia{a.incidencias_hoy === 1 ? '' : 's'} hoy</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300" /> Libre</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-300" /> Ocupada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-300" /> Con incidencia</span>
            </div>
          </div>

          {/* Feed de incidencias recientes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Incidencias recientes hoy</h2>
            {(data?.incidencias_recientes.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin incidencias registradas hoy.</p>
            ) : (
              <div className="space-y-2">
                {data!.incidencias_recientes.map(inc => (
                  <div key={inc.id} className="border border-slate-100 rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">{inc.hora_revision?.slice(0, 5)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${inc.estatus === 'sin_novedad' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {ESTATUS_LABEL[inc.estatus] ?? inc.estatus}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{inc.grupo?.clave ?? '—'} · {inc.aula?.nombre ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
