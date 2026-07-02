import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../services/academico'

const ESTATUS_LABEL: Record<string, { label: string; cls: string }> = {
  activo:           { label: 'Activo',          cls: 'bg-green-100 text-green-700' },
  baja_temporal:    { label: 'Baja temporal',    cls: 'bg-yellow-100 text-yellow-700' },
  baja_definitiva:  { label: 'Baja definitiva',  cls: 'bg-red-100 text-red-700' },
  egresado:         { label: 'Egresado',         cls: 'bg-blue-100 text-blue-700' },
}

export default function ExpedienteAlumnoPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expediente-alumno', id],
    queryFn: () => academicoApi.getExpedienteAlumno(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Cargando expediente…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <p className="text-red-500 text-sm">No se pudo cargar el expediente.</p>
      </div>
    )
  }

  const { alumno, expediente_ext, reinscripciones, bajas, constancias } = data
  const nombreCompleto = alumno.user?.name ?? alumno.numero_control
  const ext = expediente_ext
  const estatusExt = ext ? (ESTATUS_LABEL[ext.estatus] ?? { label: ext.estatus, cls: 'bg-slate-100 text-slate-600' }) : null

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div>
          <Link to="/admin/alumnos" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Alumnos
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Expediente Académico</h1>
          <p className="text-sm text-slate-500 mt-0.5">{nombreCompleto}</p>
        </div>

        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Datos del alumno</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">No. Control</p>
              <p className="font-semibold text-slate-800 mt-0.5">{alumno.numero_control}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Carrera</p>
              <p className="font-medium text-slate-700 mt-0.5">{alumno.carrera?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Semestre actual</p>
              <p className="font-medium text-slate-700 mt-0.5">{alumno.semestre_actual}°</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Período de ingreso</p>
              <p className="font-medium text-slate-700 mt-0.5">{alumno.periodoIngreso?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Correo</p>
              <p className="font-medium text-slate-700 mt-0.5">{alumno.user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Estatus</p>
              <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                alumno.estatus === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {alumno.estatus}
              </span>
            </div>
          </div>
        </div>

        {/* Expediente extendido */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Expediente académico extendido</h2>
          {ext ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Generación</p>
                <p className="font-semibold text-slate-800 mt-0.5">{ext.generacion ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Estatus</p>
                {estatusExt && (
                  <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${estatusExt.cls}`}>
                    {estatusExt.label}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Promedio general</p>
                <p className="font-semibold text-2xl text-blue-600 mt-0.5">{ext.promedio_general?.toFixed(2) ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Créditos acumulados</p>
                <p className="font-semibold text-2xl text-slate-800 mt-0.5">{ext.creditos_acumulados}</p>
              </div>
              {ext.notas_admin && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-slate-400 mb-1">Notas administrativas</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{ext.notas_admin}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Sin expediente extendido registrado.</p>
          )}
        </div>

        {/* Reinscripciones */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Reinscripciones ({reinscripciones.length})</h2>
          </div>
          {reinscripciones.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">Sin reinscripciones registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Período</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reinscripciones.map((r: { id: string; periodo?: { nombre: string }; estatus: string }) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{r.periodo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.estatus === 'aprobada' ? 'bg-green-100 text-green-700' : r.estatus === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bajas */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Bajas ({bajas.length})</h2>
          </div>
          {bajas.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">Sin bajas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estatus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bajas.map((b: { id: string; tipo_baja: string; estatus: string; created_at: string }) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 capitalize">{b.tipo_baja.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.estatus === 'aprobada' ? 'bg-green-100 text-green-700' : b.estatus === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {b.estatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(b.created_at).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Constancias */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Constancias ({constancias.length})</h2>
          </div>
          {constancias.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">Sin constancias registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Folio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {constancias.map((c: { id: string; tipo: string; folio: string; created_at: string }) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 capitalize">{c.tipo.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.folio}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
