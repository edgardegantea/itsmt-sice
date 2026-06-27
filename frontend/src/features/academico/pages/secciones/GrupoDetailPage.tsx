import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import type { CargaAcademica, Horario } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Th, EmptyRow, mutationError, inputCls } from '../tabs/shared'
import { useAlumnos } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'

// ── Horario semanal ───────────────────────────────────────────────────────────

const DIAS: Horario['dia_semana'][] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const HORA_INICIO = 7
const HORA_FIN    = 20
const SLOT_PX     = 52

const COLORES = [
  { bg: 'bg-blue-100',    border: 'border-blue-400',    text: 'text-blue-900'    },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900' },
  { bg: 'bg-violet-100',  border: 'border-violet-400',  text: 'text-violet-900'  },
  { bg: 'bg-amber-100',   border: 'border-amber-400',   text: 'text-amber-900'   },
  { bg: 'bg-pink-100',    border: 'border-pink-400',    text: 'text-pink-900'    },
  { bg: 'bg-cyan-100',    border: 'border-cyan-400',    text: 'text-cyan-900'    },
  { bg: 'bg-orange-100',  border: 'border-orange-400',  text: 'text-orange-900'  },
  { bg: 'bg-rose-100',    border: 'border-rose-400',    text: 'text-rose-900'    },
]

function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function HorarioSemanalGrid({ cargas }: { cargas: CargaAcademica[] }) {
  const horasRange = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const totalH     = (HORA_FIN - HORA_INICIO) * SLOT_PX
  const colorMap   = useMemo(() => {
    const m: Record<string, typeof COLORES[0]> = {}
    cargas.forEach((c, i) => { m[c.id] = COLORES[i % COLORES.length] })
    return m
  }, [cargas])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex" style={{ marginLeft: 52 }}>
          {DIAS.map(d => (
            <div key={d} className="flex-1 text-center text-xs font-semibold text-slate-500 py-1.5 border-b border-slate-200 uppercase tracking-wide">
              {DIA_LABEL[d]}
            </div>
          ))}
        </div>
        <div className="flex">
          <div className="shrink-0" style={{ width: 52 }}>
            {horasRange.map(h => (
              <div key={h} className="flex items-start justify-end pr-2 text-[10px] text-slate-400 border-b border-dashed border-slate-100"
                style={{ height: SLOT_PX }}>
                <span className="-translate-y-1.5">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {DIAS.map(dia => (
            <div key={dia} className="flex-1 relative border-l border-slate-100" style={{ height: totalH }}>
              {horasRange.map(h => (
                <div key={h} className="absolute left-0 right-0 border-b border-dashed border-slate-100"
                  style={{ top: (h - HORA_INICIO) * SLOT_PX }} />
              ))}
              {cargas.flatMap(c =>
                (c.horarios ?? [])
                  .filter(h => h.dia_semana === dia)
                  .map(h => {
                    const top    = (toMin(h.hora_inicio) - HORA_INICIO * 60) / 60 * SLOT_PX
                    const height = (toMin(h.hora_fin) - toMin(h.hora_inicio)) / 60 * SLOT_PX - 3
                    const col    = colorMap[c.id]
                    return (
                      <div key={h.id}
                        className={`absolute left-0.5 right-0.5 rounded border-l-4 px-1 py-0.5 text-[10px] leading-tight overflow-hidden ${col.bg} ${col.border} ${col.text}`}
                        style={{ top, height }}
                      >
                        <div className="font-semibold truncate">{c.materia?.nombre}</div>
                        {c.docente && <div className="opacity-60 truncate">{c.docente.name}</div>}
                        {c.aula && <div className="opacity-60 truncate">{c.aula.nombre}</div>}
                        <div className="opacity-60">{h.hora_inicio.slice(0,5)}–{h.hora_fin.slice(0,5)}</div>
                      </div>
                    )
                  })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TURNO_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  sabatino: 'Sabatino',
}

function alumnoNombre(a: {
  user?: { name: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}): string {
  if (a.user?.name) return a.user.name
  if (a.inscripcion?.aspirante) {
    const asp = a.inscripcion.aspirante
    return `${asp.nombres} ${asp.apellido_paterno} ${asp.apellido_materno ?? ''}`.trim()
  }
  return '—'
}

export default function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [asignarOpen, setAsignarOpen] = useState(false)
  const [selAlumnos, setSelAlumnos] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { data: grupo, isLoading } = useQuery({
    queryKey: ['grupo-detalle', id],
    queryFn: () => academicoApi.getGrupo(id!),
    enabled: !!id,
  })

  const { data: todosAlumnos = [] } = useAlumnos(
    grupo ? { carrera_id: grupo.carrera_id, semestre: grupo.semestre } : undefined
  )

  const asignar = useMutation({
    mutationFn: () => academicoApi.asignarAlumnos(id!, selAlumnos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle', id] })
      addToast('Alumnos asignados.', 'success')
      setAsignarOpen(false)
      setSelAlumnos([])
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const quitar = useMutation({
    mutationFn: (alumnoId: string) => academicoApi.quitarAlumno(id!, alumnoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle', id] })
      addToast('Alumno retirado.', 'success')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const alumnosEnGrupo = new Set((grupo?.alumnos ?? []).map(a => a.id))

  // El backend ya filtra por carrera_id + semestre; solo excluimos los ya asignados
  const alumnosElegibles = useMemo(() =>
    todosAlumnos.filter(a => !alumnosEnGrupo.has(a.id))
  , [todosAlumnos, alumnosEnGrupo])

  const alumnosDisponibles = useMemo(() => {
    if (!busqueda.trim()) return alumnosElegibles
    const q = busqueda.toLowerCase()
    return alumnosElegibles.filter(a => {
      const nombre = a.user?.name
        ?? (a.inscripcion?.aspirante
          ? `${a.inscripcion.aspirante.nombres} ${a.inscripcion.aspirante.apellido_paterno} ${a.inscripcion.aspirante.apellido_materno ?? ''}`.trim()
          : '')
      return (
        a.numero_control.toLowerCase().includes(q) ||
        nombre.toLowerCase().includes(q)
      )
    })
  }, [alumnosElegibles, busqueda])

  if (isLoading) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center text-slate-400 text-sm">
        Cargando grupo…
      </div>
    )
  }

  if (!grupo) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <p className="text-slate-500 text-sm">No se encontró el grupo.</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        {/* Breadcrumb interno */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/admin/gestion-academica" className="hover:text-slate-800 transition-colors">Gestión Académica</Link>
          <span className="text-slate-300">/</span>
          <Link to="/admin/gestion-academica/grupos" className="hover:text-slate-800 transition-colors">Grupos</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium">{grupo.clave}</span>
        </nav>

        {/* Header del grupo */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{grupo.clave}</h1>
              <p className="text-slate-500 text-sm mt-1">{grupo.carrera?.nombre ?? '—'}</p>
            </div>
            <Link
              to="/admin/gestion-academica/grupos"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Grupos
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Periodo</p>
              <p className="text-sm font-semibold text-slate-900">{grupo.periodo?.nombre ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Semestre</p>
              <p className="text-sm font-semibold text-slate-900">{grupo.semestre}°</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Turno</p>
              <p className="text-sm font-semibold text-slate-900">{TURNO_LABEL[grupo.turno] ?? grupo.turno}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Capacidad</p>
              <p className={`text-sm font-semibold ${(grupo.alumnos?.length ?? 0) >= grupo.capacidad ? 'text-red-600' : 'text-slate-900'}`}>
                {grupo.alumnos?.length ?? 0} / {grupo.capacidad}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Alumnos del grupo */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Alumnos del grupo</h2>
            <button
              onClick={() => setAsignarOpen(o => !o)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {asignarOpen ? 'Cancelar' : '+ Asignar alumnos'}
            </button>
          </div>

          {/* Panel inline de asignación */}
          {asignarOpen && (
            <div className="border-b border-slate-100 bg-slate-50 p-5 space-y-3">
              {/* Info contextual */}
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Mostrando alumnos de <strong>{grupo.carrera?.clave}</strong> en <strong>{grupo.semestre}° semestre</strong>
                {grupo.semestre > 1 && (
                  <> — avanzan automáticamente según su progreso académico</>
                )}
              </div>

              {/* Búsqueda y controles */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o N° control…"
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span>{alumnosDisponibles.length} disponible{alumnosDisponibles.length !== 1 ? 's' : ''}</span>
                  {alumnosDisponibles.length > 0 && (
                    <button
                      onClick={() =>
                        setSelAlumnos(prev =>
                          prev.length === alumnosDisponibles.length
                            ? []
                            : alumnosDisponibles.map(a => a.id)
                        )
                      }
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {selAlumnos.length === alumnosDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de alumnos */}
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-50">
                {alumnosDisponibles.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center">
                    {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay alumnos disponibles para asignar.'}
                  </p>
                ) : (
                  alumnosDisponibles.map(a => {
                    const nombre = a.user?.name
                      ?? (a.inscripcion?.aspirante
                        ? `${a.inscripcion.aspirante.nombres} ${a.inscripcion.aspirante.apellido_paterno} ${a.inscripcion.aspirante.apellido_materno ?? ''}`.trim()
                        : '—')
                    const seleccionado = selAlumnos.includes(a.id)
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${seleccionado ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={e => setSelAlumnos(prev =>
                            e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id)
                          )}
                          className="w-4 h-4 accent-blue-600 shrink-0"
                        />
                        <span className="font-mono text-xs text-slate-500 w-24 shrink-0">{a.numero_control}</span>
                        <span className="flex-1 font-medium text-slate-800 text-sm">{nombre}</span>
                        <span className="text-xs text-slate-400 shrink-0">{a.carrera?.clave ?? '—'}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">{a.semestre_actual}° sem</span>
                      </label>
                    )
                  })
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 justify-between items-center">
                <span className="text-xs text-slate-500">
                  {selAlumnos.length > 0
                    ? `${selAlumnos.length} alumno${selAlumnos.length !== 1 ? 's' : ''} seleccionado${selAlumnos.length !== 1 ? 's' : ''}`
                    : alumnosElegibles.length === 0
                      ? 'No hay alumnos elegibles para este semestre y carrera.'
                      : ''}
                </span>
                <div className="flex gap-2">
                  {grupo.semestre > 1 && alumnosElegibles.length > 0 && selAlumnos.length === 0 && (
                    <button
                      onClick={() => setSelAlumnos(alumnosElegibles.map(a => a.id))}
                      className="px-3 py-1.5 text-xs border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium"
                    >
                      Auto-asignar todos ({alumnosElegibles.length})
                    </button>
                  )}
                  <button
                    onClick={() => { setAsignarOpen(false); setSelAlumnos([]); setBusqueda('') }}
                    className="text-xs text-slate-500 hover:underline px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => asignar.mutate()}
                    disabled={selAlumnos.length === 0 || asignar.isPending}
                    className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50 font-medium"
                  >
                    {asignar.isPending ? 'Asignando…' : `Asignar${selAlumnos.length > 0 ? ` (${selAlumnos.length})` : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>N° Control</Th>
                <Th>Nombre</Th>
                <Th>Semestre</Th>
                <Th>Fecha asignación</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(grupo.alumnos ?? []).length === 0 && <EmptyRow cols={5} msg="Sin alumnos asignados." />}
              {(grupo.alumnos ?? []).map(a => (
                <tr key={a.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer" onClick={() => navigate(`/admin/alumnos/${a.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.numero_control}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{alumnoNombre(a)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{a.semestre_actual}°</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {a.pivot?.fecha_asignacion
                      ? new Date(a.pivot.fecha_asignacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => confirm({
                        title: '¿Retirar alumno del grupo?',
                        description: `${alumnoNombre(a)} será desvinculado de este grupo.`,
                        confirmLabel: 'Retirar',
                        variant: 'warning',
                        onConfirm: () => quitar.mutateAsync(a.id),
                      })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {confirmDialog}

        {/* Sección: Horario semanal */}
        {(grupo.cargas ?? []).some(c => (c.horarios ?? []).length > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Horario semanal</h2>
            </div>
            <div className="p-4">
              <HorarioSemanalGrid cargas={grupo.cargas ?? []} />
            </div>
          </div>
        )}

        {/* Sección: Cargas académicas */}
        {(grupo.cargas ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Cargas académicas</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>Materia</Th>
                  <Th>Docente</Th>
                  <Th>Horas/semana</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(grupo.cargas ?? []).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-900">
                      <span className="font-mono text-xs text-slate-500 mr-2">{c.materia?.clave}</span>
                      {c.materia?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.docente?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{c.horas_semana}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
