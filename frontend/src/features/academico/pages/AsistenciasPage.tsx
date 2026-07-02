import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type SesionClase, type AsistenciaRegistro } from '../services/academico'
import { Field, SkeletonRows, EmptyRow, inputCls, selectCls, ModalWrap, mutationError } from './tabs/shared'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'

type EstatusAsistencia = 'presente' | 'ausente' | 'retardo' | 'justificado'

const ESTATUS_COLORS: Record<EstatusAsistencia, string> = {
  presente:    'bg-green-100 text-green-700',
  ausente:     'bg-red-100 text-red-700',
  retardo:     'bg-yellow-100 text-yellow-700',
  justificado: 'bg-blue-100 text-blue-700',
}

interface Grupo { id: string; clave: string; semestre: number; carrera?: { nombre: string }; periodo?: { nombre: string } }
interface AlumnoGrupo { id: string; name: string; email: string }

interface SesionForm {
  grupo_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  tema: string
}

export default function AsistenciasPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [modal, setModal] = useState<null | 'nueva' | SesionClase>(null)
  const [formSesion, setFormSesion] = useState<SesionForm>({ grupo_id: '', fecha: '', hora_inicio: '', hora_fin: '', tema: '' })
  const [asistenciasForm, setAsistenciasForm] = useState<Record<string, EstatusAsistencia>>({})
  const [alumnosGrupo, setAlumnosGrupo] = useState<AlumnoGrupo[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState('')

  const { data: sesionesData, isLoading } = useQuery({
    queryKey: ['sesiones-clase', filtroPeriodo],
    queryFn: () => academicoApi.getSesionesClase(filtroPeriodo ? { periodo_id: filtroPeriodo } : {}),
  })

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data as { id: string; nombre: string }[]),
  })

  const sesiones = sesionesData?.data ?? []

  const mutCrear = useMutation({
    mutationFn: () => academicoApi.crearSesionClase({
      ...formSesion,
      asistencias: Object.entries(asistenciasForm).map(([alumno_id, estatus]) => ({ alumno_id, estatus })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesiones-clase'] })
      setModal(null)
      toastSuccess('Sesión registrada correctamente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutActualizar = useMutation({
    mutationFn: (sesionId: string) => academicoApi.actualizarAsistencia(sesionId,
      Object.entries(asistenciasForm).map(([alumno_id, estatus]) => ({ alumno_id, estatus }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesiones-clase'] })
      setModal(null)
      toastSuccess('Asistencia actualizada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const cargarAlumnosGrupo = async (grupoId: string) => {
    if (!grupoId) { setAlumnosGrupo([]); return }
    try {
      const r = await apiClient.get(`/grupos/${grupoId}/alumnos`)
      setAlumnosGrupo(r.data.data ?? [])
      const init: Record<string, EstatusAsistencia> = {}
      ;(r.data.data ?? []).forEach((a: AlumnoGrupo) => { init[a.id] = 'presente' })
      setAsistenciasForm(init)
    } catch {
      setAlumnosGrupo([])
    }
  }

  const openNueva = () => {
    setFormSesion({ grupo_id: '', fecha: new Date().toISOString().slice(0, 10), hora_inicio: '', hora_fin: '', tema: '' })
    setAsistenciasForm({})
    setAlumnosGrupo([])
    setModal('nueva')
  }

  const openEdit = async (s: SesionClase) => {
    const detail = await academicoApi.getSesionClase(s.id)
    const init: Record<string, EstatusAsistencia> = {}
    ;(detail.asistencias ?? []).forEach((a: AsistenciaRegistro) => { init[a.alumno_id] = a.estatus })
    setAsistenciasForm(init)
    const alumnos: AlumnoGrupo[] = (detail.asistencias ?? []).map((a: AsistenciaRegistro) => ({
      id: a.alumno_id,
      name: a.alumno?.name ?? a.alumno_id,
      email: a.alumno?.email ?? '',
    }))
    setAlumnosGrupo(alumnos)
    setModal(detail)
  }

  const handleSave = () => {
    if (modal === 'nueva') {
      mutCrear.mutate()
    } else {
      mutActualizar.mutate((modal as SesionClase).id)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Asistencias</h1>
            <p className="text-sm text-slate-500 mt-0.5">Registro de sesiones de clase y control de asistencia</p>
          </div>
          <button onClick={openNueva} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Nueva sesión
          </button>
        </div>

        {/* Filtro periodo */}
        <div className="flex gap-3 items-center">
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            className={`${selectCls} max-w-xs`}
          >
            <option value="">Todos los periodos</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Tabla de sesiones */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tema</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Asistencias</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : sesiones.length === 0 ? (
                <EmptyRow cols={6} />
              ) : (
                sesiones.map(s => {
                  const totalReg = s.asistencias?.length ?? 0
                  const presentes = s.asistencias?.filter(a => a.estatus === 'presente').length ?? 0
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.fecha}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{s.grupo?.clave ?? '—'}</p>
                        <p className="text-xs text-slate-400">{s.grupo?.carrera?.nombre}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.hora_inicio} – {s.hora_fin}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.tema ?? '—'}</td>
                      <td className="px-4 py-3">
                        {totalReg > 0 ? (
                          <span className="text-xs text-slate-600">{presentes}/{totalReg} presentes</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin registro</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Asistencia</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalWrap
          title={modal === 'nueva' ? 'Nueva sesión de clase' : `Asistencia: ${(modal as SesionClase).fecha}`}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={mutCrear.isPending || mutActualizar.isPending}
        >
          {modal === 'nueva' && (
            <>
              <Field label="Grupo *" full>
                <GrupoSelect
                  value={formSesion.grupo_id}
                  onChange={v => {
                    setFormSesion(f => ({ ...f, grupo_id: v }))
                    cargarAlumnosGrupo(v)
                  }}
                />
              </Field>
              <Field label="Fecha *">
                <input type="date" value={formSesion.fecha} onChange={e => setFormSesion(f => ({ ...f, fecha: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Hora inicio *">
                <input type="time" value={formSesion.hora_inicio} onChange={e => setFormSesion(f => ({ ...f, hora_inicio: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Hora fin *">
                <input type="time" value={formSesion.hora_fin} onChange={e => setFormSesion(f => ({ ...f, hora_fin: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Tema (opcional)" full>
                <input value={formSesion.tema} onChange={e => setFormSesion(f => ({ ...f, tema: e.target.value }))} placeholder="Ej. Recursividad" className={inputCls} />
              </Field>
            </>
          )}

          {/* Lista de asistencia */}
          {alumnosGrupo.length > 0 && (
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-slate-600 mb-3">Lista de asistencia ({alumnosGrupo.length} alumnos)</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alumnosGrupo.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate">{a.email}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(['presente', 'ausente', 'retardo', 'justificado'] as EstatusAsistencia[]).map(est => (
                        <button
                          key={est}
                          onClick={() => setAsistenciasForm(f => ({ ...f, [a.id]: est }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${
                            asistenciasForm[a.id] === est
                              ? `${ESTATUS_COLORS[est]} border-current font-semibold`
                              : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {est.slice(0, 3).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modal === 'nueva' && formSesion.grupo_id && alumnosGrupo.length === 0 && (
            <p className="col-span-2 text-xs text-slate-400 italic">Sin alumnos inscritos en este grupo.</p>
          )}
        </ModalWrap>
      )}
    </div>
  )
}

function GrupoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-docente'],
    queryFn: () => apiClient.get('/grupos').then(r => r.data.data as Grupo[]),
  })
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}>
      <option value="">Seleccionar grupo…</option>
      {grupos.map(g => (
        <option key={g.id} value={g.id}>
          {g.clave} — {g.carrera?.nombre} S{g.semestre} ({g.periodo?.nombre})
        </option>
      ))}
    </select>
  )
}
