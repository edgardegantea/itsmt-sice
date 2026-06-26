import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type CargaAcademica, type Horario } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, SkeletonRows, icls, selectCls, inputCls, ModalWrap, usePeriodos, mutationError, extractApiErrors } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'
import apiClient from '../../../../config/apiClient'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const DIA_FULL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const TURNO_COLOR: Record<string, string> = {
  matutino: 'bg-sky-100 text-sky-700',
  vespertino: 'bg-violet-100 text-violet-700',
  sabatino: 'bg-orange-100 text-orange-700',
}

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

function fmt(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`
}

// ── Chip de horario ───────────────────────────────────────────────────────────

function HorarioChip({ h }: { h: Horario }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-xs font-medium">
      <span className="font-semibold">{DIA_LABEL[h.dia_semana]}</span>
      <span className="text-blue-400">·</span>
      {fmt(h.hora_inicio)}–{fmt(h.hora_fin)}
    </span>
  )
}

// ── Card de carga ─────────────────────────────────────────────────────────────

function CargaCard({
  carga,
  onEdit,
  onDelete,
  onHorarios,
}: {
  carga: CargaAcademica
  onEdit: () => void
  onDelete: () => void
  onHorarios: () => void
}) {
  const turno = carga.grupo?.turno ?? ''
  const carrera = carga.materia?.carrera ?? carga.grupo?.carrera

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header: materia + carrera */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{carga.materia?.nombre ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{carga.materia?.clave}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {carga.materia?.tipo && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${carga.materia.tipo === 'obligatoria' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                {carga.materia.tipo}
              </span>
            )}
            {turno && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TURNO_COLOR[turno] ?? 'bg-slate-100 text-slate-600'}`}>
                {turno}
              </span>
            )}
          </div>
        </div>
        {carrera && (
          <p className="text-xs text-slate-400 mt-1">{carrera.nombre}</p>
        )}
      </div>

      {/* Body: datos de la asignación */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Docente */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Docente</p>
            <p className="text-sm font-medium text-slate-800 truncate">{carga.docente?.name ?? '—'}</p>
          </div>
        </div>

        {/* Grupo + Semestre */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400">Grupo · Semestre</p>
            <p className="text-sm font-medium text-slate-800">
              <span className="font-mono bg-slate-100 px-1.5 rounded text-slate-700">{carga.grupo?.clave ?? '—'}</span>
              {carga.grupo?.semestre && <span className="ml-2 text-slate-500">{carga.grupo.semestre}° sem.</span>}
            </p>
          </div>
        </div>

        {/* Periodo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400">Periodo escolar</p>
            <p className="text-sm font-medium text-slate-800">{carga.periodo?.nombre ?? '—'}</p>
          </div>
        </div>

        {/* Aula */}
        {carga.aula && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400">Aula</p>
              <p className="text-sm font-medium text-slate-800">{carga.aula.nombre} <span className="text-slate-400 text-xs">· cap. {carga.aula.capacidad}</span></p>
            </div>
          </div>
        )}

        {/* Horarios */}
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Horario semanal</p>
          {(carga.horarios ?? []).length === 0 ? (
            <button
              onClick={onHorarios}
              className="text-xs text-blue-500 hover:underline"
            >
              + Agregar horario
            </button>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(carga.horarios ?? [])
                .slice()
                .sort((a, b) => DIAS.indexOf(a.dia_semana as typeof DIAS[number]) - DIAS.indexOf(b.dia_semana as typeof DIAS[number]))
                .map(h => <HorarioChip key={h.id} h={h} />)}
            </div>
          )}
        </div>

        {/* Horas/sem */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-400">Horas / semana</span>
          <span className="text-sm font-bold text-slate-800">{carga.horas_semana}h</span>
        </div>
      </div>

      {/* Footer: acciones */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <button onClick={onHorarios} className="text-xs text-blue-600 hover:underline font-medium">
          {(carga.horarios ?? []).length > 0 ? 'Editar horario' : '+ Horario'}
        </button>
        <div className="flex gap-3">
          <button onClick={onEdit} className="text-xs text-slate-600 hover:text-slate-900">Editar</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de horarios ─────────────────────────────────────────────────────────

function HorariosModal({ carga, onClose }: { carga: CargaAcademica; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const [bloques, setBloques] = useState<{ dia_semana: string; hora_inicio: string; hora_fin: string }[]>(
    (carga.horarios ?? []).map(h => ({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio.slice(0, 5), hora_fin: h.hora_fin.slice(0, 5) }))
  )

  const save = useMutation({
    mutationFn: () => academicoApi.saveHorarios(carga.id, bloques),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cargas'] })
      addToast('Horarios guardados.', 'success')
      onClose()
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  function addBloque() {
    setBloques(b => [...b, { dia_semana: 'lunes', hora_inicio: '07:00', hora_fin: '08:00' }])
  }

  function removeBloque(i: number) {
    setBloques(b => b.filter((_, idx) => idx !== i))
  }

  function setBloque(i: number, k: string, v: string) {
    setBloques(b => b.map((bl, idx) => idx === i ? { ...bl, [k]: v } : bl))
  }

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
            <p className="text-sm text-slate-400 text-center py-4">No hay bloques de horario. Agrega uno abajo.</p>
          )}
          {bloques.map((bl, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
              <select
                value={bl.dia_semana}
                onChange={e => setBloque(i, 'dia_semana', e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              >
                {DIAS.map(d => <option key={d} value={d}>{DIA_FULL[d]}</option>)}
              </select>
              <input
                type="time"
                value={bl.hora_inicio}
                onChange={e => setBloque(i, 'hora_inicio', e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
              <span className="text-slate-400 text-sm">–</span>
              <input
                type="time"
                value={bl.hora_fin}
                onChange={e => setBloque(i, 'hora_fin', e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
              <button onClick={() => removeBloque(i)} className="text-red-400 hover:text-red-600 ml-auto shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            onClick={addBloque}
            className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + Agregar bloque de horario
          </button>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
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
  const [modal, setModal] = useState<Partial<CargaAcademica> | null>(null)
  const [horariosModal, setHorariosModal] = useState<CargaAcademica | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { confirm, dialog: confirmDialog } = useConfirm()

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

  const set = (k: keyof CargaAcademica, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  const totalHoras = cargasFiltradas.reduce((sum, c) => sum + c.horas_semana, 0)
  const docentesActivos = new Set(cargasFiltradas.map(c => c.docente_id)).size
  const sinHorario = cargasFiltradas.filter(c => (c.horarios ?? []).length === 0).length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

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
              <button
                onClick={() => setVistaTabla(v => !v)}
                className="px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-600 hover:bg-slate-50"
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
              <input
                className={inputCls}
                placeholder="Docente, materia, grupo…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
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
        </div>

        {/* Contenido */}
        {isLoading ? (
          vistaTabla ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody><SkeletonRows cols={7} /></tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )
        ) : cargasFiltradas.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No hay cargas académicas con los filtros seleccionados.</p>
          </div>
        ) : vistaTabla ? (
          /* Vista tabla */
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">H/sem</th>
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
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => setHorariosModal(c)} className="text-xs text-blue-600 hover:underline">Horario</button>
                      <button onClick={() => setModal(c)} className="text-xs text-slate-600 hover:underline">Editar</button>
                      <button
                        onClick={() => confirm({
                          title: '¿Eliminar esta carga académica?',
                          description: `Se eliminará la asignación de ${c.docente?.name ?? 'el docente'} a ${c.materia?.nombre ?? 'la materia'}.`,
                          confirmLabel: 'Eliminar carga',
                          onConfirm: () => del.mutateAsync(c.id),
                        })}
                        className="text-xs text-red-500 hover:underline"
                      >Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Vista tarjetas */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cargasFiltradas.map(c => (
              <CargaCard
                key={c.id}
                carga={c}
                onEdit={() => setModal(c)}
                onDelete={() => confirm({
                  title: '¿Eliminar esta carga académica?',
                  description: `Se eliminará la asignación de ${c.docente?.name ?? 'el docente'} a ${c.materia?.nombre ?? 'la materia'}.`,
                  confirmLabel: 'Eliminar carga',
                  onConfirm: () => del.mutateAsync(c.id),
                })}
                onHorarios={() => setHorariosModal(c)}
              />
            ))}
          </div>
        )}
      </div>

      {confirmDialog}

      {horariosModal && (
        <HorariosModal carga={horariosModal} onClose={() => setHorariosModal(null)} />
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
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
            <input
              className={icls(errors.horas_semana)}
              type="number" min={1} max={40}
              value={modal.horas_semana ?? 3}
              onChange={e => set('horas_semana', Number(e.target.value))}
            />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
