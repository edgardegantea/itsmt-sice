import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type CargaAcademica, type Horario } from '../../services/academico'
import { selectCls, useCarreras, usePeriodos } from './shared'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIAS_LABEL: Record<typeof DIAS[number], string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

type Bloque = { dia_semana: typeof DIAS[number]; hora_inicio: string; hora_fin: string }

function BloqueRow({ bloque, index, onChange, onDelete, conflictoMsg }: {
  bloque: Bloque
  index: number
  onChange: (i: number, b: Bloque) => void
  onDelete: (i: number) => void
  conflictoMsg?: string
}) {
  const set = (k: keyof Bloque, v: string) => onChange(index, { ...bloque, [k]: v })
  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-center">
        <select value={bloque.dia_semana} onChange={e => set('dia_semana', e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
          {DIAS.map(d => <option key={d} value={d}>{DIAS_LABEL[d]}</option>)}
        </select>
        <input type="time" value={bloque.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        <span className="text-slate-400 text-xs">→</span>
        <input type="time" value={bloque.hora_fin} onChange={e => set('hora_fin', e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        <button onClick={() => onDelete(index)} className="text-red-500 text-lg leading-none">&times;</button>
      </div>
      {conflictoMsg && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{conflictoMsg}</p>
      )}
    </div>
  )
}

export default function HorariosTab() {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const [carreraId, setCarreraId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [cargaSelId, setCargaSelId] = useState('')
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [conflictos, setConflictos] = useState<Record<number, string>>({})
  const [guardado, setGuardado] = useState(false)

  const { data: cargas = [] } = useQuery({
    queryKey: ['cargas-academicas', carreraId, periodoId],
    queryFn: () => academicoApi.getCargas(Object.fromEntries([
      ...(carreraId ? [] : []),
      ...(periodoId ? [['periodo_id', periodoId]] : []),
    ])),
    enabled: !!periodoId,
  })

  const { data: horarios = [] } = useQuery({
    queryKey: ['horarios', periodoId],
    queryFn: () => academicoApi.getHorarios({ periodo_id: periodoId }),
    enabled: !!periodoId,
  })

  const cargaActual = (cargas as CargaAcademica[]).find(c => c.id === cargaSelId)
  

  const seleccionarCarga = (id: string) => {
    setCargaSelId(id)
    setConflictos({})
    setGuardado(false)
    const existentes = (horarios as Horario[])
      .filter(h => h.carga_academica_id === id)
      .map(h => ({ dia_semana: h.dia_semana as any, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin }))
    setBloques(existentes.length > 0 ? existentes : [{ dia_semana: 'lunes', hora_inicio: '07:00', hora_fin: '09:00' }])
  }

  const verificar = async (i: number, b: Bloque) => {
    if (!cargaSelId || !b.hora_inicio || !b.hora_fin) return
    try {
      const res = await academicoApi.verificarConflictos({ carga_academica_id: cargaSelId, ...b })
      setConflictos(prev => ({
        ...prev,
        [i]: res.tiene_conflictos ? res.conflictos[0]?.mensaje : '',
      }))
    } catch { /* ignora */ }
  }

  const actualizarBloque = (i: number, b: Bloque) => {
    const nueva = [...bloques]; nueva[i] = b; setBloques(nueva)
    verificar(i, b)
  }

  const mutSave = useMutation({
    mutationFn: () => academicoApi.saveHorarios(cargaSelId, bloques),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios'] })
      setGuardado(true)
    },
  })

  const tieneConflictos = Object.values(conflictos).some(m => !!m)

  // Vista semanal (grid por horas)
  // horarios grilla no implementada
  

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setCargaSelId('') }} className={selectCls}>
            <option value="">— Selecciona —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Carrera (filtro)</label>
          <select value={carreraId} onChange={e => setCarreraId(e.target.value)} className={selectCls}>
            <option value="">Todas</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave}</option>)}
          </select>
        </div>
      </div>

      {periodoId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista de cargas */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cargas académicas
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {(cargas as CargaAcademica[])
                .filter(c => !carreraId || c.grupo?.carrera_id === carreraId)
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => seleccionarCarga(c.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition hover:bg-slate-50 ${cargaSelId === c.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                  >
                    <p className="font-medium text-slate-800">{c.materia?.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.grupo?.clave} · {c.docente?.name}</p>
                    <p className="text-xs text-slate-400">{(horarios as Horario[]).filter(h => h.carga_academica_id === c.id).length} bloques</p>
                  </button>
                ))}
              {(cargas as CargaAcademica[]).length === 0 && (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">Sin cargas en este periodo.</p>
              )}
            </div>
          </div>

          {/* Editor de horarios */}
          <div className="lg:col-span-2 space-y-3">
            {cargaActual ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div>
                  <p className="font-semibold text-slate-800">{cargaActual.materia?.nombre}</p>
                  <p className="text-xs text-slate-500">{cargaActual.grupo?.clave} · Docente: {cargaActual.docente?.name}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Bloques de horario</p>
                  {bloques.map((b, i) => (
                    <BloqueRow
                      key={i}
                      bloque={b}
                      index={i}
                      onChange={actualizarBloque}
                      onDelete={i => setBloques(prev => prev.filter((_, j) => j !== i))}
                      conflictoMsg={conflictos[i]}
                    />
                  ))}
                  <button
                    onClick={() => setBloques(prev => [...prev, { dia_semana: 'lunes', hora_inicio: '07:00', hora_fin: '09:00' }])}
                    className="text-xs text-blue-600 hover:underline"
                  >+ Agregar bloque</button>
                </div>

                {tieneConflictos && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
                    Hay conflictos de horario. Corrígelos antes de guardar.
                  </div>
                )}
                {mutSave.isError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
                    {(mutSave.error as any)?.response?.data?.message ?? 'Error al guardar horarios.'}
                  </div>
                )}
                {guardado && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-700">
                    Horarios guardados correctamente.
                  </div>
                )}

                <button
                  onClick={() => mutSave.mutate()}
                  disabled={mutSave.isPending || tieneConflictos || bloques.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {mutSave.isPending ? 'Guardando…' : 'Guardar horarios'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-16 text-center text-sm text-slate-400">
                Selecciona una carga académica para editar su horario.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
