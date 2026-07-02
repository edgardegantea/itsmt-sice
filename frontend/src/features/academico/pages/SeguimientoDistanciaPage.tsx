import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { SeguimientoDistancia, IndicadoresDistancia } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

export default function SeguimientoDistanciaPage() {
  const toast = useToastStore()
  const [seguimiento, setSeguimiento] = useState<SeguimientoDistancia[]>([])
  const [indicadores, setIndicadores] = useState<IndicadoresDistancia | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroRiesgo, setFiltroRiesgo] = useState<'todos' | 'riesgo' | 'pendiente'>('todos')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [seg, ind] = await Promise.all([
        academicoApi.getSeguimientoDistancia(),
        academicoApi.getIndicadoresDistancia(),
      ])
      setSeguimiento(Array.isArray(seg) ? seg : [])
      setIndicadores(ind)
    } catch {
      toast.error('Error al cargar seguimiento a distancia')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const filtrados = seguimiento.filter(s => {
    if (filtroRiesgo === 'riesgo') return s.alerta_riesgo
    if (filtroRiesgo === 'pendiente') return s.modulo_pendiente
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguimiento — Educación a Distancia</h1>
        <p className="text-sm text-gray-500 mt-1">TecNM Cap. 16 — Alerta de riesgo: más del 50% del tiempo máximo cursado sin egresar</p>
      </div>

      {/* KPI Cards */}
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{indicadores.total_inscritos}</p>
            <p className="text-sm text-gray-500 mt-1">Alumnos inscritos</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{indicadores.modulo_acreditado}</p>
            <p className="text-sm text-gray-500 mt-1">Módulo acreditado</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{indicadores.modulo_pendiente}</p>
            <p className="text-sm text-gray-500 mt-1">Módulo pendiente</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {seguimiento.filter(s => s.alerta_riesgo).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">En riesgo (&gt;50% tiempo)</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { key: 'todos',     label: 'Todos' },
          { key: 'riesgo',    label: 'En riesgo' },
          { key: 'pendiente', label: 'Módulo pendiente' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroRiesgo(key as 'todos' | 'riesgo' | 'pendiente')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroRiesgo === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Alumno', 'Programa / Modalidad', 'Semestres cursados', 'Tiempo cursado', 'Módulo Competencias', 'Alertas'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin alumnos en modalidad a distancia</td></tr>
              ) : filtrados.map((s, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${s.alerta_riesgo ? 'bg-red-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{s.inscripcion.alumno?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{s.inscripcion.alumno?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">
                    <p>{s.inscripcion.programa?.carrera?.nombre ?? '—'}</p>
                    <p className="text-xs text-gray-400 capitalize">{s.inscripcion.programa?.modalidad?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-center text-gray-700">
                    <span className="font-semibold">{s.semestres_cursados}</span>
                    <span className="text-gray-400"> / {s.semestres_maximos}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          s.semestres_cursados / s.semestres_maximos > 0.5
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (s.semestres_cursados / s.semestres_maximos) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {Math.round((s.semestres_cursados / s.semestres_maximos) * 100)}%
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      s.modulo_pendiente
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {s.modulo_pendiente ? 'Pendiente' : 'Acreditado'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      {s.alerta_riesgo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          ⚠ Riesgo &gt;50% tiempo
                        </span>
                      )}
                      {s.modulo_pendiente && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Módulo pendiente
                        </span>
                      )}
                      {!s.alerta_riesgo && !s.modulo_pendiente && (
                        <span className="text-xs text-gray-400">Sin alertas</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
