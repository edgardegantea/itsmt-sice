import { useRef, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { List } from 'lucide-react'

const TAGS_PERMITIDOS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span']
const ATRIBUTOS_PERMITIDOS = ['style']

/** Sanitiza el HTML de un campo de texto enriquecido antes de mostrarlo — tanto al
 * cargarlo en el editor como al pintarlo en las vistas de solo lectura (PlaneacionDetalle).
 * El array `competencias` no tiene validación de esquema en el backend (ver
 * PlaneacionDocenteController), así que este es el único punto real de defensa contra HTML
 * malicioso guardado directamente vía API — de ahí que se sanitice en cada render, no solo
 * al guardar. Solo se permiten las etiquetas que puede producir la barra de herramientas
 * (negrita, cursiva, subrayado, listas, alineación vía `style`); todo lo demás se descarta. */
export function sanitizeRichText(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS: TAGS_PERMITIDOS, ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS })
}

/** Un <br> o <p></p> solitario que deja un contentEditable al borrar todo el texto no es
 * "contenido" — sin esto, un campo que el docente vació por completo se seguiría guardando
 * como no-vacío y contaría distinto en validaciones/exportes que revisan si el campo tiene texto. */
function normalizarVacio(html: string): string {
  const limpio = html.trim()
  if (/^(<br\s*\/?>|<p>(<br\s*\/?>)?<\/p>|&nbsp;|\s)*$/i.test(limpio)) return ''
  return limpio
}

/** Texto plano a partir del HTML de un RichTextField — para mandarlo a "Mejorar con IA"
 * (que espera texto simple, no le sirve ver etiquetas) o a cualquier otro consumidor que
 * necesite el contenido sin formato (búsqueda, exportes). */
export function richTextAPlano(html: string | null | undefined): string {
  const div = document.createElement('div')
  div.innerHTML = sanitizeRichText(html)
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Pinta el HTML de un RichTextField en una vista de solo lectura (p. ej.
 * PlaneacionDetalle, para los revisores) — sanitiza en cada render, no confía en que el
 * HTML ya guardado sea seguro (ver comentario de sanitizeRichText). */
export function RichTextView({ html, className }: { html: string | null | undefined; className?: string }) {
  const limpio = sanitizeRichText(html)
  if (!limpio) return null
  // eslint-disable-next-line react/no-danger
  return <div className={className} dangerouslySetInnerHTML={{ __html: limpio }} />
}

function IconAlign({ d }: { d: string }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d={d} />
    </svg>
  )
}

const BOTON_CLS = 'px-1.5 py-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors'
const BOTON_ACTIVO_CLS = 'bg-violet-100 text-violet-700 hover:bg-violet-100 hover:text-violet-700'

const COMANDOS_ESTADO = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList'] as const
type ComandoEstado = typeof COMANDOS_ESTADO[number]
type EstadoBotones = Record<ComandoEstado, boolean>
const ESTADO_INICIAL: EstadoBotones = { bold: false, italic: false, underline: false, justifyLeft: false, justifyCenter: false, justifyRight: false, justifyFull: false, insertUnorderedList: false, insertOrderedList: false }

/** Campo de texto enriquecido: negrita/cursiva/subrayado, alineación y viñetas/numeración,
 * más redimensionable verticalmente (arrastrando la esquina, como un <textarea>). Reemplaza
 * los <textarea> de texto libre del módulo de Planeación Docente/Instrumentación Didáctica.
 * Usa `contentEditable` + `document.execCommand` en vez de una librería de editor — con solo
 * 6 comandos de formato no vale la pena el peso de TipTap/Quill, y execCommand sigue
 * soportado en todos los navegadores mayores pese a estar deprecado. */
export function RichTextField({ value, onChange, placeholder, minHeight = 90, disabled, onBlurNormalizado }: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  disabled?: boolean
  /** Se dispara al perder el foco, con el HTML ya recortado de espacios muertos — úsalo si
   * necesitas reaccionar al valor "final" (p. ej. disparar autosave) en vez de cada tecleo. */
  onBlurNormalizado?: (html: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Arranca en `null` (no en `value`) a propósito: si se inicializara con `value`, la primera
  // corrida del efecto de abajo vería `value === ultimoValorExterno.current` y se saltaría el
  // pintado inicial — el <div> quedaría vacío en pantalla aunque `value` sí traiga datos. Esto
  // pasaba cada vez que este componente se remontaba (p. ej. al salir de un paso del asistente
  // y volver, ya que ese paso deja de renderizarse mientras no está activo): el campo se veía
  // vacío, y si el docente entonces guardaba, borraba de verdad lo que ya tenía capturado.
  const ultimoValorExterno = useRef<string | null>(null)
  // Qué botones de la barra están "activos" ahora mismo — es decir, si el formato
  // correspondiente ya está aplicado donde está el cursor o la selección actual, para
  // marcarlos como presionados (igual que en Word/Google Docs) y no solo mostrarlos como
  // botones sueltos sin relación con lo que se está editando.
  const [estado, setEstado] = useState<EstadoBotones>(ESTADO_INICIAL)

  const actualizarEstado = () => {
    if (!ref.current || document.activeElement !== ref.current) return
    setEstado(prev => {
      const next = { ...prev }
      for (const cmd of COMANDOS_ESTADO) next[cmd] = document.queryCommandState(cmd)
      return next
    })
  }

  // Solo reescribe el DOM cuando `value` cambia desde AFUERA del componente (montaje/carga
  // inicial de datos, o "Mejorar con IA" reemplazando el texto) — nunca en cada tecleo del
  // usuario, que movería el cursor al inicio del campo en cada render.
  useEffect(() => {
    if (ref.current && value !== ultimoValorExterno.current) {
      ref.current.innerHTML = sanitizeRichText(value)
      ultimoValorExterno.current = value
    }
  }, [value])

  const emitirCambio = () => {
    if (!ref.current) return
    const html = normalizarVacio(ref.current.innerHTML)
    ultimoValorExterno.current = html
    onChange(html)
    return html
  }

  const ejecutar = (cmd: string, arg?: string) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emitirCambio()
    actualizarEstado()
  }

  // Pegar siempre como texto plano: además de evitar que se cuele HTML/CSS ajeno (p. ej. de
  // Word) con estilos que rompan el diseño, cierra la única vía real de inyectar markup
  // fuera de los botones de la barra — todo lo que puede terminar en el campo pasa por
  // execCommand con comandos conocidos.
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const texto = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, texto)
  }

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-500 transition-shadow ${disabled ? 'opacity-60' : ''}`}>
      {!disabled && (
        <div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 flex-wrap">
          <button type="button" title="Negrita" aria-pressed={estado.bold} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('bold')} className={`${BOTON_CLS} font-bold text-xs w-6 ${estado.bold ? BOTON_ACTIVO_CLS : ''}`}>B</button>
          <button type="button" title="Cursiva" aria-pressed={estado.italic} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('italic')} className={`${BOTON_CLS} italic text-xs w-6 ${estado.italic ? BOTON_ACTIVO_CLS : ''}`}>I</button>
          <button type="button" title="Subrayado" aria-pressed={estado.underline} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('underline')} className={`${BOTON_CLS} underline text-xs w-6 ${estado.underline ? BOTON_ACTIVO_CLS : ''}`}>U</button>
          <span className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button" title="Alinear a la izquierda" aria-pressed={estado.justifyLeft} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('justifyLeft')} className={`${BOTON_CLS} ${estado.justifyLeft ? BOTON_ACTIVO_CLS : ''}`}>
            <IconAlign d="M4 6h16M4 12h10M4 18h14" />
          </button>
          <button type="button" title="Centrar" aria-pressed={estado.justifyCenter} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('justifyCenter')} className={`${BOTON_CLS} ${estado.justifyCenter ? BOTON_ACTIVO_CLS : ''}`}>
            <IconAlign d="M4 6h16M7 12h10M5 18h14" />
          </button>
          <button type="button" title="Alinear a la derecha" aria-pressed={estado.justifyRight} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('justifyRight')} className={`${BOTON_CLS} ${estado.justifyRight ? BOTON_ACTIVO_CLS : ''}`}>
            <IconAlign d="M4 6h16M10 12h10M6 18h14" />
          </button>
          <button type="button" title="Justificar" aria-pressed={estado.justifyFull} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('justifyFull')} className={`${BOTON_CLS} ${estado.justifyFull ? BOTON_ACTIVO_CLS : ''}`}>
            <IconAlign d="M4 6h16M4 12h16M4 18h10" />
          </button>
          <span className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button" title="Viñetas" aria-pressed={estado.insertUnorderedList} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('insertUnorderedList')} className={`${BOTON_CLS} ${estado.insertUnorderedList ? BOTON_ACTIVO_CLS : ''}`}>
            <List className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" title="Lista numerada" aria-pressed={estado.insertOrderedList} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('insertOrderedList')} className={`${BOTON_CLS} ${estado.insertOrderedList ? BOTON_ACTIVO_CLS : ''}`}>
            <List className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button" title="Quitar formato" onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('removeFormat')} className={`${BOTON_CLS} text-[10px] px-2`}>
            Limpiar
          </button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitirCambio}
        onBlur={() => { onBlurNormalizado?.(emitirCambio() ?? ''); setEstado(ESTADO_INICIAL) }}
        onFocus={actualizarEstado}
        onKeyUp={actualizarEstado}
        onMouseUp={actualizarEstado}
        onPaste={onPaste}
        data-placeholder={placeholder}
        className="rich-text-editable px-3 py-2 text-sm text-slate-800 focus:outline-none"
        style={{ minHeight, maxHeight: '70vh' }}
      />
    </div>
  )
}
