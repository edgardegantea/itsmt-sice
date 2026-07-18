import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type DiaSemana, type Grupo, type Materia } from '../../services/academico'
import { selectCls, mutationError, ModalWrap } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'

interface Seleccion {
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  modulo_sabatino?: 1 | 2 | null
}

const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

export default function AsignarSlotModal({
  periodoId, docenteId, seleccion, onClose,
}: {
  periodoId: string
  docenteId: string
  seleccion: Seleccion
  onClose: (asignado: boolean) => void
}) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)

  const [grupoId, setGrupoId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [aulaId, setAulaId] = useState('')

  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['builder-grupos', periodoId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId }),
  })

  const grupoSeleccionado = grupos.find(g => g.id === grupoId)

  const { data: materias = [] } = useQuery<Materia[]>({
    queryKey: ['builder-materias', grupoSeleccionado?.carrera_id],
    queryFn: () => academicoApi.getMaterias({ carrera_id: grupoSeleccionado!.carrera_id }),
    enabled: !!grupoSeleccionado,
  })

  const { data: aulas = [] } = useQuery({
    queryKey: ['builder-aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const [verificacion, setVerificacion] = useState<{ conflictos: { tipo: string; mensaje: string }[]; dentro_disponibilidad: boolean; mensaje_disponibilidad?: string | null } | null>(null)
  const [horasInfo, setHorasInfo] = useState<{ horas_semana: number; asignadas: number; restantes: number } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!materiaId || !grupoId) {
      setVerificacion(null)
      setHorasInfo(null)
      return
    }

    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      academicoApi.verificarDisponibilidad({
        periodo_id: periodoId,
        docente_id: docenteId,
        dia_semana: seleccion.dia_semana,
        hora_inicio: seleccion.hora_inicio,
        hora_fin: seleccion.hora_fin,
        aula_id: aulaId || undefined,
        grupo_id: grupoId,
        materia_id: materiaId,
      }).then(res => {
        setVerificacion(res.resultado)
        setHorasInfo(res.horas)
      })
    }, 250)

    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [materiaId, grupoId, aulaId, periodoId, docenteId, seleccion])

  const mutAsignar = useMutation({
    mutationFn: () => academicoApi.asignarHorario({
      periodo_id: periodoId,
      docente_id: docenteId,
      materia_id: materiaId,
      grupo_id: grupoId,
      aula_id: aulaId || undefined,
      dia_semana: seleccion.dia_semana,
      hora_inicio: seleccion.hora_inicio,
      hora_fin: seleccion.hora_fin,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builder-grid'] })
      toastSuccess('Clase asignada.')
      onClose(true)
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const conflictos = verificacion?.conflictos ?? []
  const fueraDisponibilidad = verificacion ? !verificacion.dentro_disponibilidad : false
  const puedeGuardar = !!materiaId && !!grupoId && conflictos.length === 0 && !fueraDisponibilidad && !mutAsignar.isPending

  const materiaSeleccionada = useMemo(() => materias.find(m => m.id === materiaId), [materias, materiaId])
  const materiasModulo1 = materias.filter(m => m.modulo_sabatino === 1)
  const materiasModulo2 = materias.filter(m => m.modulo_sabatino === 2)
  const materiasSinModulo = materias.filter(m => !m.modulo_sabatino)
  const esSabado = seleccion.dia_semana === 'sabado'

  return (
    <ModalWrap
      title="Asignar clase"
      onClose={() => onClose(false)}
      onSave={() => mutAsignar.mutate()}
      saving={mutAsignar.isPending}
    >
      <div className="col-span-2 -mt-2 mb-1 text-sm text-slate-500">
        {DIA_LABEL[seleccion.dia_semana]} · {seleccion.hora_inicio}–{seleccion.hora_fin}
        {seleccion.modulo_sabatino && ` · Módulo ${seleccion.modulo_sabatino}`}
      </div>

      {conflictos.length > 0 && (
        <div className="col-span-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <ul className="list-disc space-y-1 pl-4">
            {conflictos.map(c => <li key={c.tipo}>{c.mensaje}</li>)}
          </ul>
        </div>
      )}

      {fueraDisponibilidad && verificacion?.mensaje_disponibilidad && (
        <div className="col-span-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {verificacion.mensaje_disponibilidad}
        </div>
      )}

      <div className="col-span-2">
        <label className="text-xs font-medium text-slate-600 mb-1 block">Grupo *</label>
        <select value={grupoId} onChange={e => { setGrupoId(e.target.value); setMateriaId('') }} className={selectCls}>
          <option value="">Selecciona un grupo</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>
              {g.clave}{g.carrera?.nombre ? ` · ${g.carrera.nombre}` : ''} ({g.capacidad ?? '—'} alumnos)
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2">
        <label className="text-xs font-medium text-slate-600 mb-1 block">Materia *</label>
        <select value={materiaId} onChange={e => setMateriaId(e.target.value)} disabled={!grupoId} className={selectCls}>
          <option value="">Selecciona una materia</option>
          {esSabado ? (
            <>
              {materiasModulo1.length > 0 && (
                <optgroup label="Módulo 1">
                  {materiasModulo1.map(m => <option key={m.id} value={m.id}>{m.nombre} · sem. {m.semestre}</option>)}
                </optgroup>
              )}
              {materiasModulo2.length > 0 && (
                <optgroup label="Módulo 2">
                  {materiasModulo2.map(m => <option key={m.id} value={m.id}>{m.nombre} · sem. {m.semestre}</option>)}
                </optgroup>
              )}
              {materiasSinModulo.length > 0 && (
                <optgroup label="Sin módulo asignado">
                  {materiasSinModulo.map(m => <option key={m.id} value={m.id}>{m.nombre} · sem. {m.semestre}</option>)}
                </optgroup>
              )}
            </>
          ) : (
            materias.map(m => <option key={m.id} value={m.id}>{m.nombre} · sem. {m.semestre}</option>)
          )}
        </select>
        {horasInfo && (
          <p className="mt-1 text-xs text-slate-500">
            {horasInfo.asignadas}h de {horasInfo.horas_semana}h asignadas a este grupo · quedan {horasInfo.restantes}h
          </p>
        )}
        {esSabado && materiaSeleccionada && !materiaSeleccionada.modulo_sabatino && (
          <p className="mt-1 text-xs text-amber-600">Esta materia no tiene módulo sabatino configurado.</p>
        )}
      </div>

      <div className="col-span-2">
        <label className="text-xs font-medium text-slate-600 mb-1 block">Aula</label>
        <select value={aulaId} onChange={e => setAulaId(e.target.value)} className={selectCls}>
          <option value="">Sin aula asignada</option>
          {aulas.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}{a.capacidad ? ` (cap. ${a.capacidad})` : ''}</option>
          ))}
        </select>
      </div>

      {!puedeGuardar && materiaId && grupoId && conflictos.length === 0 && !fueraDisponibilidad && (
        <p className="col-span-2 text-xs text-slate-400">Verificando disponibilidad…</p>
      )}
    </ModalWrap>
  )
}
