import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'
import { useToastStore } from '../../../../store/toastStore'
import { mutationError } from '../tabs/shared'
import type { FichaDocente } from '../../services/academico'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Carrera { id: string; nombre: string; clave: string }

export interface CarreraAsignada extends Carrera {
  pivot?: { horas_asignadas: number | null }
}

export interface Docente {
  id: string
  name: string
  email: string
  clave_empleado?: string
  no_huella?: string
  nombramiento?: string
  tipo_horas?: string
  carrera_id?: string | null
  carrera?: Carrera | null
  carreras?: CarreraAsignada[]
  roles?: { name: string }[]
  curp?: string | null
  rfc?: string | null
  fecha_nacimiento?: string | null
  sexo?: string | null
  estado_civil?: string | null
  direccion?: string | null
  telefono?: string | null
  contacto_emergencia_nombre?: string | null
  contacto_emergencia_telefono?: string | null
  foto_path?: string | null
  foto_url?: string | null
  /** null = usa la configuración global de recordatorios de asistencia; true/false = excepción para este docente. */
  recordatorio_asistencia_activo?: boolean | null
}

export const SEXO_OPTS = ['Masculino', 'Femenino', 'Otro']
export const ESTADO_CIVIL_OPTS = ['Soltero(a)', 'Casado(a)', 'Divorciado(a)', 'Viudo(a)', 'Unión libre']

export interface BloqueDisponibilidad {
  id?: string
  dia_semana: string
  hora_inicio: string
  hora_fin: string
}

export interface HorarioCarga {
  id: string
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  carga_academica?: {
    id: string
    materia?: { nombre: string; clave: string }
    grupos?: { clave: string; semestre: number }[]
  }
}

export interface TituloAcademico { grado: string; institucion?: string; anio?: number }
export interface ExperienciaLaboral { puesto: string; institucion?: string; fecha_inicio?: string; fecha_fin?: string; descripcion?: string }
export interface CursoCapacitacion { nombre: string; institucion?: string; fecha?: string; horas?: number }
export interface Publicacion { titulo: string; medio?: string; anio?: number; url?: string }

export interface FichaDocenteCv {
  id: string
  docente_id: string
  tipo_contrato: string
  categoria?: string | null
  fecha_ingreso?: string | null
  semblanza?: string | null
  titulos_academicos?: TituloAcademico[] | null
  experiencia_laboral?: ExperienciaLaboral[] | null
  cursos_capacitacion?: CursoCapacitacion[] | null
  publicaciones?: Publicacion[] | null
  cv_actualizado_en?: string | null
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

export const NOMBRAMIENTO_OPTS = [
  'Docente de Tiempo Completo',
  'Docente de Medio Tiempo',
  'Docente por Horas',
  'Docente Honorario',
  'Técnico Docente',
]

export const TIPO_HORAS_OPTS = ['A', 'B', 'TC', 'Honorarios', 'Mixto']

export const DIAS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
export const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
export const DIA_COLOR: Record<string, string> = {
  lunes: 'bg-blue-50 text-blue-700 border-blue-100',
  martes: 'bg-violet-50 text-violet-700 border-violet-100',
  miercoles: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  jueves: 'bg-amber-50 text-amber-700 border-amber-100',
  viernes: 'bg-rose-50 text-rose-700 border-rose-100',
  sabado: 'bg-orange-50 text-orange-700 border-orange-100',
}

// ── API ───────────────────────────────────────────────────────────────────────

export function useDocentes(carreraId?: string) {
  return useQuery({
    queryKey: ['docentes-gestion', carreraId],
    queryFn: () => apiClient.get('/admin/docentes', { params: carreraId ? { carrera_id: carreraId } : {} })
      .then(r => r.data.data as Docente[]),
    staleTime: 30_000,
  })
}

export function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as Carrera[]),
    staleTime: 60_000,
  })
}

export function useDocente(id: string | undefined) {
  return useQuery({
    queryKey: ['docente-detalle', id],
    queryFn: () => apiClient.get(`/admin/usuarios/${id}`).then(r => r.data.data as Docente),
    enabled: !!id,
  })
}

export function useHorariosDocente(docenteId: string | null, periodoId: string) {
  return useQuery({
    queryKey: ['horarios-docente', docenteId, periodoId],
    enabled: !!docenteId && !!periodoId,
    queryFn: () =>
      apiClient.get('/horarios', { params: { docente_id: docenteId, periodo_id: periodoId } })
        .then(r => r.data.data as HorarioCarga[]),
    staleTime: 15_000,
  })
}

export function useDisponibilidad(docenteId: string, periodoId: string) {
  return useQuery({
    queryKey: ['disponibilidad-docente', docenteId, periodoId],
    enabled: !!docenteId && !!periodoId,
    queryFn: () => apiClient.get('/disponibilidad-docente', { params: { docente_id: docenteId, periodo_id: periodoId } })
      .then(r => r.data.data as { bloques: BloqueDisponibilidad[]; dias_no_laborables: { fecha: string; descripcion: string }[] }),
  })
}

export function useFichaDocente(docenteId?: string) {
  return useQuery({
    queryKey: ['ficha-docente', docenteId],
    enabled: !!docenteId,
    queryFn: () => apiClient.get('/docentes/fichas', { params: { docente_id: docenteId } })
      .then(r => {
        const lista = r.data.data?.data ?? r.data.data ?? []
        return (lista as FichaDocente[])[0] ?? null
      }),
  })
}

export function useFichaSindical(docenteId?: string) {
  return useQuery({
    queryKey: ['ficha-sindical', docenteId],
    enabled: !!docenteId,
    queryFn: () => apiClient.get(`/docentes/${docenteId}/ficha-sindical`)
      .then(r => r.data.data)
      .catch(e => {
        if (e?.response?.status === 404) return null
        throw e
      }),
  })
}

export function useMiFicha() {
  return useQuery({
    queryKey: ['mi-ficha-docente'],
    queryFn: () => apiClient.get('/mi-ficha-docente').then(r => r.data.data as FichaDocenteCv),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmt12(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Panel de horario semanal (solo lectura) ────────────────────────────────────

export function HorarioSemanalPanel({ docenteId, periodoId }: { docenteId: string; periodoId: string }) {
  const { data: horarios = [], isLoading } = useHorariosDocente(docenteId, periodoId)

  const porDia = useMemo(() => {
    const map: Record<string, HorarioCarga[]> = {}
    for (const h of horarios) {
      if (!map[h.dia_semana]) map[h.dia_semana] = []
      map[h.dia_semana].push(h)
    }
    return map
  }, [horarios])

  const diasConClases = DIAS_ORDER.filter(d => porDia[d])

  if (isLoading) return <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando horario…</div>
  if (horarios.length === 0) return (
    <div className="py-10 text-center text-slate-400 text-sm">
      No hay horarios asignados en este periodo.
    </div>
  )

  const totalMin = horarios.reduce((s, h) => {
    const [hi, mi] = h.hora_inicio.split(':').map(Number)
    const [hf, mf] = h.hora_fin.split(':').map(Number)
    return s + (hf * 60 + mf) - (hi * 60 + mi)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{(totalMin / 60).toFixed(1)}h</span> / semana frente a grupo
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{diasConClases.length}</span> día{diasConClases.length !== 1 ? 's' : ''} con clases
        </div>
      </div>

      {diasConClases.map(dia => {
        const bloques = [...porDia[dia]].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        const inicioMin = bloques[0].hora_inicio.split(':').map(Number).reduce((h, m) => h * 60 + m)
        const finMax = Math.max(...bloques.map(b => {
          const [h, m] = b.hora_fin.split(':').map(Number)
          return h * 60 + m
        }))
        const span = finMax - inicioMin
        const spanExcede = span > 8 * 60

        return (
          <div key={dia} className={`border rounded-xl overflow-hidden ${spanExcede ? 'border-red-200' : 'border-slate-100'}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 ${DIA_COLOR[dia] ?? 'bg-slate-50 text-slate-700 border-slate-100'} border-b`}>
              <span className="text-xs font-bold uppercase tracking-wide">{DIA_LABEL[dia]}</span>
              <span className={`text-xs font-medium ${spanExcede ? 'text-red-600' : ''}`}>
                {fmt12(bloques[0].hora_inicio)} → {fmt12(bloques[bloques.length - 1].hora_fin)}
                {' '}· {(span / 60).toFixed(1)}h{spanExcede ? ' ⚠ excede 8h' : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {bloques.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition-colors">
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {fmt12(h.hora_inicio)}–{fmt12(h.hora_fin)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {h.carga_academica?.materia?.nombre ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {h.carga_academica?.materia?.clave} · {h.carga_academica?.grupos?.[0]?.clave}
                      {h.carga_academica?.grupos?.[0]?.semestre && ` · ${h.carga_academica.grupos![0].semestre}°`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel de disponibilidad (editable) ────────────────────────────────────────

export function DisponibilidadPanel({ docenteId, periodoId }: { docenteId: string; periodoId: string }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { data, isLoading } = useDisponibilidad(docenteId, periodoId)
  const [bloques, setBloques] = useState<BloqueDisponibilidad[] | null>(null)
  const [cargados, setCargados] = useState<BloqueDisponibilidad[] | null>(null)
  const [error, setError] = useState('')

  // Semilla el buffer editable una sola vez cuando llegan los datos del servidor
  // (patrón "ajustar estado según props" documentado por React, sin useEffect).
  if (data?.bloques && data.bloques !== cargados) {
    setCargados(data.bloques)
    setBloques(data.bloques)
  }

  const actuales = bloques ?? []

  const save = useMutation({
    mutationFn: () => apiClient.put('/disponibilidad-docente', {
      docente_id: docenteId,
      periodo_id: periodoId,
      // El backend devuelve horas con segundos ("08:00:00"); el input type="time"
      // las conserva tal cual si el usuario no las toca, y el backend solo acepta H:i.
      bloques: actuales.map(b => ({ dia_semana: b.dia_semana, hora_inicio: b.hora_inicio.slice(0, 5), hora_fin: b.hora_fin.slice(0, 5) })),
    }),
    onSuccess: () => {
      addToast('Disponibilidad actualizada.', 'success')
      setError('')
      qc.invalidateQueries({ queryKey: ['disponibilidad-docente', docenteId, periodoId] })
    },
    onError: (e) => setError(mutationError(e)),
  })

  const minutos = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm }
  const porDia = (dia: string) => actuales.filter(b => b.dia_semana === dia)
  const horasDia = (dia: string) => porDia(dia).reduce((s, b) => s + (minutos(b.hora_fin) - minutos(b.hora_inicio)), 0) / 60
  const horasSemana = actuales.reduce((s, b) => s + (minutos(b.hora_fin) - minutos(b.hora_inicio)), 0) / 60

  const agregarBloque = (dia: string) => setBloques([...actuales, { dia_semana: dia, hora_inicio: '08:00', hora_fin: '09:00' }])
  const quitarBloque = (idx: number) => setBloques(actuales.filter((_, i) => i !== idx))
  const actualizarBloque = (idx: number, campo: 'hora_inicio' | 'hora_fin', valor: string) =>
    setBloques(actuales.map((b, i) => i === idx ? { ...b, [campo]: valor } : b))

  if (isLoading) return <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando disponibilidad…</div>

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
        La suma de horas de cada día no puede exceder 8 horas (12 los sábados), y la suma de la semana no puede exceder 40 horas. Puedes registrar varios bloques por día para turnos partidos.
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total semanal de disponibilidad</span>
        <span className={`text-sm font-bold ${horasSemana > 40 ? 'text-red-600' : 'text-slate-800'}`}>{horasSemana.toFixed(1)} / 40 horas</span>
      </div>

      {DIAS_ORDER.map(dia => {
        const bloquesDia = porDia(dia)
        const horas = horasDia(dia)
        const limite = dia === 'sabado' ? 12 : 8
        const excede = horas > limite
        return (
          <div key={dia} className={`border rounded-xl overflow-hidden ${excede ? 'border-red-300' : 'border-slate-200'}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 ${DIA_COLOR[dia] ?? 'bg-slate-50 text-slate-700 border-slate-100'} border-b`}>
              <span className="text-xs font-bold uppercase tracking-wide">{DIA_LABEL[dia]}</span>
              <div className="flex items-center gap-3">
                {bloquesDia.length > 0 && (
                  <span className={`text-xs font-medium ${excede ? 'text-red-600' : 'text-slate-500'}`}>{horas.toFixed(1)}h{excede ? ` ⚠ excede ${limite}h` : ''}</span>
                )}
                <button onClick={() => agregarBloque(dia)} className="text-xs font-medium text-blue-600 hover:underline">+ Agregar bloque</button>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {bloquesDia.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">Sin disponibilidad.</p>
              ) : bloquesDia.map(b => {
                const idx = actuales.indexOf(b)
                return (
                  <div key={idx} className="flex items-center gap-2 px-4 py-2.5">
                    <input type="time" value={b.hora_inicio} onChange={e => actualizarBloque(idx, 'hora_inicio', e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                    <span className="text-xs text-slate-400">a</span>
                    <input type="time" value={b.hora_fin} onChange={e => actualizarBloque(idx, 'hora_fin', e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                    <button onClick={() => quitarBloque(idx)} className="text-xs text-red-600 hover:underline ml-auto">Quitar</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end pt-1">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {save.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
        </button>
      </div>
    </div>
  )
}

// ── Panel de CV (solo lectura, para la vista admin) ────────────────────────────

export function CvPanel({ ficha, isLoading }: { ficha: FichaDocenteCv | null | undefined; isLoading: boolean }) {
  if (isLoading) return <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando CV…</div>

  if (!ficha || (!ficha.semblanza && !ficha.experiencia_laboral?.length && !ficha.cursos_capacitacion?.length && !ficha.publicaciones?.length && !ficha.titulos_academicos?.length)) {
    return <div className="py-10 text-center text-slate-400 text-sm">El docente aún no ha capturado su CV.</div>
  }

  return (
    <div className="space-y-5">
      {ficha.cv_actualizado_en && (
        <p className="text-xs text-slate-400">Última actualización: {new Date(ficha.cv_actualizado_en).toLocaleString('es-MX')}</p>
      )}

      {ficha.semblanza && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Semblanza</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{ficha.semblanza}</p>
        </div>
      )}

      {!!ficha.titulos_academicos?.length && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Formación académica</p>
          <ul className="space-y-1.5">
            {ficha.titulos_academicos.map((t, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-medium">{t.grado}</span>
                {t.institucion && ` — ${t.institucion}`}{t.anio && ` (${t.anio})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!ficha.experiencia_laboral?.length && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Experiencia laboral</p>
          <ul className="space-y-2">
            {ficha.experiencia_laboral.map((e, i) => (
              <li key={i} className="text-sm">
                <p className="text-slate-800 font-medium">{e.puesto}{e.institucion && ` — ${e.institucion}`}</p>
                <p className="text-xs text-slate-400">{e.fecha_inicio}{e.fecha_fin && ` a ${e.fecha_fin}`}</p>
                {e.descripcion && <p className="text-xs text-slate-500 mt-0.5">{e.descripcion}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!ficha.cursos_capacitacion?.length && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cursos y capacitación</p>
          <ul className="space-y-1.5">
            {ficha.cursos_capacitacion.map((c, i) => (
              <li key={i} className="text-sm text-slate-700">
                {c.nombre}{c.institucion && ` — ${c.institucion}`}{c.fecha && ` (${c.fecha})`}{c.horas ? ` · ${c.horas}h` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!ficha.publicaciones?.length && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Publicaciones</p>
          <ul className="space-y-1.5">
            {ficha.publicaciones.map((p, i) => (
              <li key={i} className="text-sm text-slate-700">
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.titulo}</a> : p.titulo}
                {p.medio && ` — ${p.medio}`}{p.anio && ` (${p.anio})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
