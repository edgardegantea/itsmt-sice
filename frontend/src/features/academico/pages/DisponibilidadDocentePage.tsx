import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Copy, Eraser, MousePointerClick, Save, Undo2, CalendarOff, Loader2 } from 'lucide-react'
import { academicoApi, type DisponibilidadBloque, type DiaSemana } from '../services/academico'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { usePeriodos } from './tabs/shared'
import { mutationError } from './tabs/shared'

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const DIAS_HABILES: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
/** Horas de inicio de cada franja de una hora (07:00 … 20:00). */
const HORAS = Array.from({ length: 14 }, (_, i) => i + 7)

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
const toMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0) }

/** Disponibilidad como conjunto de franjas "dia|hora" (hora = 7…20). Es más simple de
 * pintar y comparar que la lista de bloques; se convierte a bloques solo al guardar. */
type Celdas = Set<string>
const clave = (dia: DiaSemana, h: number) => `${dia}|${h}`

function celdasDesdeBloques(bloques: DisponibilidadBloque[]): Celdas {
  const s: Celdas = new Set()
  for (const b of bloques) {
    const ini = toMin(b.hora_inicio), fin = toMin(b.hora_fin)
    for (const h of HORAS) {
      // Una franja cuenta como disponible si el bloque la cubre (aunque sea en parte).
      if (h * 60 < fin && (h + 1) * 60 > ini) s.add(clave(b.dia_semana as DiaSemana, h))
    }
  }
  return s
}

/** Franjas consecutivas del día fusionadas en rangos [inicio, fin). */
function rangosDelDia(celdas: Celdas, dia: DiaSemana): [number, number][] {
  const r: [number, number][] = []
  for (const h of HORAS) {
    if (!celdas.has(clave(dia, h))) continue
    const ultimo = r[r.length - 1]
    if (ultimo && ultimo[1] === h) ultimo[1] = h + 1
    else r.push([h, h + 1])
  }
  return r
}

const mismoConjunto = (a: Celdas, b: Celdas) => a.size === b.size && [...a].every(x => b.has(x))

export default function DisponibilidadDocentePage() {
  const { user } = useAuthStore()
  const { toast: addToast } = useToastStore()
  const qc = useQueryClient()
  const { data: periodos = [] } = usePeriodos()
  const { data: periodoActivo } = usePeriodoActivo()

  // Por defecto, el periodo activo; el docente puede elegir otro.
  const [periodoElegido, setPeriodoElegido] = useState('')
  const periodoId = periodoElegido || periodoActivo?.id || ''
  const docenteId = user?.id ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['disponibilidad-docente', docenteId, periodoId],
    queryFn: () => academicoApi.getDisponibilidadDocente({ docente_id: docenteId, periodo_id: periodoId }),
    enabled: !!docenteId && !!periodoId,
  })

  const guardadas = useMemo(() => celdasDesdeBloques(data?.bloques ?? []), [data])
  const [celdas, setCeldas] = useState<Celdas>(new Set())
  const [cargadoDe, setCargadoDe] = useState<unknown>(null)
  // Sincronizar al llegar datos nuevos del servidor (patrón "estado derivado de props").
  if (data && cargadoDe !== data) {
    setCargadoDe(data)
    setCeldas(new Set(guardadas))
  }
  const hayCambios = !!data && !mismoConjunto(celdas, guardadas)

  // Aviso del navegador si se sale con cambios sin guardar.
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  const saveMut = useMutation({
    mutationFn: () => {
      const bloques: Omit<DisponibilidadBloque, 'id'>[] = []
      for (const dia of DIAS) {
        for (const [ini, fin] of rangosDelDia(celdas, dia)) {
          bloques.push({ dia_semana: dia, hora_inicio: hh(ini), hora_fin: hh(fin) })
        }
      }
      return academicoApi.saveDisponibilidadDocente({ docente_id: docenteId, periodo_id: periodoId, bloques })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad-docente', docenteId, periodoId] })
      addToast('Disponibilidad guardada.', 'success')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  // ── Pintar arrastrando ──────────────────────────────────────────────────────
  // Al presionar sobre una franja se decide el modo (marcar si estaba libre, desmarcar si
  // estaba marcada) y ese mismo modo se aplica a todas las franjas por las que pase el cursor.
  const pintando = useRef<null | 'marcar' | 'desmarcar'>(null)
  useEffect(() => {
    const soltar = () => { pintando.current = null }
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => { window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar) }
  }, [])

  const aplicar = (dia: DiaSemana, h: number, modo: 'marcar' | 'desmarcar') =>
    setCeldas(prev => {
      const k = clave(dia, h)
      if ((modo === 'marcar') === prev.has(k)) return prev
      const n = new Set(prev)
      if (modo === 'marcar') n.add(k); else n.delete(k)
      return n
    })

  const alPresionar = (e: React.PointerEvent, dia: DiaSemana, h: number) => {
    e.preventDefault()
    // En táctil, el puntero queda "capturado" por la celda inicial; se libera para que
    // pointerenter llegue a las demás celdas al arrastrar.
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    pintando.current = celdas.has(clave(dia, h)) ? 'desmarcar' : 'marcar'
    aplicar(dia, h, pintando.current)
  }
  const alEntrar = (dia: DiaSemana, h: number) => {
    if (pintando.current) aplicar(dia, h, pintando.current)
  }

  const limpiarDia = (dia: DiaSemana) =>
    setCeldas(prev => new Set([...prev].filter(k => !k.startsWith(`${dia}|`))))

  const copiarAHabiles = (origen: DiaSemana) =>
    setCeldas(prev => {
      const n = new Set([...prev].filter(k => !DIAS_HABILES.some(d => d !== origen && k.startsWith(`${d}|`))))
      for (const h of HORAS) if (prev.has(clave(origen, h))) DIAS_HABILES.forEach(d => n.add(clave(d, h)))
      return n
    })

  const horasDia = (dia: DiaSemana) => HORAS.filter(h => celdas.has(clave(dia, h))).length
  const totalHoras = celdas.size
  const diasNoLab = data?.dias_no_laborables ?? []

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-brand-600" aria-hidden="true" />
            Disponibilidad docente
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Marca las horas en que estás disponible para impartir clase.</p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          <span className="block mb-1">Periodo</span>
          <select value={periodoId} onChange={e => setPeriodoElegido(e.target.value)}
            className="min-w-56 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none">
            <option value="">Selecciona un periodo</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}{p.id === periodoActivo?.id ? ' (activo)' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      {!periodoId ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-white text-sm text-slate-500">
          Selecciona un periodo para capturar tu disponibilidad.
        </div>
      ) : (
        <>
          {/* Instrucción + resumen */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <MousePointerClick className="w-4 h-4 text-slate-400" aria-hidden="true" />
              Haz clic o <strong className="font-medium text-slate-700">arrastra</strong> sobre las horas para marcarlas; hazlo sobre una marcada para quitarla.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-brand-600" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-slate-200 bg-white" /> No disponible</span>
              <span className="font-semibold text-slate-700 tabular-nums">{totalHoras} h/semana</span>
            </div>
          </div>

          {/* Rejilla */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[760px] grid select-none touch-none" style={{ gridTemplateColumns: `72px repeat(${DIAS.length}, minmax(0, 1fr))` }}>
                {/* Encabezados de día */}
                <div className="sticky left-0 bg-slate-50 border-b border-slate-200" />
                {DIAS.map(dia => (
                  <div key={dia} className="group bg-slate-50 border-b border-l border-slate-200 px-2 py-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-slate-800">{DIA_LABEL[dia]}</span>
                      <span className={`text-[11px] tabular-nums px-1.5 rounded-full ${horasDia(dia) ? 'bg-brand-600/10 text-brand-600 font-semibold' : 'text-slate-400'}`}>
                        {horasDia(dia)} h
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {DIAS_HABILES.includes(dia) && (
                        <button type="button" onClick={() => copiarAHabiles(dia)} disabled={!horasDia(dia)}
                          title={`Copiar el horario del ${DIA_LABEL[dia].toLowerCase()} a lunes–viernes`}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-brand-600 disabled:opacity-40 disabled:pointer-events-none">
                          <Copy className="w-3 h-3" aria-hidden="true" /> Lun–Vie
                        </button>
                      )}
                      <button type="button" onClick={() => limpiarDia(dia)} disabled={!horasDia(dia)}
                        title={`Quitar todas las horas del ${DIA_LABEL[dia].toLowerCase()}`}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 disabled:opacity-40 disabled:pointer-events-none">
                        <Eraser className="w-3 h-3" aria-hidden="true" /> Limpiar
                      </button>
                    </div>
                  </div>
                ))}

                {/* Franjas */}
                {HORAS.map(h => (
                  <div key={h} className="contents">
                    <div className="sticky left-0 bg-white border-b border-slate-100 px-3 flex items-start pt-1 text-[11px] font-mono tabular-nums text-slate-400 h-9">
                      {hh(h)}
                    </div>
                    {DIAS.map(dia => {
                      const activo = celdas.has(clave(dia, h))
                      const arriba = celdas.has(clave(dia, h - 1))
                      const abajo = celdas.has(clave(dia, h + 1))
                      const inicioRango = activo && !arriba
                      const rango = inicioRango ? rangosDelDia(celdas, dia).find(([i]) => i === h) : undefined
                      return (
                        <div key={dia}
                          role="checkbox" aria-checked={activo} tabIndex={0}
                          aria-label={`${DIA_LABEL[dia]} ${hh(h)}–${hh(h + 1)}`}
                          onPointerDown={e => alPresionar(e, dia, h)}
                          onPointerEnter={() => alEntrar(dia, h)}
                          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); aplicar(dia, h, activo ? 'desmarcar' : 'marcar') } }}
                          className={`relative h-9 border-l border-slate-100 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b38e5d] ${
                            activo ? '' : 'border-b hover:bg-brand-600/5'
                          }`}>
                          {activo && (
                            <div className={`absolute inset-x-1 bg-brand-600 text-white ${
                              arriba ? 'top-0' : 'top-1 rounded-t-md'} ${abajo ? 'bottom-0' : 'bottom-1 rounded-b-md'}`}>
                              {rango && (
                                <span className="absolute left-2 top-1 text-[11px] font-medium tabular-nums whitespace-nowrap">
                                  {hh(rango[0])}–{hh(rango[1])}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500 border-t border-slate-100">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Cargando disponibilidad…
              </div>
            )}
          </div>

          {/* Días no laborables del periodo */}
          {diasNoLab.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <CalendarOff className="w-4 h-4" aria-hidden="true" /> Días no laborables en el periodo
              </h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0.5">
                {diasNoLab.map((d, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {d.descripcion && ` — ${d.descripcion}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Barra de guardado */}
          <div className={`sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-t flex flex-wrap items-center justify-between gap-3 backdrop-blur ${
            hayCambios ? 'bg-amber-50/95 border-amber-200' : 'bg-white/90 border-slate-200'
          }`}>
            <p className="text-xs" aria-live="polite">
              {hayCambios
                ? <span className="text-amber-800 font-medium">Tienes cambios sin guardar · {totalHoras} h/semana</span>
                : <span className="text-slate-500">
                    {totalHoras ? `Guardado · ${totalHoras} h/semana en ${DIAS.filter(d => horasDia(d)).length} día(s)` : 'Aún no has marcado horas disponibles.'}
                  </span>}
            </p>
            <div className="flex items-center gap-2">
              {hayCambios && (
                <button type="button" onClick={() => setCeldas(new Set(guardadas))} disabled={saveMut.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50">
                  <Undo2 className="w-4 h-4" aria-hidden="true" /> Descartar
                </button>
              )}
              <button type="button" onClick={() => saveMut.mutate()} disabled={!hayCambios || saveMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                {saveMut.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
