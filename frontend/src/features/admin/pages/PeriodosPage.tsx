import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import Modal from '../../../components/ui/Modal'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type CorteCaptura, type ResumenCumplimientoCorte } from '../../academico/services/academico'

interface Periodo {
  id: string
  nombre: string
  tipo: 'ordinario' | 'verano' | 'intersemestral'
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  horarios_liberados: boolean
  fecha_limite_baja_parcial: string | null
  fecha_limite_baja_temporal: string | null
  aspirantes_count?: number
  inscripciones_count?: number
}

const API = {
  list:              () => apiClient.get('/admin/periodos').then(r => r.data.data as Periodo[]),
  create:            (d: Partial<Periodo>) => apiClient.post('/admin/periodos', d).then(r => r.data.data as Periodo),
  update:            (id: string, d: Partial<Periodo>) => apiClient.patch(`/admin/periodos/${id}`, d).then(r => r.data.data as Periodo),
  activar:           (id: string) => apiClient.patch(`/admin/periodos/${id}/activar`).then(r => r.data.data as Periodo),
  liberarHorarios:   (id: string, liberar: boolean) => apiClient.patch(`/admin/periodos/${id}/liberar-horarios`, { liberar }).then(r => r.data.data as Periodo),
  eliminar:          (id: string) => apiClient.delete(`/admin/periodos/${id}`).then(r => r.data),
}

const fmtFecha = (s: string | null | undefined): string => {
  if (!s) return '—'
  const iso = String(s).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
const toDateInput = (s: string | null | undefined): string => s ? String(s).slice(0, 10) : ''

const cls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30'
const clsErr = (e?: string) => `${cls} ${e ? 'border-red-400' : 'border-slate-300'}`
const FieldErr = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null

function PeriodoForm({
  inicial,
  onGuardar,
  onCancelar,
  cargando,
  errors = {},
  esSuperadmin,
}: {
  inicial?: Partial<Periodo>
  onGuardar: (d: Partial<Periodo>) => void
  onCancelar: () => void
  cargando: boolean
  errors?: Record<string, string>
  esSuperadmin: boolean
}) {
  const [form, setForm] = useState<Partial<Periodo>>(inicial ? {
    ...inicial,
    fecha_inicio:              toDateInput(inicial.fecha_inicio),
    fecha_fin:                 toDateInput(inicial.fecha_fin),
    fecha_limite_baja_parcial: toDateInput(inicial.fecha_limite_baja_parcial),
    fecha_limite_baja_temporal: toDateInput(inicial.fecha_limite_baja_temporal),
  } : { tipo: 'ordinario', activo: false })
  const set = (k: keyof Periodo, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(form) }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del periodo *</label>
          <input required value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej. 2025-A Agosto–Diciembre"
            className={clsErr(errors.nombre)} />
          <FieldErr msg={errors.nombre} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
          <select required value={form.tipo ?? 'ordinario'} onChange={e => set('tipo', e.target.value)}
            className={`${clsErr(errors.tipo)} bg-white`}>
            <option value="ordinario">Ordinario</option>
            <option value="verano">Verano</option>
            <option value="intersemestral">Intersemestral</option>
          </select>
          <FieldErr msg={errors.tipo} />
        </div>
        {esSuperadmin && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Activo</label>
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.activo} onChange={e => set('activo', e.target.checked)}
                className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-slate-700">Periodo actual (desactiva los demás)</span>
            </label>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio *</label>
          <input required type="date" value={form.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)}
            className={clsErr(errors.fecha_inicio)} />
          <FieldErr msg={errors.fecha_inicio} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin *</label>
          <input required type="date" value={form.fecha_fin ?? ''} onChange={e => set('fecha_fin', e.target.value)}
            className={clsErr(errors.fecha_fin)} />
          <FieldErr msg={errors.fecha_fin} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Límite baja parcial</label>
          <input type="date" value={form.fecha_limite_baja_parcial ?? ''} onChange={e => set('fecha_limite_baja_parcial', e.target.value || null)}
            className={clsErr(errors.fecha_limite_baja_parcial)} />
          <FieldErr msg={errors.fecha_limite_baja_parcial} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Límite baja temporal</label>
          <input type="date" value={form.fecha_limite_baja_temporal ?? ''} onChange={e => set('fecha_limite_baja_temporal', e.target.value || null)}
            className={clsErr(errors.fecha_limite_baja_temporal)} />
          <FieldErr msg={errors.fecha_limite_baja_temporal} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={cargando} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
          {cargando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

type ApiError = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }

const NOMBRES_CORTE_DEFAULT: Record<1 | 2 | 3, string> = {
  1: 'Primer parcial',
  2: 'Segundo parcial',
  3: 'Tercer parcial',
}

function CortesCapturaEditor({ periodoId }: { periodoId: string }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()
  const [resumen, setResumen] = useState<Record<string, ResumenCumplimientoCorte>>({})

  const { data: cortes = [], isLoading } = useQuery({
    queryKey: ['cortes-captura', periodoId],
    queryFn: () => academicoApi.getCortesCaptura(periodoId),
    enabled: Boolean(periodoId),
  })

  const porNumero = (n: 1 | 2 | 3): Partial<CorteCaptura> =>
    cortes.find(c => c.numero === n) ?? { numero: n, nombre: NOMBRES_CORTE_DEFAULT[n], fecha_corte: '', fecha_limite_captura: '' }

  const guardarCorte = useMutation({
    mutationFn: (d: { numero: 1 | 2 | 3; nombre?: string; fecha_corte: string; fecha_limite_captura: string; id?: string }) =>
      d.id ? academicoApi.actualizarCorteCaptura(d.id, d) : academicoApi.guardarCorteCaptura(periodoId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cortes-captura', periodoId] })
      success('Corte de captura guardado.')
    },
    onError: () => toastError('Error al guardar el corte de captura.'),
  })

  const evaluarCorte = useMutation({
    mutationFn: (corteId: string) => academicoApi.evaluarCorteCaptura(corteId),
    onSuccess: (data, corteId) => {
      setResumen(r => ({ ...r, [corteId]: data }))
      success(`Evaluación completa: ${data.cargas_pendientes} de ${data.cargas_evaluadas} cargas con calificaciones pendientes.`)
    },
    onError: () => toastError('Error al evaluar el cumplimiento del corte.'),
  })

  if (isLoading) return <p className="text-xs text-slate-400">Cargando cortes…</p>

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h3 className="text-sm font-medium text-slate-700 mb-2">Cortes de captura de calificaciones</h3>
      <p className="text-xs text-slate-500 mb-3">
        Fechas de revisión del avance de captura por parte de los docentes. Al vencer la fecha límite, las
        calificaciones ya capturadas para ese parcial quedan bloqueadas para el docente (solo admin/director puede modificarlas).
      </p>
      <div className="space-y-3">
        {[1, 2, 3].map(n => {
          const numero = n as 1 | 2 | 3
          const corte = porNumero(numero)
          const res = corte.id ? resumen[corte.id] : undefined
          return (
            <div key={numero} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-slate-50 rounded-lg p-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Corte {numero}</label>
                <input key={corte.id ?? `nuevo-${numero}`} defaultValue={corte.nombre ?? ''} className={cls}
                  placeholder={NOMBRES_CORTE_DEFAULT[numero]} id={`nombre-corte-${numero}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de corte</label>
                <input key={corte.id ?? `nuevo-${numero}`} type="date" defaultValue={toDateInput(corte.fecha_corte)} className={cls} id={`fecha-corte-${numero}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Límite de captura</label>
                <input key={corte.id ?? `nuevo-${numero}`} type="date" defaultValue={toDateInput(corte.fecha_limite_captura)} className={cls} id={`fecha-limite-${numero}`} />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={guardarCorte.isPending}
                  onClick={() => {
                    const nombre = (document.getElementById(`nombre-corte-${numero}`) as HTMLInputElement)?.value
                    const fecha_corte = (document.getElementById(`fecha-corte-${numero}`) as HTMLInputElement)?.value
                    const fecha_limite_captura = (document.getElementById(`fecha-limite-${numero}`) as HTMLInputElement)?.value
                    if (!fecha_corte || !fecha_limite_captura) { toastError('Completa ambas fechas del corte.'); return }
                    guardarCorte.mutate({ numero, nombre, fecha_corte, fecha_limite_captura, id: corte.id })
                  }}
                  className="px-3 py-2 text-xs text-white bg-brand-600 hover:bg-[#234d7a] disabled:opacity-60 rounded-lg"
                >
                  Guardar
                </button>
                {corte.id && (
                  <button
                    type="button"
                    disabled={evaluarCorte.isPending}
                    onClick={() => evaluarCorte.mutate(corte.id!)}
                    className="px-3 py-2 text-xs text-brand-600 border border-brand-600/30 rounded-lg hover:bg-brand-600/5 disabled:opacity-60"
                  >
                    Evaluar
                  </button>
                )}
              </div>
              {res && (
                <div className="sm:col-span-4 text-xs text-slate-500 space-y-1">
                  <p>Última evaluación: {res.cargas_pendientes} de {res.cargas_evaluadas} cargas con calificaciones pendientes.</p>
                  {res.detalle.some(d => d.unidades_esperadas != null) && (
                    <p className="text-slate-400">
                      Unidades esperadas a este corte (según temario de cada materia): {' '}
                      {res.detalle.filter(d => d.unidades_esperadas != null)
                        .map(d => `${d.materia_nombre ?? 'Materia'} (${d.unidades_esperadas}/${d.total_unidades_temario})`)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PeriodosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'nuevo' | Periodo | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { success, error: toastError } = useToastStore()
  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const { data: periodos = [], isLoading } = useQuery({ queryKey: ['admin-periodos'], queryFn: API.list })

  const closeModal = () => { setModal(null); setFormErrors({}) }

  const guardar = useMutation({
    mutationFn: (d: Partial<Periodo>) => {
      const esNuevo = modal === 'nuevo' || (typeof modal === 'object' && modal !== null && !modal.id)
      return esNuevo ? API.create(d) : API.update((modal as Periodo).id, d)
    },
    onSuccess: () => {
      const esNuevo = modal === 'nuevo' || (typeof modal === 'object' && modal !== null && !modal.id)
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success(esNuevo ? 'Periodo creado correctamente.' : 'Periodo actualizado correctamente.')
      closeModal()
    },
    onError: (err: ApiError) => {
      const errs = err.response?.data?.errors
      if (errs) {
        setFormErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])))
      } else {
        toastError(err.response?.data?.message ?? 'Error al guardar el periodo.')
      }
    },
  })

  const activar = useMutation({
    mutationFn: (id: string) => API.activar(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success(`Periodo "${data.nombre}" activado correctamente.`)
    },
    onError: () => toastError('Error al activar el periodo.'),
  })

  const liberar = useMutation({
    mutationFn: ({ id, liberar }: { id: string; liberar: boolean }) => API.liberarHorarios(id, liberar),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success(data.horarios_liberados
        ? `Horarios del periodo "${data.nombre}" liberados a los alumnos.`
        : `Horarios del periodo "${data.nombre}" ocultados a los alumnos.`)
    },
    onError: () => toastError('Error al cambiar el estado de liberación.'),
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => API.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success('Periodo eliminado correctamente.')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toastError(err?.response?.data?.message ?? 'Error al eliminar el periodo.'),
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Periodos escolares</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Solo un periodo puede estar activo a la vez.
            {!esSuperadmin && ' Solo el superadministrador puede cambiar cuál es el periodo activo global.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setModal({
                id: '',
                nombre: 'Periodo Agosto–Diciembre 2026 (DET/ITSMT/DA/0041/2026)',
                tipo: 'ordinario',
                fecha_inicio: '2026-08-24',
                fecha_fin: '2026-12-18',
                activo: true,
                horarios_liberados: true,
                fecha_limite_baja_parcial: '2026-10-23',
                fecha_limite_baja_temporal: '2026-11-20',
              })
              setFormErrors({})
            }}
            className="shrink-0 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📌 Cargar Calendario Oficial DET/ITSMT/DA/0041/2026
          </button>
          <button
            onClick={() => { setModal('nuevo'); setFormErrors({}) }}
            className="shrink-0 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-[#234d7a] rounded-lg transition-colors"
          >
            + Nuevo periodo
          </button>
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      <div className="space-y-3">
        {periodos.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.activo ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-medium text-slate-800">{p.nombre}</h2>
                  {p.activo && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      Activo
                    </span>
                  )}
                  {p.horarios_liberados && (
                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                      Horarios liberados
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                    {p.tipo}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {fmtFecha(p.fecha_inicio)} — {fmtFecha(p.fecha_fin)}
                </p>
                <div className="flex gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>{p.aspirantes_count ?? 0} aspirantes</span>
                  <span>{p.inscripciones_count ?? 0} inscritos</span>
                  {p.fecha_limite_baja_parcial && (
                    <span>Límite baja parcial: {fmtFecha(p.fecha_limite_baja_parcial)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {!p.activo && esSuperadmin && (
                  <button
                    onClick={() => activar.mutate(p.id)}
                    disabled={activar.isPending}
                    className="px-3 py-1.5 text-xs text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-60"
                  >
                    Activar
                  </button>
                )}
                {!p.activo && !esSuperadmin && (
                  <span className="px-3 py-1.5 text-xs text-slate-400" title="Solo el superadministrador puede cambiar el periodo activo global.">
                    Activar (solo superadmin)
                  </span>
                )}
                <button
                  onClick={() => liberar.mutate({ id: p.id, liberar: !p.horarios_liberados })}
                  disabled={liberar.isPending}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-60 ${
                    p.horarios_liberados
                      ? 'text-violet-700 border-violet-300 hover:bg-violet-50'
                      : 'text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p.horarios_liberados ? 'Ocultar horarios' : 'Liberar horarios'}
                </button>
                <button
                  onClick={() => setModal(p)}
                  className="px-3 py-1.5 text-xs text-brand-600 border border-brand-600/30 rounded-lg hover:bg-brand-600/5 transition-colors"
                >
                  Editar
                </button>
                {esSuperadmin && !p.activo && (
                  <button
                    onClick={() => window.confirm(`¿Eliminar el periodo "${p.nombre}"? Esta acción no se puede deshacer.`) && eliminar.mutate(p.id)}
                    disabled={eliminar.isPending}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === 'nuevo' ? 'Nuevo periodo' : `Editar: ${(modal as Periodo).nombre}`}
          onClose={closeModal}
        >
          <PeriodoForm
            inicial={modal !== 'nuevo' ? modal : undefined}
            onGuardar={d => guardar.mutate(d)}
            onCancelar={closeModal}
            cargando={guardar.isPending}
            errors={formErrors}
            esSuperadmin={esSuperadmin}
          />
          {modal !== 'nuevo' && Boolean((modal as Periodo).id) && <CortesCapturaEditor periodoId={(modal as Periodo).id} />}
        </Modal>
      )}
    </div>
  )
}
