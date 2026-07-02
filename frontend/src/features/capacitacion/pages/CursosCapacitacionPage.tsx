import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import {
  capacitacionService,
  type CursoCapacitacion,
  type DatosCedula,
  type CursoParams,
} from '../services/capacitacion'

const ESTATUS_BADGE: Record<string, string> = {
  planeado:   'bg-blue-100 text-blue-800',
  en_curso:   'bg-yellow-100 text-yellow-800',
  finalizado: 'bg-green-100 text-green-800',
  cancelado:  'bg-red-100 text-red-800',
}

const ESTATUS_LABELS: Record<string, string> = {
  planeado:   'Planeado',
  en_curso:   'En curso',
  finalizado: 'Finalizado',
  cancelado:  'Cancelado',
}

const TIPO_LABELS: Record<string, string> = {
  formacion_docente:        'FD — Formación Docente',
  actualizacion_profesional:'AP — Actualización Profesional',
}

export default function CursosCapacitacionPage() {
  const user = useAuthStore(s => s.user)
  const qc   = useQueryClient()

  const isJefe = user?.roles?.some((r: string) =>
    ['superadmin', 'admin', 'personal_administrativo', 'subdireccion_academica', 'direccion_academica'].includes(r)
  )

  const [tab, setTab]               = useState<'lista' | 'nuevo' | 'inscritos' | 'inscribir'>('lista')
  const [selectedCurso, setSelected] = useState<CursoCapacitacion | null>(null)

  const [cursoForm, setCursoForm] = useState<Partial<CursoParams>>({ tipo: 'formacion_docente', modalidad: 'presencial', origen: 'interno' })
  const [cedulaForm, setCedula]   = useState<Partial<DatosCedula>>({ sexo: 'H' })

  const { data: cursosResp, isLoading } = useQuery({
    queryKey: ['cursos-capacitacion'],
    queryFn: () => capacitacionService.getCursos(),
  })
  const cursos: CursoCapacitacion[] = (cursosResp?.data as { data?: CursoCapacitacion[] })?.data ?? []

  const { data: inscritosResp } = useQuery({
    queryKey: ['inscritos', selectedCurso?.id],
    queryFn: () => capacitacionService.getInscritos(selectedCurso!.id),
    enabled: !!selectedCurso && tab === 'inscritos',
  })
  const inscritos = inscritosResp?.data ?? []

  const crearMut = useMutation({
    mutationFn: (d: CursoParams) => capacitacionService.crearCurso(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos-capacitacion'] })
      setTab('lista')
      setCursoForm({ tipo: 'formacion_docente', modalidad: 'presencial', origen: 'interno' })
    },
  })

  const actualizarMut = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) =>
      capacitacionService.actualizarCurso(id, { estatus: estatus as CursoCapacitacion['estatus'] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos-capacitacion'] }),
  })

  const inscribirMut = useMutation({
    mutationFn: (d: DatosCedula) => capacitacionService.inscribirse(selectedCurso!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos-capacitacion'] })
      qc.invalidateQueries({ queryKey: ['inscritos', selectedCurso?.id] })
      setTab('inscritos')
      setCedula({ sexo: 'H' })
    },
  })

  const descargarCedula = async (cedulaId: string) => {
    const resp = await capacitacionService.descargarCedulaPdf(cedulaId)
    const url  = URL.createObjectURL(resp.data as Blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `cedula_${cedulaId.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCrearCurso = (e: React.FormEvent) => {
    e.preventDefault()
    crearMut.mutate(cursoForm as CursoParams)
  }

  const handleInscribir = (e: React.FormEvent) => {
    e.preventDefault()
    inscribirMut.mutate(cedulaForm as DatosCedula)
  }

  const ESTATUS_NEXT: Record<string, string | null> = {
    planeado:   'en_curso',
    en_curso:   'finalizado',
    finalizado: null,
    cancelado:  null,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Capacitación Docente</h1>
        {isJefe && (
          <button
            onClick={() => setTab('nuevo')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + Nuevo Curso
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([['lista', 'Cursos'], ...(selectedCurso ? [['inscritos', 'Inscritos'], ['inscribir', 'Inscribirme']] : [])] as [string, string][]).map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Nuevo curso */}
      {tab === 'nuevo' && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Registrar Curso de Capacitación</h2>
          <form onSubmit={handleCrearCurso} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del curso</label>
              <input
                required
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.nombre ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.tipo}
                onChange={e => setCursoForm(f => ({ ...f, tipo: e.target.value as CursoCapacitacion['tipo'] }))}
              >
                <option value="formacion_docente">Formación Docente (FD)</option>
                <option value="actualizacion_profesional">Actualización Profesional (AP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.modalidad}
                onChange={e => setCursoForm(f => ({ ...f, modalidad: e.target.value as CursoCapacitacion['modalidad'] }))}
              >
                <option value="presencial">Presencial</option>
                <option value="distancia">Distancia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.origen}
                onChange={e => setCursoForm(f => ({ ...f, origen: e.target.value as CursoCapacitacion['origen'] }))}
              >
                <option value="interno">Interno</option>
                <option value="externo">Externo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <input
                required
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.instructor ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, instructor: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                required
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.periodo_inicio ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, periodo_inicio: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input
                required
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.periodo_fin ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, periodo_fin: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas totales</label>
              <input
                required
                type="number"
                min={1}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.horas_totales ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, horas_totales: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
              <input
                type="text"
                placeholder="Ej: 08:00-12:00"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cursoForm.horario ?? ''}
                onChange={e => setCursoForm(f => ({ ...f, horario: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setTab('lista')} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMut.isPending ? 'Guardando...' : 'Registrar Curso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de cursos */}
      {tab === 'lista' && (
        isLoading ? (
          <div className="text-center py-12 text-gray-500">Cargando cursos...</div>
        ) : (
          <div className="grid gap-4">
            {cursos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No hay cursos registrados.</div>
            ) : cursos.map(curso => (
              <div key={curso.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{curso.nombre}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {TIPO_LABELS[curso.tipo] ?? curso.tipo} • {curso.modalidad} • {curso.horas_totales}h
                    </p>
                    <p className="text-sm text-gray-500">
                      Instructor: {curso.instructor} — {curso.periodo_inicio} a {curso.periodo_fin}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTATUS_BADGE[curso.estatus]}`}>
                      {ESTATUS_LABELS[curso.estatus]}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setSelected(curso); setTab('inscritos') }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver inscritos
                  </button>
                  {['planeado', 'en_curso'].includes(curso.estatus) && (
                    <button
                      onClick={() => { setSelected(curso); setTab('inscribir') }}
                      className="text-sm text-green-700 hover:underline"
                    >
                      Inscribirme
                    </button>
                  )}
                  {isJefe && ESTATUS_NEXT[curso.estatus] && (
                    <button
                      onClick={() => actualizarMut.mutate({ id: curso.id, estatus: ESTATUS_NEXT[curso.estatus]! })}
                      disabled={actualizarMut.isPending}
                      className="text-sm text-orange-600 hover:underline disabled:opacity-50"
                    >
                      → {ESTATUS_LABELS[ESTATUS_NEXT[curso.estatus]!]}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Inscritos */}
      {tab === 'inscritos' && selectedCurso && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold">{selectedCurso.nombre} — Inscritos</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">RFC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Puesto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estatus</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cédula</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.isArray(inscritos) && inscritos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No hay inscritos aún.
                  </td>
                </tr>
              ) : Array.isArray(inscritos) && inscritos.map((ced: any) => (
                <tr key={ced.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ced.usuario?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{ced.rfc}</td>
                  <td className="px-4 py-3">{ced.puesto}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{ced.estatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => descargarCedula(ced.id)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulario inscripción */}
      {tab === 'inscribir' && selectedCurso && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Inscripción — {selectedCurso.nombre}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Complete sus datos laborales para generar la cédula de inscripción (Formato TecNM-AC-PO-005-07).
          </p>
          <form onSubmit={handleInscribir} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.rfc ?? ''} onChange={e => setCedula(f => ({ ...f, rfc: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CURP</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.curp ?? ''} onChange={e => setCedula(f => ({ ...f, curp: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.sexo} onChange={e => setCedula(f => ({ ...f, sexo: e.target.value as 'H' | 'M' }))}>
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado máximo de estudios</label>
              <input required type="text" placeholder="Ej: Maestría" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.grado_maximo_estudios ?? ''} onChange={e => setCedula(f => ({ ...f, grado_maximo_estudios: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de adscripción</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.area_adscripcion ?? ''} onChange={e => setCedula(f => ({ ...f, area_adscripcion: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.puesto ?? ''} onChange={e => setCedula(f => ({ ...f, puesto: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.nombre_carrera ?? ''} onChange={e => setCedula(f => ({ ...f, nombre_carrera: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clave presupuestal</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.clave_presupuestal ?? ''} onChange={e => setCedula(f => ({ ...f, clave_presupuestal: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jefe inmediato</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.jefe_inmediato ?? ''} onChange={e => setCedula(f => ({ ...f, jefe_inmediato: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono oficial</label>
              <input required type="tel" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.telefono_oficial ?? ''} onChange={e => setCedula(f => ({ ...f, telefono_oficial: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horario laboral</label>
              <input required type="text" placeholder="Ej: 07:00-15:00" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={cedulaForm.horario_laboral ?? ''} onChange={e => setCedula(f => ({ ...f, horario_laboral: e.target.value }))} />
            </div>

            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setTab('lista')} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={inscribirMut.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {inscribirMut.isPending ? 'Inscribiendo...' : 'Confirmar Inscripción'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
