import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpenText, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { GUIA_INSTRUMENTACION, type BloqueGuia, type SeccionGuia } from './guiaInstrumentacion'

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** Resalta las coincidencias de la búsqueda (sin distinguir acentos ni mayúsculas). */
function Resaltado({ texto, q }: { texto: string; q: string }) {
  if (!q) return <>{texto}</>
  // normalize('NFD') cambia longitudes con acentos; se compara letra por letra sobre una
  // versión sin diacríticos del mismo largo que el original.
  const base = texto.split('').map(ch => normalizar(ch) || ch).join('')
  const partes: ReactNode[] = []
  let i = 0
  let k = base.indexOf(q)
  while (k !== -1) {
    if (k > i) partes.push(texto.slice(i, k))
    partes.push(<mark key={k} className="bg-amber-200/70 text-inherit rounded-sm px-0.5">{texto.slice(k, k + q.length)}</mark>)
    i = k + q.length
    k = base.indexOf(q, i)
  }
  partes.push(texto.slice(i))
  return <>{partes}</>
}

/**
 * Panel lateral con las "Indicaciones para desarrollar la instrumentación didáctica" del
 * formato del SGC. Se abre en la indicación de lo que el docente está llenando.
 */
export default function GuiaInstrumentacionPanel({ abierto, onCerrar, seccionInicial }: {
  abierto: boolean
  onCerrar: () => void
  seccionInicial?: string
}) {
  // Se monta solo mientras está abierto: cada apertura arranca limpia y en su sección.
  if (!abierto) return null
  return <Panel onCerrar={onCerrar} seccionInicial={seccionInicial} />
}

function Panel({ onCerrar, seccionInicial }: { onCerrar: () => void; seccionInicial?: string }) {
  const [busqueda, setBusqueda] = useState('')
  const [activa, setActiva] = useState<string>(seccionInicial ?? GUIA_INSTRUMENTACION[0].id)
  const contenidoRef = useRef<HTMLDivElement>(null)
  const buscadorRef = useRef<HTMLInputElement>(null)
  // Mientras corre un salto programado, el scroll-spy no debe pisar la sección elegida.
  const saltando = useRef(false)

  const q = normalizar(busqueda.trim())
  const visibles: SeccionGuia[] = useMemo(() => q
    ? GUIA_INSTRUMENTACION.filter(s => normalizar(`${s.id} ${s.titulo} ${s.bloques.map(b => b.texto).join(' ')}`).includes(q))
    : GUIA_INSTRUMENTACION, [q])

  const desplazarA = (id: string, suave: boolean) => {
    const el = document.getElementById(`guia-${id}`)
    if (!el || !contenidoRef.current) return
    saltando.current = true
    contenidoRef.current.scrollTo({ top: el.offsetTop - 12, behavior: suave ? 'smooth' : 'auto' })
    window.setTimeout(() => { saltando.current = false }, 600)
  }
  const irA = (id: string) => { setActiva(id); desplazarA(id, true) }

  // Al abrir: saltar a la indicación del contexto (ya marcada como activa en el estado inicial).
  useEffect(() => {
    if (seccionInicial) desplazarA(seccionInicial, false)
  }, [seccionInicial])

  // Scroll-spy: el índice marca la sección que se está leyendo.
  useEffect(() => {
    const cont = contenidoRef.current
    if (!cont) return
    const onScroll = () => {
      if (saltando.current) return
      const tope = cont.scrollTop + 24
      let actual = visibles[0]?.id
      for (const s of visibles) {
        const el = document.getElementById(`guia-${s.id}`)
        if (el && el.offsetTop <= tope) actual = s.id
      }
      if (actual) setActiva(actual)
    }
    cont.addEventListener('scroll', onScroll, { passive: true })
    return () => cont.removeEventListener('scroll', onScroll)
  }, [visibles])

  // Esc cierra; "/" enfoca el buscador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (busqueda) setBusqueda(''); else onCerrar() }
      if (e.key === '/' && document.activeElement !== buscadorRef.current) { e.preventDefault(); buscadorRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar, busqueda])

  const idxActiva = GUIA_INSTRUMENTACION.findIndex(s => s.id === activa)
  const anterior = idxActiva > 0 ? GUIA_INSTRUMENTACION[idxActiva - 1] : null
  const siguiente = idxActiva < GUIA_INSTRUMENTACION.length - 1 ? GUIA_INSTRUMENTACION[idxActiva + 1] : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="guia-titulo">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]" onClick={onCerrar} />
      <aside className="relative w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]">
        <style>{'@keyframes slideIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}'}</style>

        {/* Encabezado */}
        <header className="bg-brand-600 text-white px-5 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <BookOpenText className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="guia-titulo" className="text-base font-semibold leading-tight">Guía de llenado</h2>
              <p className="text-xs text-white/70 mt-0.5">Indicaciones oficiales del formato del SGC · Ingreso Agosto 2015, SGI G4</p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar guía (Esc)" title="Cerrar (Esc)"
              className="shrink-0 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input ref={buscadorRef} type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en la guía: “indicadores”, “APA”, “rúbrica”…" aria-label="Buscar en la guía"
              className="w-full pl-9 pr-24 py-2 rounded-lg bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b38e5d]" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              {q ? `${visibles.length} resultado${visibles.length === 1 ? '' : 's'}` : <kbd className="border border-slate-200 rounded px-1">/</kbd>}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex">
          {/* Índice */}
          <nav className="hidden md:block w-60 shrink-0 border-r border-slate-100 bg-slate-50/60 overflow-y-auto py-3" aria-label="Índice de la guía">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contenido</p>
            <ul>
              {GUIA_INSTRUMENTACION.map(s => {
                const sub = s.id.includes('.')
                const oculta = !visibles.includes(s)
                const esActiva = activa === s.id
                return (
                  <li key={s.id}>
                    <button type="button" onClick={() => irA(s.id)} disabled={oculta} aria-current={esActiva ? 'location' : undefined}
                      className={`relative w-full flex gap-2 text-left py-1.5 pr-3 text-xs leading-snug transition-colors disabled:opacity-30 ${
                        sub ? 'pl-8' : 'pl-4 font-semibold'
                      } ${esActiva ? 'text-brand-600 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}>
                      {esActiva && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#b38e5d]" aria-hidden="true" />}
                      <span className={`shrink-0 tabular-nums ${esActiva ? 'text-[#b38e5d]' : 'text-slate-400'}`}>{s.id}</span>
                      <span>{s.titulo}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Contenido */}
          <div ref={contenidoRef} className="relative flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-7">
              {visibles.length === 0 && (
                <div className="text-center py-16">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-slate-600">No hay indicaciones que coincidan con “{busqueda}”.</p>
                  <button type="button" onClick={() => setBusqueda('')} className="mt-2 text-sm font-medium text-brand-600 hover:underline">Limpiar búsqueda</button>
                </div>
              )}
              {visibles.map(s => (
                <section key={s.id} id={`guia-${s.id}`}
                  className={`pl-4 border-l-[3px] transition-colors ${activa === s.id ? 'border-[#b38e5d]' : 'border-transparent'}`}>
                  <h3 className="flex items-baseline gap-2 text-[15px] font-semibold text-slate-900">
                    <span className="shrink-0 text-xs font-bold text-white bg-brand-600 rounded px-1.5 py-0.5 tabular-nums">{s.id}</span>
                    <Resaltado texto={s.titulo} q={q} />
                  </h3>
                  <Bloques bloques={s.bloques} q={q} />
                </section>
              ))}
            </div>
          </div>
        </div>

        {/* Navegación anterior / siguiente */}
        {!q && (
          <footer className="border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 bg-white">
            <button type="button" disabled={!anterior} onClick={() => anterior && irA(anterior.id)}
              className="flex items-center gap-1 min-w-0 text-xs text-slate-600 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none px-2 py-1.5 rounded-lg hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{anterior ? `(${anterior.id}) ${anterior.titulo}` : 'Anterior'}</span>
            </button>
            <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">{idxActiva + 1} / {GUIA_INSTRUMENTACION.length}</span>
            <button type="button" disabled={!siguiente} onClick={() => siguiente && irA(siguiente.id)}
              className="flex items-center gap-1 min-w-0 text-xs text-slate-600 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none px-2 py-1.5 rounded-lg hover:bg-slate-50">
              <span className="truncate">{siguiente ? `(${siguiente.id}) ${siguiente.titulo}` : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}

/** Párrafos, viñetas y listados numerados; los listados (competencias genéricas) van en
 * una caja a dos columnas para que no se vuelvan una tira interminable. */
function Bloques({ bloques, q }: { bloques: BloqueGuia[]; q: string }) {
  // Agrupar renglones consecutivos del mismo tipo de lista.
  const grupos: { tipo: BloqueGuia['tipo']; items: string[] }[] = []
  for (const b of bloques) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.tipo === b.tipo && (b.tipo === 'li' || b.tipo === 'num')) ultimo.items.push(b.texto)
    else grupos.push({ tipo: b.tipo, items: [b.texto] })
  }
  return (
    <div className="mt-2.5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
      {grupos.map((g, i) => (
        <Fragment key={i}>
          {g.tipo === 'p' && <p><Resaltado texto={g.items[0]} q={q} /></p>}
          {g.tipo === 'sub' && <p className="font-semibold text-slate-800 pt-1"><Resaltado texto={g.items[0]} q={q} /></p>}
          {g.tipo === 'li' && (
            <ul className="space-y-1.5">
              {g.items.map((t, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="shrink-0 mt-[9px] w-1.5 h-1.5 rounded-full bg-[#b38e5d]" aria-hidden="true" />
                  <span><Resaltado texto={t} q={q} /></span>
                </li>
              ))}
            </ul>
          )}
          {g.tipo === 'num' && (
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-[13px]">
              {g.items.map((t, j) => {
                const m = t.match(/^(\d+)\)\s*(.*)$/)
                return (
                  <li key={j} className="flex gap-2">
                    <span className="shrink-0 w-5 text-right tabular-nums text-slate-400">{m ? m[1] : ''}</span>
                    <span><Resaltado texto={m ? m[2] : t} q={q} /></span>
                  </li>
                )
              })}
            </ol>
          )}
        </Fragment>
      ))}
    </div>
  )
}
