import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type Baja, type EstatusBaja } from '../services/permanencia'
import { useAuthStore } from '../../../store/authStore'

const TIPO_LABEL: Record<string, string> = {
  parcial:    'Baja parcial',
  temporal:   'Baja temporal',
  definitiva: 'Baja definitiva',
}

const ESTATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

const MOTIVO_LABEL: Record<string, string> = {
  economico:          'Económico',
  salud:              'Salud',
  trabajo:            'Trabajo',
  familiar:           'Familiar',
  cambio_carrera:     'Cambio de carrera',
  cambio_institucion: 'Cambio de institución',
  otro:               'Otro',
}

function fmt(fecha?: string | null) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BajaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [pendienteAccion, setPendienteAccion] = useState<EstatusBaja | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['baja-detalle', id],
    queryFn: () => permanenciaApi.getBajaDetalle(id!),
    enabled: !!id,
  })

  const actualizarMut = useMutation({
    mutationFn: ({ estatus, motivo }: { estatus: EstatusBaja; motivo?: string }) =>
      permanenciaApi.actualizarEstatusBaja(id!, estatus, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baja-detalle', id] })
      qc.invalidateQueries({ queryKey: ['bajas-admin'] })
      setPendienteAccion(null)
      setMotivoRechazo('')
    },
  })

  const reingresoMut = useMutation({
    mutationFn: () => permanenciaApi.registrarReingreso(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baja-detalle', id] })
      qc.invalidateQueries({ queryKey: ['bajas-admin'] })
    },
  })

  const esJefeCarrera = user?.roles.includes('jefe_carrera') && !user?.roles.some(r => ['superadmin', 'admin'].includes(r))
  const puedeGestionar = user?.roles.some(r => ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera'].includes(r))

  if (isLoading) {
    return <div className="px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400 text-sm">Cargando…</div>
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-slate-500 text-sm mb-3">No se pudo cargar esta baja (puede que no exista o no tengas acceso).</p>
        <Link to="/admin/bajas" className="text-sm text-brand-600 hover:underline">← Volver a Bajas</Link>
      </div>
    )
  }

  const { baja, otras_bajas_del_alumno: otrasBajas } = data

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-4xl">
      <div>
        <Link to="/admin/bajas" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-3 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Gestión de Bajas
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <Link to={`/admin/alumnos/${baja.alumno_id}`} className="text-2xl font-bold text-slate-800 hover:text-brand-700 hover:underline">
            {baja.alumno?.user?.name ?? 'Alumno'}
          </Link>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTATUS_BADGE[baja.estatus]}`}>
            {baja.estatus}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {baja.alumno?.numero_control} · {baja.alumno?.carrera?.nombre} · {baja.alumno?.semestre_actual}° semestre
        </p>
      </div>

      {/* Confirmación aprobar */}
      {pendienteAccion === 'aprobada' && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-sm font-medium text-brand-800 mb-3">
            ¿Aprobar esta baja? El estatus del alumno cambiará automáticamente a {baja.tipo_baja === 'definitiva' ? 'baja definitiva' : 'baja temporal'}.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => actualizarMut.mutate({ estatus: 'aprobada' })}
              disabled={actualizarMut.isPending}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-green-700"
            >
              {actualizarMut.isPending ? 'Procesando…' : 'Confirmar aprobación'}
            </button>
            <button onClick={() => setPendienteAccion(null)} className="px-4 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirmación rechazar */}
      {pendienteAccion === 'rechazada' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">Rechazar esta solicitud de baja</p>
          <textarea
            value={motivoRechazo}
            onChange={e => setMotivoRechazo(e.target.value)}
            placeholder="Motivo del rechazo (requerido)"
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => actualizarMut.mutate({ estatus: 'rechazada', motivo: motivoRechazo })}
              disabled={!motivoRechazo.trim() || actualizarMut.isPending}
              className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-red-700"
            >
              {actualizarMut.isPending ? 'Procesando…' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => setPendienteAccion(null)} className="px-4 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Detalle */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Tipo de baja</div>
            <div className="text-sm text-slate-800 mt-0.5">{TIPO_LABEL[baja.tipo_baja]}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Periodo</div>
            <div className="text-sm text-slate-800 mt-0.5">{baja.periodo?.nombre ?? '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Motivo</div>
            <div className="text-sm text-slate-800 mt-0.5">
              {baja.motivo_enum ? (MOTIVO_LABEL[baja.motivo_enum] ?? baja.motivo_enum) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Semestres cursados</div>
            <div className="text-sm text-slate-800 mt-0.5">{baja.numero_semestres_cursados ?? '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Fecha de solicitud</div>
            <div className="text-sm text-slate-800 mt-0.5">{fmt(baja.fecha_solicitud)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Fecha efectiva</div>
            <div className="text-sm text-slate-800 mt-0.5">{fmt(baja.fecha_efectiva)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Registrada por</div>
            <div className="text-sm text-slate-800 mt-0.5">{baja.registrada_por?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Revisada por</div>
            <div className="text-sm text-slate-800 mt-0.5">
              {baja.revisada_por?.name ? `${baja.revisada_por.name} — ${fmt(baja.revisada_en)}` : '—'}
            </div>
          </div>
        </div>

        {baja.motivo_texto && (
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Comentario del alumno</div>
            <p className="text-sm text-slate-700 mt-1">{baja.motivo_texto}</p>
          </div>
        )}

        {baja.motivo_rechazo && (
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-medium text-red-500 uppercase tracking-wide">Motivo del rechazo</div>
            <p className="text-sm text-red-700 mt-1">{baja.motivo_rechazo}</p>
          </div>
        )}

        {baja.tipo_baja === 'temporal' && baja.estatus === 'aprobada' && (
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Reingreso</div>
            <p className="text-sm mt-1">
              {baja.reingreso_registrado
                ? <span className="text-green-700">✓ Registrado el {fmt(baja.fecha_reingreso)}{baja.reingreso_por?.name ? ` por ${baja.reingreso_por.name}` : ''} — el alumno volvió a estatus activo.</span>
                : baja.reingreso_posible
                  ? <span className="text-amber-600">El alumno sigue en baja temporal — reingreso pendiente de registrar.</span>
                  : <span className="text-slate-400">Esta baja no permite reingreso.</span>}
            </p>
          </div>
        )}

        {/* Acciones */}
        {puedeGestionar && (
          <div className="pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
            {baja.estatus === 'pendiente' && (
              <>
                <button
                  onClick={() => setPendienteAccion('aprobada')}
                  className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => setPendienteAccion('rechazada')}
                  className="text-sm bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Rechazar
                </button>
              </>
            )}
            {baja.tipo_baja === 'temporal' && baja.estatus === 'aprobada' && baja.reingreso_posible && !baja.reingreso_registrado && (
              <button
                onClick={() => { if (confirm('¿Registrar el reingreso? El alumno volverá a estatus activo.')) reingresoMut.mutate() }}
                disabled={reingresoMut.isPending}
                className="text-sm bg-brand-50 text-brand-700 border border-brand-200 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {reingresoMut.isPending ? 'Procesando…' : 'Registrar reingreso'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Historial del alumno */}
      {otrasBajas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Otras bajas de este alumno</h2>
          <div className="space-y-2">
            {otrasBajas.map((b: Baja) => (
              <button
                key={b.id}
                onClick={() => navigate(`/admin/bajas/${b.id}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-sm text-slate-800 font-medium">{TIPO_LABEL[b.tipo_baja]}</span>
                  <span className="text-xs text-slate-400 ml-2">{b.periodo?.nombre} · {fmt(b.fecha_solicitud)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_BADGE[b.estatus]}`}>
                  {b.estatus}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {esJefeCarrera && (
        <p className="text-xs text-slate-400">Vista restringida a alumnos de tu carrera.</p>
      )}
    </div>
  )
}
