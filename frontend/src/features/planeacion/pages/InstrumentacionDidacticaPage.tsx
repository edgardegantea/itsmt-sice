import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planeacionApi, type InstrumentacionDidactica, type ObservacionCampoInstrumentacion, type SeccionInstrumentacion } from '../services/planeacion'
import { useToastStore } from '../../../store/toastStore'
import { openPdfPreview, triggerDownload } from '../../../utils/pdfHelpers'
import apiClient from '../../../config/apiClient'

const ESTATUS_COLOR: Record<string, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada:      'bg-blue-100 text-blue-700',
  observaciones:'bg-yellow-100 text-yellow-700',
  enviada_jc:   'bg-indigo-100 text-indigo-700',
  liberada:     'bg-green-100 text-green-700',
  vigente:      'bg-emerald-100 text-emerald-700',
}

const ESTATUS_LABEL: Record<string, string> = {
  borrador:     'Borrador',
  enviada:      'En revisión (Desarrollo Académico)',
  observaciones:'Con observaciones',
  enviada_jc:   'En revisión (Jefatura de Carrera)',
  liberada:     'Liberada',
  vigente:      'Vigente',
}

const SECCION_LABEL: Record<SeccionInstrumentacion, string> = {
  objetivo_general:     'Objetivo general',
  competencias:         'Competencias',
  unidades:             'Unidades',
  metodologia:          'Metodología',
  criterios_evaluacion: 'Criterios de evaluación',
  bibliografia:         'Bibliografía',
}

// Orden del flujo TecNM-AC-PO-003 para el stepper del detalle — 'observaciones' comparte
// la posición de 'da' porque cualquier reenvío del docente vuelve a pasar primero por
// Desarrollo Académico, sin importar quién la haya devuelto.
const PASOS: { key: string; label: string }[] = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'da', label: 'Desarrollo Académico' },
  { key: 'jc', label: 'Jefatura de Carrera' },
  { key: 'liberada', label: 'Liberada' },
  { key: 'vigente', label: 'Vigente' },
]

const PASO_POR_ESTATUS: Record<string, string> = {
  borrador: 'borrador',
  enviada: 'da',
  observaciones: 'da',
  enviada_jc: 'jc',
  liberada: 'liberada',
  vigente: 'vigente',
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50'
const selectCls = inputCls

function mutationError(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Ocurrió un error. Intenta de nuevo.'
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {ESTATUS_LABEL[estatus] ?? estatus}
    </span>
  )
}

function Stepper({ estatus }: { estatus: string }) {
  const pasoActivo = PASO_POR_ESTATUS[estatus] ?? estatus
  const idxActivo = PASOS.findIndex(p => p.key === pasoActivo)
  return (
    <div className="flex items-center">
      {PASOS.map((p, i) => {
        const alcanzado = i <= idxActivo
        const esActual = p.key === pasoActivo
        return (
          <div key={p.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                esActual ? 'bg-[#1a3a5c] text-white ring-4 ring-[#1a3a5c]/15'
                  : alcanzado ? 'bg-[#1a3a5c] text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {alcanzado && !esActual ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight max-w-[64px] ${esActual ? 'text-[#1a3a5c]' : 'text-slate-400'}`}>{p.label}</span>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < idxActivo ? 'bg-[#1a3a5c]' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Sección de contenido — cuando `modoRevision` está activo (la instrumentación está en
 * 'enviada' o 'enviada_jc') deja anclar una observación puntual a esta área específica;
 * cuando la instrumentación fue devuelta ('observaciones') muestra las notas ya ancladas
 * aquí, para que el docente sepa exactamente qué corregir en cada sección. */
function Seccion({
  seccion, title, children, vacio, modoRevision, pendientes, onAgregarObs, onQuitarObs, notasGuardadas,
}: {
  seccion: SeccionInstrumentacion
  title: string
  children: React.ReactNode
  vacio?: boolean
  modoRevision?: boolean
  pendientes?: ObservacionCampoInstrumentacion[]
  onAgregarObs?: (seccion: SeccionInstrumentacion, texto: string) => void
  onQuitarObs?: (id: string) => void
  notasGuardadas?: ObservacionCampoInstrumentacion[]
}) {
  const [anotando, setAnotando] = useState(false)
  const [texto, setTexto] = useState('')

  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {modoRevision && !anotando && (
          <button
            type="button"
            onClick={() => setAnotando(true)}
            className="text-[11px] font-medium text-blue-600 hover:underline shrink-0"
          >
            + Observación aquí
          </button>
        )}
      </div>

      {notasGuardadas && notasGuardadas.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {notasGuardadas.map(n => (
            <div key={n.id} className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-1.5">
              <p className="text-sm text-yellow-900 whitespace-pre-line">{n.texto}</p>
            </div>
          ))}
        </div>
      )}

      {vacio ? <p className="text-sm text-slate-400 italic">Sin información capturada.</p> : children}

      {modoRevision && pendientes && pendientes.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {pendientes.map(p => (
            <div key={p.id} className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5">
              <p className="text-sm text-blue-900 whitespace-pre-line flex-1">{p.texto}</p>
              <button type="button" onClick={() => onQuitarObs?.(p.id)} className="text-blue-400 hover:text-blue-700 text-xs shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {modoRevision && anotando && (
        <div className="mt-2 space-y-1.5">
          <textarea
            rows={2}
            autoFocus
            className={inputCls}
            placeholder={`Observación sobre "${title.toLowerCase()}"...`}
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { if (texto.trim()) { onAgregarObs?.(seccion, texto.trim()); setTexto(''); setAnotando(false) } }}
              disabled={!texto.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Agregar
            </button>
            <button type="button" onClick={() => { setAnotando(false); setTexto('') }} className="text-xs text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Panel = 'listado' | 'form' | 'detalle'

export default function InstrumentacionDidacticaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)
  const [panel, setPanel] = useState<Panel>('listado')
  const [selected, setSelected] = useState<InstrumentacionDidactica | null>(null)
  const [periodoId, setPeriodoId] = useState('')
  const [asignacionId, setAsignacionId] = useState('')
  const [generandoPdf, setGenerandoPdf] = useState<'previsualizar' | 'descargar' | null>(null)

  // Estado de revisión (Desarrollo Académico en 'enviada' / Jefatura en 'enviada_jc'):
  // observaciones ancladas a una sección específica + un comentario general opcional.
  const [obsCampos, setObsCampos] = useState<ObservacionCampoInstrumentacion[]>([])
  const [obsGeneral, setObsGeneral] = useState('')
  const [mostrandoRechazo, setMostrandoRechazo] = useState(false)

  // Form state para edición/creación
  const [form, setForm] = useState({
    objetivo_general: '',
    metodologia: '',
    bibliografia: '',
  })

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-instrumentacion'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string }[]),
  })

  const { data: instrumentaciones = [], isLoading } = useQuery({
    queryKey: ['instrumentaciones', periodoId],
    queryFn: () => planeacionApi.getInstrumentaciones(periodoId ? { periodo_id: periodoId } : undefined),
  })

  const reiniciarRevision = () => {
    setObsCampos([])
    setObsGeneral('')
    setMostrandoRechazo(false)
  }

  const agregarObsCampo = (seccion: SeccionInstrumentacion, texto: string) => {
    setObsCampos(prev => [...prev, { id: crypto.randomUUID(), seccion, texto }])
  }
  const quitarObsCampo = (id: string) => setObsCampos(prev => prev.filter(o => o.id !== id))

  const crear = useMutation({
    mutationFn: () => planeacionApi.crearInstrumentacion({
      asignacion_id: asignacionId,
      ...form,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      setPanel('detalle')
      toastSuccess('Instrumentación creada en borrador.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const actualizar = useMutation({
    mutationFn: (id: string) => planeacionApi.actualizarInstrumentacion(id, form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      setPanel('detalle')
      toastSuccess('Cambios guardados.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const enviar = useMutation({
    mutationFn: (id: string) => planeacionApi.enviarInstrumentacion(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      toastSuccess('Instrumentación enviada a revisión de Desarrollo Académico.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const revisarDA = useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: 'aprobar' | 'rechazar' }) =>
      planeacionApi.revisarDesarrolloAcademico(id, accion, obsGeneral || undefined, obsCampos.length ? obsCampos : undefined),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      reiniciarRevision()
      toastSuccess(data.estatus === 'enviada_jc' ? 'Aprobada — enviada a Jefatura de Carrera.' : 'Devuelta al docente con observaciones.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const liberar = useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: 'liberar' | 'devolver' }) =>
      planeacionApi.liberarInstrumentacion(id, accion, obsGeneral || undefined, obsCampos.length ? obsCampos : undefined),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      reiniciarRevision()
      toastSuccess(data.estatus === 'liberada' ? 'Instrumentación liberada.' : 'Devuelta al docente con observaciones.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const vistoBueno = useMutation({
    mutationFn: (id: string) => planeacionApi.vistoBueno(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      toastSuccess('Visto bueno otorgado — instrumentación vigente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const abrirEdicion = (inst: InstrumentacionDidactica) => {
    setSelected(inst)
    setForm({
      objetivo_general: inst.objetivo_general ?? '',
      metodologia: inst.metodologia ?? '',
      bibliografia: inst.bibliografia ?? '',
    })
    setPanel('form')
  }

  const abrirNueva = () => {
    setSelected(null)
    setForm({ objetivo_general: '', metodologia: '', bibliografia: '' })
    setAsignacionId('')
    setPanel('form')
  }

  const abrirDetalle = (inst: InstrumentacionDidactica) => {
    setSelected(inst)
    reiniciarRevision()
    setPanel('detalle')
  }

  const handleVerPdf = async (id: string, accion: 'previsualizar' | 'descargar') => {
    setGenerandoPdf(accion)
    try {
      const blob = await planeacionApi.getInstrumentacionPdf(id)
      const filename = `instrumentacion_didactica_${id}.pdf`
      if (accion === 'previsualizar') openPdfPreview(blob, filename)
      else triggerDownload(blob, filename)
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setGenerandoPdf(null)
    }
  }

  if (panel === 'form') {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setPanel('listado')} className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {selected ? 'Editar instrumentación' : 'Nueva instrumentación didáctica'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">TecNM-AC-PO-003 — Paso 2: elaboración del borrador</p>
            </div>
          </div>

          {selected?.estatus === 'observaciones' && (selected.observaciones_jefe || (selected.observaciones_campos?.length ?? 0) > 0) && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-2">
              <p className="text-xs uppercase text-yellow-700 font-semibold">Observaciones a corregir</p>
              {selected.observaciones_jefe && (
                <p className="text-sm text-yellow-900 whitespace-pre-line">{selected.observaciones_jefe}</p>
              )}
              {selected.observaciones_campos?.map(o => (
                <p key={o.id} className="text-sm text-yellow-900">
                  <span className="font-semibold">{SECCION_LABEL[o.seccion]}:</span> {o.texto}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            {!selected && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID de la asignación docente *</label>
                <input
                  className={inputCls}
                  value={asignacionId}
                  onChange={e => setAsignacionId(e.target.value)}
                  placeholder="UUID de la asignación"
                />
                <p className="text-xs text-slate-400 mt-1">Consulta el ID en Asignaciones docentes.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo general</label>
              <textarea
                rows={3}
                className={inputCls}
                value={form.objetivo_general}
                onChange={e => setForm(f => ({ ...f, objetivo_general: e.target.value }))}
                placeholder="Describe el objetivo general del curso..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Metodología</label>
              <textarea
                rows={3}
                className={inputCls}
                value={form.metodologia}
                onChange={e => setForm(f => ({ ...f, metodologia: e.target.value }))}
                placeholder="Aprendizaje basado en proyectos, aula invertida..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bibliografía</label>
              <textarea
                rows={2}
                className={inputCls}
                value={form.bibliografia}
                onChange={e => setForm(f => ({ ...f, bibliografia: e.target.value }))}
                placeholder="Referencias bibliográficas..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setPanel('listado')} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={() => selected ? actualizar.mutate(selected.id) : crear.mutate()}
              disabled={crear.isPending || actualizar.isPending || (!selected && !asignacionId)}
              className="rounded-lg bg-[#1a3a5c] px-5 py-2 text-sm font-medium text-white hover:bg-[#234d7a] disabled:opacity-50"
            >
              {crear.isPending || actualizar.isPending ? 'Guardando…' : 'Guardar borrador'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (panel === 'detalle' && selected) {
    const canEnviar = ['borrador', 'observaciones'].includes(selected.estatus)
    const canEdit = ['borrador', 'observaciones'].includes(selected.estatus)
    // Modo revisión: la instrumentación está pendiente de un dictamen (Desarrollo Académico
    // en 'enviada', Jefatura en 'enviada_jc') — se pueden anclar observaciones por sección.
    const enRevisionDA = selected.estatus === 'enviada'
    const enRevisionJC = selected.estatus === 'enviada_jc'
    const modoRevision = enRevisionDA || enRevisionJC
    const hayObservacionesPendientes = obsGeneral.trim().length > 0 || obsCampos.length > 0

    const notasPorSeccion = (s: SeccionInstrumentacion) =>
      selected.estatus === 'observaciones' ? (selected.observaciones_campos ?? []).filter(o => o.seccion === s) : []
    const pendientesPorSeccion = (s: SeccionInstrumentacion) => obsCampos.filter(o => o.seccion === s)

    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-5">
          <button
            onClick={() => setPanel('listado')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Instrumentaciones
          </button>

          {/* Encabezado con stepper */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-slate-900">{selected.asignacion?.materia?.nombre ?? 'Instrumentación didáctica'}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selected.asignacion?.carrera?.nombre} · Grupo {selected.asignacion?.grupo?.clave ?? '—'} · {selected.asignacion?.periodo?.nombre}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.entrega_tardia && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-700 font-medium">Entrega tardía</span>
                )}
                <Badge estatus={selected.estatus} />
              </div>
            </div>

            <div className="pt-2">
              <Stepper estatus={selected.estatus} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-slate-100">
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wide">Docente</p>
                <p className="font-medium text-slate-800">{selected.asignacion?.docente?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wide">Liberada por</p>
                <p className="font-medium text-slate-800">{selected.liberadaPor?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wide">Visto bueno</p>
                <p className="font-medium text-slate-800">{selected.vistoBuenoPor?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wide">Entrega</p>
                <p className="font-medium text-slate-800">
                  {selected.entrega_en ? new Date(selected.entrega_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
          </div>

          {modoRevision && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              {enRevisionDA
                ? 'Revisión de Desarrollo Académico: puedes anclar una observación en cualquier sección antes de aprobar o rechazar.'
                : 'Revisión de Jefatura de Carrera: puedes anclar una observación en cualquier sección antes de liberar o devolver.'}
            </div>
          )}

          {/* Observaciones ya devueltas al docente (visibles para todos en el historial) */}
          {selected.estatus === 'observaciones' && (selected.observaciones_jefe || (selected.observaciones_campos?.length ?? 0) > 0) && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-2">
              <p className="text-xs uppercase text-yellow-700 font-semibold">Observaciones para el docente</p>
              {selected.observaciones_jefe && (
                <p className="text-sm text-yellow-900 whitespace-pre-line">{selected.observaciones_jefe}</p>
              )}
            </div>
          )}

          {/* Contenido */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <Seccion
              seccion="objetivo_general" title="Objetivo general" vacio={!selected.objetivo_general}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('objetivo_general')}
              pendientes={pendientesPorSeccion('objetivo_general')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <p className="text-sm text-slate-700 whitespace-pre-line">{selected.objetivo_general}</p>
            </Seccion>
            <Seccion
              seccion="competencias" title="Competencias" vacio={!selected.competencias?.length}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('competencias')}
              pendientes={pendientesPorSeccion('competencias')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <ul className="text-sm text-slate-700 list-disc pl-4 space-y-0.5">
                {selected.competencias?.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </Seccion>
            <Seccion
              seccion="unidades" title="Unidades" vacio={!selected.unidades?.length}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('unidades')}
              pendientes={pendientesPorSeccion('unidades')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <ul className="text-sm text-slate-700 list-disc pl-4 space-y-0.5">
                {selected.unidades?.map((u, i) => <li key={i}>{u.nombre}</li>)}
              </ul>
            </Seccion>
            <Seccion
              seccion="metodologia" title="Metodología" vacio={!selected.metodologia}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('metodologia')}
              pendientes={pendientesPorSeccion('metodologia')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <p className="text-sm text-slate-700 whitespace-pre-line">{selected.metodologia}</p>
            </Seccion>
            <Seccion
              seccion="criterios_evaluacion" title="Criterios de evaluación" vacio={!selected.criterios_evaluacion || Object.keys(selected.criterios_evaluacion).length === 0}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('criterios_evaluacion')}
              pendientes={pendientesPorSeccion('criterios_evaluacion')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <ul className="text-sm text-slate-700 space-y-0.5">
                {selected.criterios_evaluacion && Object.entries(selected.criterios_evaluacion).map(([k, v]) => (
                  <li key={k}>{k}: <span className="font-medium">{v}%</span></li>
                ))}
              </ul>
            </Seccion>
            <Seccion
              seccion="bibliografia" title="Bibliografía" vacio={!selected.bibliografia}
              modoRevision={modoRevision} notasGuardadas={notasPorSeccion('bibliografia')}
              pendientes={pendientesPorSeccion('bibliografia')} onAgregarObs={agregarObsCampo} onQuitarObs={quitarObsCampo}
            >
              <p className="text-sm text-slate-700 whitespace-pre-line">{selected.bibliografia}</p>
            </Seccion>
          </div>

          {/* Acciones */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleVerPdf(selected.id, 'previsualizar')}
              disabled={generandoPdf !== null}
              className="px-3.5 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {generandoPdf === 'previsualizar' ? 'Generando…' : '📄 Vista previa PDF'}
            </button>
            <button
              onClick={() => handleVerPdf(selected.id, 'descargar')}
              disabled={generandoPdf !== null}
              className="px-3.5 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {generandoPdf === 'descargar' ? 'Generando…' : '⬇ Descargar PDF'}
            </button>

            <span className="w-px self-stretch bg-slate-200 mx-1" />

            {canEdit && (
              <button
                onClick={() => abrirEdicion(selected)}
                className="px-3.5 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Editar
              </button>
            )}
            {canEnviar && (
              <button
                onClick={() => enviar.mutate(selected.id)}
                disabled={enviar.isPending}
                className="px-3.5 py-2 text-sm font-medium text-white bg-[#1a3a5c] rounded-lg hover:bg-[#234d7a] disabled:opacity-50"
              >
                {enviar.isPending ? 'Enviando…' : 'Enviar a revisión'}
              </button>
            )}

            {enRevisionDA && !mostrandoRechazo && (
              <>
                <button
                  onClick={() => revisarDA.mutate({ id: selected.id, accion: 'aprobar' })}
                  disabled={revisarDA.isPending}
                  className="px-3.5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Aprobar (enviar a Jefatura)
                </button>
                <button
                  onClick={() => setMostrandoRechazo(true)}
                  className="px-3.5 py-2 text-sm font-medium border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50"
                >
                  Rechazar con observaciones
                </button>
              </>
            )}

            {enRevisionJC && !mostrandoRechazo && (
              <>
                <button
                  onClick={() => liberar.mutate({ id: selected.id, accion: 'liberar' })}
                  disabled={liberar.isPending}
                  className="px-3.5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Liberar
                </button>
                <button
                  onClick={() => setMostrandoRechazo(true)}
                  className="px-3.5 py-2 text-sm font-medium border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50"
                >
                  Devolver con observaciones
                </button>
              </>
            )}

            {selected.estatus === 'liberada' && (
              <button
                onClick={() => vistoBueno.mutate(selected.id)}
                disabled={vistoBueno.isPending}
                className="px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {vistoBueno.isPending ? 'Procesando…' : '✓ Dar visto bueno (vigente)'}
              </button>
            )}

            {modoRevision && mostrandoRechazo && (
              <div className="w-full space-y-2 pt-2 border-t border-slate-100">
                {obsCampos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Observaciones ancladas por sección:</p>
                    {obsCampos.map(o => (
                      <div key={o.id} className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                        <span className="font-semibold text-blue-800 shrink-0">{SECCION_LABEL[o.seccion]}:</span>
                        <span className="text-blue-900 flex-1">{o.texto}</span>
                        <button onClick={() => quitarObsCampo(o.id)} className="text-blue-400 hover:text-blue-700">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder="Observación general para el docente (opcional si ya anclaste observaciones por sección)..."
                  value={obsGeneral}
                  onChange={e => setObsGeneral(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => enRevisionDA
                      ? revisarDA.mutate({ id: selected.id, accion: 'rechazar' })
                      : liberar.mutate({ id: selected.id, accion: 'devolver' })}
                    disabled={(revisarDA.isPending || liberar.isPending) || !hayObservacionesPendientes}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Confirmar devolución
                  </button>
                  <button onClick={() => setMostrandoRechazo(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Listado
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Instrumentaciones didácticas</h1>
            <p className="text-sm text-slate-500 mt-0.5">TecNM-AC-PO-003 — Pasos 2 a 5</p>
          </div>
          <button
            onClick={abrirNueva}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1a3a5c] rounded-lg hover:bg-[#234d7a]"
          >
            + Nueva
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-slate-900 text-sm">Listado</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
              <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={`${selectCls} max-w-xs`}>
                <option value="">Todos los periodos</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Materia', 'Docente', 'Carrera', 'Estatus', 'Liberada por', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Cargando…</td></tr>
                )}
                {!isLoading && instrumentaciones.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400 italic">Sin instrumentaciones registradas.</td></tr>
                )}
                {instrumentaciones.map((inst: InstrumentacionDidactica) => (
                  <tr
                    key={inst.id}
                    onClick={() => abrirDetalle(inst)}
                    className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {inst.asignacion?.materia?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {inst.asignacion?.docente?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {inst.asignacion?.carrera?.clave ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge estatus={inst.estatus} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {inst.liberadaPor?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-medium text-blue-600 hover:underline">Ver / gestionar →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
