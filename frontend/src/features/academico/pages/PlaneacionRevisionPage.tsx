import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type EstatusPlaneacion, type ObservacionCampo } from '../services/academico'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import { selectCls, mutationError, transicionesPlaneacion, PlaneacionDetalle } from './tabs/shared'
import { EstatusBadge } from './planeacionShared'

export default function PlaneacionRevisionPage() {
  const { id = '' } = useParams()
  const roles = useAuthStore(s => s.user?.roles) ?? []
  const qc = useQueryClient()
  const toast = useToastStore()
  const [estatus, setEstatus] = useState<EstatusPlaneacion | ''>('')
  const [obs, setObs] = useState('')
  const [obsCampos, setObsCampos] = useState<ObservacionCampo[]>([])

  const { data: planeacion, isLoading } = useQuery({
    queryKey: ['planeacion-detalle', id],
    queryFn: () => academicoApi.getPlaneacion(id),
    enabled: !!id,
  })

  const opciones = planeacion ? transicionesPlaneacion(planeacion.estatus, roles) : []
  const estatusSel = estatus || opciones[0]?.estatus || ''
  const requiereObs = estatusSel === 'devuelta_da' || estatusSel === 'devuelta_jc'
  const tieneObservaciones = !!obs.trim() || obsCampos.length > 0

  const agregarObsCampo = (o: Omit<ObservacionCampo, 'id'>) =>
    setObsCampos(prev => [...prev, { ...o, id: crypto.randomUUID() }])
  const quitarObsCampo = (obsId: string) =>
    setObsCampos(prev => prev.filter(o => o.id !== obsId))

  const mutCambiar = useMutation({
    mutationFn: () => academicoApi.cambiarEstatusPlaneacion(id, estatusSel, obs, obsCampos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planeacion-detalle', id] })
      qc.invalidateQueries({ queryKey: ['planeaciones-admin'] })
      setObs('')
      setObsCampos([])
    },
  })

  // El docente ya no captura el avance real (semana_realizado) desde su editor — solo
  // Desarrollo Académico/admin/superadmin lo confirman aquí, en el corte.
  const puedeEditarDosificacion = roles.some(r => ['desarrollo_academico', 'admin', 'superadmin'].includes(r))
  const mutDosificacion = useMutation({
    mutationFn: (avance: { unidad: number; index: number; semana_realizado: number | null }) =>
      academicoApi.actualizarDosificacionPlaneacion(id, [avance]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planeacion-detalle', id] }),
    onError: (e) => toast.error(mutationError(e)),
  })

  if (isLoading) {
    return <div className="min-h-full bg-slate-50 p-6"><p className="text-sm text-slate-400">Cargando…</p></div>
  }

  if (!planeacion) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <p className="text-sm text-slate-500">No se encontró la planeación.</p>
        <Link to="/admin/gestion-academica/planeaciones" className="text-sm text-blue-600 hover:underline">← Volver al listado</Link>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/40 via-slate-50 to-slate-50 p-6" data-modulo-planeacion>
      <div className="space-y-5">
        <Link to="/admin/gestion-academica/planeaciones" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Planeaciones Didácticas
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{planeacion.carga_academica?.materia?.nombre ?? 'Instrumentación didáctica'}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Docente: {planeacion.docente?.name} · Grupo: {planeacion.carga_academica?.grupos?.[0]?.clave ?? '—'} · Periodo: {planeacion.periodo?.nombre ?? '—'}
              </p>
            </div>
            <EstatusBadge estatus={planeacion.estatus} />
          </div>
        </div>

        {opciones.length > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            Modo revisión: pasa el cursor sobre cada sección para agregar una observación anclada exactamente ahí — el docente la verá en ese mismo punto al corregir.
          </p>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-5 space-y-4">
          <PlaneacionDetalle
            p={planeacion}
            editable={opciones.length > 0}
            observaciones={obsCampos}
            onAgregarObservacion={agregarObsCampo}
            onQuitarObservacion={quitarObsCampo}
            puedeEditarDosificacion={puedeEditarDosificacion}
            onEditarSemanaRealizado={(unidad, index, semanaRealizado) => mutDosificacion.mutate({ unidad, index, semana_realizado: semanaRealizado })}
            variante="amber"
          />
          {planeacion.archivo_url && (
            <a href={planeacion.archivo_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-blue-600 hover:underline">
              Ver archivo adjunto
            </a>
          )}
        </div>

        {planeacion.observaciones_revision && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold text-xs mb-1">Observaciones de la última revisión:</p>
            {planeacion.observaciones_revision}
          </div>
        )}

        {opciones.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
              Acción de revisión
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Acción *</label>
              <select value={estatusSel} onChange={e => setEstatus(e.target.value as EstatusPlaneacion)} className={selectCls}>
                {opciones.map(o => <option key={o.estatus} value={o.estatus}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Observación general{requiereObs ? '' : ' (opcional)'}</label>
              <textarea
                rows={3}
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Resumen general de la revisión — para observaciones puntuales, agrégalas directamente en la sección correspondiente arriba…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {requiereObs && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Requerido: al menos una observación, aquí o anclada a una sección específica{obsCampos.length > 0 ? ` (ya agregaste ${obsCampos.length}).` : '.'}
                </p>
              )}
            </div>
            {mutCambiar.isError && <p className="text-xs text-red-600">{mutationError(mutCambiar.error)}</p>}
            {mutCambiar.isSuccess && <p className="text-xs text-green-700">Revisión guardada.</p>}
            <button
              onClick={() => mutCambiar.mutate()}
              disabled={mutCambiar.isPending || (requiereObs && !tieneObservaciones)}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {mutCambiar.isPending ? 'Guardando…' : 'Guardar revisión'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
