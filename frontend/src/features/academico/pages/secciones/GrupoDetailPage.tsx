import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Th, EmptyRow, mutationError } from '../tabs/shared'
import { useAlumnos } from '../tabs/shared'

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
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [asignarOpen, setAsignarOpen] = useState(false)
  const [selAlumnos, setSelAlumnos] = useState<string[]>([])

  const { data: grupo, isLoading } = useQuery({
    queryKey: ['grupo-detalle', id],
    queryFn: () => academicoApi.getGrupo(id!),
    enabled: !!id,
  })

  const { data: todosAlumnos = [] } = useAlumnos()

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

  const alumnosEnGrupo = new Set((grupo.alumnos ?? []).map(a => a.id))
  const alumnosDisponibles = todosAlumnos.filter(a => !alumnosEnGrupo.has(a.id))

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
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
              <p className="text-xs font-medium text-slate-600">Seleccionar alumnos a agregar:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {alumnosDisponibles.length === 0 && (
                  <p className="text-xs text-slate-400">No hay alumnos disponibles.</p>
                )}
                {alumnosDisponibles.map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selAlumnos.includes(a.id)}
                      onChange={e => setSelAlumnos(prev =>
                        e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id)
                      )}
                    />
                    <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{a.numero_control}</span>
                    <span>{
                      a.user?.name
                        ?? (a.inscripcion?.aspirante
                          ? `${a.inscripcion.aspirante.nombres} ${a.inscripcion.aspirante.apellido_paterno} ${a.inscripcion.aspirante.apellido_materno ?? ''}`.trim()
                          : '—')
                    }</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setAsignarOpen(false); setSelAlumnos([]) }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => asignar.mutate()}
                  disabled={selAlumnos.length === 0 || asignar.isPending}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {asignar.isPending ? 'Asignando…' : `Asignar${selAlumnos.length > 0 ? ` (${selAlumnos.length})` : ''}`}
                </button>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>N° Control</Th>
                <Th>Nombre</Th>
                <Th>Sem.</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(grupo.alumnos ?? []).length === 0 && <EmptyRow cols={4} msg="Sin alumnos asignados." />}
              {(grupo.alumnos ?? []).map(a => (
                <tr key={a.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.numero_control}</td>
                  <td className="px-4 py-2.5 text-slate-900">{alumnoNombre(a)}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{a.semestre_actual}°</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => window.confirm('¿Retirar alumno del grupo?') && quitar.mutate(a.id)}
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
