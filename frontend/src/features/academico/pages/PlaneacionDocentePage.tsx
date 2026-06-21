import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type PlaneacionDocente, type EstatusPlaneacion, type CargaAcademica } from '../services/academico'
import { mutationError } from './tabs/shared'
import apiClient from '../../../config/apiClient'

const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:  'bg-slate-100 text-slate-600',
  entregada: 'bg-blue-100 text-blue-700',
  revisada:  'bg-yellow-100 text-yellow-700',
  liberada:  'bg-green-100 text-green-700',
  devuelta:  'bg-red-100 text-red-700',
}

const ESTATUS_LABEL: Record<EstatusPlaneacion, string> = {
  borrador:  'Borrador',
  entregada: 'Entregada',
  revisada:  'Revisada',
  liberada:  'Liberada',
  devuelta:  'Devuelta — requiere correcciones',
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'
const selectCls = inputCls

export default function PlaneacionDocentePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [periodoId, setPeriodoId] = useState('')
  const [cargaSelId, setCargaSelId] = useState('')
  const [form, setForm] = useState<Partial<PlaneacionDocente>>({})
  const [saved, setSaved] = useState(false)

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
    staleTime: 60_000,
  })

  const { data: misCargas = [] } = useQuery({
    queryKey: ['mis-cargas', periodoId, user?.id],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!periodoId && !!user?.id,
  })

  const { data: misPlaneaciones = [] } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!user?.id,
  })

  const cargaActual = (misCargas as CargaAcademica[]).find(c => c.id === cargaSelId)
  const planeacionActual = (misPlaneaciones as PlaneacionDocente[]).find(p => p.carga_academica_id === cargaSelId)

  const seleccionarCarga = (id: string) => {
    setCargaSelId(id)
    setSaved(false)
    const p = (misPlaneaciones as PlaneacionDocente[]).find(pl => pl.carga_academica_id === id)
    setForm(p ? {
      caracterizacion:     p.caracterizacion ?? '',
      intencion_didactica: p.intencion_didactica ?? '',
      fuentes_informacion: p.fuentes_informacion ?? '',
      apoyos_didacticos:   p.apoyos_didacticos ?? '',
      archivo_url:         p.archivo_url ?? '',
    } : {
      caracterizacion: '', intencion_didactica: '', fuentes_informacion: '', apoyos_didacticos: '', archivo_url: '',
    })
  }

  const set = (k: keyof PlaneacionDocente, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const mutSave = useMutation({
    mutationFn: () => academicoApi.savePlaneacion({
      ...form,
      carga_academica_id: cargaSelId,
      periodo_id: periodoId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
      setSaved(true)
    },
  })

  const mutEntregar = useMutation({
    mutationFn: () => academicoApi.entregarPlaneacion(planeacionActual!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-planeaciones'] }),
  })

  const puedeEntregar = planeacionActual &&
    ['borrador', 'devuelta'].includes(planeacionActual.estatus) &&
    (planeacionActual.caracterizacion || planeacionActual.archivo_url)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Planeación didáctica</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registra y entrega tu planeación por materia asignada.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo *</label>
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setCargaSelId('') }} className={selectCls}>
            <option value="">— Selecciona —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>
        {periodoId && (
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-slate-600 mb-1">Materia asignada</label>
            <select value={cargaSelId} onChange={e => seleccionarCarga(e.target.value)} className={selectCls}>
              <option value="">— Selecciona —</option>
              {(misCargas as CargaAcademica[]).map(c => (
                <option key={c.id} value={c.id}>{c.materia?.nombre} / {c.grupo?.clave}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Listado de planeaciones */}
      {(misPlaneaciones as PlaneacionDocente[]).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis planeaciones</p>
          <div className="divide-y divide-slate-100">
            {(misPlaneaciones as PlaneacionDocente[]).map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.carga_academica?.materia?.nombre ?? '—'}</p>
                  <p className="text-xs text-slate-400">{p.carga_academica?.grupo?.clave ?? '—'} · {p.periodo?.nombre}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_COLOR[p.estatus]}`}>
                    {ESTATUS_LABEL[p.estatus]}
                  </span>
                  {p.fecha_entrega && (
                    <span className="text-xs text-slate-400">{new Date(p.fecha_entrega).toLocaleDateString('es-MX')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {cargaSelId && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">{cargaActual?.materia?.nombre}</p>
              <p className="text-xs text-slate-500">{cargaActual?.grupo?.clave} · {cargaActual?.materia?.creditos} créditos</p>
            </div>
            {planeacionActual && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_COLOR[planeacionActual.estatus]}`}>
                {ESTATUS_LABEL[planeacionActual.estatus]}
              </span>
            )}
          </div>

          {/* Observaciones de revisión */}
          {planeacionActual?.observaciones_revision && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold text-xs mb-1">Observaciones del revisor:</p>
              {planeacionActual.observaciones_revision}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Caracterización del grupo</label>
              <textarea
                rows={3} value={form.caracterizacion ?? ''}
                onChange={e => set('caracterizacion', e.target.value)}
                placeholder="Describe las características del grupo, contexto, nivel, etc."
                className={inputCls + ' resize-none'}
                disabled={planeacionActual?.estatus === 'liberada'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Intención didáctica</label>
              <textarea
                rows={3} value={form.intencion_didactica ?? ''}
                onChange={e => set('intencion_didactica', e.target.value)}
                placeholder="¿Qué pretende lograr con esta planeación?"
                className={inputCls + ' resize-none'}
                disabled={planeacionActual?.estatus === 'liberada'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fuentes de información</label>
              <textarea
                rows={2} value={form.fuentes_informacion ?? ''}
                onChange={e => set('fuentes_informacion', e.target.value)}
                placeholder="Bibliografía, sitios web, recursos digitales…"
                className={inputCls + ' resize-none'}
                disabled={planeacionActual?.estatus === 'liberada'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Apoyos didácticos</label>
              <textarea
                rows={2} value={form.apoyos_didacticos ?? ''}
                onChange={e => set('apoyos_didacticos', e.target.value)}
                placeholder="Equipo, software, material, laboratorio…"
                className={inputCls + ' resize-none'}
                disabled={planeacionActual?.estatus === 'liberada'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">URL del archivo (PDF/Drive)</label>
              <input
                type="url" value={form.archivo_url ?? ''}
                onChange={e => set('archivo_url', e.target.value)}
                placeholder="https://drive.google.com/..."
                className={inputCls}
                disabled={planeacionActual?.estatus === 'liberada'}
              />
            </div>
          </div>

          {/* Errores */}
          {mutSave.isError && (
            <p className="text-xs text-red-600">{mutationError(mutSave.error)}</p>
          )}
          {mutEntregar.isError && (
            <p className="text-xs text-red-600">{mutationError(mutEntregar.error)}</p>
          )}
          {saved && <p className="text-xs text-green-700">Borrador guardado correctamente.</p>}
          {mutEntregar.isSuccess && (
            <p className="text-xs text-green-700">Planeación entregada. El jefe de carrera la revisará a la brevedad.</p>
          )}

          {planeacionActual?.estatus !== 'liberada' && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setSaved(false); mutSave.mutate() }}
                disabled={mutSave.isPending}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {mutSave.isPending ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <button
                onClick={() => mutEntregar.mutate()}
                disabled={!puedeEntregar || mutEntregar.isPending}
                className="px-5 py-2 text-sm text-white bg-[#1a3a5c] rounded-lg hover:bg-[#234d7a] disabled:opacity-50"
              >
                {mutEntregar.isPending ? 'Entregando…' : 'Entregar planeación'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
