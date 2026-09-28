import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'
import { useAuthStore } from '../../../../store/authStore'
import { useIa } from '../../iaContext'
import { academicoApi, type EstatusPlaneacion, type PlaneacionDocente, type ObservacionCampo, type SeccionObservacion, type FuenteInformacion, type TipoFuente } from '../../services/academico'
import {
  citarFuente,
  TIPO_FUENTE_LABEL,
  normalizarCompetencia,
  obtenerFilasDeSubtema,
  calendarizacionEvaluaciones,
  PRODUCTOS_APRENDIZAJE_CATALOGO,
  inferirEvidenciasHeuristicas,
  extraerProductoDeActividad,
  CATALOGO_INSTRUMENTOS_EVALUACION,
  inferirInstrumentoParaEvidencia,
  generarEstructuraInstrumentoCompleto,
  type TipoInstrumentoEvaluacion,
  type InstrumentoEvaluacionDetallado,
  type CriterioInstrumento,
} from '../planeacionCatalogo'
import {
  detectarTipoIdentificador,
  resolverFuentePorIdentificador,
  parseCitasDirectas,
  type TipoIdentificadorBibliografico,
} from '../bibliografiaLookup'
import { mutationError } from '@/utils/apiErrors'
import { RichTextView, richTextAPlano } from '../../../../components/RichTextField'
import { Inbox, Loader2, Paperclip } from 'lucide-react'

/**
 * Opciones de transición de estatus disponibles para una planeación, según su
 * estatus actual y los roles del usuario en sesión (cadena TecNM-AC-PO-003:
 * Docente -> Desarrollo Académico -> Jefatura de Carrera -> liberada).
 */
export function transicionesPlaneacion(estatus: EstatusPlaneacion, roles: string[]): { estatus: EstatusPlaneacion; label: string }[] {
  const tieneRol = (r: string[]) => r.some(x => roles.includes(x))

  if (estatus === 'enviada_da' && tieneRol(['desarrollo_academico', 'admin', 'superadmin'])) {
    return [
      { estatus: 'enviada_jc', label: 'Enviar a Jefatura de Carrera' },
      { estatus: 'devuelta_da', label: 'Devolver con observaciones' },
    ]
  }
  if (estatus === 'enviada_jc' && tieneRol(['jefe_carrera', 'admin', 'superadmin'])) {
    return [
      { estatus: 'liberada', label: 'Liberar' },
      { estatus: 'devuelta_jc', label: 'Devolver con observaciones' },
    ]
  }
  return []
}

/** Esquema de color de PlaneacionDetalle: "sky" para el editor/confirmación del docente,
 * "amber" para la vista de revisión de Desarrollo Académico/Jefatura — así se distingue de
 * un vistazo en qué modo se está, sin tener que leer el encabezado de la página. */
export type VarianteDetalle = 'sky' | 'amber'
const CLASES_VARIANTE: Record<VarianteDetalle, { circulo: string; borde: string; header: string; badge: string }> = {
  sky:   { circulo: 'from-brand-600 to-sky-600 shadow-brand-600/30', borde: 'border-l-sky-200',   header: 'from-brand-600 to-sky-700',    badge: 'bg-white/15 text-white' },
  amber: { circulo: 'from-amber-600 to-orange-500 shadow-amber-600/30', borde: 'border-l-amber-300', header: 'from-amber-600 to-orange-600', badge: 'bg-white/20 text-white' },
}

function SeccionTitulo({ numero, title, variante = 'sky' }: { numero: string; title: string; variante?: VarianteDetalle }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${CLASES_VARIANTE[variante].circulo} text-white text-xs font-bold flex items-center justify-center shadow-sm`}>{numero}</span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
    </div>
  )
}

function DetalleSection({ id, numero, title, variante = 'sky', destacada, children }: { id?: string; numero: string; title: string; variante?: VarianteDetalle; destacada?: boolean; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={`bg-white border rounded-xl p-4 shadow-sm scroll-mt-24 ${
        destacada
          ? 'border-red-200 border-l-4 border-l-red-400 shadow-red-100/60'
          : `border-slate-200 border-l-4 ${CLASES_VARIANTE[variante].borde} shadow-slate-200/50`
      }`}
    >
      <SeccionTitulo numero={numero} title={title} variante={variante} />
      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{children}</div>
    </div>
  )
}

/** Cada "Dato" se envuelve en su propia caja con acento de color — antes era solo una
 * etiqueta seguida de texto corrido, y con 6-8 de estos seguidos dentro de una unidad el
 * conjunto se sentía como un muro de texto plano sin ningún punto de referencia visual. */
const TONO_DATO: Record<string, { fondo: string; borde: string; etiqueta: string }> = {
  sky:     { fondo: 'bg-sky-50/60',     borde: 'border-sky-100',     etiqueta: 'text-sky-700' },
  indigo:  { fondo: 'bg-indigo-50/60',  borde: 'border-indigo-100',  etiqueta: 'text-indigo-700' },
  violet:  { fondo: 'bg-violet-50/60',  borde: 'border-violet-100',  etiqueta: 'text-violet-700' },
  amber:   { fondo: 'bg-amber-50/60',   borde: 'border-amber-100',   etiqueta: 'text-amber-700' },
  emerald: { fondo: 'bg-emerald-50/60', borde: 'border-emerald-100', etiqueta: 'text-emerald-700' },
  rose:    { fondo: 'bg-rose-50/60',    borde: 'border-rose-100',    etiqueta: 'text-rose-700' },
  slate:   { fondo: 'bg-slate-50/80',   borde: 'border-slate-200',   etiqueta: 'text-slate-500' },
}

function Dato({ label, tono = 'slate', children }: { label: string; tono?: keyof typeof TONO_DATO; children: React.ReactNode }) {
  const c = TONO_DATO[tono]
  return (
    <div className={`rounded-lg border ${c.borde} ${c.fondo} px-3 py-2.5`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${c.etiqueta}`}>{label}</p>
      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{children}</div>
    </div>
  )
}

/** Ancla de observación anidada dentro de PlaneacionDetalle: muestra las observaciones ya
 * capturadas para esta sección/unidad/categoría exacta y, en modo revisión, un botón para
 * agregar una nueva justo ahí — así el docente ve la observación pegada al contenido al que
 * corresponde en vez de un comentario general suelto. */
function AnchorObservaciones({ seccion, unidad, categoria, editable, observaciones, onAgregar, onQuitar }: {
  seccion: SeccionObservacion
  unidad?: number
  categoria?: string
  editable?: boolean
  observaciones: ObservacionCampo[]
  onAgregar?: (obs: Omit<ObservacionCampo, 'id'>) => void
  onQuitar?: (id: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')

  const propias = observaciones.filter(o =>
    o.seccion === seccion &&
    (unidad === undefined ? o.unidad == null : o.unidad === unidad) &&
    (categoria === undefined ? !o.categoria : o.categoria === categoria)
  )

  const guardar = () => {
    if (!texto.trim() || !onAgregar) return
    onAgregar({ seccion, unidad: unidad ?? null, categoria: categoria ?? null, texto: texto.trim() })
    setTexto('')
    setAbierto(false)
  }

  if (!editable && propias.length === 0) return null

  return (
    <div className="mt-1.5 space-y-1.5">
      {propias.map(o => (
        <div key={o.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">!</span>
          <p className="text-xs text-amber-800 flex-1 whitespace-pre-line">{o.texto}</p>
          {editable && onQuitar && (
            <button type="button" onClick={() => onQuitar(o.id)} className="text-[11px] text-amber-700 hover:underline shrink-0">Quitar</button>
          )}
        </div>
      ))}
      {editable && (
        abierto ? (
          <div className="flex items-start gap-1.5">
            <textarea
              value={texto} onChange={e => setTexto(e.target.value)} rows={2} autoFocus
              placeholder="Escribe aquí qué debe corregir el docente…"
              className="flex-1 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={guardar} className="text-[11px] px-2 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap">Agregar</button>
              <button type="button" onClick={() => { setAbierto(false); setTexto('') }} className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 whitespace-nowrap">Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAbierto(true)} className="text-[11px] text-amber-600 hover:underline">+ Observación aquí</button>
        )
      )}
    </div>
  )
}

/** Hilo de comentarios persistente anclado a una sección/unidad/categoría — a diferencia de
 * AnchorObservaciones (que solo vive mientras la planeación está devuelta y se limpia en el
 * siguiente reenvío del docente), este hilo sobrevive indefinidamente y admite respuestas de
 * cualquiera de las dos partes, como un comentario de Google Docs. Se usa tanto en el editor
 * del docente como en la vista de revisión — misma ancla, mismo hilo. */
export function HiloComentarios({ planeacionId, seccion, unidad, categoria }: {
  planeacionId: string
  seccion: SeccionObservacion
  unidad?: number
  categoria?: string
}) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const { data: todos = [] } = useQuery({
    queryKey: ['planeacion-comentarios', planeacionId],
    queryFn: () => academicoApi.comentariosPlaneacion(planeacionId),
    enabled: !!planeacionId,
  })

  const hilo = todos.filter(c =>
    c.seccion === seccion &&
    (unidad === undefined ? c.unidad == null : c.unidad === unidad) &&
    (categoria === undefined ? !c.categoria : c.categoria === categoria)
  )
  const resuelto = hilo.length > 0 && hilo[hilo.length - 1].resuelto

  const invalidar = () => qc.invalidateQueries({ queryKey: ['planeacion-comentarios', planeacionId] })

  const mutAgregar = useMutation({
    mutationFn: () => academicoApi.agregarComentarioPlaneacion(planeacionId, {
      seccion, unidad: unidad ?? null, categoria: categoria ?? null, mensaje: mensaje.trim(),
    }),
    onSuccess: () => { invalidar(); setMensaje(''); setAbierto(false) },
  })
  const mutResolver = useMutation({
    mutationFn: (r: boolean) => academicoApi.resolverComentariosPlaneacion(planeacionId, {
      seccion, unidad: unidad ?? null, categoria: categoria ?? null, resuelto: r,
    }),
    onSuccess: invalidar,
  })

  if (hilo.length === 0 && !abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-1 text-[11px] text-brand-600 hover:underline">
        + Comentario
      </button>
    )
  }

  return (
    <div className={`mt-1.5 border rounded-lg p-2 space-y-1.5 ${resuelto ? 'border-slate-100 bg-slate-50' : 'border-brand-200 bg-brand-50/40'}`}>
      {hilo.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-slate-500">Comentarios{resuelto ? ' (resuelto)' : ''}</span>
          <button type="button" onClick={() => mutResolver.mutate(!resuelto)} disabled={mutResolver.isPending} className="text-[10px] text-brand-600 hover:underline shrink-0">
            {resuelto ? 'Reabrir' : 'Marcar resuelto'}
          </button>
        </div>
      )}
      {hilo.map(c => (
        <div key={c.id} className="text-xs">
          <span className="font-medium text-slate-700">{c.autor ?? 'Alguien'}</span>
          <span className="text-slate-400 ml-1.5 text-[10px]">
            {new Date(c.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <p className="text-slate-600 whitespace-pre-line">{c.mensaje}</p>
        </div>
      ))}
      {abierto ? (
        <div className="flex items-start gap-1.5">
          <textarea
            value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2} autoFocus
            placeholder="Responder…"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={() => mutAgregar.mutate()} disabled={!mensaje.trim() || mutAgregar.isPending}
              className="text-[11px] px-2 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 whitespace-nowrap">
              Enviar
            </button>
            <button type="button" onClick={() => { setAbierto(false); setMensaje('') }} className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 whitespace-nowrap">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className="text-[11px] text-brand-600 hover:underline">Responder</button>
      )}
    </div>
  )
}

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Archivos adjuntos (rúbricas, material didáctico, evidencias) — generales de la planeación
 * (unidad=undefined) o ligados a una unidad específica. Visible/editable tanto para el docente
 * dueño como para los roles revisores, igual que los hilos de comentarios. */
export function ArchivosAdjuntos({ planeacionId, unidad }: { planeacionId: string; unidad?: number }) {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  const esAdmin = useAuthStore(s => s.user?.roles?.some(r => ['admin', 'superadmin'].includes(r))) ?? false
  const [subiendo, setSubiendo] = useState(false)

  const { data: todos = [] } = useQuery({
    queryKey: ['planeacion-archivos', planeacionId],
    queryFn: () => academicoApi.archivosPlaneacion(planeacionId),
    enabled: !!planeacionId,
  })

  const archivos = todos.filter(a => (unidad === undefined ? a.unidad == null : a.unidad === unidad))
  const invalidar = () => qc.invalidateQueries({ queryKey: ['planeacion-archivos', planeacionId] })

  const mutSubir = useMutation({
    mutationFn: (archivo: File) => academicoApi.subirArchivoPlaneacion(planeacionId, archivo, unidad ?? null),
    onSuccess: invalidar,
    onSettled: () => setSubiendo(false),
  })
  const mutEliminar = useMutation({
    mutationFn: (archivoId: string) => academicoApi.eliminarArchivoPlaneacion(planeacionId, archivoId),
    onSuccess: invalidar,
  })

  const onSeleccionar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    mutSubir.mutate(archivo)
  }

  return (
    <div className="space-y-1.5">
      {archivos.map(a => (
        <div key={a.id} className="flex items-center gap-2 border border-slate-100 rounded-lg px-2.5 py-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} aria-hidden="true" />
          <button type="button" onClick={() => academicoApi.descargarArchivoPlaneacion(planeacionId, a.id, a.nombre_original)}
            className="flex-1 min-w-0 text-left text-xs text-brand-600 hover:underline truncate">
            {a.nombre_original}
          </button>
          <span className="text-[10px] text-slate-400 shrink-0">{formatoTamano(a.tamano_bytes)}</span>
          {(esAdmin || a.subido_por_id === userId) && (
            <button type="button" onClick={() => mutEliminar.mutate(a.id)} disabled={mutEliminar.isPending}
              className="text-[10px] text-red-500 hover:underline shrink-0">
              Eliminar
            </button>
          )}
        </div>
      ))}
      <label className="inline-flex items-center gap-1.5 text-[11px] text-brand-600 hover:underline cursor-pointer">
        <input type="file" className="hidden" onChange={onSeleccionar} disabled={subiendo} />
        {subiendo ? 'Subiendo…' : '+ Adjuntar archivo'}
      </label>
    </div>
  )
}

/** Envuelve en <mark> las ocurrencias (sin distinguir mayúsculas/minúsculas) de cualquiera
 * de los `terminos` dentro de `texto` — usado para resaltar el nombre de la evidencia de
 * aprendizaje dentro de una sugerencia de actividad, así el docente ve de un vistazo qué
 * parte del texto viene de ahí (y que, como el resto, sigue siendo editable una vez
 * aplicada). Solo resalta términos de al menos 3 caracteres para no marcar palabras sueltas
 * por coincidencia accidental. */
function resaltarTerminos(texto: string, terminos: string[] | undefined): React.ReactNode {
  const validos = (terminos ?? []).map(t => t.trim()).filter(t => t.length >= 3)
  if (validos.length === 0) return texto
  const patron = new RegExp(`(${validos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const partes = texto.split(patron)
  return partes.map((parte, i) =>
    validos.some(t => t.toLowerCase() === parte.toLowerCase())
      ? <mark key={i} className="bg-amber-200/80 text-slate-900 rounded-sm px-0.5">{parte}</mark>
      : parte
  )
}

function TarjetaSugerenciaAprendizaje({
  sugerenciaInicial,
  evidenciaInicial,
  resaltar,
  onUsar,
  onQuitar,
  etiquetaAccion,
}: {
  sugerenciaInicial: string
  evidenciaInicial?: string | null
  resaltar?: string[]
  onUsar: (texto: string, evidencia?: string) => void
  onQuitar: () => void
  etiquetaAccion: string
}) {
  const evidenciaDetectada = useMemo(() => {
    if (evidenciaInicial) return evidenciaInicial
    const ext = extraerProductoDeActividad(sugerenciaInicial)
    if (ext) return ext
    const matchCat = PRODUCTOS_APRENDIZAJE_CATALOGO.find(p => sugerenciaInicial.toLowerCase().includes(p.toLowerCase()))
    return matchCat || 'Reporte de práctica de laboratorio'
  }, [sugerenciaInicial, evidenciaInicial])

  const [evidenciaElegida, setEvidenciaElegida] = useState<string>(evidenciaDetectada)

  // Reemplazar o integrar la evidencia elegida de forma limpia respetando la respuesta original de la IA
  const textoConEvidencia = useMemo(() => {
    if (!evidenciaElegida.trim()) return sugerenciaInicial

    const evElegidaLimpia = evidenciaElegida.trim()
    const evDetectadaLimpia = evidenciaDetectada?.trim()

    // Si la evidencia elegida es la misma que detectó la IA, mantener la respuesta original de la IA
    if (evDetectadaLimpia && evElegidaLimpia.toLowerCase() === evDetectadaLimpia.toLowerCase()) {
      return sugerenciaInicial
    }

    // Si la evidencia detectada está presente en el texto original, reemplazarla por la elegida
    if (evDetectadaLimpia && sugerenciaInicial.toLowerCase().includes(evDetectadaLimpia.toLowerCase())) {
      const regex = new RegExp(evDetectadaLimpia.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return sugerenciaInicial.replace(regex, evElegidaLimpia)
    }

    // Buscar si hay algún otro producto del catálogo en el texto original para reemplazarlo
    const matchCat = PRODUCTOS_APRENDIZAJE_CATALOGO.find(p => sugerenciaInicial.toLowerCase().includes(p.toLowerCase()))
    if (matchCat) {
      const regex = new RegExp(matchCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return sugerenciaInicial.replace(regex, evElegidaLimpia)
    }

    // Si no contiene ninguna evidencia previa, anexar de forma natural la nueva evidencia
    const evMin = evElegidaLimpia.charAt(0).toLowerCase() + evElegidaLimpia.slice(1)
    const base = sugerenciaInicial.trim().replace(/[.,;]$/, '')
    return `${base}, sistematizando los resultados mediante la entrega de ${evMin}.`
  }, [evidenciaElegida, evidenciaDetectada, sugerenciaInicial])

  const listaResaltar = useMemo(() => {
    const arr = [...(resaltar || [])]
    if (evidenciaElegida.trim() && !arr.some(a => a.toLowerCase().includes(evidenciaElegida.trim().toLowerCase()))) {
      arr.push(evidenciaElegida.trim())
    }
    return arr
  }, [resaltar, evidenciaElegida])

  return (
    <div className="bg-white border border-violet-200/90 rounded-lg p-2.5 space-y-2.5 shadow-sm">
      <div className="bg-amber-50/90 border border-amber-200 rounded-md p-2 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="font-semibold text-amber-900 flex items-center gap-1.5 text-[11px]">
            <span>📦</span>
            <span>Evidencia de aprendizaje (seleccionar o editar):</span>
          </label>
          
          <select
            value={PRODUCTOS_APRENDIZAJE_CATALOGO.includes(evidenciaElegida) ? evidenciaElegida : ''}
            onChange={e => {
              if (e.target.value) {
                setEvidenciaElegida(e.target.value)
              }
            }}
            className="text-xs font-semibold bg-white border border-amber-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs max-w-full"
          >
            <option value="">-- Seleccionar del catálogo TecNM --</option>
            {PRODUCTOS_APRENDIZAJE_CATALOGO.map(prod => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
          </select>
        </div>

        {/* Input de texto para edición directa del nombre de la evidencia */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 border border-amber-300 rounded-md shadow-xs focus-within:ring-1 focus-within:ring-amber-500">
          <span className="text-amber-600 font-bold text-xs shrink-0">✏️ Nombre de la evidencia:</span>
          <input
            type="text"
            value={evidenciaElegida}
            onChange={e => setEvidenciaElegida(e.target.value)}
            placeholder="Escribe o edita la evidencia de aprendizaje..."
            className="flex-1 text-xs font-semibold text-amber-950 bg-transparent border-none outline-none focus:ring-0 p-0"
          />
        </div>

        {/* Chips de selección rápida */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-amber-700 font-medium">Sugerencias rápidas:</span>
          {['Mapa conceptual', 'Reporte de práctica de laboratorio', 'Ejercicios prácticos / Banco de problemas resueltos', 'Código fuente y software ejecutable documentado', 'Cuadro comparativo'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => setEvidenciaElegida(chip)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                evidenciaElegida.toLowerCase() === chip.toLowerCase()
                  ? 'bg-amber-500 text-white border-amber-600 font-semibold shadow-xs'
                  : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100/80'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 bg-slate-50/60 rounded border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
        {resaltarTerminos(textoConEvidencia, listaResaltar)}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onUsar(textoConEvidencia, evidenciaElegida.trim())}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-xs transition-colors"
        >
          ✓ {etiquetaAccion}
        </button>
        <button
          type="button"
          onClick={onQuitar}
          className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
        >
          Quitar
        </button>
      </div>
    </div>
  )
}

/** Lista de alternativas generadas por la IA, cada una con su propio "Usar esta versión" —
 * compartida por MejorarConIa y SugerirActividadEnsenanza. Cuando la primera sugerencia no
 * es la que el docente busca, "Ver otra alternativa" agrega una más a la lista en vez de
 * reemplazarla, para poder comparar varias antes de decidir. */
function PanelSugerenciasIA({ titulo, sugerencias, onUsar, etiquetaAccion = 'Usar esta versión', onQuitar, onPedirOtra, pidiendoOtra, error, resaltar, permitirEditarEvidencia }: {
  titulo: string
  sugerencias: string[]
  onUsar: (s: string, evidencia?: string) => void
  etiquetaAccion?: string
  onQuitar: (i: number) => void
  onPedirOtra: () => void
  pidiendoOtra: boolean
  error: unknown
  resaltar?: string[]
  permitirEditarEvidencia?: boolean
}) {
  return (
    <div className="mt-1 border border-violet-200 bg-violet-50/60 rounded-lg p-2 space-y-2">
      <p className="text-[10px] font-medium text-violet-700">{titulo}</p>
      {!!resaltar?.length && !permitirEditarEvidencia && (
        <p className="text-[10px] text-amber-700 flex items-center gap-1">
          <mark className="bg-amber-200/80 rounded-sm px-1">evidencia</mark> resaltada en el texto — sigue siendo editable
        </p>
      )}
      <div className="space-y-1.5">
        {sugerencias.map((s, i) => (
          permitirEditarEvidencia ? (
            <TarjetaSugerenciaAprendizaje
              key={i}
              sugerenciaInicial={s}
              resaltar={resaltar}
              onUsar={(txt, ev) => onUsar(txt, ev)}
              onQuitar={() => onQuitar(i)}
              etiquetaAccion={etiquetaAccion}
            />
          ) : (
            <div key={i} className="bg-white/80 border border-violet-100 rounded-md p-1.5">
              <p className="text-xs text-slate-700 whitespace-pre-line">{resaltarTerminos(s, resaltar)}</p>
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={() => onUsar(s)} className="text-[11px] font-medium text-violet-700 hover:underline">
                  {etiquetaAccion}
                </button>
                <button type="button" onClick={() => onQuitar(i)} className="text-[11px] text-slate-500 hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          )
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onPedirOtra} disabled={pidiendoOtra} className="text-[11px] font-medium text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 disabled:no-underline">
          {pidiendoOtra ? 'Pensando…' : '+ Ver otra alternativa'}
        </button>
        {!!error && <span className="text-[11px] text-red-500 ml-1">— {mutationError(error)}</span>}
      </div>
    </div>
  )
}

/** Botón "Mejorar con IA" — manda el texto actual del campo al LLM autoalojado (Ollama, ver
 * docker-compose.yml) y muestra la(s) sugerencia(s) en un cuadro aparte para que el docente
 * decida si la usa, en vez de sobrescribir el campo directamente. Nada se guarda hasta que
 * el docente presiona "Usar esta versión". */
export function MejorarConIa({ texto, tipo, contexto, resaltar, onAplicar, disabled }: {
  texto: string
  tipo: 'indicador' | 'actividad' | 'actividad_aprendizaje' | 'evidencia' | 'general' | 'sugerir_ensenanza' | 'sugerir_evidencia'
  contexto?: string
  resaltar?: string[]
  onAplicar: (nuevoTexto: string, productoSugerido?: string) => void
  disabled?: boolean
}) {
  const [sugerencias, setSugerencias] = useState<string[]>([])

  const ia = useIa()

  const mut = useMutation({
    mutationFn: () => ia.mejorar(texto, tipo, contexto),
    onSuccess: (r) => setSugerencias(prev => [...prev, r.sugerencia]),
  })

  if (sugerencias.length > 0) {
    return (
      <PanelSugerenciasIA
        titulo="Sugerencia de la IA"
        sugerencias={sugerencias}
        permitirEditarEvidencia={tipo === 'actividad_aprendizaje'}
        onUsar={(s, ev) => { onAplicar(s, ev); setSugerencias([]) }}
        onQuitar={i => setSugerencias(prev => prev.filter((_, j) => j !== i))}
        onPedirOtra={() => mut.mutate()}
        pidiendoOtra={mut.isPending}
        error={mut.error}
        resaltar={resaltar}
      />
    )
  }

  // Desactivada por el superadministrador para esta planeación.
  if (!ia.habilitada) return null

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={disabled || !texto.trim() || mut.isPending}
      title="Mejorar la redacción con el asistente de IA"
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 disabled:no-underline"
    >
      ✨ {mut.isPending ? 'Pensando…' : 'Mejorar con IA'}
      {mut.isError && <span className="text-red-500 ml-1">— {mutationError(mut.error)}</span>}
    </button>
  )
}

/** Botón "Sugerir actividad de enseñanza" — a diferencia de MejorarConIa (que reescribe un
 * campo tomando su propio texto), este toma el texto de OTRO campo ya escrito (la actividad
 * de aprendizaje de la misma fila) y le pide a la IA la actividad de enseñanza que le
 * correspondería, para que el docente no tenga que redactar las dos desde cero. Mismo patrón
 * de "sugerencia(s) aparte, no se guarda hasta Usar esta versión", con varias alternativas
 * disponibles por si la primera no encaja con lo que se necesita. */
export function SugerirActividadEnsenanza({ aprendizaje, contexto, onAplicar, disabled }: {
  aprendizaje: string
  contexto?: string
  onAplicar: (nuevoTexto: string) => void
  disabled?: boolean
}) {
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const textoOrigen = richTextAPlano(aprendizaje)

  const ia = useIa()

  const mut = useMutation({
    mutationFn: () => ia.mejorar(textoOrigen, 'sugerir_ensenanza', contexto),
    onSuccess: (r) => setSugerencias(prev => [...prev, r.sugerencia]),
  })

  if (sugerencias.length > 0) {
    return (
      <PanelSugerenciasIA
        titulo="Actividad de enseñanza sugerida"
        sugerencias={sugerencias}
        onUsar={s => { onAplicar(s); setSugerencias([]) }}
        onQuitar={i => setSugerencias(prev => prev.filter((_, j) => j !== i))}
        onPedirOtra={() => mut.mutate()}
        pidiendoOtra={mut.isPending}
        error={mut.error}
      />
    )
  }

  // Desactivada por el superadministrador para esta planeación.
  if (!ia.habilitada) return null

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={disabled || !textoOrigen.trim() || mut.isPending}
      title={textoOrigen.trim() ? 'Sugerir la actividad de enseñanza correspondiente, a partir de la de aprendizaje' : 'Escribe primero la actividad de aprendizaje'}
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 disabled:no-underline"
    >
      🧑‍🏫 {mut.isPending ? 'Pensando…' : 'Sugerir actividad de enseñanza'}
      {mut.isError && <span className="text-red-500 ml-1">— {mutationError(mut.error)}</span>}
    </button>
  )
}

/** Botón "Sugerir evidencia de aprendizaje" — toma la actividad de enseñanza y/o aprendizaje
 * de una fila y le pide a la IA un entregable concreto (la evidencia). Al aceptarla,
/** Selector e indicador del producto / evidencia de aprendizaje para una actividad — permite
 * elegir del catálogo institucional TecNM, escribir uno personalizado o crearlo con IA.
 * Al seleccionarlo, se integra en la redacción y se sincroniza automáticamente en Indicadores y evaluación. */
export function SelectorProductoAprendizaje({
  ensenanza,
  aprendizaje,
  contexto,
  productoActual,
  onSeleccionar,
  onQuitar,
  disabled,
}: {
  ensenanza: string
  aprendizaje: string
  contexto?: string
  productoActual?: string | null
  onSeleccionar: (producto: string) => void
  onQuitar?: () => void
  disabled?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [personalizado, setPersonalizado] = useState(false)
  const [textoPersonalizado, setTextoPersonalizado] = useState('')
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [mostrandoFallback, setMostrandoFallback] = useState(false)

  const textoOrigen = [richTextAPlano(ensenanza), richTextAPlano(aprendizaje)].filter(Boolean).join(' / ')

  const ia = useIa()

  const mut = useMutation({
    mutationFn: () => ia.mejorar(textoOrigen, 'sugerir_evidencia', contexto),
    onSuccess: (r) => {
      setSugerencias(prev => [...prev, r.sugerencia])
      setMostrandoFallback(false)
    },
    onError: () => {
      const heuristicas = inferirEvidenciasHeuristicas(textoOrigen)
      setSugerencias(heuristicas)
      setMostrandoFallback(true)
    },
  })

  const manejarSeleccion = (producto: string) => {
    onSeleccionar(producto)
    setEditando(false)
    setPersonalizado(false)
    setTextoPersonalizado('')
    setSugerencias([])
  }

  if (sugerencias.length > 0) {
    return (
      <div className="mt-1.5">
        <PanelSugerenciasIA
          titulo={mostrandoFallback ? "Productos de aprendizaje sugeridos" : "Producto de aprendizaje sugerido por IA"}
          sugerencias={sugerencias}
          etiquetaAccion="+ Asignar producto y cargar a Indicadores y evaluación"
          onUsar={s => manejarSeleccion(s)}
          onQuitar={i => setSugerencias(prev => prev.filter((_, j) => j !== i))}
          onPedirOtra={() => mut.mutate()}
          pidiendoOtra={mut.isPending}
          error={mostrandoFallback ? undefined : mut.error}
        />
      </div>
    )
  }

  if (productoActual && !editando) {
    return (
      <div className="inline-flex items-center justify-between gap-2 text-xs py-0.5 px-2 bg-emerald-50/60 border border-emerald-200/70 rounded-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-amber-500 font-bold text-xs">📦</span>
          <span className="text-[11px] text-slate-500 font-medium">Producto:</span>
          <span className="font-semibold text-emerald-800 text-[11px] truncate bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200" title="Cargado automáticamente en Indicadores y evaluación">
            ✓ {productoActual}
          </span>
        </div>
        {!disabled && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-brand-600 hover:text-brand-800 hover:underline text-[10px] font-medium"
            >
              Cambiar
            </button>
            {onQuitar && (
              <button
                type="button"
                onClick={onQuitar}
                className="text-red-500 hover:text-red-700 hover:underline text-[10px]"
                title="Quitar producto de esta actividad y de Indicadores y evaluación"
              >
                Quitar
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!productoActual && !editando) {
    return (
      <div className="mt-1 flex items-center gap-2 text-xs py-0.5">
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-brand-600 hover:underline"
              title="Seleccionar del catálogo o escribir producto de aprendizaje"
            >
              📦 <span className="font-medium text-slate-700">+ Definir producto de aprendizaje</span>
            </button>
            <span className="text-slate-300">·</span>
            {ia.habilitada && (
              <button
                type="button"
                onClick={() => mut.mutate()}
                disabled={!textoOrigen.trim() || mut.isPending}
                title={textoOrigen.trim() ? 'Sugerir o crear producto de aprendizaje con IA' : 'Escribe primero la actividad'}
                className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 hover:underline disabled:opacity-40"
              >
                🪄 {mut.isPending ? 'Generando…' : 'Crear con IA'}
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mt-1.5 p-2 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs space-y-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="text-amber-500 font-bold text-xs">📦</span>
          <span className="text-[11px] font-semibold text-slate-700">Seleccionar producto de aprendizaje:</span>
        </div>

        <div className="flex items-center gap-2">
          {!disabled && ia.habilitada && (
            <button
              type="button"
              onClick={() => mut.mutate()}
              disabled={!textoOrigen.trim() || mut.isPending}
              title={textoOrigen.trim() ? 'Sugerir o crear producto de aprendizaje con IA' : 'Escribe primero la actividad'}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-900 hover:underline disabled:opacity-40"
            >
              🪄 {mut.isPending ? 'Generando…' : 'Crear con IA'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditando(false)
              setPersonalizado(false)
            }}
            className="text-slate-400 hover:text-slate-600 text-[11px] hover:underline"
          >
            Cerrar ✕
          </button>
        </div>
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <select
            value={PRODUCTOS_APRENDIZAJE_CATALOGO.includes(productoActual ?? '') ? (productoActual ?? '') : (personalizado ? '__custom__' : '')}
            onChange={e => {
              if (e.target.value === '__custom__') {
                setPersonalizado(true)
              } else if (e.target.value) {
                setPersonalizado(false)
                manejarSeleccion(e.target.value)
              }
            }}
            className="text-[11px] border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 max-w-[210px] focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Seleccionar del catálogo…</option>
            {PRODUCTOS_APRENDIZAJE_CATALOGO.map(prod => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
            <option value="__custom__">✏️ Escribir otro producto…</option>
          </select>

          {personalizado && (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={textoPersonalizado}
                onChange={e => setTextoPersonalizado(e.target.value)}
                placeholder="Nombre del producto"
                className="text-[11px] border border-slate-300 rounded px-2 py-1 bg-white w-44 focus:outline-none focus:ring-1 focus:ring-brand-500"
                onKeyDown={e => {
                  if (e.key === 'Enter' && textoPersonalizado.trim()) {
                    e.preventDefault()
                    manejarSeleccion(textoPersonalizado.trim())
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (textoPersonalizado.trim()) {
                    manejarSeleccion(textoPersonalizado.trim())
                  }
                }}
                className="px-2 py-1 bg-brand-600 text-white rounded text-[10px] font-medium hover:bg-brand-700"
              >
                Asignar
              </button>
              <button
                type="button"
                onClick={() => setPersonalizado(false)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                title="Cancelar"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            {['Mapa conceptual', 'Reporte de práctica', 'Banco de ejercicios', 'Código fuente'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => manejarSeleccion(p)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  productoActual === p
                    ? 'bg-brand-600 text-white border-brand-600 font-medium'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Botón "Sugerir evidencia de aprendizaje" — toma la actividad de enseñanza y/o aprendizaje
 * de una fila y le pide a la IA un entregable concreto (la evidencia). Al aceptarla,
 * `onAgregar` la agrega a la lista de "Evidencias de aprendizaje" de Indicadores y
 * evaluación Y la integra en la redacción de la actividad de aprendizaje. */
export function SugerirEvidenciaAprendizaje({ ensenanza, aprendizaje, contexto, onAgregar, disabled }: {
  ensenanza: string
  aprendizaje: string
  contexto?: string
  onAgregar: (evidencia: string) => void
  disabled?: boolean
}) {
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [mostrandoFallback, setMostrandoFallback] = useState(false)
  const textoOrigen = [richTextAPlano(ensenanza), richTextAPlano(aprendizaje)].filter(Boolean).join(' / ')

  const ia = useIa()

  const mut = useMutation({
    mutationFn: () => ia.mejorar(textoOrigen, 'sugerir_evidencia', contexto),
    onSuccess: (r) => {
      setSugerencias(prev => [...prev, r.sugerencia])
      setMostrandoFallback(false)
    },
    onError: () => {
      const heuristicas = inferirEvidenciasHeuristicas(textoOrigen)
      setSugerencias(heuristicas)
      setMostrandoFallback(true)
    },
  })

  if (sugerencias.length > 0) {
    return (
      <PanelSugerenciasIA
        titulo={mostrandoFallback ? "Productos de aprendizaje sugeridos" : "Evidencia de aprendizaje sugerida"}
        sugerencias={sugerencias}
        etiquetaAccion="+ Integrar en la actividad y agregar a Evidencias"
        onUsar={s => { onAgregar(s); setSugerencias([]) }}
        onQuitar={i => setSugerencias(prev => prev.filter((_, j) => j !== i))}
        onPedirOtra={() => mut.mutate()}
        pidiendoOtra={mut.isPending}
        error={mostrandoFallback ? undefined : mut.error}
      />
    )
  }

  // Desactivada por el superadministrador para esta planeación.
  if (!ia.habilitada) return null

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={disabled || !textoOrigen.trim() || mut.isPending}
      title={textoOrigen.trim() ? 'Sugerir una evidencia de aprendizaje a partir de esta actividad, y agregarla a Indicadores y evaluación' : 'Escribe primero alguna de las dos actividades'}
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 disabled:no-underline"
    >
      📄 {mut.isPending ? 'Pensando…' : 'Sugerir evidencia de aprendizaje'}
      {mut.isError && !mostrandoFallback && <span className="text-red-500 ml-1">— {mutationError(mut.error)}</span>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Selector e Instrumento de Evaluación Formativa con IA y Modal de Diseño
// ---------------------------------------------------------------------------

export function SelectorInstrumentoEvaluacion({
  valor,
  evidencia,
  contexto,
  disabled,
  smallInputCls = 'w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500',
  onChange,
  onAbrirModalDiseno,
}: {
  valor: string
  evidencia: string
  contexto?: string
  disabled?: boolean
  smallInputCls?: string
  onChange: (nuevoTexto: string) => void
  onAbrirModalDiseno?: () => void
}) {
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [mostrandoFallback, setMostrandoFallback] = useState(false)
  const textoOrigen = evidencia.trim()

  const ia = useIa()

  const mut = useMutation({
    mutationFn: () => ia.mejorar(textoOrigen, 'sugerir_instrumento', contexto),
    onSuccess: (r) => {
      setSugerencias(prev => [...prev, r.sugerencia])
      setMostrandoFallback(false)
    },
    onError: () => {
      const sugerenciaHeuristica = inferirInstrumentoParaEvidencia(textoOrigen).descripcion
      setSugerencias([sugerenciaHeuristica])
      setMostrandoFallback(true)
    },
  })

  const handleSeleccionarCatalogo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value as TipoInstrumentoEvaluacion
    if (!tipo) return
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === tipo)
    if (def) {
      const desc = def.generarDescripcion(evidencia)
      onChange(desc)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder="Rúbrica de evaluación, lista de cotejo con criterios…"
          className={smallInputCls}
          disabled={disabled}
        />
      </div>

      {sugerencias.length > 0 && (
        <PanelSugerenciasIA
          titulo={mostrandoFallback ? "Instrumento sugerido para esta evidencia" : "Sugerencia de instrumento de evaluación (IA)"}
          sugerencias={sugerencias}
          etiquetaAccion="Usar esta descripción"
          onUsar={s => { onChange(s); setSugerencias([]) }}
          onQuitar={i => setSugerencias(prev => prev.filter((_, j) => j !== i))}
          onPedirOtra={() => mut.mutate()}
          pidiendoOtra={mut.isPending}
          error={mostrandoFallback ? undefined : mut.error}
        />
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {/* Dropdown de catálogo estándar */}
          <select
            onChange={handleSeleccionarCatalogo}
            defaultValue=""
            title="Seleccionar un instrumento de evaluación estándar"
            className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="" disabled>📐 Instrumento...</option>
            {CATALOGO_INSTRUMENTOS_EVALUACION.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.icono} {inst.nombre}
              </option>
            ))}
          </select>

          {/* Botón Sugerir con IA */}
          {ia.habilitada && (
            <button
              type="button"
              onClick={() => mut.mutate()}
              disabled={!textoOrigen || mut.isPending}
              title={textoOrigen ? 'Sugerir el instrumento de evaluación más adecuado y sus criterios clave con IA' : 'Escribe primero el nombre de la evidencia'}
              className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 disabled:no-underline font-medium"
            >
              🪄 {mut.isPending ? 'Analizando…' : 'Sugerir con IA'}
            </button>
          )}

          {/* Botón Diseñar / Ver instrumento completo en modal */}
          {onAbrirModalDiseno && (
            <button
              type="button"
              onClick={onAbrirModalDiseno}
              title="Abrir ventana modal para diseñar, editar criterios, ver rúbrica completa o imprimir"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-medium ml-auto"
            >
              👁️ Ver / Diseñar instrumento
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Modal completo para diseñar, editar criterios, ver tabla de niveles de desempeño,
 * copiar al portapapeles o imprimir el instrumento de evaluación formativa.
 */
export function ModalInstrumentoEvaluacion({
  abierto,
  evidencia,
  ponderacion,
  competencia,
  actividadAprendizaje,
  valorInicial,
  onCerrar,
  onAplicar,
}: {
  abierto: boolean
  evidencia: string
  ponderacion?: number | null
  competencia?: string
  actividadAprendizaje?: string
  valorInicial?: string
  onCerrar: () => void
  onAplicar: (descripcion: string) => void
}) {
  const [tipo, setTipo] = useState<TipoInstrumentoEvaluacion>(() => {
    return inferirInstrumentoParaEvidencia(evidencia).tipo
  })

  const [descripcion, setDescripcion] = useState(valorInicial || '')
  const [instrumento, setInstrumento] = useState<InstrumentoEvaluacionDetallado>(() => {
    return generarEstructuraInstrumentoCompleto(evidencia, inferirInstrumentoParaEvidencia(evidencia).tipo, ponderacion, competencia, actividadAprendizaje)
  })

  const [vista, setVista] = useState<'tabla' | 'markdown'>('tabla')
  const [copiado, setCopiado] = useState(false)

  // Sincronizar cuando cambia el tipo de instrumento
  const cambiarTipo = (nuevoTipo: TipoInstrumentoEvaluacion) => {
    setTipo(nuevoTipo)
    const nuevoInst = generarEstructuraInstrumentoCompleto(evidencia, nuevoTipo, ponderacion, competencia, actividadAprendizaje)
    setInstrumento(nuevoInst)
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === nuevoTipo)
    if (def) {
      setDescripcion(def.generarDescripcion(evidencia))
    }
  }

  // Agregar un nuevo criterio personalizado al diseño
  const agregarCriterio = () => {
    setInstrumento(prev => {
      const nuevoId = `c_${Date.now()}`
      const numExistentes = prev.criterios.length
      const esRubrica = prev.tipo === 'rubrica' || prev.tipo === 'matriz_valoracion' || prev.tipo === 'escala_estimativa'
      
      const nuevoCriterio: CriterioInstrumento = {
        id: nuevoId,
        nombre: `Nuevo Criterio ${numExistentes + 1}`,
        descripcion: `Describir el aspecto o requisito observable a evaluar en "${evidencia}".`,
        ponderacion: 10,
        cumple: true,
        descriptores: esRubrica ? {
          excelente: 'Demuestra cumplimiento sobresaliente con este criterio.',
          notable: 'Cumple de manera adecuada con casi todos los aspectos.',
          bueno: 'Cumple de forma básica con algunas inconsistencias menores.',
          suficiente: 'Cumple con lo mínimo indispensable.',
          insuficiente: 'No cumple con este criterio.',
        } : undefined
      }

      return {
        ...prev,
        criterios: [...prev.criterios, nuevoCriterio]
      }
    })
  }

  // Eliminar un criterio del diseño
  const quitarCriterio = (cIdx: number) => {
    setInstrumento(prev => {
      if (prev.criterios.length <= 1) return prev
      return {
        ...prev,
        criterios: prev.criterios.filter((_, i) => i !== cIdx)
      }
    })
  }

  // Distribuir % equitativamente entre los criterios
  const equilibrarPorcentajes = () => {
    setInstrumento(prev => {
      const count = prev.criterios.length
      if (count === 0) return prev
      const base = Math.floor(100 / count)
      const residuo = 100 % count
      const nuevos = prev.criterios.map((c, idx) => ({
        ...c,
        ponderacion: base + (idx === 0 ? residuo : 0)
      }))
      return { ...prev, criterios: nuevos }
    })
  }

  // Mutación para generar con IA completamente alineado
  const ia = useIa()
  const mutIa = useMutation({
    mutationFn: () => ia.mejorar(
      `Evidencia: ${evidencia}\n` +
      `Competencia del Tema: ${competencia ?? 'General'}\n` +
      `Actividad de aprendizaje del estudiante: ${actividadAprendizaje ?? 'Sin especificar'}\n` +
      `Tipo de instrumento: ${tipo}\n` +
      `Ponderación: ${ponderacion ?? 0}%`,
      'generar_instrumento',
      `${competencia ?? ''} | Actividad: ${actividadAprendizaje ?? ''}`
    ),
    onSuccess: (r) => {
      if (r.sugerencia) {
        setVista('markdown')
      }
    },
  })

  // Suma total actual de los criterios
  const sumaCriterios = useMemo(() => {
    return instrumento.criterios.reduce((acc, c) => acc + (c.ponderacion || 0), 0)
  }, [instrumento.criterios])

  // Generar texto Markdown completo para copiar / exportar
  const textoMarkdown = useMemo(() => {
    const lineas: string[] = []
    lineas.push(`# ${instrumento.nombre.toUpperCase()}`)
    lineas.push(`**Evidencia de Aprendizaje:** ${instrumento.evidencia}`)
    if (instrumento.ponderacion != null) lineas.push(`**Ponderación:** ${instrumento.ponderacion}%`)
    if (instrumento.competencia) lineas.push(`**Competencia a evaluar:** ${instrumento.competencia}`)
    if (actividadAprendizaje) lineas.push(`**Actividad de aprendizaje asociada:** ${actividadAprendizaje}`)
    lineas.push(`\n**Descripción / Justificación:**\n${descripcion || instrumento.nombre}`)
    lineas.push(`\n**Instrucciones para el estudiante:**\n${instrumento.instrucciones}`)
    lineas.push('\n---\n')

    if (instrumento.tipo === 'lista_cotejo') {
      lineas.push('### Lista de Cotejo de Verificación')
      lineas.push('| No. | Criterio / Indicador observable | Puntos | Cumple (Sí/No) | Observaciones |')
      lineas.push('|---|---|:---:|:---:|---|')
      instrumento.criterios.forEach((c, idx) => {
        lineas.push(`| ${idx + 1} | **${c.nombre}**: ${c.descripcion} | ${c.ponderacion}% | [  ] | |`)
      })
    } else if (instrumento.tipo === 'guia_observacion') {
      lineas.push('### Guía de Observación de Desempeño')
      lineas.push('| No. | Indicador procedimental / actitudinal | Ponderación | Nivel de Ejecución | Observaciones |')
      lineas.push('|---|---|:---:|:---:|---|')
      instrumento.criterios.forEach((c, idx) => {
        lineas.push(`| ${idx + 1} | **${c.nombre}**: ${c.descripcion} | ${c.ponderacion}% | Excelente / Bueno / Regular / Deficiente | |`)
      })
    } else {
      lineas.push('### Rúbrica Analítica de Evaluación')
      lineas.push('| Criterio (% Ponderación) | Excelente (95-100%) | Notable (85-94%) | Bueno (75-84%) | Suficiente (70-74%) | Insuficiente (<70%) |')
      lineas.push('|---|---|---|---|---|---|')
      instrumento.criterios.forEach((c) => {
        lineas.push(`| **${c.nombre}** (${c.ponderacion}%)<br>_${c.descripcion}_ | ${c.descriptores?.excelente ?? ''} | ${c.descriptores?.notable ?? ''} | ${c.descriptores?.bueno ?? ''} | ${c.descriptores?.suficiente ?? ''} | ${c.descriptores?.insuficiente ?? ''} |`)
      })
    }

    lineas.push('\n### Retroalimentación Docente:')
    lineas.push('_________________________________________________________________________________\n')
    lineas.push('**Calificación final obtenida:** ________ / 100')

    return lineas.join('\n')
  }, [instrumento, descripcion, actividadAprendizaje])

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(textoMarkdown)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // fallback
    }
  }

  const imprimirInstrumento = () => {
    window.print()
  }

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onCerrar}
      onKeyDown={e => { if (e.key === 'Escape') onCerrar() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg border border-white/20 shadow-inner">
              📐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg">Diseño de Instrumento de Evaluación</h2>
                {ponderacion != null && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                    {ponderacion}% de la unidad
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Evidencia:</span>
                <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">{evidencia || 'Sin definir'}</span>
                {actividadAprendizaje && (
                  <span className="text-[11px] text-emerald-300 truncate max-w-md" title={actividadAprendizaje}>
                    · Actividad: {actividadAprendizaje}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 text-xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Barra superior de herramientas y selección de tipo */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Tipo de instrumento:</span>
            {CATALOGO_INSTRUMENTOS_EVALUACION.map(inst => {
              const activo = tipo === inst.id
              return (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => cambiarTipo(inst.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activo
                      ? 'bg-brand-600 text-white shadow-sm ring-2 ring-sky-400/40'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{inst.icono}</span>
                  <span>{inst.nombre}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVista(v => v === 'tabla' ? 'markdown' : 'tabla')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1"
            >
              {vista === 'tabla' ? '📝 Ver en Markdown' : '📊 Ver en Tabla'}
            </button>
            {ia.habilitada && (
              <button
                type="button"
                onClick={() => mutIa.mutate()}
                disabled={mutIa.isPending}
                className="px-3 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-1 disabled:opacity-50"
              >
                🪄 {mutIa.isPending ? 'Generando con IA…' : 'Regenerar con IA'}
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo con contenido interactivo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Campo de descripción / justificación de la planeación */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span>📋 Descripción y Justificación para la Planeación</span>
                <span className="text-[10px] font-normal text-emerald-700">(Este texto se inserta en "Evaluación formativa de la competencia")</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === tipo)
                  if (def) setDescripcion(def.generarDescripcion(evidencia))
                }}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-medium"
              >
                Restablecer sugerencia
              </button>
            </div>
            <textarea
              rows={2}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="w-full text-xs rounded-lg border border-emerald-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              placeholder="Ej. Rúbrica de evaluación con indicadores para evaluar calidad de la información, estructura, conectores y legibilidad en el mapa conceptual."
            />
          </div>

          {/* Vista Tabla Interactiva */}
          {vista === 'tabla' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Instrucciones para la aplicación:</p>
                <input
                  value={instrumento.instrucciones}
                  onChange={e => setInstrumento(prev => ({ ...prev, instrucciones: e.target.value }))}
                  className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Matriz de criterios editables con controles de agregar/eliminar/equilibrar */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-slate-100 to-sky-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Criterios de Evaluación y Descriptores
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                      sumaCriterios === 100 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}>
                      Suma: {sumaCriterios}%
                    </span>
                    <button
                      type="button"
                      onClick={equilibrarPorcentajes}
                      title="Distribuir % equitativamente entre los criterios para sumar 100%"
                      className="text-xs font-medium text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded-md hover:bg-slate-50 shadow-xs"
                    >
                      ⚖️ Distribuir %
                    </button>
                    <button
                      type="button"
                      onClick={agregarCriterio}
                      className="text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md hover:bg-emerald-200 shadow-xs"
                    >
                      + Agregar criterio
                    </button>
                  </div>
                </div>

                {tipo === 'rubrica' || tipo === 'matriz_valoracion' || tipo === 'escala_estimativa' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
                          <th className="p-2.5 w-44 font-semibold">Criterio</th>
                          <th className="p-2 w-16 text-center font-semibold">%</th>
                          <th className="p-2.5 font-semibold text-emerald-800 bg-emerald-50/50">Excelente (95-100%)</th>
                          <th className="p-2.5 font-semibold text-sky-800 bg-sky-50/50">Notable (85-94%)</th>
                          <th className="p-2.5 font-semibold text-brand-800 bg-brand-50/50">Bueno (75-84%)</th>
                          <th className="p-2.5 font-semibold text-amber-800 bg-amber-50/50">Suficiente (70-74%)</th>
                          <th className="p-2.5 font-semibold text-red-800 bg-red-50/50">Insuficiente (&lt;70%)</th>
                          <th className="p-2 w-10 text-center font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {instrumento.criterios.map((c, cIdx) => (
                          <tr key={c.id || cIdx} className="align-top hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <input
                                value={c.nombre}
                                onChange={e => {
                                  const val = e.target.value
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, nombre: val } : item),
                                  }))
                                }}
                                className="w-full font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none mb-1 bg-transparent"
                              />
                              <textarea
                                rows={2}
                                value={c.descripcion}
                                onChange={e => {
                                  const val = e.target.value
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, descripcion: val } : item),
                                  }))
                                }}
                                className="w-full text-[11px] text-slate-500 border border-slate-200 rounded p-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="p-2 text-center border-l border-slate-100">
                              <input
                                type="number"
                                value={c.ponderacion}
                                onChange={e => {
                                  const val = Number(e.target.value)
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, ponderacion: val } : item),
                                  }))
                                }}
                                className="w-12 text-center font-bold text-slate-700 border border-slate-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            {(['excelente', 'notable', 'bueno', 'suficiente', 'insuficiente'] as const).map(nivel => (
                              <td key={nivel} className="p-2 border-l border-slate-100">
                                <textarea
                                  rows={3}
                                  value={c.descriptores?.[nivel] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value
                                    setInstrumento(prev => ({
                                      ...prev,
                                      criterios: prev.criterios.map((item, i) => i === cIdx ? {
                                        ...item,
                                        descriptores: { ...item.descriptores, [nivel]: val } as any,
                                      } : item),
                                    }))
                                  }}
                                  className="w-full text-[11px] text-slate-600 border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-center border-l border-slate-100">
                              <button
                                type="button"
                                onClick={() => quitarCriterio(cIdx)}
                                title="Eliminar criterio"
                                disabled={instrumento.criterios.length <= 1}
                                className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-30"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
                          <th className="p-2.5 w-12 text-center">No.</th>
                          <th className="p-2.5 font-semibold">Criterio / Requisito observable</th>
                          <th className="p-2 w-20 text-center font-semibold">Puntos (%)</th>
                          <th className="p-2.5 w-32 text-center font-semibold">Verificación</th>
                          <th className="p-2.5 font-semibold">Observaciones</th>
                          <th className="p-2 w-10 text-center font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {instrumento.criterios.map((c, cIdx) => (
                          <tr key={c.id || cIdx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 text-center font-bold text-slate-400">{cIdx + 1}</td>
                            <td className="p-2.5">
                              <input
                                value={c.nombre}
                                onChange={e => {
                                  const val = e.target.value
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, nombre: val } : item),
                                  }))
                                }}
                                className="w-full font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none mb-1 bg-transparent"
                              />
                              <input
                                value={c.descripcion}
                                onChange={e => {
                                  const val = e.target.value
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, descripcion: val } : item),
                                  }))
                                }}
                                className="w-full text-[11px] text-slate-500 border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="p-2 text-center border-l border-slate-100">
                              <input
                                type="number"
                                value={c.ponderacion}
                                onChange={e => {
                                  const val = Number(e.target.value)
                                  setInstrumento(prev => ({
                                    ...prev,
                                    criterios: prev.criterios.map((item, i) => i === cIdx ? { ...item, ponderacion: val } : item),
                                  }))
                                }}
                                className="w-12 text-center font-bold text-slate-700 border border-slate-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="p-2.5 text-center border-l border-slate-100">
                              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-medium text-[11px] border border-slate-200">
                                [  ] Cumple &nbsp; [  ] No cumple
                              </span>
                            </td>
                            <td className="p-2.5 border-l border-slate-100">
                              <input
                                placeholder="Notas de retroalimentación…"
                                className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="p-2 text-center border-l border-slate-100">
                              <button
                                type="button"
                                onClick={() => quitarCriterio(cIdx)}
                                title="Eliminar criterio"
                                disabled={instrumento.criterios.length <= 1}
                                className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-30"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vista Texto / Markdown */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Formato de texto enriquecido / Markdown para exportar a procesadores de texto o plataformas:</span>
                <button
                  type="button"
                  onClick={copiarAlPortapapeles}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  {copiado ? '✓ ¡Copiado!' : '📋 Copiar todo'}
                </button>
              </div>
              <textarea
                rows={14}
                readOnly
                value={textoMarkdown}
                className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 shadow-inner focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Pie de acción del modal */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copiarAlPortapapeles}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
            >
              {copiado ? '✓ ¡Copiado!' : '📋 Copiar formato'}
            </button>
            <button
              type="button"
              onClick={imprimirInstrumento}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
            >
              🖨️ Imprimir
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-white transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onAplicar(descripcion)
                onCerrar()
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5"
            >
              💾 Aplicar a la planeación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal Avanzado de Fuentes de Información (ISBN, DOI, ISSN, URL y Manual)
// ---------------------------------------------------------------------------

export const TIPOS_FUENTE_CATALOGO: { value: TipoFuente; label: string; icono: string; placeholder: string }[] = [
  { value: 'impreso', label: 'Libro / Impreso', icono: '📚', placeholder: 'Ej. Fundamentos de Sistemas Operativos' },
  { value: 'articulo', label: 'Artículo científico / Revista', icono: '📄', placeholder: 'Ej. An Overview of Microservices Architecture' },
  { value: 'digital', label: 'Digital / E-book / Repositorio', icono: '💾', placeholder: 'Ej. Guía de Arquitectura de Software' },
  { value: 'sitio_web', label: 'Sitio web / Recurso en línea', icono: '🌐', placeholder: 'Ej. Documentación Oficial de React' },
]

export function ModalFuenteInformacion({
  abierto,
  fuenteInicial,
  esEdicion,
  modoInicial = 'individual',
  todasLasFuentes = [],
  unidadesDisponibles = [],
  unidadActualIdx = 0,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean
  fuenteInicial: FuenteInformacion
  esEdicion: boolean
  modoInicial?: 'individual' | 'masivo' | 'reutilizar'
  todasLasFuentes?: FuenteInformacion[]
  unidadesDisponibles?: Array<{ idx: number; numero: number; nombre: string; fuentesCount?: number }>
  unidadActualIdx?: number
  onCerrar: () => void
  onGuardar: (fuente: FuenteInformacion | FuenteInformacion[], unidadesObjetivo?: number[]) => void
}) {
  const [modo, setModo] = useState<'individual' | 'masivo' | 'reutilizar'>(modoInicial)
  const [draft, setDraft] = useState<FuenteInformacion>(fuenteInicial)
  const [queryBusqueda, setQueryBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [exitoBusqueda, setExitoBusqueda] = useState<string | null>(null)
  const [alternativas, setAlternativas] = useState<Array<{ fuente: FuenteInformacion; descripcionCorta: string }>>([])

  // Estado para carga masiva / directa por texto plano
  const [textoMasivo, setTextoMasivo] = useState('')
  const [fuentesMasivas, setFuentesMasivas] = useState<FuenteInformacion[]>([])

  // Estado para reutilización de fuentes registradas en la asignatura
  const [fuentesSeleccionadasReuso, setFuentesSeleccionadasReuso] = useState<FuenteInformacion[]>([])
  const [filtroReuso, setFiltroReuso] = useState('')
  const [unidadesObjetivo, setUnidadesObjetivo] = useState<number[]>([unidadActualIdx])

  // Reiniciar estado cuando se abre el modal
  useEffect(() => {
    if (abierto) {
      setDraft(fuenteInicial)
      setQueryBusqueda('')
      setErrorBusqueda(null)
      setExitoBusqueda(null)
      setAlternativas([])
      setModo(modoInicial)
      setTextoMasivo('')
      setFuentesMasivas([])
      setFuentesSeleccionadasReuso([])
      setFiltroReuso('')
      setUnidadesObjetivo([unidadActualIdx])
    }
  }, [abierto, fuenteInicial, modoInicial, unidadActualIdx])

  // Actualizar parsing en tiempo real al escribir en modo masivo
  useEffect(() => {
    if (modo === 'masivo') {
      const parsed = parseCitasDirectas(textoMasivo)
      setFuentesMasivas(parsed)
    }
  }, [textoMasivo, modo])

  const EJEMPLO_FUENTES_DIRECTAS = `1. Taylor David. Object Orient informations systems, planning and implementations. Canada: Wiley. 1992.
2. Larman Craig. UML y patrones introducción al análisis y diseño orientado a objetos. México: Pretince Hall. 1999.
3. Winblad, Ann L. Edwards, Samuel R. Software orientado a objetos. USA: Addison. Wesley/ Díaz Santos. 1993.
4. Fco. Javier Ceballos. Java 2 Curso de Programación. Alfaomega.
5. Agustín Froufe. Java 2 Manual de usuario y tutorial. Alfaomega.
6. Laura Lemay, Rogers Cadenhead. Aprendiendo JAVA 2 en 21 días. Prentice Hall.
7. Herbert Schildt. Fundamentos de Programación en Java 2. McGrawHil.
8. J Deitel y Deitel. Como programar en Java. Prentice Hall.
9. Stephen R. Davis. Aprenda Java Ya. McGrawHill.
10. Kris Jamsa Ph D. ¡Java Ahora!. McGrawHill.
11. Francisco Charte Ojeda. Visual C# .NET. ANAYA MULTIMEDIA
12. Kingsley-Hughes, Kathie; Kingsley-Hughes, Adrian. C# 2005. ANAYAMULTIMEDIA`

  // Detección en vivo del tipo de identificador conforme escribe el docente
  const tipoDetectado = useMemo<TipoIdentificadorBibliografico>(() => {
    return detectarTipoIdentificador(queryBusqueda)
  }, [queryBusqueda])

  const badgeTipo = useMemo(() => {
    if (!queryBusqueda.trim()) return null
    switch (tipoDetectado) {
      case 'doi':
        return { label: 'DOI de Artículo', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icono: '📄' }
      case 'isbn':
        return { label: 'ISBN de Libro', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icono: '🔢' }
      case 'issn':
        return { label: 'ISSN de Revista', color: 'bg-purple-50 text-purple-700 border-purple-200', icono: '📰' }
      case 'url':
        return { label: 'Enlace Web', color: 'bg-brand-50 text-brand-700 border-brand-200', icono: '🌐' }
      case 'texto':
      default:
        return { label: 'Búsqueda / Cita Directa', color: 'bg-amber-50 text-amber-700 border-amber-200', icono: '🔍' }
    }
  }, [queryBusqueda, tipoDetectado])

  const ejecutarBusqueda = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = queryBusqueda.trim()
    if (!q) return

    setBuscando(true)
    setErrorBusqueda(null)
    setExitoBusqueda(null)
    setAlternativas([])

    try {
      const res = await resolverFuentePorIdentificador(q)
      setDraft(res.fuente)
      setAlternativas(res.alternativas || [])

      const fuentesDesc: Record<TipoIdentificadorBibliografico, string> = {
        doi: 'CrossRef (DOI)',
        isbn: 'Google Books / Open Library (ISBN)',
        issn: 'CrossRef (ISSN)',
        url: 'Enlace Web',
        texto: 'Formato Cita Directa / Catálogo',
      }
      setExitoBusqueda(`Datos cargados exitosamente desde ${fuentesDesc[res.tipoDetectado] || 'el catálogo'}. Revisa y ajusta los campos si es necesario.`)
    } catch (err: any) {
      setErrorBusqueda(err.message || 'No se pudo obtener información del recurso. Puedes capturarlo manualmente a continuación.')
    } finally {
      setBuscando(false)
    }
  }

  const handleSeleccionarAlternativa = (f: FuenteInformacion) => {
    setDraft(f)
    setAlternativas([])
    setExitoBusqueda('Se aplicó la edición seleccionada. Revisa los datos en el formulario.')
  }

  const handleGuardar = () => {
    if (modo === 'reutilizar') {
      if (fuentesSeleccionadasReuso.length === 0) {
        setErrorBusqueda('Selecciona al menos una fuente bibliográfica para reutilizar.')
        return
      }
      onGuardar(fuentesSeleccionadasReuso, unidadesObjetivo)
      onCerrar()
      return
    }

    if (modo === 'masivo') {
      if (fuentesMasivas.length === 0) {
        setErrorBusqueda('Pega al menos una referencia bibliográfica válida en el recuadro.')
        return
      }
      onGuardar(fuentesMasivas, unidadesObjetivo)
      onCerrar()
      return
    }

    if (!draft.titulo.trim()) {
      setErrorBusqueda('El título de la fuente es obligatorio.')
      return
    }
    if (!draft.tipo) {
      setErrorBusqueda('Selecciona el tipo de fuente de información.')
      return
    }
    onGuardar(draft, unidadesObjetivo)
    onCerrar()
  }

  if (!abierto) return null

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onCerrar}
      onKeyDown={e => { if (e.key === 'Escape') onCerrar() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg border border-white/20 shadow-inner">
              📚
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                {esEdicion ? 'Editar Fuente de Información' : 'Fuente de Información de la Asignatura'}
              </h2>
              <p className="text-xs text-slate-300">
                Búsqueda automática, citas directas, pegado en bloque o reutilización entre temas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 text-xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Selector de Modo (Individual vs Pegado Masivo vs Reutilizar) */}
        {!esEdicion && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 shrink-0 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setModo('individual')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 shrink-0 transition-all ${
                modo === 'individual'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>🔍</span>
              <span>Captura Individual / Búsqueda</span>
            </button>
            <button
              type="button"
              onClick={() => setModo('masivo')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 shrink-0 transition-all ${
                modo === 'masivo'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>📋</span>
              <span>Carga Directa en Bloque</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">Rápido</span>
            </button>
            <button
              type="button"
              onClick={() => setModo('reutilizar')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 shrink-0 transition-all ${
                modo === 'reutilizar'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>📚</span>
              <span>Reutilizar Bibliografía de la Asignatura</span>
              {todasLasFuentes.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                  {todasLasFuentes.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {modo === 'reutilizar' ? (
            /* Modo Reutilizar Fuentes Existentes de la Asignatura */
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-1 text-xs text-indigo-900">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>📚 Reutilizar Bibliografía Existente</span>
                  </span>
                  <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    {todasLasFuentes.length} disponible(s)
                  </span>
                </div>
                <p className="text-slate-600">
                  Selecciona una o más fuentes que ya hayas capturado anteriormente en la asignatura para asociarlas a esta o múltiples unidades.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filtroReuso}
                  onChange={e => setFiltroReuso(e.target.value)}
                  placeholder="Buscar por título, autor o editorial…"
                  className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {todasLasFuentes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (fuentesSeleccionadasReuso.length === todasLasFuentes.length) {
                        setFuentesSeleccionadasReuso([])
                      } else {
                        setFuentesSeleccionadasReuso([...todasLasFuentes])
                      }
                    }}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-300 px-3 py-2 rounded-lg shadow-sm hover:bg-indigo-50 transition-all shrink-0"
                  >
                    {fuentesSeleccionadasReuso.length === todasLasFuentes.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                )}
              </div>

              {todasLasFuentes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                  <span className="text-2xl block">📚</span>
                  <p className="font-semibold text-slate-700">Aún no hay fuentes registradas en la asignatura.</p>
                  <p className="text-slate-500 text-[11px]">
                    Cambia al modo <strong className="text-sky-700">Captura Individual</strong> o <strong className="text-sky-700">Carga Directa en Bloque</strong> para registrar las primeras referencias.
                  </p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {todasLasFuentes
                    .filter(f => {
                      if (!filtroReuso.trim()) return true
                      const q = filtroReuso.toLowerCase()
                      return (
                        f.titulo.toLowerCase().includes(q) ||
                        (f.autor && f.autor.toLowerCase().includes(q)) ||
                        (f.editorial && f.editorial.toLowerCase().includes(q))
                      )
                    })
                    .map((f, idx) => {
                      const seleccionada = fuentesSeleccionadasReuso.some(
                        sf => sf.titulo.trim().toLowerCase() === f.titulo.trim().toLowerCase() && (sf.autor || '') === (f.autor || '')
                      )
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (seleccionada) {
                              setFuentesSeleccionadasReuso(prev =>
                                prev.filter(sf => !(sf.titulo.trim().toLowerCase() === f.titulo.trim().toLowerCase() && (sf.autor || '') === (f.autor || '')))
                              )
                            } else {
                              setFuentesSeleccionadasReuso(prev => [...prev, f])
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                            seleccionada
                              ? 'border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-400/40 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={seleccionada}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {f.tipo && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-semibold">
                                  {TIPO_FUENTE_LABEL[f.tipo]}
                                </span>
                              )}
                              {f.autor && <span className="font-semibold text-slate-700">{f.autor}</span>}
                              {f.anio && <span className="text-slate-500">({f.anio})</span>}
                            </div>
                            <p className="font-bold text-slate-900 leading-snug">{f.titulo}</p>
                            <p className="text-[11px] text-slate-500 italic mt-0.5">{citarFuente(f)}</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          ) : modo === 'masivo' ? (
            /* Modo Masivo / Carga Directa */
            <div className="space-y-4">
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-2 text-xs text-sky-900">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>⚡ Pegar Referencias Directas</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTextoMasivo(EJEMPLO_FUENTES_DIRECTAS)}
                    className="text-[11px] text-sky-700 hover:text-sky-900 bg-white border border-sky-300 px-2.5 py-1 rounded-lg shadow-sm hover:bg-sky-100 transition-all font-semibold"
                  >
                    📋 Cargar 12 fuentes del temario (Ejemplo)
                  </button>
                </div>
                <p className="text-slate-600">
                  Pega directamente la lista de fuentes bibliográficas (una por línea). El sistema desglosará automáticamente autor, título, editorial, ciudad y año.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Citas bibliográficas directas (una fuente por línea)
                </label>
                <textarea
                  rows={8}
                  value={textoMasivo}
                  onChange={e => setTextoMasivo(e.target.value)}
                  placeholder={`Ejemplo:\n1. Taylor David. Object Orient informations systems, planning and implementations. Canada: Wiley. 1992.\n2. Larman Craig. UML y patrones introducción al análisis y diseño orientado a objetos. México: Pretince Hall. 1999.`}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-white font-mono leading-relaxed focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-inner"
                />
              </div>

              {/* Vista Previa Desglosada de las Fuentes Procesadas */}
              {fuentesMasivas.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>📚 Vista previa de fuentes procesadas ({fuentesMasivas.length}):</span>
                    <button
                      type="button"
                      onClick={() => setTextoMasivo('')}
                      className="text-[11px] text-red-600 hover:underline font-normal"
                    >
                      Limpiar todas
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {fuentesMasivas.map((f, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-3 shadow-sm">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-500 text-[11px]">#{i + 1}</span>
                            {f.autor && (
                              <span className="px-2 py-0.5 rounded-md bg-brand-100/70 text-brand-900 font-medium text-[11px] truncate max-w-[200px]">
                                👤 {f.autor}
                              </span>
                            )}
                            {f.anio && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100/70 text-purple-900 font-medium text-[11px]">
                                📅 {f.anio}
                              </span>
                            )}
                            {(f.editorial || f.ciudad) && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-900 font-medium text-[11px] truncate max-w-[200px]">
                                🏢 {[f.ciudad, f.editorial].filter(Boolean).join(': ')}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 leading-snug">{f.titulo}</p>
                          <p className="text-[11px] text-slate-500 italic">Cita final: {citarFuente(f)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const lineas = textoMasivo.split(/\r?\n/).filter(Boolean)
                            lineas.splice(i, 1)
                            setTextoMasivo(lineas.join('\n'))
                          }}
                          className="text-slate-400 hover:text-red-600 text-lg leading-none p-1 shrink-0"
                          title="Eliminar de la lista"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo Individual (Búsqueda + Formulario) */
            <>
              {/* Barra de Búsqueda Rápida / Autocompletado */}
              <div className="bg-gradient-to-br from-sky-50/70 via-indigo-50/40 to-slate-50 border border-sky-200/80 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>⚡ Búsqueda y Autocompletado Automático</span>
                  </label>
                  {badgeTipo && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${badgeTipo.color}`}>
                      <span>{badgeTipo.icono}</span>
                      <span>{badgeTipo.label}</span>
                    </span>
                  )}
                </div>

                <form onSubmit={ejecutarBusqueda} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={queryBusqueda}
                      onChange={e => setQueryBusqueda(e.target.value)}
                      placeholder="Pega un ISBN, DOI, URL o cita directa (ej. Taylor David. Object Orient...)"
                      className="w-full text-xs rounded-lg border border-sky-300 pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                    {queryBusqueda && (
                      <button
                        type="button"
                        onClick={() => { setQueryBusqueda(''); setErrorBusqueda(null); setExitoBusqueda(null); setAlternativas([]) }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm leading-none"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={buscando || !queryBusqueda.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    {buscando ? (
                      <>
                        <Loader2 className="animate-spin h-3.5 w-3.5 text-white" aria-hidden="true" />
                        <span>Buscando…</span>
                      </>
                    ) : (
                      <>
                        <span>🔍 Buscar y autollenar</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-600">Ejemplos soportados:</span>
                  <span className="cursor-pointer text-sky-600 hover:underline" onClick={() => setQueryBusqueda('978-0132350884')}>ISBN: 978-0132350884</span>
                  <span className="cursor-pointer text-sky-600 hover:underline" onClick={() => setQueryBusqueda('10.1016/j.procs.2020.03.200')}>DOI: 10.1016/j.procs...</span>
                  <span className="cursor-pointer text-sky-600 hover:underline" onClick={() => setQueryBusqueda('Taylor David. Object Orient informations systems, planning and implementations. Canada: Wiley. 1992.')}>Cita Directa</span>
                  <span className="cursor-pointer text-sky-600 hover:underline" onClick={() => setQueryBusqueda('Sistemas Operativos Silberschatz')}>Título de libro</span>
                </div>

                {/* Mensajes de éxito o error */}
                {exitoBusqueda && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span>✓ {exitoBusqueda}</span>
                    <button type="button" onClick={() => setExitoBusqueda(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">&times;</button>
                  </div>
                )}
                {errorBusqueda && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span>⚠️ {errorBusqueda}</span>
                    <button type="button" onClick={() => setErrorBusqueda(null)} className="text-amber-600 hover:text-amber-900 font-bold ml-2">&times;</button>
                  </div>
                )}

                {/* Ediciones o alternativas sugeridas */}
                {alternativas.length > 0 && (
                  <div className="pt-2 border-t border-sky-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600">Otras ediciones / alternativas encontradas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {alternativas.map((alt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSeleccionarAlternativa(alt.fuente)}
                          className="text-left text-[11px] px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-slate-700 transition-colors"
                        >
                          📖 {alt.descripcionCorta}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vista Previa de la Referencia APA en Vivo */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <span>📖 Vista previa de la referencia bibliográfica (APA)</span>
                  <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                    {TIPO_FUENTE_LABEL[draft.tipo] || 'Tipo no seleccionado'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-800 italic bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner">
                  {citarFuente(draft)}
                </p>
              </div>

              {/* Formulario Manual Detallado */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Detalles del Recurso Bibliográfico
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDraft({ tipo: 'impreso', titulo: '', autor: '', anio: '' })}
                    className="text-[11px] text-slate-500 hover:text-red-600 underline"
                  >
                    Limpiar campos
                  </button>
                </div>

                {/* Selector de Tipo de Fuente */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de fuente *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TIPOS_FUENTE_CATALOGO.map(t => {
                      const activo = draft.tipo === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setDraft(f => ({ ...f, tipo: t.value }))}
                          className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col gap-0.5 ${
                            activo
                              ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-400/30 font-semibold text-sky-900'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="text-base">{t.icono}</span>
                          <span className="truncate">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Campos principales */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-12">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Título de la obra / recurso *</label>
                    <input
                      type="text"
                      value={draft.titulo}
                      onChange={e => setDraft(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Título completo del libro, artículo o página web…"
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Autor(es){draft.tipo === 'sitio_web' ? ' / Organización' : ''}
                    </label>
                    <input
                      type="text"
                      value={draft.autor ?? ''}
                      onChange={e => setDraft(f => ({ ...f, autor: e.target.value }))}
                      placeholder="Ej. Tanenbaum, Andrew S.; Woodhull, Albert S."
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Año de publicación</label>
                    <input
                      type="text"
                      value={draft.anio ?? ''}
                      onChange={e => setDraft(f => ({ ...f, anio: e.target.value }))}
                      placeholder="Ej. 2022"
                      className={inputCls}
                    />
                  </div>

                  {/* Campos para Libros Impresos */}
                  {draft.tipo === 'impreso' && (
                    <>
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Editorial</label>
                        <input
                          type="text"
                          value={draft.editorial ?? ''}
                          onChange={e => setDraft(f => ({ ...f, editorial: e.target.value }))}
                          placeholder="Ej. Pearson Educación / McGraw-Hill"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Edición</label>
                        <input
                          type="text"
                          value={draft.edicion ?? ''}
                          onChange={e => setDraft(f => ({ ...f, edicion: e.target.value }))}
                          placeholder="Ej. 4ta. edición"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ciudad / País</label>
                        <input
                          type="text"
                          value={draft.ciudad ?? ''}
                          onChange={e => setDraft(f => ({ ...f, ciudad: e.target.value }))}
                          placeholder="Ej. México, D.F."
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-medium text-slate-600 mb-1">ISBN</label>
                        <input
                          type="text"
                          value={draft.isbn ?? ''}
                          onChange={e => setDraft(f => ({ ...f, isbn: e.target.value }))}
                          placeholder="Ej. 978-607-15-0315-2"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Páginas</label>
                        <input
                          type="text"
                          value={draft.paginas ?? ''}
                          onChange={e => setDraft(f => ({ ...f, paginas: e.target.value }))}
                          placeholder="Ej. 650 pp."
                          className={inputCls}
                        />
                      </div>
                    </>
                  )}

                  {/* Campos para Artículos de Revista / Científicos */}
                  {draft.tipo === 'articulo' && (
                    <>
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la Revista</label>
                        <input
                          type="text"
                          value={draft.revista ?? ''}
                          onChange={e => setDraft(f => ({ ...f, revista: e.target.value }))}
                          placeholder="Ej. IEEE Software / Revista Iberoamericana"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Volumen / Número</label>
                        <input
                          type="text"
                          value={draft.volumen ?? ''}
                          onChange={e => setDraft(f => ({ ...f, volumen: e.target.value }))}
                          placeholder="Ej. 35(2)"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Páginas</label>
                        <input
                          type="text"
                          value={draft.paginas ?? ''}
                          onChange={e => setDraft(f => ({ ...f, paginas: e.target.value }))}
                          placeholder="Ej. 45-58"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-slate-600 mb-1">DOI</label>
                        <input
                          type="text"
                          value={draft.doi ?? ''}
                          onChange={e => setDraft(f => ({ ...f, doi: e.target.value }))}
                          placeholder="Ej. 10.1109/MS.2018.12345"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-slate-600 mb-1">URL del artículo</label>
                        <input
                          type="text"
                          value={draft.url ?? ''}
                          onChange={e => setDraft(f => ({ ...f, url: e.target.value }))}
                          placeholder="https://doi.org/…"
                          className={inputCls}
                        />
                      </div>
                    </>
                  )}

                  {/* Campos para Sitios Web o Recursos Digitales */}
                  {(draft.tipo === 'sitio_web' || draft.tipo === 'digital') && (
                    <>
                      <div className="sm:col-span-12">
                        <label className="block text-xs font-medium text-slate-600 mb-1">URL / Enlace web</label>
                        <input
                          type="text"
                          value={draft.url ?? ''}
                          onChange={e => setDraft(f => ({ ...f, url: e.target.value }))}
                          placeholder="https://ejemplo.com/recurso"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {draft.tipo === 'digital' ? 'Plataforma (Moodle, e-book, repositorio…)' : 'Sitio web / Plataforma'}
                        </label>
                        <input
                          type="text"
                          value={draft.plataforma ?? ''}
                          onChange={e => setDraft(f => ({ ...f, plataforma: e.target.value }))}
                          placeholder="Ej. SciELO, YouTube, GitHub, Moodle Institucional"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de consulta</label>
                        <input
                          type="date"
                          value={draft.fecha_consulta ?? ''}
                          onChange={e => setDraft(f => ({ ...f, fecha_consulta: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Selector de Unidades Destino (Asignar a uno o varios temas) */}
          {unidadesDisponibles.length > 1 && !esEdicion && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📌 Asignar recurso(s) a los siguientes temas/unidades:</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setUnidadesObjetivo(unidadesDisponibles.map(u => u.idx))}
                    className="text-sky-700 hover:text-sky-900 font-semibold hover:underline"
                  >
                    Seleccionar todas ({unidadesDisponibles.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setUnidadesObjetivo([unidadActualIdx])}
                    className="text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Solo unidad actual (#{unidadesDisponibles.find(u => u.idx === unidadActualIdx)?.numero ?? (unidadActualIdx + 1)})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                {unidadesDisponibles.map(u => {
                  const checked = unidadesObjetivo.includes(u.idx)
                  return (
                    <label
                      key={u.idx}
                      className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer transition-all ${
                        checked
                          ? 'bg-white border-sky-400 font-semibold text-sky-950 shadow-sm ring-1 ring-sky-300/50'
                          : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            if (unidadesObjetivo.length > 1) {
                              setUnidadesObjetivo(prev => prev.filter(i => i !== u.idx))
                            }
                          } else {
                            setUnidadesObjetivo(prev => [...prev, u.idx])
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                      />
                      <span className="truncate flex-1">
                        Unidad {u.numero}: <span className="font-normal text-slate-700">{u.nombre || `Tema ${u.numero}`}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            className="px-5 py-2 bg-gradient-to-r from-sky-600 to-brand-700 hover:from-sky-700 hover:to-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>
              {modo === 'reutilizar'
                ? `Agregar ${fuentesSeleccionadasReuso.length} fuente(s) a ${unidadesObjetivo.length} tema(s)`
                : modo === 'masivo'
                ? `Guardar ${fuentesMasivas.length} fuentes en ${unidadesObjetivo.length} tema(s)`
                : (esEdicion ? 'Guardar cambios' : `Guardar fuente en ${unidadesObjetivo.length} tema(s)`)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Vista del contenido completo de una planeación (TecNM-AC-PO-003), usada por los revisores
 * (Desarrollo Académico / Jefatura de Carrera) en vez de depender solo del PDF adjunto. Es de
 * solo lectura por defecto; pasando `editable` + `observaciones`/`onAgregarObservacion`/
 * `onQuitarObservacion` habilita botones "+ Observación aquí" en cada sección/unidad/categoría
 * para que el revisor ancle comentarios exactamente donde el docente debe corregir. */
export function PlaneacionDetalle({ p, editable, observaciones = [], onAgregarObservacion, onQuitarObservacion, puedeEditarDosificacion, onEditarSemanaRealizado, variante = 'sky' }: {
  p: PlaneacionDocente
  editable?: boolean
  observaciones?: ObservacionCampo[]
  onAgregarObservacion?: (obs: Omit<ObservacionCampo, 'id'>) => void
  onQuitarObservacion?: (id: string) => void
  /** Habilita, solo para Desarrollo Académico/admin/superadmin, capturar el avance real
   * (semana_realizado) directamente en la dosificación — el docente ya no puede tocar ese
   * campo desde su editor, así que este es el único lugar donde se registra. */
  puedeEditarDosificacion?: boolean
  onEditarSemanaRealizado?: (unidad: number, index: number, semanaRealizado: number | null) => void
  /** "sky" (por defecto) en edición/confirmación del docente, "amber" en la vista de
   * revisión de Desarrollo Académico/Jefatura — cambia el color de los círculos numerados,
   * el borde de las tarjetas y el encabezado de cada unidad. */
  variante?: VarianteDetalle
}) {
  // La planeación puede traer datos de esquemas anteriores (requisitos de práctica como
  // texto libre en vez de tags, etc.) — se normaliza aquí, igual que en el editor del
  // docente, para que esta vista de solo lectura no truene con datos guardados antes de
  // esos cambios de esquema.
  const competencias = useMemo(
    () => (p.competencias ?? []).map((c, i) => normalizarCompetencia({ ...c, numero: c.numero ?? i + 1 })),
    [p.competencias]
  )
  const semanasConEvaluacion = (p.calendarizacion ?? []).filter(s => s.tipo_evaluacion)
  const sinNada = !p.caracterizacion && !p.intencion_didactica && !p.competencia_asignatura && !competencias.length
    && semanasConEvaluacion.length === 0

  if (sinNada && !editable) {
    return <p className="text-sm text-slate-400">El docente aún no ha capturado contenido estructurado.</p>
  }

  const anchor = (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) => (
    <>
      <AnchorObservaciones
        seccion={seccion} unidad={opts?.unidad} categoria={opts?.categoria}
        editable={editable} observaciones={observaciones}
        onAgregar={onAgregarObservacion} onQuitar={onQuitarObservacion}
      />
      <HiloComentarios planeacionId={p.id} seccion={seccion} unidad={opts?.unidad} categoria={opts?.categoria} />
    </>
  )

  // Marca con borde rojo las tarjetas que ya tienen una observación anclada (de una revisión
  // anterior) — para que salten a la vista en vez de tener que leer todo el documento en
  // busca de comentarios.
  const tieneObs = (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) =>
    observaciones.some(o => o.seccion === seccion
      && (opts?.unidad === undefined ? o.unidad == null : o.unidad === opts.unidad)
      && (opts?.categoria === undefined ? !o.categoria : o.categoria === opts.categoria))

  return (
    <div className="space-y-4">
      {p.caracterizacion && (
        <div>
          <DetalleSection id="seccion-caracterizacion" numero="1" title="Caracterización de la asignatura" variante={variante} destacada={tieneObs('caracterizacion')}><RichTextView html={p.caracterizacion} /></DetalleSection>
          {anchor('caracterizacion')}
        </div>
      )}
      {p.intencion_didactica && (
        <div>
          <DetalleSection id="seccion-intencion" numero="2" title="Intención didáctica" variante={variante} destacada={tieneObs('intencion_didactica')}><RichTextView html={p.intencion_didactica} /></DetalleSection>
          {anchor('intencion_didactica')}
        </div>
      )}
      {p.competencia_asignatura && (
        <div>
          <DetalleSection id="seccion-competencia" numero="3" title="Competencia de la asignatura" variante={variante} destacada={tieneObs('competencia_asignatura')}><RichTextView html={p.competencia_asignatura} /></DetalleSection>
          {anchor('competencia_asignatura')}
        </div>
      )}

      {!!competencias.length && (
        <div id="seccion-especificas" className="scroll-mt-24">
          <SeccionTitulo numero="4" title="Análisis por competencias específicas" variante={variante} />
          <div className="space-y-4">
            {competencias.map((c, i) => {
              const obsUnidad = tieneObs('especifica', { unidad: c.numero }) || tieneObs('dosificacion', { unidad: c.numero })
              return (
              <div key={i} id={`unidad-${c.numero}`} className={`border rounded-xl overflow-hidden shadow-sm scroll-mt-24 ${obsUnidad ? 'border-red-300 shadow-red-100/60' : 'border-slate-200 shadow-slate-200/60'}`}>
                <div className={`bg-gradient-to-r border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 ${obsUnidad ? 'from-red-500 to-red-600' : CLASES_VARIANTE[variante].header}`}>
                  <p className="font-semibold text-white text-sm">
                    Unidad {c.numero} de {competencias.length}{c.nombre_unidad ? ` — ${c.nombre_unidad}` : ''}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {obsUnidad && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white text-red-600">Con observaciones</span>
                    )}
                    {c.porcentaje != null && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CLASES_VARIANTE[variante].badge}`}>
                        {c.porcentaje}% de la materia
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {anchor('especifica', { unidad: c.numero })}
                  {c.descripcion && <Dato label="Competencia específica" tono="sky"><RichTextView html={c.descripcion} /></Dato>}

                  {!!c.actividades?.length && (
                    <Dato label="Actividades de enseñanza y aprendizaje" tono="indigo">
                      <ul className="space-y-1.5">
                        {c.actividades.map((a, j) => (
                          <li key={j} className="border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-sm shadow-sm shadow-slate-100">
                            <span className="font-medium text-slate-500">N{a.numero}</span>
                            {(a.horas_teoricas != null || a.horas_practicas != null) && (
                              <span className="ml-2 text-xs text-slate-400">({a.horas_teoricas ?? 0}h teóricas / {a.horas_practicas ?? 0}h prácticas)</span>
                            )}
                            {a.actividad_ensenanza && <div><span className="text-slate-400">Enseñanza: </span><RichTextView html={a.actividad_ensenanza} className="inline-block align-top" /></div>}
                            {a.actividad_aprendizaje && <div><span className="text-slate-400">Aprendizaje: </span><RichTextView html={a.actividad_aprendizaje} className="inline-block align-top" /></div>}
                          </li>
                        ))}
                      </ul>
                    </Dato>
                  )}

                  {!!c.subtemas?.length && (
                    <Dato label="Temas y subtemas" tono="violet">
                      <ul className="list-disc list-inside space-y-0.5">
                        {c.subtemas.map((s, j) => {
                          const filas = obtenerFilasDeSubtema(s)
                          const tag = filas.length > 0 ? ` (N${filas.join(', N')})` : ''
                          return <li key={j}>{s.texto}{tag ? <span className="text-slate-400 text-xs">{tag}</span> : null}</li>
                        })}
                      </ul>
                    </Dato>
                  )}

                  {!!c.competencias_genericas?.length && (
                    <Dato label="Competencias genéricas" tono="slate">
                      <div className="flex flex-wrap gap-1.5">
                        {c.competencias_genericas.map((g, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{g}</span>
                        ))}
                      </div>
                    </Dato>
                  )}
                  {anchor('especifica', { unidad: c.numero, categoria: 'analisis' })}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {!!c.indicadores_alcance?.length && (
                      <Dato label="Indicadores de alcance" tono="amber">
                        <ul className="list-disc list-inside space-y-0.5">
                          {c.indicadores_alcance.map((ind, j) => (
                            <li key={j}>{ind.letra ? `${ind.letra}. ` : ''}{ind.indicador}{ind.valor != null ? ` (${ind.valor}%)` : ''}</li>
                          ))}
                        </ul>
                      </Dato>
                    )}

                    {c.niveles_desempeno?.some(n => n.indicadores) && (
                      <Dato label="Niveles de desempeño" tono="sky">
                        <ul className="space-y-1">
                          {c.niveles_desempeno.filter(n => n.indicadores).map((n, j) => (
                            <li key={j}><span className="font-medium">{n.nivel}</span> — {n.indicadores}</li>
                          ))}
                        </ul>
                      </Dato>
                    )}
                  </div>

                  {!!c.matriz_evaluacion?.length && (
                    <Dato label="Evidencias de aprendizaje" tono="emerald">
                      <ul className="space-y-1.5">
                        {c.matriz_evaluacion.map((f, j) => (
                          <li key={j} className="border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-sm shadow-sm shadow-slate-100">
                            <span className="font-medium">{f.evidencia}</span>
                            {f.porcentaje != null && <span className="ml-2 text-xs text-slate-400">({f.porcentaje}%)</span>}
                            {!!f.indicadores?.length && <p className="text-xs text-slate-500 mt-0.5">Indicadores: {f.indicadores.join(', ')}</p>}
                            {f.evaluacion_formativa && <p className="text-xs text-slate-500 mt-0.5">{f.evaluacion_formativa}</p>}
                          </li>
                        ))}
                      </ul>
                    </Dato>
                  )}
                  {anchor('especifica', { unidad: c.numero, categoria: 'indicadores' })}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {!!c.fuentes_informacion?.length && (
                      <Dato label="Fuentes" tono="slate">
                        <ul className="list-disc list-inside space-y-0.5">
                          {c.fuentes_informacion.map((f, j) => (
                            <li key={j}>{citarFuente(f)}{f.tipo ? <span className="text-slate-400 text-xs"> ({TIPO_FUENTE_LABEL[f.tipo]})</span> : null}</li>
                          ))}
                        </ul>
                      </Dato>
                    )}
                    {!!c.apoyos_didacticos?.length && (
                      <Dato label="Apoyo didáctico" tono="slate">
                        <div className="flex flex-wrap gap-1.5">
                          {c.apoyos_didacticos.map((a, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{a}</span>
                          ))}
                        </div>
                      </Dato>
                    )}
                  </div>
                  {anchor('especifica', { unidad: c.numero, categoria: 'fuentes' })}
                  {anchor('especifica', { unidad: c.numero, categoria: 'apoyo' })}

                  {!!c.practicas?.length && (
                    <Dato label="Prácticas" tono="rose">
                      <ul className="space-y-1.5">
                        {c.practicas.map((pr, j) => (
                          <li key={j} className="text-sm">
                            <span className="font-medium">{pr.nombre || '—'}</span>
                            {pr.semana != null && <span className="text-slate-400"> — Sem {pr.semana}</span>}
                            {pr.lugar && <span className="text-slate-400"> ({pr.lugar})</span>}
                            {pr.competencia_especifica && pr.competencia_especifica !== c.descripcion && (
                              <div className="text-xs text-slate-500 mt-0.5">Competencia específica: <RichTextView html={pr.competencia_especifica} className="inline-block align-top" /></div>
                            )}
                            {!!pr.requisitos?.length && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {pr.requisitos.map((r, k) => (
                                  <span key={k} className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{r}</span>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Dato>
                  )}
                  {anchor('especifica', { unidad: c.numero, categoria: 'practicas' })}

                  {!!c.dosificacion?.length && (
                    <Dato label="Dosificación" tono="amber">
                      {puedeEditarDosificacion && (
                        <p className="text-[11px] text-slate-400 mb-1.5">Captura aquí la semana en que realmente se impartió cada subtema, al corte.</p>
                      )}
                      <ul className="space-y-1">
                        {c.dosificacion.map((s, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <span className="flex-1">{s.subtema || '—'}</span>
                            {s.semana_inicio != null && s.semana_fin != null && (
                              <span className="text-xs text-slate-400 shrink-0">sem. {s.semana_inicio}-{s.semana_fin}</span>
                            )}
                            {puedeEditarDosificacion ? (
                              <span className="flex items-center gap-1 shrink-0 text-xs">
                                <span className="text-slate-400">realizado sem.</span>
                                <input
                                  key={s.semana_realizado ?? 'vacio'}
                                  type="number" min={1} max={16}
                                  defaultValue={s.semana_realizado ?? ''}
                                  onBlur={e => onEditarSemanaRealizado?.(c.numero, j, e.target.value === '' ? null : Number(e.target.value))}
                                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                  className="w-14 border border-amber-300 bg-amber-50 rounded-md px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </span>
                            ) : (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${s.semana_realizado != null ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {s.semana_realizado != null ? `realizado sem. ${s.semana_realizado}` : 'pendiente'}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Dato>
                  )}
                  {anchor('dosificacion', { unidad: c.numero })}
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {!!competencias.length && (
        <div>
          <DetalleSection id="seccion-calendarizacion" numero="5" title="Calendarización de evaluación" variante={variante} destacada={tieneObs('calendarizacion')}>
            <p className="text-xs text-slate-400 mb-2">
              Generada automáticamente: cada unidad se evalúa la semana siguiente a la última semana dosificada de su
              contenido (una semana de holgura para aplicar la evaluación y cargar calificaciones).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {calendarizacionEvaluaciones(competencias).map(ev => (
                <span key={ev.unidad} className={`text-xs px-2 py-0.5 rounded-full ${ev.semanaEvaluacion != null ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                  Unidad {ev.unidad}{ev.nombreUnidad ? ` — ${ev.nombreUnidad}` : ''}: {ev.semanaEvaluacion != null ? `Sem ${ev.semanaEvaluacion} (${ev.tipo})` : 'sin dosificar'}
                </span>
              ))}
            </div>
          </DetalleSection>
          {anchor('calendarizacion')}
        </div>
      )}
    </div>
  )
}

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50'
export const inputErrCls = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:bg-slate-50'
export const selectCls = inputCls
export const icls = (e?: string) => e ? inputErrCls : inputCls

export function Field({ label, children, full, error }: { label: string; children: React.ReactNode; full?: boolean; error?: string }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIA_LABEL_CORTO: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

/** Editor de horario personalizado por día de la semana (0 días marcados = sin restricción). */
export function HorarioPorDiaEditor({ value, onChange }: {
  value: { dia_semana: string; hora_inicio: string; hora_fin: string }[]
  onChange: (v: { dia_semana: string; hora_inicio: string; hora_fin: string }[]) => void
}) {
  function porDia(dia: string) {
    return value.find(v => v.dia_semana === dia)
  }

  function toggleDia(dia: string, activo: boolean) {
    if (activo) {
      onChange([...value, { dia_semana: dia, hora_inicio: '07:00', hora_fin: '14:00' }])
    } else {
      onChange(value.filter(v => v.dia_semana !== dia))
    }
  }

  function setHora(dia: string, campo: 'hora_inicio' | 'hora_fin', hora: string) {
    onChange(value.map(v => v.dia_semana === dia ? { ...v, [campo]: hora } : v))
  }

  return (
    <div className="space-y-1.5">
      {DIAS_SEMANA.map(dia => {
        const fila = porDia(dia)
        return (
          <div key={dia} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 w-16 shrink-0 text-xs text-slate-600">
              <input type="checkbox" checked={!!fila} onChange={e => toggleDia(dia, e.target.checked)} />
              {DIA_LABEL_CORTO[dia]}
            </label>
            {fila ? (
              <>
                <input type="time" value={fila.hora_inicio} onChange={e => setHora(dia, 'hora_inicio', e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs" />
                <span className="text-xs text-slate-400">–</span>
                <input type="time" value={fila.hora_fin} onChange={e => setHora(dia, 'hora_fin', e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs" />
              </>
            ) : (
              <span className="text-xs text-slate-300">Sin restricción</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function extractApiErrors(e: unknown): Record<string, string> {
  const errs = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
  return errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])) : {}
}

export function ModalWrap({ title, onClose, children, onSave, saving, maxWidth = 'max-w-lg', noGrid = false }: {
  title: string; onClose: () => void; children: React.ReactNode; onSave?: () => void; saving?: boolean
  maxWidth?: string; noGrid?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
      onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-700 text-2xl leading-none disabled:opacity-40">&times;</button>
        </div>
        <div className={`p-6 overflow-y-auto flex-1 ${noGrid ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}`}>{children}</div>
        {onSave && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40">Cancelar</button>
            <button onClick={onSave} disabled={saving} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table primitives ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null

export function Th({ children, className = '', id }: { children?: React.ReactNode; className?: string; id?: string }) {
  return <th id={id} className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${className}`}>{children}</th>
}

export function SortableTh({ children, field, sort, onSort }: {
  children: React.ReactNode
  field: string
  sort: { field: string; dir: SortDir }
  onSort: (f: string) => void
}) {
  const active = sort.field === field
  const dir = active ? sort.dir : null
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide select-none cursor-pointer hover:text-slate-800 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}>
          {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
    </th>
  )
}

export function useSorted<T>(data: T[], defaultField = '', defaultDir: SortDir = null) {
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: defaultField, dir: defaultDir })

  const onSort = useCallback((field: string) => {
    setSort(prev => ({
      field,
      dir: prev.field === field ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }))
  }, [])

  const sorted = sort.field && sort.dir
    ? [...data].sort((a, b) => {
        const av = getNestedVal(a, sort.field) as string | number
        const bv = getNestedVal(b, sort.field) as string | number
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
    : data

  return { sorted, sort, onSort }
}

function getNestedVal(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj) ?? ''
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-slate-200 rounded animate-pulse"
                style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '75%', animationDelay: `${i * 60}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyRow({ cols, msg = 'Sin registros.' }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <Inbox className="w-8 h-8 text-slate-300" aria-hidden="true" />
          <span className="text-sm text-slate-400">{msg}</span>
        </div>
      </td>
    </tr>
  )
}

// ── Capacity bar ──────────────────────────────────────────────────────────────

export function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${pct >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
        {current}/{max}
      </span>
    </div>
  )
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export { mutationError } from '@/utils/apiErrors'

// ── Shared queries ────────────────────────────────────────────────────────────

export function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
    staleTime: 60_000,
  })
}

export function usePeriodos() {
  return useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; codigo?: string; activo: boolean; horarios_liberados: boolean }[]),
    staleTime: 60_000,
  })
}

export function usePlanteles() {
  return useQuery({
    queryKey: ['planteles-select'],
    queryFn: () => apiClient.get('/admin/catalogos/planteles').then(r => r.data.data as { id: number; nombre: string; clave: string; activo: boolean }[]),
    staleTime: 60_000,
  })
}

type AlumnoSelect = {
  id: string
  numero_control: string
  semestre_actual: number
  user?: { name: string }
  carrera?: { id: string; nombre: string; clave: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}

export function useAlumnos(params?: { carrera_id?: string; semestre?: number }) {
  return useQuery({
    queryKey: ['alumnos-select', params?.carrera_id, params?.semestre],
    enabled: params === undefined || !!params.carrera_id,
    queryFn: () => {
      const p: Record<string, string> = { per_page: '500' }
      if (params?.carrera_id) p.carrera_id = params.carrera_id
      if (params?.semestre)   p.semestre   = String(params.semestre)
      return apiClient.get('/alumnos', { params: p }).then(r => {
        const d = r.data.data
        return (Array.isArray(d) ? d : d.data ?? []) as AlumnoSelect[]
      })
    },
    staleTime: 30_000,
  })
}
