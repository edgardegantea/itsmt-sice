import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  academicoApi,
  type DiaSemana, type BuilderDia, type BuilderSlot, type Grupo, type Materia,
} from '../../services/academico'
import { usePeriodos, useCarreras, selectCls, Field, ModalWrap, mutationError } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const DIA_LABEL_FULL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

// ── Color por asignatura ─────────────────────────────────────────────────────

/** Paleta de colores saturados, suficientemente distinguibles entre sí. */
const MATERIA_PALETTE: { bg: string; border: string }[] = [
  { bg: 'bg-blue-600',    border: 'border-blue-600' },
  { bg: 'bg-emerald-600', border: 'border-emerald-600' },
  { bg: 'bg-purple-600',  border: 'border-purple-600' },
  { bg: 'bg-rose-600',    border: 'border-rose-600' },
  { bg: 'bg-amber-600',   border: 'border-amber-600' },
  { bg: 'bg-cyan-600',    border: 'border-cyan-600' },
  { bg: 'bg-fuchsia-600', border: 'border-fuchsia-600' },
  { bg: 'bg-lime-600',    border: 'border-lime-600' },
  { bg: 'bg-orange-600',  border: 'border-orange-600' },
  { bg: 'bg-teal-600',    border: 'border-teal-600' },
  { bg: 'bg-indigo-600',  border: 'border-indigo-600' },
  { bg: 'bg-pink-600',    border: 'border-pink-600' },
  { bg: 'bg-sky-600',     border: 'border-sky-600' },
  { bg: 'bg-violet-600',  border: 'border-violet-600' },
  { bg: 'bg-green-600',   border: 'border-green-600' },
]

function colorPorMateria(clave: string): { bg: string; border: string } {
  let hash = 0
  for (let i = 0; i < clave.length; i++) {
    hash = (hash * 31 + clave.charCodeAt(i)) >>> 0
  }
  return MATERIA_PALETTE[hash % MATERIA_PALETTE.length]
}

// ── Celda de la cuadrícula ───────────────────────────────────────────────────

function SlotCell({
  slot, onClick, onMouseDown, onMouseEnter, highlighted,
}: {
  slot: BuilderSlot
  onClick?: () => void
  onMouseDown?: () => void
  onMouseEnter?: () => void
  highlighted?: boolean
}) {
  const base = 'px-1 py-0.5 text-[10px] rounded transition-colors min-h-[36px] flex items-center justify-center border select-none'

  if (slot.estado === 'reservado') {
    const estaCarrera = slot.misma_carrera !== false
    const color = colorPorMateria(slot.materia_id ?? slot.materia ?? '')
    return (
      <div
        onClick={onClick}
        className={`${base} flex-col gap-0.5 cursor-pointer text-white font-medium ${color.bg} ${
          estaCarrera ? 'border-transparent' : `${color.border} ring-2 ring-amber-400 ring-offset-1`
        }`}
        title={`${slot.materia} · ${slot.grupo}${slot.aula ? ` · ${slot.aula}` : ''}\n${slot.hora_inicio}–${slot.hora_fin}${estaCarrera ? '' : ' (otra carrera)'}`}
      >
        <span className="truncate max-w-full">{slot.materia}</span>
        <span className="opacity-80 text-[9px] truncate max-w-full">{slot.grupo}{!estaCarrera && ' · otra carrera'}</span>
      </div>
    )
  }

  if (slot.estado === 'disponible') {
    return (
      <div
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        className={`${base} cursor-pointer ${
          highlighted
            ? 'bg-blue-500 border-blue-600 text-white'
            : 'bg-white border-slate-200 text-slate-400 hover:bg-blue-50 hover:border-blue-200'
        }`}
        title="Disponible — clic para asignar 1h, o arrastra para varias horas consecutivas"
      >
        +
      </div>
    )
  }

  // fuera_disponibilidad (y grupo_ocupado, que no debería aparecer sin grupo_id fijo)
  return (
    <div
      className={`${base} bg-slate-100 border-slate-200 cursor-not-allowed`}
      title="Fuera de la disponibilidad declarada por el docente"
    />
  )
}

// ── Modal: nueva clase para el rango de horas seleccionado ──────────────────

interface Seleccion {
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
}

/** Convención propuestahorarios: en sábado solo se pueden agendar grupos cuya clave termine en F o B. */
function esGrupoSabatino(clave: string): boolean {
  return /[fb]$/i.test(clave)
}

interface Plantilla {
  materiaId: string
  grupoIds: string[]
  aulaId: string
}

function NuevaClaseModal({
  periodoId, carreraId, docenteId, grupoId: grupoIdFijo, seleccion, plantillaInicial, onClose,
}: {
  periodoId: string
  carreraId: string
  docenteId: string
  grupoId?: string
  seleccion: Seleccion
  plantillaInicial?: Plantilla | null
  onClose: (asignado: boolean, plantillaParaContinuar?: Plantilla | null) => void
}) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)

  const [grupoIds, setGrupoIds] = useState<string[]>(plantillaInicial?.grupoIds ?? (grupoIdFijo ? [grupoIdFijo] : []))
  const [materiaId, setMateriaId] = useState(plantillaInicial?.materiaId ?? '')
  const [aulaId, setAulaId] = useState(plantillaInicial?.aulaId ?? '')
  const [saving, setSaving] = useState(false)

  const esSabado = seleccion.dia_semana === 'sabado'

  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['builder-grupos', periodoId, carreraId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId, carrera_id: carreraId }),
  })

  const { data: materias = [] } = useQuery<Materia[]>({
    queryKey: ['builder-materias', carreraId],
    queryFn: () => academicoApi.getMaterias({ carrera_id: carreraId }),
  })

  const { data: aulas = [] } = useQuery({
    queryKey: ['builder-aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const [verificacion, setVerificacion] = useState<{ conflictos: { tipo: string; mensaje: string }[]; dentro_disponibilidad: boolean; mensaje_disponibilidad?: string | null } | null>(null)
  const [horasInfo, setHorasInfo] = useState<Record<string, { horas_semana: number; asignadas: number; restantes: number }> | null>(null)
  const [checking, setChecking] = useState(false)

  function toggleGrupo(id: string) {
    if (grupoIdFijo === id) return // el grupo fijo (venido de la URL) no se puede quitar
    setGrupoIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  useEffect(() => {
    if (!materiaId || grupoIds.length === 0) { setVerificacion(null); setHorasInfo(null); return }
    setChecking(true)
    const t = setTimeout(() => {
      academicoApi.verificarDisponibilidad({
        periodo_id: periodoId,
        docente_id: docenteId,
        dia_semana: seleccion.dia_semana,
        hora_inicio: seleccion.hora_inicio,
        hora_fin: seleccion.hora_fin,
        aula_id: aulaId || undefined,
        grupo_ids: grupoIds,
        materia_id: materiaId,
      }).then(res => { setVerificacion(res.resultado); setHorasInfo(res.horas) }).finally(() => setChecking(false))
    }, 250)
    return () => clearTimeout(t)
  }, [materiaId, grupoIds, aulaId, docenteId, periodoId, seleccion])

  const conflictos = verificacion?.conflictos ?? []
  const fueraDisponibilidad = verificacion ? !verificacion.dentro_disponibilidad : false
  const puedeGuardar = !!materiaId && grupoIds.length > 0 && conflictos.length === 0 && !fueraDisponibilidad && !saving

  const aulaSeleccionada = aulas.find(a => a.id === aulaId)
  const totalAlumnos = grupoIds.reduce((s, gid) => s + (grupos.find(g => g.id === gid)?.alumnos_count ?? 0), 0)
  const excedeCapacidad = !!aulaSeleccionada?.capacidad && totalAlumnos > aulaSeleccionada.capacidad

  async function handleSave() {
    if (!puedeGuardar) return
    setSaving(true)
    try {
      await academicoApi.asignarHorario({
        periodo_id: periodoId,
        docente_id: docenteId,
        materia_id: materiaId,
        grupo_ids: grupoIds,
        aula_id: aulaId || undefined,
        dia_semana: seleccion.dia_semana,
        hora_inicio: seleccion.hora_inicio,
        hora_fin: seleccion.hora_fin,
      })
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      toastSuccess('Clase asignada.')
      const quedanHoras = horasInfo && grupoIds.some(gid => (horasInfo[gid]?.restantes ?? 0) > 0)
      onClose(true, quedanHoras ? { materiaId, grupoIds, aulaId } : null)
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap title="Nueva carga académica" onClose={() => onClose(false)} onSave={handleSave} saving={saving}>
      <div className="col-span-2 -mt-2 mb-1 text-sm text-slate-500">
        {DIA_LABEL_FULL[seleccion.dia_semana]} · {seleccion.hora_inicio}–{seleccion.hora_fin}
      </div>

      {plantillaInicial && (
        <div className="col-span-2 rounded-md bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
          Continuando con la misma materia y grupo(s) — quedan horas por asignar.
        </div>
      )}

      {conflictos.length > 0 && (
        <div className="col-span-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <ul className="list-disc space-y-1 pl-4">
            {conflictos.map((c, i) => <li key={`${c.tipo}-${i}`}>{c.mensaje}</li>)}
          </ul>
        </div>
      )}
      {fueraDisponibilidad && verificacion?.mensaje_disponibilidad && (
        <div className="col-span-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {verificacion.mensaje_disponibilidad}
        </div>
      )}

      <Field label="Grupo(s) *" full>
        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
          {grupos.map(g => {
            const deshabilitado = esSabado && !esGrupoSabatino(g.clave)
            return (
              <label key={g.id} className={`flex items-center gap-2 text-sm px-1 py-0.5 rounded ${deshabilitado ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                <input
                  type="checkbox"
                  checked={grupoIds.includes(g.id)}
                  disabled={deshabilitado || g.id === grupoIdFijo}
                  onChange={() => toggleGrupo(g.id)}
                />
                <span>{g.clave} · Sem {g.semestre}</span>
                {deshabilitado && <span className="text-[10px] text-amber-600 ml-auto">no sabatino</span>}
              </label>
            )
          })}
        </div>
      </Field>

      <Field label="Materia *" full>
        <select className={selectCls} value={materiaId} onChange={e => setMateriaId(e.target.value)} disabled={grupoIds.length === 0}>
          <option value="">— Selecciona materia —</option>
          {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} · Sem {m.semestre}</option>)}
        </select>
      </Field>

      <Field label="Aula (opcional)" full>
        <select className={selectCls} value={aulaId} onChange={e => setAulaId(e.target.value)}>
          <option value="">— Sin aula asignada —</option>
          {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.capacidad ? ` (cap. ${a.capacidad})` : ''}</option>)}
        </select>
      </Field>

      {excedeCapacidad && (
        <p className="col-span-2 text-xs text-amber-600">
          Los grupos seleccionados suman {totalAlumnos} alumnos, más que la capacidad del aula ({aulaSeleccionada?.capacidad}). No bloquea el guardado.
        </p>
      )}

      {horasInfo && (
        <div className="col-span-2 text-xs text-slate-500 space-y-0.5">
          {grupoIds.map(gid => {
            const info = horasInfo[gid]
            const grupo = grupos.find(g => g.id === gid)
            if (!info) return null
            return <p key={gid}>{grupo?.clave}: {info.asignadas}h de {info.horas_semana}h asignadas — quedan {info.restantes}h.</p>
          })}
        </div>
      )}

      {checking && <p className="col-span-2 text-xs text-slate-400">Verificando disponibilidad…</p>}
      {!checking && materiaId && grupoIds.length > 0 && !fueraDisponibilidad && conflictos.length === 0 && (
        <p className="col-span-2 text-xs text-emerald-600">Disponible — sin conflictos.</p>
      )}
    </ModalWrap>
  )
}

// ── Editor inline: agregar/quitar grupos de un bloque ya asignado ──────────

function EditarGruposBloque({
  periodoId, carreraId, horarioId, grupoIdsActuales, onSaved,
}: {
  periodoId: string
  carreraId: string
  horarioId: string
  grupoIdsActuales: string[]
  onSaved: () => void
}) {
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)
  const [editando, setEditando] = useState(false)
  const [grupoIds, setGrupoIds] = useState<string[]>(grupoIdsActuales)
  const [saving, setSaving] = useState(false)

  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['builder-grupos', periodoId, carreraId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId, carrera_id: carreraId }),
    enabled: editando,
  })

  async function handleSave() {
    if (grupoIds.length === 0) return
    setSaving(true)
    try {
      await academicoApi.actualizarGruposHorario(horarioId, grupoIds)
      toastSuccess('Grupos del bloque actualizados.')
      setEditando(false)
      onSaved()
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setSaving(false)
    }
  }

  if (!editando) {
    return <button onClick={() => setEditando(true)} className="text-xs font-medium text-blue-600 hover:underline">Editar grupos</button>
  }

  return (
    <div className="space-y-2">
      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
        {grupos.map(g => (
          <label key={g.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={grupoIds.includes(g.id)}
              onChange={() => setGrupoIds(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
            />
            <span>{g.clave} · Sem {g.semestre}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || grupoIds.length === 0} className="text-xs font-medium text-white bg-blue-600 px-3 py-1 rounded disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar grupos'}
        </button>
        <button onClick={() => setEditando(false)} className="text-xs text-slate-500 hover:underline">Cancelar</button>
      </div>
    </div>
  )
}

// ── Modal: elegir periodo + carrera cuando no vienen en la URL ──────────────

function SeleccionContextoModal({ onContinuar }: { onContinuar: (periodoId: string, carreraId: string) => void }) {
  const { data: periodos = [] } = usePeriodos()
  const { data: carreras = [] } = useCarreras()
  const periodoActivo = periodos.find(p => p.activo)
  const [periodoId, setPeriodoId] = useState(periodoActivo?.id ?? '')
  const [carreraId, setCarreraId] = useState('')

  useEffect(() => {
    if (periodoActivo && !periodoId) setPeriodoId(periodoActivo.id)
  }, [periodoActivo, periodoId])

  return (
    <div className="min-h-full bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 w-full max-w-md space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Constructor de cargas académicas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Selecciona el periodo y la carrera para comenzar.</p>
        </div>
        <Field label="Periodo *" full>
          <select className={selectCls} value={periodoId} onChange={e => setPeriodoId(e.target.value)}>
            <option value="">— Selecciona periodo —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
          </select>
        </Field>
        <Field label="Carrera *" full>
          <select className={selectCls} value={carreraId} onChange={e => setCarreraId(e.target.value)}>
            <option value="">— Selecciona carrera —</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
          </select>
        </Field>
        <button
          onClick={() => periodoId && carreraId && onContinuar(periodoId, carreraId)}
          disabled={!periodoId || !carreraId}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CargaBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo_id') ?? ''
  const carreraId = searchParams.get('carrera_id') ?? ''
  const grupoIdParam = searchParams.get('grupo_id') ?? ''

  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)

  const { data: periodos = [] } = usePeriodos()
  const { data: carreras = [] } = useCarreras()
  const periodo = periodos.find(p => p.id === periodoId)
  const carrera = carreras.find(c => c.id === carreraId)

  const [docenteId, setDocenteId] = useState(searchParams.get('docente_id') ?? '')
  const [selectedSlot, setSelectedSlot] = useState<{ dia: DiaSemana; slot: BuilderSlot } | null>(null)
  const [nuevaClaseSeleccion, setNuevaClaseSeleccion] = useState<Seleccion | null>(null)
  const [drag, setDrag] = useState<{ dia: DiaSemana; anchorHora: string; hoverHora: string } | null>(null)
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)

  const primerRender = useRef(true)
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return }
    setDocenteId('')
  }, [periodoId, carreraId])

  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes', carreraId],
    queryFn: () => academicoApi.getDocentes({ carrera_id: carreraId || undefined }),
    enabled: !!periodoId && !!carreraId,
  })

  const { data: gridData, isLoading } = useQuery({
    queryKey: ['builder-grid', periodoId, docenteId, carreraId, grupoIdParam],
    queryFn: () => academicoApi.getBuilderGrid({
      periodo_id: periodoId, docente_id: docenteId, carrera_id: carreraId,
      ...(grupoIdParam ? { grupo_id: grupoIdParam } : {}),
    }),
    enabled: !!periodoId && !!docenteId,
    staleTime: 15_000,
  })

  const dias: BuilderDia[] = gridData?.dias ?? []
  const allSlots = dias.flatMap(d => d.horas).map(h => h.hora).filter((v, i, a) => a.indexOf(v) === i).sort()

  function siguienteHora(hora: string): string {
    const h = parseInt(hora.slice(0, 2), 10) + 1
    return `${String(h).padStart(2, '0')}:00`
  }

  function handleSlotClick(dia: DiaSemana, slot: BuilderSlot) {
    if (slot.estado === 'reservado') setSelectedSlot({ dia, slot })
  }

  function horasDisponibles(dia: DiaSemana): string[] {
    const diaData = dias.find(d => d.dia_semana === dia)
    return (diaData?.horas ?? []).filter(h => h.estado === 'disponible').map(h => h.hora).sort()
  }

  function iniciarArrastre(dia: DiaSemana, hora: string) {
    setDrag({ dia, anchorHora: hora, hoverHora: hora })
  }

  function extenderArrastre(dia: DiaSemana, hora: string) {
    setDrag(d => {
      if (!d || d.dia !== dia) return d
      const disponibles = new Set(horasDisponibles(dia))
      const desde = Math.min(parseInt(d.anchorHora), parseInt(hora))
      const hasta = Math.max(parseInt(d.anchorHora), parseInt(hora))
      for (let h = desde; h <= hasta; h++) {
        if (!disponibles.has(`${String(h).padStart(2, '0')}:00`)) return d
      }
      return { ...d, hoverHora: hora }
    })
  }

  function estaResaltado(dia: DiaSemana, hora: string): boolean {
    if (!drag || drag.dia !== dia) return false
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
          setNuevaClaseSeleccion({ dia_semana: d.dia, hora_inicio: desde, hora_fin: siguienteHora(hasta) })
        }
        return null
      })
    }
    window.addEventListener('mouseup', finalizar)
    return () => window.removeEventListener('mouseup', finalizar)
  }, [drag])

  async function handleEliminarBloque(horarioId: string) {
    try {
      await academicoApi.deleteHorario(horarioId)
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      setSelectedSlot(null)
      toastSuccess('Bloque de horario eliminado.')
    } catch (e) {
      toastError(mutationError(e))
    }
  }

  if (!periodoId || !carreraId) {
    return (
      <SeleccionContextoModal
        onContinuar={(p, c) => setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.set('periodo_id', p)
          next.set('carrera_id', c)
          return next
        })}
      />
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <Link to="/admin" className="hover:text-slate-800 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link to="/admin/gestion-academica/cargas" className="hover:text-slate-800 transition-colors">Cargas académicas</Link>
        <span>/</span>
        <span>{periodo?.nombre ?? '…'}</span>
        <span>/</span>
        <span>{carrera?.nombre ?? '…'}</span>
        <span>/</span>
        <span className="font-medium text-slate-800">Nueva carga académica</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Nueva carga académica</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {carrera?.clave} — {carrera?.nombre} · {periodo?.nombre}
        </p>
      </div>

      {/* Docente */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Docente</label>
          <select className={`${selectCls} min-w-[260px]`} value={docenteId} onChange={e => setDocenteId(e.target.value)}>
            <option value="">— Selecciona docente —</option>
            {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {docenteId && (
        <>
          {/* Banner instructivo */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-800">
            Haz clic en una hora disponible o arrastra para seleccionar un rango contiguo. Se abrirá una ventana para elegir asignatura, grupo(s) y aula.
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            {[
              { color: 'bg-white border-slate-300', label: 'Disponible' },
              { color: 'bg-blue-600 border-blue-600', label: 'Ocupado — color por asignatura' },
              { color: 'bg-blue-600 ring-2 ring-amber-400 ring-offset-1 border-transparent', label: 'Ocupado (otra carrera)' },
              { color: 'bg-slate-100 border-slate-200', label: 'Fuera de disponibilidad' },
            ].map(item => (
              <span key={item.label} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded border ${item.color}`} />
                {item.label}
              </span>
            ))}
          </div>

          {/* Cuadrícula */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Cargando cuadrícula…</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-slate-500 font-medium w-14">Hora</th>
                      {DIAS.map(dia => (
                        <th key={dia} className="px-1 py-2 text-center text-slate-700 font-semibold">{DIA_LABEL[dia]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSlots.map(hora => (
                      <tr key={hora} className="border-b border-slate-50">
                        <td className="px-3 py-0.5 text-slate-400 font-mono tabular-nums">{hora}</td>
                        {DIAS.map(dia => {
                          const diaData = dias.find(d => d.dia_semana === dia)
                          const slot = diaData?.horas.find(h => h.hora === hora)
                          return (
                            <td key={dia} className="px-0.5 py-0.5">
                              {slot && (
                                <SlotCell
                                  slot={slot}
                                  onClick={() => handleSlotClick(dia, slot)}
                                  onMouseDown={() => slot.estado === 'disponible' && iniciarArrastre(dia, slot.hora)}
                                  onMouseEnter={() => slot.estado === 'disponible' && extenderArrastre(dia, slot.hora)}
                                  highlighted={estaResaltado(dia, slot.hora)}
                                />
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
        </>
      )}

      {/* Panel de detalle del slot seleccionado */}
      {selectedSlot && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              {DIA_LABEL_FULL[selectedSlot.dia]} {selectedSlot.slot.hora_inicio} – {selectedSlot.slot.hora_fin}
            </h2>
            <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p><span className="font-medium">Materia:</span> {selectedSlot.slot.materia ?? '—'}</p>
            <p><span className="font-medium">Grupo:</span> {selectedSlot.slot.grupo ?? '—'}</p>
            <p><span className="font-medium">Aula:</span> {selectedSlot.slot.aula ?? '—'}</p>
            {selectedSlot.slot.misma_carrera === false && (
              <p className="text-amber-600 text-xs">Esta clase pertenece a otra carrera.</p>
            )}
            {selectedSlot.slot.horario_id && (
              <div className="mt-2 flex items-center gap-4">
                <EditarGruposBloque
                  periodoId={periodoId}
                  carreraId={carreraId}
                  horarioId={selectedSlot.slot.horario_id}
                  grupoIdsActuales={selectedSlot.slot.grupo_ids ?? []}
                  onSaved={() => { qc.invalidateQueries({ queryKey: ['builder-grid'] }); setSelectedSlot(null) }}
                />
                <button
                  onClick={() => handleEliminarBloque(selectedSlot.slot.horario_id!)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Eliminar este bloque
                </button>
                {selectedSlot.slot.materia_id && (
                  <button
                    onClick={() => {
                      setPlantilla({
                        materiaId: selectedSlot.slot.materia_id!,
                        grupoIds: selectedSlot.slot.grupo_ids ?? [],
                        aulaId: selectedSlot.slot.aula_id ?? '',
                      })
                      setSelectedSlot(null)
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Duplicar…
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {plantilla && !nuevaClaseSeleccion && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-800 flex items-center justify-between">
          <span>Plantilla lista para duplicar — selecciona una hora libre en el grid para colocarla.</span>
          <button onClick={() => setPlantilla(null)} className="text-xs font-medium text-blue-600 hover:underline">Cancelar</button>
        </div>
      )}

      {nuevaClaseSeleccion && (
        <NuevaClaseModal
          periodoId={periodoId}
          carreraId={carreraId}
          docenteId={docenteId}
          grupoId={grupoIdParam || undefined}
          seleccion={nuevaClaseSeleccion}
          plantillaInicial={plantilla}
          onClose={(_asignado, plantillaParaContinuar) => {
            setNuevaClaseSeleccion(null)
            setPlantilla(plantillaParaContinuar ?? null)
          }}
        />
      )}
    </div>
  )
}
