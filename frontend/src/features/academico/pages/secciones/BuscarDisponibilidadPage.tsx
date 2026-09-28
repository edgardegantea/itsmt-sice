import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { academicoApi, type Grupo, type Materia } from '../../services/academico'
import { usePeriodos, useCarreras, selectCls, Field, mutationError } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'
import { ChevronLeft } from 'lucide-react'

const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

export default function BuscarDisponibilidadPage() {
  const navigate = useNavigate()
  const toastError = useToastStore(s => s.error)
  const { data: periodos = [] } = usePeriodos()
  const { data: carreras = [] } = useCarreras()
  const periodoActivo = periodos.find(p => p.activo)

  const [periodoId, setPeriodoId] = useState(periodoActivo?.id ?? '')
  const [carreraId, setCarreraId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [grupoIds, setGrupoIds] = useState<string[]>([])
  const [diaFiltro, setDiaFiltro] = useState('')

  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['builder-grupos', periodoId, carreraId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId, carrera_id: carreraId }),
    enabled: !!periodoId && !!carreraId,
  })

  const { data: materias = [] } = useQuery<Materia[]>({
    queryKey: ['builder-materias', carreraId],
    queryFn: () => academicoApi.getMaterias({ carrera_id: carreraId }),
    enabled: !!carreraId,
  })

  const buscar = useMutation({
    mutationFn: () => academicoApi.buscarDisponibilidad({
      periodo_id: periodoId,
      materia_id: materiaId,
      grupo_ids: grupoIds,
      carrera_id: carreraId || undefined,
      dia_semana: diaFiltro || undefined,
    }),
    onError: (e) => toastError(mutationError(e)),
  })

  function toggleGrupo(id: string) {
    setGrupoIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  const puedeBuscar = !!periodoId && !!materiaId && grupoIds.length > 0

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Buscador de disponibilidad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dado uno o varios grupos y una materia, encuentra combinaciones de día, hora, docente y aula libres.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4">
          <Field label="Periodo *" full>
            <select className={selectCls} value={periodoId} onChange={e => setPeriodoId(e.target.value)}>
              <option value="">— Selecciona periodo —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
            </select>
          </Field>
          <Field label="Carrera *" full>
            <select className={selectCls} value={carreraId} onChange={e => { setCarreraId(e.target.value); setMateriaId(''); setGrupoIds([]) }}>
              <option value="">— Selecciona carrera —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Materia *" full>
            <select className={selectCls} value={materiaId} onChange={e => setMateriaId(e.target.value)} disabled={!carreraId}>
              <option value="">— Selecciona materia —</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} · Sem {m.semestre}</option>)}
            </select>
          </Field>
          <Field label="Grupo(s) *" full>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {grupos.map(g => (
                <label key={g.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={grupoIds.includes(g.id)} onChange={() => toggleGrupo(g.id)} />
                  <span>{g.clave} · Sem {g.semestre}</span>
                </label>
              ))}
              {carreraId && grupos.length === 0 && <p className="text-xs text-slate-400 px-1">Sin grupos para esta carrera/periodo.</p>}
            </div>
          </Field>
          <Field label="Día (opcional)" full>
            <select className={selectCls} value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}>
              <option value="">Cualquier día</option>
              {Object.entries(DIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          <div className="col-span-2">
            <button
              onClick={() => buscar.mutate()}
              disabled={!puedeBuscar || buscar.isPending}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {buscar.isPending ? 'Buscando…' : 'Buscar huecos libres'}
            </button>
          </div>
        </div>

        {buscar.isSuccess && (
          buscar.data.propuestas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-6 py-8 text-center text-sm text-slate-400">
              No se encontraron combinaciones libres con estos criterios.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50 text-sm text-emerald-700 font-medium">
                {buscar.data.propuestas.length} propuesta{buscar.data.propuestas.length !== 1 ? 's' : ''} encontrada{buscar.data.propuestas.length !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-slate-100">
                {buscar.data.propuestas.map((p, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">{DIA_LABEL[p.dia_semana] ?? p.dia_semana}</span> {p.hora_inicio}–{p.hora_fin}
                      {' · '}{p.docente_nombre}
                      {p.aula_nombre && ` · ${p.aula_nombre}`}
                    </div>
                    <button
                      onClick={() => navigate(`/admin/gestion-academica/cargas/builder?periodo_id=${periodoId}&carrera_id=${carreraId}&docente_id=${p.docente_id}&grupo_id=${grupoIds[0]}`)}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Ir al constructor →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
