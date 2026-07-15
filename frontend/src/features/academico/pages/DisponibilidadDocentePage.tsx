import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type DisponibilidadBloque, type DiaSemana } from '../services/academico'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import { usePeriodos } from './tabs/shared'
import { mutationError } from './tabs/shared'

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const HORAS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

function toMin(h: string) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}
function formatHora(h: string) { return h.slice(0, 5) }

interface DiaBloque {
  hora_inicio: string
  hora_fin: string
  dragging: boolean
}

export default function DisponibilidadDocentePage() {
  const { user } = useAuthStore()
  const { toast: addToast } = useToastStore()
  const qc = useQueryClient()

  const [periodoId, setPeriodoId] = useState<string>('')
  const [docenteId] = useState<string>(user?.id ?? '')

  // Indexed by dia_semana: list of bloque objects being built
  const emptyBloques = (): Record<DiaSemana, DiaBloque[]> =>
    Object.fromEntries(DIAS.map(d => [d, []])) as unknown as Record<DiaSemana, DiaBloque[]>

  const [bloquesPorDia, setBloquesPorDia] = useState<Record<DiaSemana, DiaBloque[]>>(emptyBloques)

  const { data: periodos = [] } = usePeriodos()

  const esAdmin = user?.roles.some(r => ['superadmin', 'admin'].includes(r)) ?? false
  const docenteTarget = esAdmin ? docenteId : (user?.id ?? '')

  const { data } = useQuery({
    queryKey: ['disponibilidad-docente', docenteTarget, periodoId],
    queryFn: () => academicoApi.getDisponibilidadDocente({ docente_id: docenteTarget, periodo_id: periodoId }),
    enabled: !!docenteTarget && !!periodoId,
  })

  useEffect(() => {
    if (!data) return
    const nuevo = emptyBloques()
    data.bloques.forEach((b: DisponibilidadBloque) => {
      nuevo[b.dia_semana as DiaSemana].push({
        hora_inicio: formatHora(b.hora_inicio),
        hora_fin: formatHora(b.hora_fin),
        dragging: false,
      })
    })
    setBloquesPorDia(nuevo)
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => {
      const bloques: Omit<DisponibilidadBloque, 'id'>[] = []
      DIAS.forEach(dia => {
        bloquesPorDia[dia].forEach(b => {
          bloques.push({ dia_semana: dia, hora_inicio: b.hora_inicio, hora_fin: b.hora_fin })
        })
      })
      return academicoApi.saveDisponibilidadDocente({
        docente_id: docenteTarget,
        periodo_id: periodoId,
        bloques,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad-docente', docenteTarget, periodoId] })
      addToast('Disponibilidad guardada.', 'success')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  function horaEstaEnBloque(dia: DiaSemana, hora: string): boolean {
    const m = toMin(hora)
    return bloquesPorDia[dia].some(b => toMin(b.hora_inicio) <= m && m < toMin(b.hora_fin))
  }

  function toggleHora(dia: DiaSemana, hora: string) {
    const m = toMin(hora)
    const finM = m + 60

    setBloquesPorDia(prev => {
      const lista = [...prev[dia]]

      // Si ya está en un bloque, quitarlo
      const idx = lista.findIndex(b => toMin(b.hora_inicio) <= m && m < toMin(b.hora_fin))
      if (idx !== -1) {
        const b = lista[idx]
        const nuevos: DiaBloque[] = []
        if (toMin(b.hora_inicio) < m) {
          nuevos.push({ ...b, hora_fin: hora })
        }
        if (toMin(b.hora_fin) > finM) {
          nuevos.push({ ...b, hora_inicio: `${String(finM / 60).padStart(2, '0')}:00` })
        }
        lista.splice(idx, 1, ...nuevos)
        return { ...prev, [dia]: mergeAndSort(lista) }
      }

      // Agregar nuevo bloque de 1 hora y fusionar con adyacentes
      lista.push({ hora_inicio: hora, hora_fin: `${String(finM / 60).padStart(2, '0')}:00`, dragging: false })
      return { ...prev, [dia]: mergeAndSort(lista) }
    })
  }

  function mergeAndSort(bloques: DiaBloque[]): DiaBloque[] {
    if (bloques.length === 0) return []
    const sorted = [...bloques].sort((a, b) => toMin(a.hora_inicio) - toMin(b.hora_inicio))
    const merged: DiaBloque[] = [sorted[0]]
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1]
      if (toMin(sorted[i].hora_inicio) <= toMin(last.hora_fin)) {
        merged[merged.length - 1] = { ...last, hora_fin: sorted[i].hora_fin }
      } else {
        merged.push(sorted[i])
      }
    }
    return merged
  }

  function limpiarDia(dia: DiaSemana) {
    setBloquesPorDia(prev => ({ ...prev, [dia]: [] }))
  }

  const diasNoLab = data?.dias_no_laborables ?? []

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Disponibilidad docente</h1>
        <p className="text-sm text-slate-500 mt-0.5">Marca las horas en que estás disponible para impartir clase.</p>
      </div>

      {/* Selector de periodo */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Periodo</label>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Selecciona un periodo</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {periodoId && (
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
          </button>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-500 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-slate-200 inline-block" /> No disponible
        </span>
      </div>

      {/* Grid de disponibilidad */}
      {periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-slate-500 w-16">Hora</th>
                  {DIAS.map(d => (
                    <th key={d} className="px-2 py-2 text-center text-slate-700 font-semibold">
                      <div>{DIA_LABEL[d]}</div>
                      <button
                        onClick={() => limpiarDia(d)}
                        className="text-[10px] text-slate-400 hover:text-red-500 font-normal"
                      >
                        Limpiar
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map(hora => (
                  <tr key={hora} className="border-b border-slate-50">
                    <td className="px-3 py-1 text-slate-400 font-mono tabular-nums">{hora}</td>
                    {DIAS.map(dia => {
                      const activo = horaEstaEnBloque(dia, hora)
                      return (
                        <td
                          key={dia}
                          onClick={() => periodoId && toggleHora(dia, hora)}
                          className={`px-1 py-1 text-center cursor-pointer select-none transition-colors ${
                            activo
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`block h-6 rounded ${activo ? 'bg-blue-400' : ''}`} />
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

      {/* Resumen de bloques */}
      {periodoId && DIAS.some(d => bloquesPorDia[d].length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Resumen de disponibilidad</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIAS.filter(d => bloquesPorDia[d].length > 0).map(dia => (
              <div key={dia} className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{DIA_LABEL[dia]}:</span>{' '}
                {bloquesPorDia[dia].map(b => `${b.hora_inicio}–${b.hora_fin}`).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Días no laborables del periodo */}
      {diasNoLab.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-amber-800 mb-2">Días no laborables en el periodo</h2>
          <ul className="space-y-0.5">
            {diasNoLab.map((d, i) => (
              <li key={i} className="text-xs text-amber-700">
                {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {d.descripcion && ` — ${d.descripcion}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
