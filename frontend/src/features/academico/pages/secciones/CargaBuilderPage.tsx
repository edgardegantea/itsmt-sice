import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { academicoApi, type CargaAcademica } from '../../services/academico'
import { usePeriodos, selectCls, ModalWrap, Field, inputCls } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'
import apiClient from '../../../../config/apiClient'

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
type DiaKey = typeof DIAS[number]

const DIA_LABEL: Record<DiaKey, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}
const DIA_SHORT: Record<DiaKey, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

const HORA_SLOTS: string[] = []
for (let h = 7; h < 21; h++) HORA_SLOTS.push(`${String(h).padStart(2, '0')}:00`)

const ROW_H = 52 // px por hora

const PALETTE = [
  { bg: '#3b82f6', light: 'bg-blue-100 border-blue-300 text-blue-900' },
  { bg: '#10b981', light: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
  { bg: '#8b5cf6', light: 'bg-violet-100 border-violet-300 text-violet-900' },
  { bg: '#f59e0b', light: 'bg-amber-100 border-amber-300 text-amber-900' },
  { bg: '#ef4444', light: 'bg-rose-100 border-rose-300 text-rose-900' },
  { bg: '#06b6d4', light: 'bg-cyan-100 border-cyan-300 text-cyan-900' },
  { bg: '#f97316', light: 'bg-orange-100 border-orange-300 text-orange-900' },
  { bg: '#14b8a6', light: 'bg-teal-100 border-teal-300 text-teal-900' },
  { bg: '#6366f1', light: 'bg-indigo-100 border-indigo-300 text-indigo-900' },
  { bg: '#ec4899', light: 'bg-pink-100 border-pink-300 text-pink-900' },
]

// ── Tipos locales ─────────────────────────────────────────────────────────────

type Aula = { id: string; nombre: string; tipo: string; capacidad: number }

type Conflicto = { tipo: 'docente' | 'aula'; mensaje: string }

type DraftBlock = {
  uid: string           // id temporal o id del horario en DB
  cargaId: string
  dia: DiaKey
  horaInicio: string
  horaFin: string
  aulaId?: string
  conflictos: Conflicto[]
  saved: boolean        // ya persisitido en DB
}

type DropTarget = { dia: DiaKey; hora: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fmt12(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`
}

function horasDisponibles(inicio: string): string[] {
  const inicioMin = toMin(inicio)
  return HORA_SLOTS.filter(s => toMin(s) > inicioMin)
}

// ── Componente: tarjeta draggable ─────────────────────────────────────────────

function CargaCard({
  carga,
  color,
  bloques,
  disabled,
}: {
  carga: CargaAcademica
  color: typeof PALETTE[number]
  bloques: DraftBlock[]
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: carga.id,
    disabled,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  const horas = bloques.reduce((s, b) => s + (toMin(b.horaFin) - toMin(b.horaInicio)) / 60, 0)
  const tieneConflicto = bloques.some(b => b.conflictos.length > 0)

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeft: `4px solid ${color.bg}` }}
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-3 select-none transition-shadow
        ${isDragging ? 'shadow-lg' : 'hover:shadow-md'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        ${tieneConflicto ? 'ring-1 ring-red-400' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      <div className="font-semibold text-slate-800 text-sm leading-tight truncate">
        {carga.materia?.nombre ?? '—'}
      </div>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="text-xs text-slate-500 font-mono">{carga.materia?.clave}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs font-medium text-slate-600">{carga.grupo?.clave}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-500">Sem {carga.grupo?.semestre}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-slate-400">{carga.horas_semana} h/sem</span>
        <div className="flex items-center gap-1">
          {tieneConflicto && (
            <span title="Conflicto de horario" className="text-red-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${bloques.length > 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
            {horas > 0 ? `${horas}h asig.` : 'Sin horario'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Componente: overlay al arrastrar ─────────────────────────────────────────

function DragPreview({ carga, color }: { carga: CargaAcademica; color: typeof PALETTE[number] }) {
  return (
    <div
      style={{ borderLeft: `4px solid ${color.bg}`, width: 220 }}
      className="bg-white rounded-lg border border-slate-300 shadow-xl p-3 rotate-2 opacity-90"
    >
      <div className="font-semibold text-slate-800 text-sm truncate">{carga.materia?.nombre}</div>
      <div className="text-xs text-slate-500 mt-0.5">{carga.grupo?.clave} · Sem {carga.grupo?.semestre}</div>
    </div>
  )
}

// ── Componente: celda droppable ───────────────────────────────────────────────

function DroppableCell({
  dia, hora, children,
}: {
  dia: DiaKey; hora: string; children?: React.ReactNode
}) {
  const id = `${dia}|${hora}`   // "|" para no romper "07:00" al parsear
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ height: ROW_H }}
      className={`border-b border-slate-100 relative transition-colors
        ${isOver ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50/60'}
      `}
    >
      {children}
    </div>
  )
}

// ── Componente: bloque colocado en la cuadrícula ──────────────────────────────

function PlacedBlock({
  block,
  carga,
  color,
  aulaName,
  onRemove,
  onEdit,
}: {
  block: DraftBlock
  carga: CargaAcademica
  color: typeof PALETTE[number]
  aulaName?: string
  onRemove: () => void
  onEdit: () => void
}) {
  const startMin = toMin(block.horaInicio)
  const endMin = toMin(block.horaFin)
  const gridStartMin = toMin(HORA_SLOTS[0])
  const top = (startMin - gridStartMin) / 60 * ROW_H
  const height = (endMin - startMin) / 60 * ROW_H - 2

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height,
        backgroundColor: color.bg,
        zIndex: 10,
      }}
      className={`rounded text-white text-xs p-1 overflow-hidden shadow-sm
        ${block.conflictos.length > 0 ? 'ring-2 ring-red-500 ring-offset-1' : ''}
        ${!block.saved ? 'ring-2 ring-offset-1 ring-white/50' : ''}
      `}
    >
      <div className="font-bold leading-tight truncate">{carga.materia?.nombre}</div>
      {aulaName && <div className="opacity-80 truncate">{aulaName}</div>}
      <div className="opacity-70 truncate">{fmt12(block.horaInicio)}–{fmt12(block.horaFin)}</div>
      {block.conflictos.length > 0 && (
        <div className="text-red-200 font-medium text-[10px] mt-0.5">⚠ Conflicto</div>
      )}
      {/* Botones de acción */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="p-0.5 rounded hover:bg-white/20"
          title="Editar"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="p-0.5 rounded hover:bg-white/20"
          title="Eliminar"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Modal: confirmar bloque al soltar ─────────────────────────────────────────

function DropModal({
  carga,
  dia,
  horaInicio,
  docenteId,
  periodoId,
  aulas,
  existingBlockUid,
  onConfirm,
  onCancel,
}: {
  carga: CargaAcademica
  dia: DiaKey
  horaInicio: string
  docenteId: string
  periodoId: string
  aulas: Aula[]
  existingBlockUid?: string
  onConfirm: (horaFin: string, aulaId: string | undefined, conflictos: Conflicto[]) => void
  onCancel: () => void
}) {
  const opts = horasDisponibles(horaInicio)
  const defaultFin = opts.length >= 2 ? opts[1] : opts[0] ?? ''
  const [horaFin, setHoraFin] = useState(defaultFin)
  const [aulaId, setAulaId] = useState<string>('')
  const [conflictos, setConflictos] = useState<Conflicto[]>([])
  const [checking, setChecking] = useState(false)

  const check = useCallback(async (fin: string, aid: string) => {
    if (!fin) return
    setChecking(true)
    try {
      const res = await apiClient.get('/horarios/disponibilidad', {
        params: {
          docente_id: docenteId,
          periodo_id: periodoId,
          dia_semana: dia,
          hora_inicio: horaInicio,
          hora_fin: fin,
          ...(aid ? { aula_id: aid } : {}),
          ...(existingBlockUid ? { excluir_carga_id: carga.id } : {}),
        },
      })
      setConflictos(res.data.data.conflictos ?? [])
    } catch {
      setConflictos([])
    } finally {
      setChecking(false)
    }
  }, [docenteId, periodoId, dia, horaInicio, existingBlockUid, carga.id])

  useEffect(() => { check(horaFin, aulaId) }, [horaFin, aulaId, check])

  return (
    <ModalWrap onClose={onCancel} title={`Agregar bloque — ${DIA_LABEL[dia]}`}>
      <div className="space-y-4 min-w-[340px]">
        {/* Info de la carga */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-1">
          <div className="font-semibold text-slate-800">{carga.materia?.nombre}</div>
          <div className="text-sm text-slate-500">
            Grupo <span className="font-medium text-slate-700">{carga.grupo?.clave}</span>
            {' · '}Semestre {carga.grupo?.semestre}
            {' · '}{carga.horas_semana} h/sem
          </div>
          <div className="text-sm text-slate-600">
            Inicia: <span className="font-medium">{fmt12(horaInicio)}</span>
          </div>
        </div>

        {/* Hora fin */}
        <Field label="Hora de fin">
          <select
            className={selectCls}
            value={horaFin}
            onChange={e => setHoraFin(e.target.value)}
          >
            {opts.map(o => (
              <option key={o} value={o}>{fmt12(o)}</option>
            ))}
          </select>
        </Field>

        {/* Aula */}
        <Field label="Aula (opcional)">
          <select
            className={selectCls}
            value={aulaId}
            onChange={e => setAulaId(e.target.value)}
          >
            <option value="">— Sin aula asignada —</option>
            {aulas.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} ({a.tipo})</option>
            ))}
          </select>
        </Field>

        {/* Estado de conflictos */}
        <div className={`rounded-lg p-3 text-sm transition-all ${
          checking ? 'bg-slate-50 text-slate-400' :
          conflictos.length > 0 ? 'bg-red-50 border border-red-200' :
          'bg-emerald-50 border border-emerald-200'
        }`}>
          {checking ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Verificando disponibilidad…
            </span>
          ) : conflictos.length > 0 ? (
            <div className="space-y-1">
              {conflictos.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-red-700">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{c.mensaje}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Disponible — sin conflictos
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(horaFin, aulaId || undefined, conflictos)}
            disabled={!horaFin}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors
              ${conflictos.length > 0
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700'}
              disabled:opacity-50`}
          >
            {conflictos.length > 0 ? 'Guardar con conflicto' : 'Confirmar'}
          </button>
        </div>
      </div>
    </ModalWrap>
  )
}

// ── Modal: nueva carga académica ──────────────────────────────────────────────

function NuevaCargaModal({
  docenteId,
  periodoId,
  onCreated,
  onCancel,
}: {
  docenteId: string
  periodoId: string
  onCreated: (carga: CargaAcademica) => void
  onCancel: () => void
}) {
  const [materiaId, setMateriaId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [horasSemana, setHorasSemana] = useState('3')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const toast = useToastStore()

  const { data: materias = [] } = useQuery({
    queryKey: ['materias-all'],
    queryFn: () => apiClient.get('/materias').then(r => r.data.data as { id: string; clave: string; nombre: string; semestre: number; carrera?: { nombre: string } }[]),
    staleTime: 60_000,
  })
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-select', periodoId],
    queryFn: () => apiClient.get('/grupos', { params: { periodo_id: periodoId } }).then(r => r.data.data as { id: string; clave: string; semestre: number; turno: string; carrera?: { nombre: string } }[]),
    staleTime: 60_000,
  })

  async function handleSave() {
    if (!materiaId || !grupoId) { setError('Selecciona materia y grupo.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.post('/cargas-academicas', {
        docente_id: docenteId,
        materia_id: materiaId,
        grupo_id: grupoId,
        periodo_id: periodoId,
        horas_semana: parseInt(horasSemana),
      })
      onCreated(res.data.data as CargaAcademica)
      toast.toast('Carga creada', 'success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message ?? 'Error al crear la carga.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onCancel} title="Nueva carga académica">
      <div className="space-y-4 min-w-[360px]">
        <Field label="Materia">
          <select className={selectCls} value={materiaId} onChange={e => setMateriaId(e.target.value)}>
            <option value="">— Selecciona materia —</option>
            {materias.map(m => (
              <option key={m.id} value={m.id}>{m.nombre} ({m.clave}) · Sem {m.semestre}</option>
            ))}
          </select>
        </Field>
        <Field label="Grupo">
          <select className={selectCls} value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            <option value="">— Selecciona grupo —</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.clave} · {g.turno} · {g.carrera?.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Horas / semana">
          <input type="number" min={1} max={20} className={inputCls} value={horasSemana} onChange={e => setHorasSemana(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Crear carga'}
          </button>
        </div>
      </div>
    </ModalWrap>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CargaBuilderPage() {
  const toast = useToastStore()
  const qc = useQueryClient()

  // Filtros
  const { data: periodos = [] } = usePeriodos()
  const periodosTyped = periodos as { id: string; nombre: string; activo: boolean }[]
  const periodoActivo = periodosTyped.find(p => p.activo)
  const [periodoId, setPeriodoId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [panelTab, setPanelTab] = useState<'sin_horario' | 'con_horario'>('sin_horario')

  // Setear periodo activo al cargar
  useEffect(() => {
    if (periodoActivo && !periodoId) setPeriodoId(periodoActivo.id)
  }, [periodoActivo, periodoId])

  // Datos
  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes-builder'],
    queryFn: () => academicoApi.getDocentes(),
  })
  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-builder'],
    queryFn: () => apiClient.get('/aulas').then(r => r.data.data as Aula[]),
    staleTime: 60_000,
  })
  const { data: cargas = [], refetch: refetchCargas, isLoading: loadingCargas } = useQuery({
    queryKey: ['cargas-builder', docenteId, periodoId],
    queryFn: () => academicoApi.getCargas({ docente_id: docenteId, periodo_id: periodoId }),
    enabled: !!docenteId && !!periodoId,
  })

  // Estado de bloques en la cuadrícula (draft + guardados)
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([])

  // Sincronizar bloques existentes al cargar cargas
  useEffect(() => {
    if (cargas.length === 0) { setDraftBlocks([]); return }
    const blocks: DraftBlock[] = []
    cargas.forEach(c => {
      ;(c.horarios ?? []).forEach(h => {
        blocks.push({
          uid: h.id,
          cargaId: c.id,
          dia: h.dia_semana as DiaKey,
          horaInicio: h.hora_inicio.slice(0, 5),
          horaFin: h.hora_fin.slice(0, 5),
          aulaId: c.aula_id,
          conflictos: [],
          saved: true,
        })
      })
    })
    setDraftBlocks(blocks)
  }, [cargas])

  // Mapa de color por carga
  const colorMap = useMemo(() => {
    const map = new Map<string, typeof PALETTE[number]>()
    cargas.forEach((c, i) => map.set(c.id, PALETTE[i % PALETTE.length]))
    return map
  }, [cargas])

  // Aula seleccionada para un bloque
  const aulaNombre = useCallback((aulaId?: string) =>
    aulas.find(a => a.id === aulaId)?.nombre, [aulas])

  // ── Drag state ──
  // pendingCargaId conserva el id tras soltar hasta que el modal termine
  const [activeCargaId, setActiveCargaId] = useState<string | null>(null)
  const [pendingCargaId, setPendingCargaId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [showDropModal, setShowDropModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState<DraftBlock | null>(null)
  const [showNuevaCarga, setShowNuevaCarga] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function handleDragStart(e: DragStartEvent) {
    setActiveCargaId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    const draggedId = e.active.id as string
    setActiveCargaId(null)
    if (!e.over) return
    // El id es "lunes|07:00" — usamos "|" como separador para no romper "07:00"
    const raw = e.over.id as string
    const pipeIdx = raw.indexOf('|')
    const dia = raw.slice(0, pipeIdx) as DiaKey
    const hora = raw.slice(pipeIdx + 1)
    setPendingCargaId(draggedId)
    setDropTarget({ dia, hora })
    setShowDropModal(true)
  }

  function handleDropConfirm(horaFin: string, aulaId: string | undefined, conflictos: Conflicto[]) {
    const cargaId = editingBlock?.cargaId ?? pendingCargaId
    if (!cargaId) return
    const dia = editingBlock?.dia ?? dropTarget!.dia
    const horaInicio = editingBlock?.horaInicio ?? dropTarget!.hora

    if (editingBlock) {
      setDraftBlocks(prev => prev.map(b =>
        b.uid === editingBlock.uid
          ? { ...b, horaFin, aulaId, conflictos, saved: false }
          : b
      ))
    } else {
      const uid = `draft-${Date.now()}`
      setDraftBlocks(prev => [
        ...prev,
        { uid, cargaId, dia, horaInicio, horaFin, aulaId, conflictos, saved: false },
      ])
    }

    setShowDropModal(false)
    setEditingBlock(null)
    setPendingCargaId(null)
    setDropTarget(null)
  }

  function handleRemoveBlock(uid: string) {
    setDraftBlocks(prev => prev.filter(b => b.uid !== uid))
  }

  function handleEditBlock(block: DraftBlock) {
    setEditingBlock(block)
    setShowDropModal(true)
  }

  // ── Guardar todo ──
  const [saving, setSaving] = useState(false)
  const [saveErrors, setSaveErrors] = useState<string[]>([])

  async function handleSaveAll() {
    setSaving(true)
    setSaveErrors([])

    // Solo guardar cargas que tienen al menos un bloque nuevo (no guardado aún)
    const unsavedCargaIds = [...new Set(draftBlocks.filter(b => !b.saved).map(b => b.cargaId))]
    const errMessages: string[] = []

    for (const cargaId of unsavedCargaIds) {
      // Enviar TODOS los bloques de esa carga (nuevos + ya guardados) para que el backend los reemplace
      const bloques = draftBlocks
        .filter(b => b.cargaId === cargaId)
        .map(b => ({ dia_semana: b.dia, hora_inicio: b.horaInicio, hora_fin: b.horaFin }))

      try {
        await apiClient.post('/horarios', { carga_academica_id: cargaId, bloques })

        // Actualizar aula si fue asignada en un bloque nuevo
        const carga = cargas.find(c => c.id === cargaId)
        const bloque = draftBlocks.find(b => b.cargaId === cargaId && b.aulaId)
        if (bloque?.aulaId && bloque.aulaId !== carga?.aula_id) {
          await apiClient.patch(`/cargas-academicas/${cargaId}`, { aula_id: bloque.aulaId })
            .catch(() => { /* aula es opcional, no es crítico */ })
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } }
        const msg = err?.response?.data?.message ?? 'Error desconocido'
        const carga = cargas.find(c => c.id === cargaId)
        errMessages.push(`${carga?.materia?.nombre ?? cargaId}: ${msg}`)
      }
    }

    setSaving(false)
    if (errMessages.length > 0) {
      setSaveErrors(errMessages)
      toast.toast(`${errMessages.length} carga(s) con conflicto`, 'error')
    } else {
      toast.toast('Horarios guardados correctamente', 'success')
      refetchCargas()
      qc.invalidateQueries({ queryKey: ['cargas-builder'] })
    }
  }

  // ── Carga activa para el overlay y modal ──
  const activeCarga = cargas.find(c => c.id === activeCargaId)
  const activeColor = activeCargaId ? (colorMap.get(activeCargaId) ?? PALETTE[0]) : PALETTE[0]

  // ── Cargas sin/con horario ──
  const cargasSin = cargas.filter(c => draftBlocks.filter(b => b.cargaId === c.id).length === 0)
  const cargasCon = cargas.filter(c => draftBlocks.some(b => b.cargaId === c.id))

  // ── Estadísticas ──
  const totalHoras = draftBlocks.reduce((s, b) => s + (toMin(b.horaFin) - toMin(b.horaInicio)) / 60, 0)
  const totalConflictos = draftBlocks.filter(b => b.conflictos.length > 0).length
  const unsaved = draftBlocks.filter(b => !b.saved).length

  const docenteSeleccionado = docentes.find(d => d.id === docenteId)
  const periodoSeleccionado = periodos.find(p => p.id === periodoId) as { id: string; nombre: string } | undefined

  // ── Carga activa en modal (drag o edición) ──
  const modalCarga = editingBlock
    ? cargas.find(c => c.id === editingBlock.cargaId)
    : cargas.find(c => c.id === pendingCargaId)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full min-h-screen bg-slate-50">

        {/* ── Barra superior ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
          <Link
            to="/admin/gestion-academica/cargas"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Cargas
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-base font-semibold text-slate-800">Constructor de Horarios</h1>

          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Docente */}
            <select
              className={`${selectCls} min-w-[220px]`}
              value={docenteId}
              onChange={e => setDocenteId(e.target.value)}
            >
              <option value="">— Selecciona docente —</option>
              {docentes.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Periodo */}
            <select
              className={`${selectCls} min-w-[160px]`}
              value={periodoId}
              onChange={e => setPeriodoId(e.target.value)}
            >
              <option value="">— Periodo —</option>
              {periodos.map((p: { id: string; nombre: string }) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            {/* Stats */}
            {docenteId && periodoId && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {/* Horas semanales con semáforo */}
                <span className={`rounded px-2 py-1 font-medium ${
                  totalHoras > 40 ? 'bg-red-100 text-red-700' :
                  totalHoras >= 39 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {totalHoras}/40 h/sem{totalHoras > 40 ? ' ⚠' : ''}
                </span>
                {totalConflictos > 0 && (
                  <span className="bg-red-100 text-red-700 rounded px-2 py-1 font-medium">
                    ⚠ {totalConflictos} conflicto{totalConflictos > 1 ? 's' : ''}
                  </span>
                )}
                {unsaved > 0 && (
                  <span className="bg-amber-100 text-amber-700 rounded px-2 py-1 font-medium">
                    {unsaved} sin guardar
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handleSaveAll}
              disabled={saving || unsaved === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {saving ? 'Guardando…' : 'Guardar horarios'}
            </button>
          </div>
        </div>

        {/* ── Errores de guardado ── */}
        {saveErrors.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 space-y-0.5">
                {saveErrors.map((msg, i) => (
                  <p key={i} className="text-sm text-red-700">{msg}</p>
                ))}
              </div>
              <button onClick={() => setSaveErrors([])} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* ── Cuerpo ── */}
        {!docenteId || !periodoId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400 space-y-2">
              <svg className="w-12 h-12 mx-auto opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Selecciona un docente y periodo para comenzar</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* ── Panel izquierdo: cargas ── */}
            <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
              {/* Header del panel */}
              <div className="p-3 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {docenteSeleccionado?.name}
                </div>
                <div className="text-xs text-slate-400">{periodoSeleccionado?.nombre}</div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setPanelTab('sin_horario')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${panelTab === 'sin_horario' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sin horario ({cargasSin.length})
                </button>
                <button
                  onClick={() => setPanelTab('con_horario')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${panelTab === 'con_horario' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Programadas ({cargasCon.length})
                </button>
              </div>

              {/* Lista de cargas */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingCargas ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (panelTab === 'sin_horario' ? cargasSin : cargasCon).length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8">
                    {panelTab === 'sin_horario' ? 'Todas las cargas tienen horario' : 'Ninguna carga programada aún'}
                  </div>
                ) : (
                  (panelTab === 'sin_horario' ? cargasSin : cargasCon).map(c => (
                    <CargaCard
                      key={c.id}
                      carga={c}
                      color={colorMap.get(c.id) ?? PALETTE[0]}
                      bloques={draftBlocks.filter(b => b.cargaId === c.id)}
                    />
                  ))
                )}
              </div>

              {/* Botón nueva carga */}
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => setShowNuevaCarga(true)}
                  className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva carga
                </button>
              </div>
            </div>

            {/* ── Cuadrícula horaria ── */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-[700px]">
                {/* Encabezado de días con indicador de horas acumuladas */}
                <div className="grid sticky top-0 z-20 bg-white border-b-2 border-slate-200 shadow-sm"
                  style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}
                >
                  <div className="py-2 px-2 text-xs text-slate-400 font-medium text-center border-r border-slate-200">
                    Hora
                  </div>
                  {DIAS.map(dia => {
                    // Calcular span del día: entrada más temprana → salida más tardía
                    const bloquesDia = draftBlocks.filter(b => b.dia === dia)
                    const span = bloquesDia.length > 0
                      ? (Math.max(...bloquesDia.map(b => toMin(b.horaFin))) -
                         Math.min(...bloquesDia.map(b => toMin(b.horaInicio)))) / 60
                      : 0

                    const entradaMin = bloquesDia.length > 0 ? Math.min(...bloquesDia.map(b => toMin(b.horaInicio))) : null
                    const salidaMin  = bloquesDia.length > 0 ? Math.max(...bloquesDia.map(b => toMin(b.horaFin))) : null
                    const fmtMin = (m: number) => {
                      const h = Math.floor(m / 60), min = m % 60
                      return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(min).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
                    }

                    const excede = span > 8
                    const cerca  = !excede && span >= 7

                    return (
                      <div key={dia} className="py-1.5 text-center border-r border-slate-200 last:border-r-0">
                        <div className={`text-xs font-semibold uppercase tracking-wide ${excede ? 'text-red-600' : cerca ? 'text-amber-600' : 'text-slate-600'}`}>
                          <span className="hidden sm:block">{DIA_LABEL[dia]}</span>
                          <span className="block sm:hidden">{DIA_SHORT[dia]}</span>
                        </div>
                        {entradaMin !== null && salidaMin !== null && (
                          <div className={`text-[10px] font-medium mt-0.5 leading-tight ${excede ? 'text-red-500' : cerca ? 'text-amber-500' : 'text-slate-400'}`}>
                            <div>{fmtMin(entradaMin)}–{fmtMin(salidaMin)}</div>
                            <div>{span.toFixed(1)}h/8h{excede && ' ⚠'}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Filas de horas */}
                <div className="grid" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
                  {/* Columna de horas */}
                  <div className="border-r border-slate-200">
                    {HORA_SLOTS.map(slot => (
                      <div
                        key={slot}
                        style={{ height: ROW_H }}
                        className="border-b border-slate-100 flex items-start justify-center pt-1"
                      >
                        <span className="text-[10px] text-slate-400 font-mono">{slot}</span>
                      </div>
                    ))}
                  </div>

                  {/* Columnas de días */}
                  {DIAS.map(dia => {
                    const bloquesDelDia = draftBlocks.filter(b => b.cargaId && b.dia === dia)

                    return (
                      <div key={dia} className="relative border-r border-slate-200 last:border-r-0">
                        {/* Droppable cells */}
                        {HORA_SLOTS.map(slot => (
                          <DroppableCell key={slot} dia={dia} hora={slot} />
                        ))}

                        {/* Bloques colocados (absolutamente posicionados) */}
                        <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
                          {bloquesDelDia.map(block => {
                            const carga = cargas.find(c => c.id === block.cargaId)
                            if (!carga) return null
                            const color = colorMap.get(block.cargaId) ?? PALETTE[0]
                            return (
                              <div key={block.uid} className="pointer-events-auto group">
                                <PlacedBlock
                                  block={block}
                                  carga={carga}
                                  color={color}
                                  aulaName={aulaNombre(block.aulaId)}
                                  onRemove={() => handleRemoveBlock(block.uid)}
                                  onEdit={() => handleEditBlock(block)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Overlay al arrastrar ── */}
      <DragOverlay>
        {activeCarga && <DragPreview carga={activeCarga} color={activeColor} />}
      </DragOverlay>

      {/* ── Modal de confirmación de drop ── */}
      {showDropModal && modalCarga && (docenteId && periodoId) && (
        <DropModal
          carga={modalCarga}
          dia={editingBlock?.dia ?? dropTarget!.dia}
          horaInicio={editingBlock?.horaInicio ?? dropTarget!.hora}
          docenteId={docenteId}
          periodoId={periodoId}
          aulas={aulas}
          existingBlockUid={editingBlock?.uid}
          onConfirm={handleDropConfirm}
          onCancel={() => {
            setShowDropModal(false)
            setEditingBlock(null)
            setPendingCargaId(null)
            setDropTarget(null)
          }}
        />
      )}

      {/* ── Modal nueva carga ── */}
      {showNuevaCarga && docenteId && periodoId && (
        <NuevaCargaModal
          docenteId={docenteId}
          periodoId={periodoId}
          onCreated={() => {
            setShowNuevaCarga(false)
            refetchCargas()
          }}
          onCancel={() => setShowNuevaCarga(false)}
        />
      )}
    </DndContext>
  )
}
