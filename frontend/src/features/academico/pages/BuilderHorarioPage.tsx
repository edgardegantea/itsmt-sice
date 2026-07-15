import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  academicoApi,
  type DiaSemana, type BuilderDia, type BuilderSlot, type EstadoCarga,
} from '../services/academico'
import { usePeriodos, selectCls } from './tabs/shared'

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const DIA_LABEL_FULL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

const ESTADO_CARGA_COLOR: Record<EstadoCarga, string> = {
  pendiente: 'bg-blue-400',
  confirmada: 'bg-emerald-500',
  conflicto: 'bg-red-400',
}

function SlotCell({ slot, onClick }: { slot: BuilderSlot; onClick?: () => void }) {
  const base = 'px-1 py-0.5 text-[10px] rounded cursor-pointer transition-colors min-h-[36px] flex items-center justify-center border'
  switch (slot.estado) {
    case 'reservado':
      return (
        <div
          onClick={onClick}
          className={`${base} ${ESTADO_CARGA_COLOR[slot.carga_estado ?? 'pendiente']} text-white border-transparent font-medium flex-col gap-0.5`}
          title={`${slot.materia} · ${slot.grupo} · ${slot.aula}\n${slot.hora_inicio}–${slot.hora_fin}`}
        >
          <span className="truncate max-w-full">{slot.materia}</span>
          <span className="opacity-75 text-[9px]">{slot.grupo} · {slot.aula}</span>
        </div>
      )
    case 'disponible':
      return (
        <div
          onClick={onClick}
          className={`${base} bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100`}
          title="Disponible — clic para asignar"
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
  const [periodoId, setPeriodoId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [grupoId] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<{ dia: DiaSemana; slot: BuilderSlot } | null>(null)

  const { data: periodos = [] } = usePeriodos()

  const { data: docentesData } = useQuery({
    queryKey: ['cargas-academicas', 'docentes', periodoId],
    queryFn: async () => {
      // Obtiene todos los docentes del periodo via cargas existentes + usuarios con rol docente
      const res = await academicoApi.getHorarios({ periodo_id: periodoId })
      const mapa = new Map<string, { id: string; name: string }>()
      res.forEach((h: any) => {
        const d = h.carga_academica?.docente
        if (d) mapa.set(d.id, d)
      })
      return Array.from(mapa.values()).sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: !!periodoId,
  })
  const docentes = docentesData ?? []

  const { data: gridData, isLoading } = useQuery({
    queryKey: ['builder-grid', periodoId, docenteId, grupoId],
    queryFn: () => academicoApi.getBuilderGrid({
      periodo_id: periodoId,
      docente_id: docenteId,
      ...(grupoId ? { grupo_id: grupoId } : {}),
    }),
    enabled: !!periodoId && !!docenteId,
    staleTime: 30_000,
  })

  const dias: BuilderDia[] = gridData?.dias ?? []

  // Todas las horas que aparecen en el grid
  const allSlots = dias.flatMap(d => d.horas).map(h => h.hora).filter((v, i, a) => a.indexOf(v) === i).sort()

  function handleSlotClick(dia: DiaSemana, slot: BuilderSlot) {
    if (slot.estado === 'disponible') {
      setSelectedSlot({ dia, slot })
    } else if (slot.estado === 'reservado' && slot.carga_id) {
      setSelectedSlot({ dia, slot })
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Builder de horarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vista semanal de disponibilidad y cargas asignadas por docente.</p>
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
          <label className="text-xs font-medium text-slate-600 block mb-1">Periodo</label>
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setDocenteId('') }} className={selectCls}>
            <option value="">Selecciona…</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {periodoId && docentes.length > 0 && (
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
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
        {[
          { color: 'bg-emerald-100 border-emerald-200', label: 'Disponible' },
          { color: 'bg-blue-400', label: 'Pendiente' },
          { color: 'bg-emerald-500', label: 'Confirmada' },
          { color: 'bg-red-400', label: 'Con conflicto' },
          { color: 'bg-amber-50 border-amber-200', label: 'Grupo ocupado' },
          { color: 'bg-slate-100 border-slate-200', label: 'Sin disponibilidad' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded border ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Grid semanal */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Cargando grid…
        </div>
      ) : !docenteId ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Selecciona un periodo y un docente para ver el horario.
        </div>
      ) : (
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
                                {slot && <SlotCell slot={slot} onClick={() => slot && handleSlotClick(dia, slot)} />}
                              </div>
                              <div className="flex-1">
                                <SlotCell slot={slot2} onClick={() => slot2 && handleSlotClick(dia, slot2)} />
                              </div>
                            </div>
                          ) : (
                            slot && <SlotCell slot={slot} onClick={() => slot && handleSlotClick(dia, slot)} />
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
              <p><span className="font-medium">Grupo:</span> {selectedSlot.slot.grupo ?? '—'}</p>
              <p><span className="font-medium">Aula:</span> {selectedSlot.slot.aula ?? '—'}</p>
              <p>
                <span className="font-medium">Estado:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  selectedSlot.slot.carga_estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                  selectedSlot.slot.carga_estado === 'conflicto' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {selectedSlot.slot.carga_estado ?? 'pendiente'}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Este horario está dentro de la disponibilidad del docente.
              Para asignar una carga académica, usa el módulo de Cargas Académicas.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
