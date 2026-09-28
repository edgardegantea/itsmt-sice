import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  academicoApi,
  type CargaAcademica, type Grupo,
  type DiaSemana, type BuilderDia, type BuilderSlot,
} from '../services/academico'
import { usePeriodos, useCarreras, selectCls, icls, Field, ModalWrap, mutationError, extractApiErrors } from './tabs/shared'
import { useToastStore } from '../../../store/toastStore'
import AsignarSlotModal from './builder/AsignarSlotModal'

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const DIA_LABEL_FULL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

// Paleta de colores por asignatura — cada materia distinta recibe un color
// estable (ciclado por índice de primera aparición), en vez de colorear por
// estatus de la carga.
const MATERIA_PALETTE = [
  'bg-brand-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-600', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]

function SlotCell({
  slot, modo, color, onClick, onMouseDown, onMouseEnter, highlighted,
}: {
  slot: BuilderSlot
  modo: 'docente' | 'grupo'
  color?: string
  onClick?: () => void
  onMouseDown?: () => void
  onMouseEnter?: () => void
  highlighted?: boolean
}) {
  const base = 'px-1 py-0.5 text-[10px] rounded transition-colors min-h-[36px] flex items-center justify-center border select-none'
  switch (slot.estado) {
    case 'reservado': {
      const subtitulo = modo === 'grupo' ? slot.docente : [slot.grupo, slot.aula].filter(Boolean).join(' · ')
      const conflicto = slot.carga_estado === 'conflicto'
      return (
        <div
          onClick={onClick}
          className={`${base} ${color ?? 'bg-slate-400'} text-white border-transparent font-medium flex-col gap-0.5 cursor-pointer ${conflicto ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}
          title={`${slot.materia} · ${subtitulo}\n${slot.hora_inicio}–${slot.hora_fin}${conflicto ? '\n⚠ Con conflicto' : ''}`}
        >
          <span className="truncate max-w-full">{slot.materia}</span>
          <span className="opacity-75 text-[9px] truncate max-w-full">{subtitulo || '—'}</span>
        </div>
      )
    }
    case 'disponible':
      return (
        <div
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          className={`${base} cursor-pointer ${
            highlighted
              ? 'bg-emerald-500 border-emerald-600 text-white'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
          title="Disponible — clic para asignar 1h, o arrastra para varias horas consecutivas"
        >
          +
        </div>
      )
    case 'grupo_ocupado':
      return (
        <div
          className={`${base} bg-amber-50 border-amber-200 text-amber-700 cursor-default flex-col gap-0.5`}
          title={`Grupo ocupado: ${slot.materia} con ${slot.docente}`}
        >
          <span className="text-[9px] truncate max-w-full">{slot.materia}</span>
          <span className="text-[9px] opacity-70">(otro doc.)</span>
        </div>
      )
    default:
      return <div className={`${base} bg-slate-100 border-slate-200 cursor-default`} />
  }
}

export default function BuilderHorarioPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)

  const [modo, setModo] = useState<'docente' | 'grupo'>('docente')
  const [periodoId, setPeriodoId] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [agregarClaseGrupo, setAgregarClaseGrupo] = useState<Grupo | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ dia: DiaSemana; slot: BuilderSlot } | null>(null)
  const [editingBlock, setEditingBlock] = useState<{ horarioId: string; dia: DiaSemana; horaInicio: string; horaFin: string; aulaId?: string } | null>(null)
  const [asignarSeleccion, setAsignarSeleccion] = useState<{ dia_semana: DiaSemana; hora_inicio: string; hora_fin: string; modulo_sabatino?: 1 | 2 | null } | null>(null)

  // Arrastre para seleccionar varias horas consecutivas disponibles en el mismo día/módulo.
  const [drag, setDrag] = useState<{ dia: DiaSemana; modulo: 1 | 2 | null; anchorHora: string; hoverHora: string } | null>(null)

  const mutEliminarBloque = useMutation({
    mutationFn: (horarioId: string) => academicoApi.deleteHorario(horarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      setSelectedSlot(null)
      toastSuccess('Bloque de horario eliminado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const { data: periodos = [] } = usePeriodos()
  const { data: carreras = [] } = useCarreras()

  const { data: docentesData } = useQuery({
    queryKey: ['docentes', carreraId],
    // Todos los docentes de la institución, no solo quienes ya tienen carga
    // asignada — de lo contrario nunca se podría asignar la primera clase.
    queryFn: () => academicoApi.getDocentes({ carrera_id: carreraId || undefined }),
    enabled: !!periodoId && modo === 'docente',
  })
  const docentes = docentesData ?? []

  const { data: gruposData } = useQuery({
    queryKey: ['grupos-builder', periodoId, carreraId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId, ...(carreraId ? { carrera_id: carreraId } : {}) }),
    enabled: !!periodoId && modo === 'grupo',
  })
  const grupos: Grupo[] = gruposData ?? []

  const { data: cargasGrupoData } = useQuery({
    queryKey: ['cargas-builder', periodoId],
    queryFn: () => academicoApi.getCargas({ periodo_id: periodoId }),
    enabled: !!periodoId && modo === 'grupo' && !grupoId,
  })
  const cargasParaResumen: CargaAcademica[] = cargasGrupoData ?? []

  const seleccionActiva = modo === 'docente' ? docenteId : grupoId

  const { data: gridData, isLoading } = useQuery({
    queryKey: ['builder-grid', periodoId, modo, docenteId, grupoId],
    queryFn: () => academicoApi.getBuilderGrid(
      modo === 'docente'
        ? { periodo_id: periodoId, docente_id: docenteId }
        : { periodo_id: periodoId, grupo_id: grupoId }
    ),
    enabled: !!periodoId && !!seleccionActiva,
    staleTime: 30_000,
  })

  const dias: BuilderDia[] = gridData?.dias ?? []

  // Todas las horas que aparecen en el grid
  const allSlots = dias.flatMap(d => d.horas).map(h => h.hora).filter((v, i, a) => a.indexOf(v) === i).sort()

  // Color estable por asignatura: se asigna por orden de primera aparición
  // en la cuadrícula, ciclando la paleta si hay más materias que colores.
  const materiaColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const todosLosSlots = dias.flatMap(d => [...d.horas, ...(d.horas_modulo2 ?? [])])
    for (const slot of todosLosSlots) {
      if (slot.estado !== 'reservado') continue
      const key = slot.materia_id ?? slot.materia ?? ''
      if (key && !map.has(key)) map.set(key, MATERIA_PALETTE[map.size % MATERIA_PALETTE.length])
    }
    return map
  }, [dias])

  const colorDeSlot = useCallback((slot: BuilderSlot) => {
    const key = slot.materia_id ?? slot.materia ?? ''
    return materiaColorMap.get(key)
  }, [materiaColorMap])

  function siguienteHora(hora: string): string {
    const h = parseInt(hora.slice(0, 2), 10) + 1
    return `${String(h).padStart(2, '0')}:00`
  }

  function cambiarModo(nuevo: 'docente' | 'grupo') {
    setModo(nuevo)
    setDocenteId('')
    setGrupoId('')
    setSelectedSlot(null)
  }

  function handleSlotClick(dia: DiaSemana, slot: BuilderSlot) {
    if (slot.estado === 'reservado' && slot.carga_id) {
      setSelectedSlot({ dia, slot })
    }
  }

  // Horas disponibles (ordenadas) de una columna día/módulo, para saber hasta dónde se puede extender el arrastre.
  function horasDisponibles(dia: DiaSemana, modulo: 1 | 2 | null): string[] {
    const diaData = dias.find(d => d.dia_semana === dia)
    const horas = modulo === 2 ? diaData?.horas_modulo2 : diaData?.horas
    return (horas ?? []).filter(h => h.estado === 'disponible').map(h => h.hora).sort()
  }

  function iniciarArrastre(dia: DiaSemana, modulo: 1 | 2 | null, hora: string) {
    setDrag({ dia, modulo, anchorHora: hora, hoverHora: hora })
  }

  function extenderArrastre(dia: DiaSemana, modulo: 1 | 2 | null, hora: string) {
    setDrag(d => {
      if (!d || d.dia !== dia || d.modulo !== modulo) return d
      // Solo extiende si toda la franja entre el ancla y esta hora sigue disponible (sin huecos).
      const disponibles = new Set(horasDisponibles(dia, modulo))
      const desde = Math.min(parseInt(d.anchorHora), parseInt(hora))
      const hasta = Math.max(parseInt(d.anchorHora), parseInt(hora))
      for (let h = desde; h <= hasta; h++) {
        if (!disponibles.has(`${String(h).padStart(2, '0')}:00`)) return d
      }
      return { ...d, hoverHora: hora }
    })
  }

  function estaResaltado(dia: DiaSemana, modulo: 1 | 2 | null, hora: string): boolean {
    if (!drag || drag.dia !== dia || drag.modulo !== modulo) return false
    const desde = Math.min(parseInt(drag.anchorHora), parseInt(drag.hoverHora))
    const hasta = Math.max(parseInt(drag.anchorHora), parseInt(drag.hoverHora))
    const h = parseInt(hora)
    return h >= desde && h <= hasta
  }

  useEffect(() => {
    if (!drag) return
    const finalizar = () => {
      setDrag(d => {
        if (d) {
          const desde = d.anchorHora < d.hoverHora ? d.anchorHora : d.hoverHora
          const hasta = d.anchorHora < d.hoverHora ? d.hoverHora : d.anchorHora
          setAsignarSeleccion({
            dia_semana: d.dia,
            hora_inicio: desde,
            hora_fin: siguienteHora(hasta),
            modulo_sabatino: d.dia === 'sabado' ? d.modulo : null,
          })
        }
        return null
      })
    }
    window.addEventListener('mouseup', finalizar)
    return () => window.removeEventListener('mouseup', finalizar)
  }, [drag])

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Builder de horarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vista semanal de disponibilidad y cargas asignadas, por {modo === 'docente' ? 'docente' : 'grupo'}.
          </p>
        </div>

        {periodoId && (
          <a
            href={academicoApi.getConcentradoUrl({ periodo_id: periodoId })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Exportar Excel
          </a>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Ver por</label>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            {(['docente', 'grupo'] as const).map(m => (
              <button
                key={m}
                onClick={() => cambiarModo(m)}
                className={`px-3 py-2 capitalize transition-colors ${
                  modo === m ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Periodo</label>
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setDocenteId(''); setGrupoId('') }} className={selectCls}>
            <option value="">Selecciona…</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Carrera</label>
          <select value={carreraId} onChange={e => { setCarreraId(e.target.value); setDocenteId(''); setGrupoId('') }} className={selectCls}>
            <option value="">Todas las carreras</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
          </select>
        </div>
        {periodoId && modo === 'docente' && docentes.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Docente</label>
            <select value={docenteId} onChange={e => setDocenteId(e.target.value)} className={selectCls}>
              <option value="">Selecciona docente…</option>
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border bg-emerald-100 border-emerald-200" />
          Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded ring-2 ring-red-500 ring-offset-1 bg-slate-300" />
          Con conflicto
        </span>
        {modo === 'docente' && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border bg-amber-50 border-amber-200" />
            Grupo ocupado
          </span>
        )}
        {modo === 'docente' && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border bg-slate-100 border-slate-200" />
            Sin disponibilidad
          </span>
        )}
        {materiaColorMap.size > 0 && (
          <span className="text-slate-400">· Cada color de bloque representa una asignatura distinta</span>
        )}
      </div>

      {/* Grid semanal */}
      {modo === 'grupo' && !grupoId ? (
        !periodoId ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
            Selecciona un periodo para ver los grupos.
          </div>
        ) : (
          <ListaGruposBuilder
            grupos={grupos}
            cargas={cargasParaResumen}
            onVerHorario={g => setGrupoId(g.id)}
            onAgregarClase={g => setAgregarClaseGrupo(g)}
          />
        )
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Cargando grid…
        </div>
      ) : !seleccionActiva ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Selecciona un periodo y un {modo} para ver el horario.
        </div>
      ) : (
        <>
        {modo === 'grupo' && (
          <button
            onClick={() => setGrupoId('')}
            className="text-xs text-brand-600 hover:underline -mt-2 mb-2 inline-block"
          >
            ← Volver a la lista de grupos
          </button>
        )}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-slate-500 font-medium w-14">Hora</th>
                  {DIAS.map(dia => {
                    const diaData = dias.find(d => d.dia_semana === dia)
                    return (
                      <th key={dia} className="px-1 py-2 text-center text-slate-700 font-semibold">
                        <div>{DIA_LABEL[dia]}</div>
                        {diaData?.disponibilidad && diaData.disponibilidad.length > 0 && (
                          <div className="text-[9px] text-slate-400 font-normal">
                            {diaData.disponibilidad.map(b => `${b.hora_inicio.slice(0,5)}–${b.hora_fin.slice(0,5)}`).join(', ')}
                          </div>
                        )}
                        {dia === 'sabado' && diaData?.horas_modulo2 && (
                          <div className="flex gap-0.5 text-[9px] text-slate-400 font-normal justify-center mt-0.5">
                            <span className="bg-slate-100 px-1 rounded">M1</span>
                            <span className="bg-slate-100 px-1 rounded">M2</span>
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {allSlots.map(hora => (
                  <tr key={hora} className="border-b border-slate-50">
                    <td className="px-3 py-0.5 text-slate-400 font-mono tabular-nums">{hora}</td>
                    {DIAS.map(dia => {
                      const diaData = dias.find(d => d.dia_semana === dia)
                      const slot = diaData?.horas.find(h => h.hora === hora)
                      const slot2 = dia === 'sabado' ? diaData?.horas_modulo2?.find(h => h.hora === hora) : null

                      return (
                        <td key={dia} className="px-0.5 py-0.5">
                          {dia === 'sabado' && slot2 !== null && slot2 !== undefined ? (
                            <div className="flex gap-0.5">
                              <div className="flex-1">
                                {slot && (
                                  <SlotCell
                                    slot={slot}
                                    modo={modo}
                                    color={colorDeSlot(slot)}
                                    onClick={() => handleSlotClick(dia, slot)}
                                    onMouseDown={() => slot.estado === 'disponible' && iniciarArrastre(dia, 1, slot.hora)}
                                    onMouseEnter={() => slot.estado === 'disponible' && extenderArrastre(dia, 1, slot.hora)}
                                    highlighted={estaResaltado(dia, 1, slot.hora)}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <SlotCell
                                  slot={slot2}
                                  modo={modo}
                                  color={colorDeSlot(slot2)}
                                  onClick={() => handleSlotClick(dia, slot2)}
                                  onMouseDown={() => slot2.estado === 'disponible' && iniciarArrastre(dia, 2, slot2.hora)}
                                  onMouseEnter={() => slot2.estado === 'disponible' && extenderArrastre(dia, 2, slot2.hora)}
                                  highlighted={estaResaltado(dia, 2, slot2.hora)}
                                />
                              </div>
                            </div>
                          ) : (
                            slot && (
                              <SlotCell
                                slot={slot}
                                modo={modo}
                                color={colorDeSlot(slot)}
                                onClick={() => handleSlotClick(dia, slot)}
                                onMouseDown={() => slot.estado === 'disponible' && iniciarArrastre(dia, null, slot.hora)}
                                onMouseEnter={() => slot.estado === 'disponible' && extenderArrastre(dia, null, slot.hora)}
                                highlighted={estaResaltado(dia, null, slot.hora)}
                              />
                            )
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Panel de detalle del slot seleccionado */}
      {selectedSlot && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              {DIA_LABEL_FULL[selectedSlot.dia]} {selectedSlot.slot.hora_inicio ?? selectedSlot.slot.hora}
              {selectedSlot.slot.hora_fin && ` – ${selectedSlot.slot.hora_fin}`}
            </h2>
            <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>

          {selectedSlot.slot.estado === 'reservado' ? (
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Materia:</span> {selectedSlot.slot.materia ?? '—'}</p>
              {modo === 'docente' ? (
                <>
                  <p><span className="font-medium">Grupo:</span> {selectedSlot.slot.grupo ?? '—'}</p>
                  <p><span className="font-medium">Aula:</span> {selectedSlot.slot.aula ?? '—'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-medium">Docente:</span> {selectedSlot.slot.docente ?? '—'}</p>
                  <p><span className="font-medium">Aula:</span> {selectedSlot.slot.aula ?? '—'}</p>
                </>
              )}
              <p>
                <span className="font-medium">Estado:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  selectedSlot.slot.carga_estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                  selectedSlot.slot.carga_estado === 'conflicto' ? 'bg-red-100 text-red-700' :
                  'bg-brand-100 text-brand-700'
                }`}>
                  {selectedSlot.slot.carga_estado ?? 'pendiente'}
                </span>
              </p>
              {selectedSlot.slot.horario_id && (
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setEditingBlock({
                      horarioId: selectedSlot.slot.horario_id!,
                      dia: selectedSlot.dia,
                      horaInicio: (selectedSlot.slot.hora_inicio ?? selectedSlot.slot.hora).slice(0, 5),
                      horaFin: (selectedSlot.slot.hora_fin ?? '').slice(0, 5),
                      aulaId: selectedSlot.slot.aula_id,
                    })}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => mutEliminarBloque.mutate(selectedSlot.slot.horario_id!)}
                    disabled={mutEliminarBloque.isPending}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Eliminar este bloque
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Este horario está dentro de la disponibilidad del docente.
              Para asignar una carga académica, usa el módulo de Cargas Académicas.
            </p>
          )}
        </div>
      )}

      {asignarSeleccion && periodoId && seleccionActiva && (
        <AsignarSlotModal
          periodoId={periodoId}
          docenteId={modo === 'docente' ? docenteId : undefined}
          grupoId={modo === 'grupo' ? grupoId : undefined}
          seleccion={asignarSeleccion}
          onClose={() => setAsignarSeleccion(null)}
        />
      )}

      {agregarClaseGrupo && periodoId && (
        <AgregarCargaModal
          periodoId={periodoId}
          grupo={agregarClaseGrupo}
          onClose={() => setAgregarClaseGrupo(null)}
        />
      )}

      {editingBlock && (
        <EditarBloqueModal
          bloque={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSaved={() => { setEditingBlock(null); setSelectedSlot(null) }}
        />
      )}
    </div>
  )
}

// ── Lista de grupos agrupada por carrera (modo "Grupo") ─────────────────────────

function GrupoRow({
  g, cargas, onVerHorario, onAgregarClase,
}: {
  g: Grupo
  cargas: CargaAcademica[]
  onVerHorario: (g: Grupo) => void
  onAgregarClase: (g: Grupo) => void
}) {
  const cargasGrupo = cargas.filter(c => c.grupos?.some(gr => gr.id === g.id))
  const creditos = cargasGrupo.reduce((s, c) => s + (c.materia?.creditos ?? 0), 0)
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/40 transition-colors flex-wrap">
      <span className="font-semibold text-slate-800 text-sm">Grupo {g.clave}</span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Semestre {g.semestre}</span>
      {g.alumnos_count !== undefined && (
        <span className="text-xs text-slate-400">{g.alumnos_count} alumnos</span>
      )}
      <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">
        {cargasGrupo.length} clase{cargasGrupo.length !== 1 ? 's' : ''} asignada{cargasGrupo.length !== 1 ? 's' : ''} · {creditos} crédito{creditos !== 1 ? 's' : ''}
      </span>
      <button onClick={() => onVerHorario(g)} className="text-xs text-brand-600 hover:underline shrink-0 whitespace-nowrap">
        Ver horario
      </button>
      <button onClick={() => onAgregarClase(g)} className="text-xs text-emerald-700 hover:underline shrink-0 whitespace-nowrap">
        + Agregar clase
      </button>
    </div>
  )
}

function ListaGruposBuilder({
  grupos, cargas, onVerHorario, onAgregarClase,
}: {
  grupos: Grupo[]
  cargas: CargaAcademica[]
  onVerHorario: (g: Grupo) => void
  onAgregarClase: (g: Grupo) => void
}) {
  const [openCarreras, setOpenCarreras] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((key: string) => {
    setOpenCarreras(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }, [])

  const byCarrera = useMemo(() => {
    type CarEntry = { id: string; nombre: string; clave: string; grupos: Grupo[] }
    const map = new Map<string, CarEntry>()
    for (const g of grupos) {
      const cid = g.carrera?.id ?? '_sin'
      if (!map.has(cid)) map.set(cid, { id: cid, nombre: g.carrera?.nombre ?? 'Sin carrera', clave: g.carrera?.clave ?? '—', grupos: [] })
      map.get(cid)!.grupos.push(g)
    }
    for (const ce of map.values()) ce.grupos.sort((a, b) => a.clave.localeCompare(b.clave))
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [grupos])

  // Auto-expandir si solo hay una carrera
  useEffect(() => {
    if (byCarrera.length === 1) setOpenCarreras(new Set([byCarrera[0].id]))
  }, [byCarrera])

  if (grupos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        No hay grupos con los filtros seleccionados.
      </div>
    )
  }

  const totalClases = cargas.length
  const totalCreditos = cargas.reduce((s, c) => s + (c.materia?.creditos ?? 0), 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {totalClases} clase{totalClases !== 1 ? 's' : ''} asignada{totalClases !== 1 ? 's' : ''} · {totalCreditos} crédito{totalCreditos !== 1 ? 's' : ''}
      </p>
      <div className="space-y-3">
        {byCarrera.map(carrera => {
          const isOpen = openCarreras.has(carrera.id)
          const clasesCarrera = cargas.filter(c => carrera.grupos.some(g => c.grupos?.some(gr => gr.id === g.id))).length
          return (
            <div key={carrera.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                onClick={() => toggle(carrera.id)}
              >
                <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">{carrera.clave}</span>
                <span className="font-semibold text-slate-800 text-sm truncate">{carrera.nombre}</span>
                <span className="ml-auto text-xs text-slate-400 shrink-0 whitespace-nowrap">
                  {carrera.grupos.length} grupo{carrera.grupos.length !== 1 ? 's' : ''} · {clasesCarrera} clase{clasesCarrera !== 1 ? 's' : ''}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {carrera.grupos.map(g => (
                    <GrupoRow key={g.id} g={g} cargas={cargas} onVerHorario={onVerHorario} onAgregarClase={onAgregarClase} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Modal: editar día/hora/aula de un bloque ya asignado ────────────────────────

function EditarBloqueModal({
  bloque, onClose, onSaved,
}: {
  bloque: { horarioId: string; dia: DiaSemana; horaInicio: string; horaFin: string; aulaId?: string }
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const [dia, setDia] = useState<DiaSemana>(bloque.dia)
  const [horaInicio, setHoraInicio] = useState(bloque.horaInicio)
  const [horaFin, setHoraFin] = useState(bloque.horaFin)
  const [aulaId, setAulaId] = useState(bloque.aulaId ?? '')
  const [error, setError] = useState('')

  const { data: aulas = [] } = useQuery({
    queryKey: ['builder-aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const mutGuardar = useMutation({
    mutationFn: () => academicoApi.updateHorario(bloque.horarioId, {
      dia_semana: dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      aula_id: aulaId || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      toastSuccess('Bloque de horario actualizado.')
      onSaved()
    },
    onError: (e) => setError(mutationError(e)),
  })

  return (
    <ModalWrap
      title="Editar bloque de horario"
      onClose={onClose}
      onSave={() => mutGuardar.mutate()}
      saving={mutGuardar.isPending}
    >
      {error && <div className="col-span-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <Field label="Día *">
        <select className={selectCls} value={dia} onChange={e => setDia(e.target.value as DiaSemana)}>
          {DIAS.map(d => <option key={d} value={d}>{DIA_LABEL_FULL[d]}</option>)}
        </select>
      </Field>
      <Field label="Aula">
        <select className={selectCls} value={aulaId} onChange={e => setAulaId(e.target.value)}>
          <option value="">— Sin asignar —</option>
          {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Field>
      <Field label="Hora inicio *">
        <input type="time" className={icls()} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
      </Field>
      <Field label="Hora fin *">
        <input type="time" className={icls()} value={horaFin} onChange={e => setHoraFin(e.target.value)} />
      </Field>
    </ModalWrap>
  )
}

// ── Modal: agregar clase a un grupo (sin horario todavía) ───────────────────────

function AgregarCargaModal({ periodoId, grupo, onClose }: { periodoId: string; grupo: Grupo; onClose: () => void }) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const [docenteId, setDocenteId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [aulaId, setAulaId] = useState('')
  const [horasSemana, setHorasSemana] = useState('3')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => academicoApi.getDocentes(),
  })
  const { data: materias = [] } = useQuery({
    queryKey: ['builder-materias', grupo.carrera_id],
    queryFn: () => academicoApi.getMaterias({ carrera_id: grupo.carrera_id }),
  })
  const { data: aulas = [] } = useQuery({
    queryKey: ['builder-aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const save = useMutation({
    mutationFn: () => academicoApi.createCarga({
      docente_id: docenteId,
      materia_id: materiaId,
      grupo_ids: [grupo.id],
      periodo_id: periodoId,
      aula_id: aulaId || undefined,
      horas_semana: Number(horasSemana),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cargas-builder'] })
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      toastSuccess('Clase agregada.')
      onClose()
    },
    onError: (e) => setErrors(extractApiErrors(e)),
  })

  return (
    <ModalWrap
      title={`Agregar clase — Grupo ${grupo.clave}`}
      onClose={onClose}
      onSave={() => save.mutate()}
      saving={save.isPending}
    >
      <Field label="Docente *" full error={errors.docente_id}>
        <select className={icls(errors.docente_id)} value={docenteId} onChange={e => setDocenteId(e.target.value)}>
          <option value="">— Seleccionar docente —</option>
          {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Materia *" full error={errors.materia_id}>
        <select className={icls(errors.materia_id)} value={materiaId} onChange={e => setMateriaId(e.target.value)}>
          <option value="">— Seleccionar materia —</option>
          {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} · sem. {m.semestre}</option>)}
        </select>
      </Field>
      <Field label="Aula" error={errors.aula_id}>
        <select className={icls(errors.aula_id)} value={aulaId} onChange={e => setAulaId(e.target.value)}>
          <option value="">— Sin asignar —</option>
          {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre} (cap. {a.capacidad})</option>)}
        </select>
      </Field>
      <Field label="Horas por semana" error={errors.horas_semana}>
        <input className={icls(errors.horas_semana)} type="number" min={1} max={40}
          value={horasSemana} onChange={e => setHorasSemana(e.target.value)} />
      </Field>
    </ModalWrap>
  )
}
