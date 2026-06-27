import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type CargaAcademica, type Horario } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { useAuthStore } from '../../../../store/authStore'
import { Field, SkeletonRows, icls, selectCls, inputCls, ModalWrap, usePeriodos, mutationError, extractApiErrors } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'
import apiClient from '../../../../config/apiClient'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
type DiaKey = typeof DIAS[number]

const DIA_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const DIA_FULL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const DIA_HEADER: Record<string, string> = {
  lunes: 'LUNES', martes: 'MARTES', miercoles: 'MIÉRCOLES', jueves: 'JUEVES', viernes: 'VIERNES', sabado: 'SÁBADO',
}
const TURNO_COLOR: Record<string, string> = {
  matutino: 'bg-sky-100 text-sky-700',
  vespertino: 'bg-violet-100 text-violet-700',
  sabatino: 'bg-orange-100 text-orange-700',
}
const HORA_SLOTS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
  '15:00','16:00','17:00','18:00','19:00','20:00','21:00',
]

type Docente = { id: string; name: string; email: string; clave_empleado?: string; no_huella?: string; nombramiento?: string; tipo_horas?: string }

function useAulas() {
  return useQuery({
    queryKey: ['aulas-select'],
    queryFn: () => apiClient.get('/aulas').then(r => r.data.data as { id: string; nombre: string; tipo: string; capacidad: number }[]),
    staleTime: 60_000,
  })
}

function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
    staleTime: 60_000,
  })
}

function fmt12(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`
}

// Convierte "07:00" a minutos desde medianoche
function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}


// Tipos internos del accordion
type GrupoEntry = { id: string; clave: string; turno: string; cargas: CargaAcademica[]; horarios_liberados: boolean }
type SemestreEntry = { semestre: number; grupos: Map<string, GrupoEntry> }
type CarreraEntry = { id: string; nombre: string; clave: string; semestres: Map<number, SemestreEntry> }

function CargasAccordion({
  cargas,
  onLiberarGrupo,
  onLiberarBulk,
  esSuperadmin = false,
}: {
  cargas: CargaAcademica[]
  onLiberarGrupo?: (grupoId: string, liberar: boolean) => void
  onLiberarBulk?: (params: { carrera_id?: string; semestre?: number; liberar: boolean }) => void
  esSuperadmin?: boolean
}) {
  const [openCarreras, setOpenCarreras] = useState<Set<string>>(() => new Set())
  const [openSemestres, setOpenSemestres] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    set(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }, [])

  // Agrupar por carrera → semestre → grupo
  const byCarrera = useMemo(() => {
    const map = new Map<string, CarreraEntry>()

    for (const c of cargas) {
      const carrera = c.grupo?.carrera ?? c.materia?.carrera
      const carreraId = carrera?.id ?? '_sin_carrera'
      const semestre = c.grupo?.semestre ?? 0
      const grupoId = c.grupo?.id ?? '_sin_grupo'
      const grupoClave = c.grupo?.clave ?? 'Sin grupo'
      const grupoTurno = c.grupo?.turno ?? ''

      if (!map.has(carreraId)) {
        map.set(carreraId, {
          id: carreraId,
          nombre: carrera?.nombre ?? 'Sin carrera',
          clave: carrera?.clave ?? '—',
          semestres: new Map(),
        })
      }
      const ce = map.get(carreraId)!

      if (!ce.semestres.has(semestre)) ce.semestres.set(semestre, { semestre, grupos: new Map() })
      const se = ce.semestres.get(semestre)!

      if (!se.grupos.has(grupoId)) se.grupos.set(grupoId, { id: grupoId, clave: grupoClave, turno: grupoTurno, cargas: [], horarios_liberados: c.grupo?.horarios_liberados ?? false })
      se.grupos.get(grupoId)!.cargas.push(c)
    }

    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cargas])

  // Auto-expand si solo hay una carrera
  useMemo(() => {
    if (byCarrera.length === 1) {
      const c = byCarrera[0]
      setOpenCarreras(new Set([c.id]))
    }
  }, [byCarrera])

  const Chevron = ({ open, size = 'w-4 h-4' }: { open: boolean; size?: string }) => (
    <svg className={`${size} text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )

  return (
    <div className="space-y-3">
      {byCarrera.map(carrera => {
        const isOpenC = openCarreras.has(carrera.id)
        const totalCargas = [...carrera.semestres.values()]
          .flatMap(s => [...s.grupos.values()])
          .reduce((sum, g) => sum + g.cargas.length, 0)
        const sortedSems = [...carrera.semestres.values()].sort((a, b) => a.semestre - b.semestre)

        return (
          <div key={carrera.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">

            {/* ── Nivel 1: Carrera ── */}
            <div className="flex items-center gap-2 px-5 py-4 hover:bg-slate-50 transition-colors">
              <button
                className="flex items-center gap-3 flex-1 text-left min-w-0"
                onClick={() => toggle(setOpenCarreras, carrera.id)}
              >
                <Chevron open={isOpenC} />
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  {carrera.clave}
                </span>
                <span className="font-semibold text-slate-800 text-sm truncate">{carrera.nombre}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">{totalCargas} carga{totalCargas !== 1 ? 's' : ''}</span>
              </button>
              {esSuperadmin && onLiberarBulk && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onLiberarBulk({ carrera_id: carrera.id, liberar: true })}
                    className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 whitespace-nowrap"
                    title="Liberar todos los grupos de esta carrera"
                  >Liberar carrera</button>
                  <button
                    onClick={() => onLiberarBulk({ carrera_id: carrera.id, liberar: false })}
                    className="text-xs px-2 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    title="Ocultar todos los grupos de esta carrera"
                  >Ocultar</button>
                </div>
              )}
            </div>

            {isOpenC && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {sortedSems.map(semEntry => {
                  const semKey = `${carrera.id}|${semEntry.semestre}`
                  const isOpenS = openSemestres.has(semKey)
                  const totalSem = [...semEntry.grupos.values()].reduce((s, g) => s + g.cargas.length, 0)
                  const sortedGrupos = [...semEntry.grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave))

                  return (
                    <div key={semKey}>

                      {/* ── Nivel 2: Semestre ── */}
                      <div className="flex items-center gap-2 pl-10 pr-5 py-2.5 hover:bg-slate-50/80 transition-colors">
                        <button
                          className="flex items-center gap-3 flex-1 text-left min-w-0"
                          onClick={() => toggle(setOpenSemestres, semKey)}
                        >
                          <Chevron open={isOpenS} size="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold text-slate-600">
                            {semEntry.semestre > 0 ? `${semEntry.semestre}° Semestre` : 'Sin semestre'}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">· {sortedGrupos.length} grupo{sortedGrupos.length !== 1 ? 's' : ''}</span>
                          <span className="ml-auto text-xs text-slate-400">{totalSem} asignatura{totalSem !== 1 ? 's' : ''}</span>
                        </button>
                        {esSuperadmin && onLiberarBulk && semEntry.semestre > 0 && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => onLiberarBulk({ carrera_id: carrera.id, semestre: semEntry.semestre, liberar: true })}
                              className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                              title={`Liberar ${semEntry.semestre}° semestre`}
                            >Liberar sem.</button>
                            <button
                              onClick={() => onLiberarBulk({ carrera_id: carrera.id, semestre: semEntry.semestre, liberar: false })}
                              className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                            >Ocultar</button>
                          </div>
                        )}
                      </div>

                      {isOpenS && (
                        <div className="border-t border-slate-50 divide-y divide-slate-50">
                          {sortedGrupos.map(grupo => (
                            <div key={grupo.id} className="flex items-center gap-2 pl-16 pr-5 py-2 hover:bg-blue-50/30 transition-colors">
                              <Link
                                to={`/admin/gestion-academica/grupos/${grupo.id}`}
                                className="flex items-center gap-3 flex-1 min-w-0 hover:text-blue-700 group"
                              >
                                <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700 px-2 py-0.5 rounded shrink-0 transition-colors">
                                  {grupo.clave}
                                </span>
                                {grupo.turno && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TURNO_COLOR[grupo.turno] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {grupo.turno}
                                  </span>
                                )}
                                {grupo.horarios_liberados && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">liberado</span>
                                )}
                                <span className="ml-auto text-xs text-slate-400">
                                  {grupo.cargas.length} materia{grupo.cargas.length !== 1 ? 's' : ''}
                                </span>
                              </Link>
                              {esSuperadmin && onLiberarGrupo && (
                                <button
                                  onClick={e => { e.preventDefault(); onLiberarGrupo(grupo.id, !grupo.horarios_liberados) }}
                                  className={`text-xs px-2 py-0.5 rounded border shrink-0 transition-colors ${
                                    grupo.horarios_liberados
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {grupo.horarios_liberados ? 'Ocultar' : 'Liberar'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Chip de horario ───────────────────────────────────────────────────────────

function HorarioChip({ h }: { h: Horario }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-xs font-medium">
      <span className="font-semibold">{DIA_SHORT[h.dia_semana]}</span>
      <span className="text-blue-400">·</span>
      {fmt12(h.hora_inicio)}–{fmt12(h.hora_fin)}
    </span>
  )
}

// ── Vista de carga docente (estilo documento oficial) ─────────────────────────

function CargaDocenteView({
  docente,
  cargas,
  periodo,
  onBack,
}: {
  docente: Docente
  cargas: CargaAcademica[]
  periodo?: { id: string; nombre: string; activo: boolean }
  onBack: () => void
}) {
  const totalHorasGrupo = cargas.reduce((s, c) => s + c.horas_semana, 0)
  const [descargando, setDescargando] = useState(false)

  async function descargarPdf() {
    setDescargando(true)
    try {
      const params = periodo ? `?periodo_id=${periodo.id}` : ''
      const res = await apiClient.get(`/docentes/${docente.id}/carga-academica/pdf${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `CargaAcademica_${docente.name.replace(/ /g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDescargando(false)
    }
  }

  // Construir cuadrícula horaria
  type CeldaHorario = { label: string; color: string } | null
  const grid: Record<string, Record<string, CeldaHorario>> = {}

  // Paleta de colores por carga (índice)
  const COLORS = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-orange-100 text-orange-800 border-orange-200',
  ]

  cargas.forEach((carga, idx) => {
    const color = COLORS[idx % COLORS.length]
    const label = `${carga.grupo?.clave ?? '?'}${carga.aula ? `-${carga.aula.nombre}` : ''}`
    ;(carga.horarios ?? []).forEach(h => {
      const inicioMin = toMin(h.hora_inicio)
      const finMin = toMin(h.hora_fin)
      HORA_SLOTS.forEach(slot => {
        const slotMin = toMin(slot)
        if (slotMin >= inicioMin && slotMin < finMin) {
          if (!grid[slot]) grid[slot] = {}
          grid[slot][h.dia_semana] = { label, color }
        }
      })
    })
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la lista
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm rounded-lg hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={descargarPdf}
            disabled={descargando}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {descargando ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Documento de carga */}
      <div className="bg-white rounded-xl overflow-hidden print:shadow-none print:border-0" id="carga-doc">

        {/* Encabezado institucional */}
        <div className="border-b-2 border-slate-800 px-6 py-3 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Instituto Tecnológico Superior de Martínez de la Torre</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">Carga Académica y/o Administrativa</p>
        </div>

        {/* Info del docente */}
        <div className="grid grid-cols-3 gap-0">
          {/* Columna izquierda */}
          <div className="col-span-2 divide-y">
            <div className="flex items-center px-4 py-2.5 gap-3">
              <span className="text-xs font-semiboldw-24 shrink-0">NOMBRE</span>
              <span className="font-bold uppercase tracking-wide">{docente.name}</span>
            </div>
            {periodo && (
              <div className="flex items-center px-4 py-2.5 gap-3">
                <span className="text-xs font-semibold text-slate-500 w-24 shrink-0">PERIODO</span>
                <span className="text-slate-800">{periodo.nombre}</span>
                {periodo.activo && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>}
              </div>
            )}
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              <div className="flex items-center px-4 py-2.5 gap-2">
                <span className="text-xs text-slate-500 shrink-0">CLAVE EMPLEADO</span>
                <span className="font-mono font-bold text-slate-800">{docente.clave_empleado ?? '—'}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 gap-2">
                <span className="text-xs text-slate-500 shrink-0">NO. HUELLA</span>
                <span className="font-mono font-bold text-slate-800">{docente.no_huella ?? '—'}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 gap-2">
                <span className="text-xs text-slate-500 shrink-0">NOMBRAMIENTO</span>
                <span className="text-slate-800 text-sm">{docente.nombramiento ?? '—'}</span>
              </div>
            </div>
          </div>
          {/* Columna derecha: resumen de horas */}
          <div className="divide-y divide-slate-200">
            <div className="px-3 py-2 bg-slate-50">
              <p className="text-xs font-bold text-slate-600 text-center uppercase tracking-wide">Tipo de Horas</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
              <div className="px-2 py-2">
                <p className="text-xs text-slate-400">Tipo A</p>
                <p className="font-bold text-slate-900">0</p>
              </div>
              <div className="px-2 py-2">
                <p className="text-xs text-slate-400">Tipo B</p>
                <p className="font-bold text-blue-700">{docente.tipo_horas === 'B' ? totalHorasGrupo : totalHorasGrupo}</p>
              </div>
            </div>
            <div className="flex justify-between items-center px-4 py-2">
              <span className="text-xs text-slate-500">Horas Frente a Grupo</span>
              <span className="font-bold text-slate-900">{totalHorasGrupo}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2 bg-blue-50">
              <span className="text-xs font-semibold text-slate-700">Total de Horas</span>
              <span className="font-bold text-blue-700 text-lg">{totalHorasGrupo}</span>
            </div>
          </div>
        </div>

        {/* Tabla de asignaturas */}
        <div className="border-b border-slate-200">
          <div className="bg-slate-800 text-white text-xs font-semibold text-center py-1.5 uppercase tracking-widest">
            Carga General
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr className="divide-x divide-slate-200">
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-left w-24">Carr. y Sem.</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-left w-24">Grupo</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-left w-28">Clave</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-left">Asignatura</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-center w-16">Horas</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 text-center w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Sin asignaturas asignadas.</td></tr>
              ) : (
                cargas.map((c, idx) => {
                  const carreraClave = c.grupo?.carrera?.clave ?? c.materia?.carrera?.clave ?? 'N/A'
                  const semestre = c.grupo?.semestre ?? '?'
                  const isLast = idx === cargas.length - 1
                  return (
                    <tr key={c.id} className="divide-x divide-slate-100 hover:bg-blue-50/40">
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">
                        {carreraClave}/{String(semestre).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{c.grupo?.clave ?? '—'}</span>
                          {c.grupo?.turno && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${TURNO_COLOR[c.grupo.turno] ?? ''}`}>
                              {c.grupo.turno.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{c.materia?.clave ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{c.materia?.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-900">{c.horas_semana}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-700">
                        {isLast ? totalHorasGrupo : ''}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Horarios semanales */}
        <div>
          <div className="bg-slate-800 text-white text-xs font-semibold text-center py-1.5 uppercase tracking-widest">
            Horarios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="divide-x divide-slate-200 bg-slate-100">
                  <th className="px-3 py-2 text-slate-600 font-semibold text-left w-20">Hora</th>
                  {DIAS.map(d => (
                    <th key={d} className="px-2 py-2 text-slate-600 font-semibold text-center">{DIA_HEADER[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HORA_SLOTS.slice(0, -1).map((slot, i) => {
                  const nextSlot = HORA_SLOTS[i + 1]
                  const row = grid[slot] ?? {}
                  const hasAny = DIAS.some(d => row[d])
                  return (
                    <tr key={slot} className={`divide-x divide-slate-100 ${hasAny ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-3 py-1.5 font-mono text-slate-500 text-xs font-medium whitespace-nowrap">
                        {slot}–{nextSlot}
                      </td>
                      {DIAS.map(d => {
                        const cell = row[d]
                        return (
                          <td key={d} className="px-1.5 py-1">
                            {cell ? (
                              <div className={`border rounded px-1.5 py-1 text-center font-semibold leading-tight ${cell.color}`}>
                                {cell.label}
                              </div>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {/* Fila de totales de horas al día */}
                <tr className="bg-slate-100 divide-x divide-slate-200 font-semibold">
                  <td className="px-3 py-1.5 text-xs text-slate-600">Horas al día</td>
                  {DIAS.map(d => {
                    let hrs = 0
                    cargas.forEach(c => {
                      ;(c.horarios ?? []).forEach(h => {
                        if (h.dia_semana === d) {
                          hrs += (toMin(h.hora_fin) - toMin(h.hora_inicio)) / 60
                        }
                      })
                    })
                    return (
                      <td key={d} className="px-2 py-1.5 text-center text-slate-800">
                        {hrs > 0 ? hrs : ''}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: firmas */}
        <div className="border-t border-slate-200 grid grid-cols-3 divide-x divide-slate-200 px-0">
          {['Personal Docente', 'División Académica', 'Subdirección Académica'].map(f => (
            <div key={f} className="px-4 py-6 text-center">
              <div className="border-t border-slate-400 mt-8 pt-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{f}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal: visualizar carga completa del docente ──────────────────────────────

function HorarioDocenteModal({
  docente,
  cargas,
  periodo,
  onClose,
}: {
  docente: Docente
  cargas: CargaAcademica[]
  periodo?: { id: string; nombre: string; activo: boolean }
  onClose: () => void
}) {
  return (
    <>
      {/* Estilos de impresión: oculta todo excepto el modal */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #horario-docente-print { display: block !important; position: static !important; }
          #horario-docente-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl" id="horario-docente-print">
          {/* Toolbar — se oculta al imprimir */}
          <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Carga Académica · {docente.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
          </div>

          {/* Contenido del documento */}
          <div className="p-6">
            <CargaDocenteView
              docente={docente}
              cargas={cargas}
              periodo={periodo}
              onBack={onClose}
            />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Modal de horarios ─────────────────────────────────────────────────────────

function HorariosModal({ carga, onClose }: { carga: CargaAcademica; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const [bloques, setBloques] = useState(
    (carga.horarios ?? []).map(h => ({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio.slice(0, 5), hora_fin: h.hora_fin.slice(0, 5) }))
  )

  const save = useMutation({
    mutationFn: () => academicoApi.saveHorarios(carga.id, bloques),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargas'] }); addToast('Horarios guardados.', 'success'); onClose() },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Horario semanal</h2>
            <p className="text-xs text-slate-500 mt-0.5">{carga.materia?.nombre} · {carga.grupo?.clave}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {bloques.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Sin bloques de horario. Agrega uno abajo.</p>
          )}
          {bloques.map((bl, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
              <select
                value={bl.dia_semana}
                onChange={e => setBloques(b => b.map((x, j) => j === i ? { ...x, dia_semana: e.target.value as DiaKey } : x))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              >
                {DIAS.map(d => <option key={d} value={d}>{DIA_FULL[d]}</option>)}
              </select>
              <input type="time" value={bl.hora_inicio}
                onChange={e => setBloques(b => b.map((x, j) => j === i ? { ...x, hora_inicio: e.target.value } : x))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
              <span className="text-slate-400">–</span>
              <input type="time" value={bl.hora_fin}
                onChange={e => setBloques(b => b.map((x, j) => j === i ? { ...x, hora_fin: e.target.value } : x))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
              <button onClick={() => setBloques(b => b.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 ml-auto">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => setBloques(b => [...b, { dia_semana: 'lunes' as DiaKey, hora_inicio: '07:00', hora_fin: '08:00' }])}
            className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + Agregar bloque de horario
          </button>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {save.isPending ? 'Guardando…' : 'Guardar horarios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const BLANK: Partial<CargaAcademica> = { horas_semana: 3 }

export default function CargasPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroDocente, setFiltroDocente] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [vistaTabla, setVistaTabla] = useState(false)
  const [vistaDocente, setVistaDocente] = useState(false)
  const [modal, setModal] = useState<Partial<CargaAcademica> | null>(null)
  const [horariosModal, setHorariosModal] = useState<CargaAcademica | null>(null)
  const [horarioDocenteModal, setHorarioDocenteModal] = useState<Docente | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const { data: periodos = [] } = usePeriodos()
  const { data: aulas = [] } = useAulas()
  const { data: carreras = [] } = useCarreras()
  const { data: docentes = [] } = useQuery({ queryKey: ['docentes'], queryFn: academicoApi.getDocentes, staleTime: 60_000 })
  const { data: materias = [] } = useQuery({ queryKey: ['materias'], queryFn: () => academicoApi.getMaterias(), staleTime: 30_000 })
  const { data: grupos = [] } = useQuery({ queryKey: ['grupos'], queryFn: () => academicoApi.getGrupos(), staleTime: 30_000 })

  const params: Record<string, string> = {}
  if (filtroPeriodo) params.periodo_id = filtroPeriodo
  if (filtroDocente) params.docente_id = filtroDocente

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas', params],
    queryFn: () => academicoApi.getCargas(params),
  })

  const cargasFiltradas = useMemo(() => {
    let list = cargas as CargaAcademica[]
    if (filtroCarrera) list = list.filter(c => (c.materia?.carrera?.id ?? c.grupo?.carrera?.id) === filtroCarrera)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(c =>
        c.docente?.name?.toLowerCase().includes(q) ||
        c.materia?.nombre?.toLowerCase().includes(q) ||
        c.grupo?.clave?.toLowerCase().includes(q) ||
        c.materia?.clave?.toLowerCase().includes(q)
      )
    }
    return list
  }, [cargas, filtroCarrera, busqueda])

  const docenteSeleccionado = useMemo(
    () => docentes.find(d => d.id === filtroDocente) ?? null,
    [docentes, filtroDocente]
  )

  const periodoSeleccionado = useMemo(
    () => periodos.find(p => p.id === filtroPeriodo) ?? periodos.find(p => p.activo) ?? null,
    [periodos, filtroPeriodo]
  )

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateCarga(modal.id!, modal) : academicoApi.createCarga(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargas'] }); addToast('Carga guardada.', 'success'); setModal(null); setErrors({}) },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteCarga(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargas'] }); addToast('Carga eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const liberarHorariosMut = useMutation({
    mutationFn: ({ id, liberar }: { id: string; liberar: boolean }) =>
      apiClient.patch(`/admin/periodos/${id}/liberar-horarios`, { liberar }).then(r => r.data.data),
    onSuccess: (data: { nombre: string; horarios_liberados: boolean }) => {
      qc.invalidateQueries({ queryKey: ['periodos'] })
      addToast(
        data.horarios_liberados
          ? `Horarios del periodo "${data.nombre}" liberados a los alumnos.`
          : `Horarios del periodo "${data.nombre}" ocultados.`,
        'success'
      )
    },
    onError: () => addToast('Error al cambiar el estado de liberación.', 'error'),
  })

  const liberarGrupoMut = useMutation({
    mutationFn: ({ grupoId, liberar }: { grupoId: string; liberar: boolean }) =>
      academicoApi.liberarGrupoHorarios(grupoId, liberar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cargas'] })
      qc.invalidateQueries({ queryKey: ['grupos'] })
    },
    onError: () => addToast('Error al cambiar el estado del grupo.', 'error'),
  })

  const liberarBulkMut = useMutation({
    mutationFn: (params: { periodo_id?: string; carrera_id?: string; semestre?: number; liberar: boolean }) =>
      academicoApi.liberarHorariosBulk(params),
    onSuccess: (data: { data: { grupos_afectados: number }; message: string }) => {
      qc.invalidateQueries({ queryKey: ['cargas'] })
      qc.invalidateQueries({ queryKey: ['grupos'] })
      addToast(data.message ?? 'Grupos actualizados.', 'success')
    },
    onError: () => addToast('Error al liberar horarios.', 'error'),
  })

  const set = (k: keyof CargaAcademica, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  const totalHoras = cargasFiltradas.reduce((s, c) => s + c.horas_semana, 0)
  const docentesActivos = new Set(cargasFiltradas.map(c => c.docente_id)).size
  const sinHorario = cargasFiltradas.filter(c => (c.horarios ?? []).length === 0).length

  // Vista de carga por docente
  if (vistaDocente && docenteSeleccionado) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-5">
          <div>
            <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Gestión Académica
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Carga Académica · Documento</h1>
          </div>
          <CargaDocenteView
            docente={docenteSeleccionado}
            cargas={cargasFiltradas}
            periodo={periodoSeleccionado ?? undefined}
            onBack={() => setVistaDocente(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Cargas Académicas</h1>
              <p className="text-sm text-slate-500 mt-0.5">Asignación de materias, grupos y horarios a docentes por periodo</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {docenteSeleccionado && (
                <button
                  onClick={() => setVistaDocente(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ver documento
                </button>
              )}
              <Link
                to="/admin/gestion-academica/cargas/builder"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-violet-300 bg-violet-50 text-violet-700 text-sm rounded-lg hover:bg-violet-100"
                title="Constructor de horarios con arrastrar y soltar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Constructor
              </Link>
              <button
                onClick={() => setVistaTabla(v => !v)}
                className="px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
                title={vistaTabla ? 'Vista tarjetas' : 'Vista tabla'}
              >
                {vistaTabla ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                )}
              </button>
              {esSuperadmin && periodoSeleccionado && (
                <button
                  onClick={() => liberarHorariosMut.mutate({
                    id: periodoSeleccionado.id,
                    liberar: !periodoSeleccionado?.horarios_liberados,
                  })}
                  disabled={liberarHorariosMut.isPending}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-60 ${
                    periodoSeleccionado?.horarios_liberados
                      ? 'text-violet-700 border-violet-300 bg-violet-50 hover:bg-violet-100'
                      : 'text-slate-600 border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                  title={periodoSeleccionado?.horarios_liberados
                    ? 'Ocultar horarios a los alumnos'
                    : 'Liberar horarios a los alumnos de 1er semestre'}
                >
                  {periodoSeleccionado?.horarios_liberados ? '🔓 Ocultar horarios' : '🔒 Liberar horarios'}
                </button>
              )}
              <button
                onClick={() => setModal({ ...BLANK })}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                + Asignar carga
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {cargasFiltradas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Total cargas</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{cargasFiltradas.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Horas / semana</p>
              <p className="text-2xl font-bold text-blue-700 mt-0.5">{totalHoras}h</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Docentes con carga</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{docentesActivos}</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${sinHorario > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs ${sinHorario > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Sin horario asignado</p>
              <p className={`text-2xl font-bold mt-0.5 ${sinHorario > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{sinHorario}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
              <input className={inputCls} placeholder="Docente, materia, grupo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
              <select className={selectCls} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                <option value="">Todos los periodos</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
              <select className={selectCls} value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}>
                <option value="">Todos</option>
                {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
              <select className={selectCls} value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
                <option value="">Todas</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
              </select>
            </div>
          </div>
          {docenteSeleccionado && (
            <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm text-blue-800 font-medium">{docenteSeleccionado.name}</span>
              {docenteSeleccionado.nombramiento && <span className="text-xs text-blue-600">· {docenteSeleccionado.nombramiento}</span>}
              {docenteSeleccionado.clave_empleado && <span className="text-xs text-blue-500 font-mono">({docenteSeleccionado.clave_empleado})</span>}
              <button onClick={() => setVistaDocente(true)} className="ml-auto text-xs text-blue-600 hover:underline font-medium">
                Ver documento de carga →
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><SkeletonRows cols={7} /></tbody></table>
          </div>
        ) : cargasFiltradas.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No hay cargas académicas con los filtros seleccionados.</p>
          </div>
        ) : vistaTabla ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Materia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Periodo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">H/sem</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargasFiltradas.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">{c.docente?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 truncate max-w-[180px]">{c.materia?.nombre ?? '—'}</p>
                      <p className="text-xs text-slate-400 font-mono">{c.materia?.clave}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{c.grupo?.clave ?? '—'}</span>
                      {c.grupo?.semestre && <span className="ml-1.5 text-xs text-slate-500">{c.grupo.semestre}°</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.grupo?.carrera?.clave ?? c.materia?.carrera?.clave ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.periodo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {(c.horarios ?? []).length === 0 ? (
                        <button onClick={() => setHorariosModal(c)} className="text-xs text-amber-600 hover:underline">Sin horario</button>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.horarios!.slice(0, 2).map(h => <HorarioChip key={h.id} h={h} />)}
                          {c.horarios!.length > 2 && <span className="text-xs text-slate-400">+{c.horarios!.length - 2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900">{c.horas_semana}h</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {c.docente && <button onClick={() => setHorarioDocenteModal(c.docente as Docente)} className="text-xs text-violet-600 hover:underline">Ver carga</button>}
                      <button onClick={() => setHorariosModal(c)} className="text-xs text-blue-600 hover:underline">Horario</button>
                      <button onClick={() => setModal(c)} className="text-xs text-slate-600 hover:underline">Editar</button>
                      <button onClick={() => confirm({ title: '¿Eliminar carga?', description: `${c.docente?.name} · ${c.materia?.nombre}`, confirmLabel: 'Eliminar', onConfirm: () => del.mutateAsync(c.id) })} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CargasAccordion
            cargas={cargasFiltradas}
            esSuperadmin={esSuperadmin}
            onLiberarGrupo={(grupoId, liberar) => liberarGrupoMut.mutate({ grupoId, liberar })}
            onLiberarBulk={(params) => liberarBulkMut.mutate({ ...params, periodo_id: periodoSeleccionado?.id })}
          />
        )}
      </div>

      {confirmDialog}

      {horariosModal && <HorariosModal carga={horariosModal} onClose={() => setHorariosModal(null)} />}

      {horarioDocenteModal && (
        <HorarioDocenteModal
          docente={horarioDocenteModal}
          cargas={cargasFiltradas.filter(c => c.docente_id === horarioDocenteModal.id)}
          periodo={periodoSeleccionado ?? undefined}
          onClose={() => setHorarioDocenteModal(null)}
        />
      )}

      {modal !== null && (
        <ModalWrap
          title={modal.id ? 'Editar carga académica' : 'Asignar nueva carga'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          <Field label="Docente *" full error={errors.docente_id}>
            <select className={icls(errors.docente_id)} value={modal.docente_id ?? ''} onChange={e => set('docente_id', e.target.value)}>
              <option value="">— Seleccionar docente —</option>
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}{d.nombramiento ? ` · ${d.nombramiento}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Materia / Asignatura" full error={errors.materia_id}>
            <select className={icls(errors.materia_id)} value={modal.materia_id ?? ''} onChange={e => set('materia_id', e.target.value)}>
              <option value="">— Seleccionar materia —</option>
              {(materias as { id: string; nombre: string; clave: string }[]).map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.clave})</option>
              ))}
            </select>
          </Field>
          <Field label="Grupo" error={errors.grupo_id}>
            <select className={icls(errors.grupo_id)} value={modal.grupo_id ?? ''} onChange={e => set('grupo_id', e.target.value)}>
              <option value="">— Seleccionar grupo —</option>
              {(grupos as { id: string; clave: string; semestre: number; carrera?: { clave: string } }[]).map(g => (
                <option key={g.id} value={g.id}>{g.clave} — {g.carrera?.clave ?? ''} {g.semestre}°</option>
              ))}
            </select>
          </Field>
          <Field label="Periodo" error={errors.periodo_id}>
            <select className={icls(errors.periodo_id)} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
              <option value="">— Seleccionar periodo —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
            </select>
          </Field>
          <Field label="Aula" error={errors.aula_id}>
            <select className={icls(errors.aula_id)} value={modal.aula_id ?? ''} onChange={e => set('aula_id', e.target.value || null as unknown as string)}>
              <option value="">— Sin asignar —</option>
              {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre} (cap. {a.capacidad})</option>)}
            </select>
          </Field>
          <Field label="Horas por semana" error={errors.horas_semana}>
            <input className={icls(errors.horas_semana)} type="number" min={1} max={40}
              value={modal.horas_semana ?? 3} onChange={e => set('horas_semana', Number(e.target.value))} />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
