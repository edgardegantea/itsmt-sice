import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, mergeCargasPorAsignatura, type SesionClase, type AsistenciaRegistro, type CargaAcademica, type Grupo as GrupoCarga } from '../services/academico'
import { Field, SkeletonRows, inputCls, selectCls, ModalWrap, mutationError, useCarreras } from './tabs/shared'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import { openPdfPreview, triggerDownload } from '../../../utils/pdfHelpers'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { useAuthStore } from '../../../store/authStore'
import PaseAsistenciaPanel from './PaseAsistenciaPanel'

// Roles con permiso de administrar el envío masivo de listas (coincide con
// SesionClaseController::ROLES_GESTION_ENVIO en el backend) — un docente sin
// ninguno de estos roles no puede usar esos paneles, así que ni se le muestran.
const ROLES_GESTION_ENVIO = ['superadmin', 'admin', 'jefe_carrera', 'director_academico',
  'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica']

type EstatusAsistencia = 'presente' | 'ausente' | 'retardo' | 'justificado'

const ESTATUS_COLORS: Record<EstatusAsistencia, string> = {
  presente:    'bg-green-100 text-green-700',
  ausente:     'bg-red-100 text-red-700',
  retardo:     'bg-yellow-100 text-yellow-700',
  justificado: 'bg-blue-100 text-blue-700',
}

interface Grupo { id: string; clave: string; semestre: number; carrera?: { nombre: string }; periodo?: { nombre: string }; alumnos_count?: number }
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
  const user = useAuthStore(s => s.user)
  const roles = user?.roles ?? []
  const puedeGestionarEnvios = roles.some(r => ROLES_GESTION_ENVIO.includes(r))
  const esDocente = roles.includes('docente') && !puedeGestionarEnvios
  // Cualquier rol de gestión (superadmin, admin, jefe_carrera…) también puede pasar lista
  // por cualquier grupo — típicamente para cubrir a un docente ausente — no solo superadmin.
  const puedePasarLista = esDocente || puedeGestionarEnvios
  // Tabs en vez de apilar todo verticalmente — con pase de lista + historial + hasta 2
  // paneles de gestión en la misma página, el usuario se perdía entre tantos controles.
  type TabAsistencias = 'pase' | 'sesiones' | 'gestion'
  const [tab, setTab] = useState<TabAsistencias>(puedePasarLista ? 'pase' : 'sesiones')
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [modal, setModal] = useState<null | 'nueva' | SesionClase>(null)
  const [formSesion, setFormSesion] = useState<SesionForm>({ grupo_id: '', fecha: '', hora_inicio: '', hora_fin: '', tema: '' })
  const [carreraSel, setCarreraSel] = useState('')
  const [asistenciasForm, setAsistenciasForm] = useState<Record<string, EstatusAsistencia>>({})
  const [alumnosGrupo, setAlumnosGrupo] = useState<AlumnoGrupo[]>([])
  // Un solo filtro de periodo para toda la página (antes había dos selectores de periodo
  // independientes — uno para "Sesiones" y otro para "Todas las listas" — que confundían
  // al parecer controlar cosas distintas cuando en realidad ambos filtran por el mismo periodo).
  const { data: periodoActivo } = usePeriodoActivo()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [vista, setVista] = useViewMode('asistencias')

  useEffect(() => {
    if (!filtroPeriodo && periodoActivo?.id) setFiltroPeriodo(periodoActivo.id)
  }, [filtroPeriodo, periodoActivo])

  // Envío de listas de asistencia por correo
  const [envioCarrera, setEnvioCarrera] = useState('')
  const [envioGrupo, setEnvioGrupo] = useState('')
  const [envioCarga, setEnvioCarga] = useState('')
  const [envioTipo, setEnvioTipo] = useState<'blanco' | 'reporte'>('blanco')
  const [masivoPeriodo, setMasivoPeriodo] = useState('')
  const [masivoTipo, setMasivoTipo] = useState<'blanco' | 'reporte'>('blanco')
  const [generandoPdf, setGenerandoPdf] = useState<'previsualizar' | 'descargar' | null>(null)

  // Todas las listas de asistencia, agrupadas — usa el mismo filtroPeriodo de arriba.
  const [agruparPor, setAgruparPor] = useState<'carrera' | 'grupo' | 'docente'>('carrera')
  const [generandoFila, setGenerandoFila] = useState<string | null>(null)

  const { data: sesionesData, isLoading } = useQuery({
    queryKey: ['sesiones-clase', filtroPeriodo],
    queryFn: () => academicoApi.getSesionesClase(filtroPeriodo ? { periodo_id: filtroPeriodo } : {}),
  })

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; fecha_inicio: string; fecha_fin: string }[]),
  })
  const periodoSel = periodos.find(p => p.id === filtroPeriodo)

  // Cargas para el "Pase de lista": el docente solo ve las suyas; un rol de gestión
  // (superadmin, admin, jefe_carrera) ve todas, por si necesita cubrir a un docente ausente.
  const { data: cargasPase = [], isLoading: cargandoCargasPase } = useQuery({
    queryKey: ['cargas-pase-asistencia', filtroPeriodo, esDocente, user?.id],
    queryFn: () => academicoApi.getCargas(
      esDocente ? { docente_id: user!.id, periodo_id: filtroPeriodo } : { periodo_id: filtroPeriodo }
    ),
    enabled: !!filtroPeriodo && !!user?.id && puedePasarLista,
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

  const mutEnviarResumen = useMutation({
    mutationFn: (sesionId: string) => academicoApi.enviarResumenSesion(sesionId),
    onSuccess: () => toastSuccess('Resumen de asistencia enviado por correo.'),
    onError: (e) => toastError(mutationError(e)),
  })

  const mutEnviarLista = useMutation({
    mutationFn: () => envioTipo === 'blanco'
      ? academicoApi.enviarListaAsistenciaBlanco(envioCarga)
      : academicoApi.enviarReporteAsistenciaGrupo(envioCarga),
    onSuccess: () => toastSuccess('Lista enviada por correo al docente.'),
    onError: (e) => toastError(mutationError(e)),
  })

  const mutEnviarMasivo = useMutation({
    mutationFn: () => academicoApi.enviarAsistenciaMasivo(masivoPeriodo, masivoTipo),
    onSuccess: (r) => toastSuccess(`Envío masivo completado: ${r.enviados} correos enviados${r.sin_correo ? `, ${r.sin_correo} docentes sin correo` : ''}.`),
    onError: (e) => toastError(mutationError(e)),
  })

  const { data: todasCargas = [], isLoading: cargandoTodas } = useQuery({
    queryKey: ['todas-cargas-asistencia', filtroPeriodo],
    queryFn: () => academicoApi.getCargas({ periodo_id: filtroPeriodo }),
    enabled: !!filtroPeriodo,
  })

  const { data: carreras = [] } = useCarreras()
  const carreraNombrePorId = useMemo(
    () => Object.fromEntries(carreras.map(c => [c.id, c.nombre])),
    [carreras]
  )

  // Cada fila es una combinación única carga+grupo — una carga que abarca varios
  // grupos aparece una vez por grupo, agrupada según lo que elija el usuario.
  const filasAgrupadas = useMemo(() => {
    type Fila = { key: string; carga: CargaAcademica; grupo: GrupoCarga }
    const grupos: Record<string, Fila[]> = {}
    // Las sesiones siempre se guardan bajo el carga_academica_id canónico (ver
    // mergeCargasPorAsignatura) — sin fusionar aquí, una materia repartida en varios
    // días podía listar una fila con un id "no canónico" cuyo reporte salía vacío
    // aunque sí hubiera asistencia registrada para esa materia.
    mergeCargasPorAsignatura(todasCargas).forEach(carga => {
      (carga.grupos ?? []).forEach(grupo => {
        const clave = agruparPor === 'carrera'
          ? (carreraNombrePorId[grupo.carrera_id] ?? 'Sin carrera')
          : agruparPor === 'grupo'
            ? `${grupo.clave}`
            : (carga.docente?.name ?? 'Sin docente')
        if (!grupos[clave]) grupos[clave] = []
        grupos[clave].push({ key: `${carga.id}-${grupo.id}`, carga, grupo })
      })
    })
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }, [todasCargas, agruparPor, carreraNombrePorId])

  const handleVerPdfFila = async (cargaId: string, filaKey: string, accion: 'previsualizar' | 'descargar', tipo: 'blanco' | 'reporte' = 'blanco') => {
    setGenerandoFila(filaKey)
    try {
      const blob = await academicoApi.getListaAsistenciaPdf(cargaId, tipo)
      const filename = `${tipo === 'blanco' ? 'lista' : 'reporte'}_asistencia_${cargaId}.pdf`
      if (accion === 'previsualizar') {
        openPdfPreview(blob, filename)
      } else {
        triggerDownload(blob, filename)
      }
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setGenerandoFila(null)
    }
  }

  const nombreArchivoAsistencia = (tipo: 'blanco' | 'reporte') =>
    `${tipo === 'blanco' ? 'lista' : 'reporte'}_asistencia_${envioGrupo}.pdf`

  const handleVerPdf = async (accion: 'previsualizar' | 'descargar') => {
    if (!envioCarga) return
    setGenerandoPdf(accion)
    try {
      const blob = await academicoApi.getListaAsistenciaPdf(envioCarga, envioTipo)
      const filename = nombreArchivoAsistencia(envioTipo)
      if (accion === 'previsualizar') {
        openPdfPreview(blob, filename)
      } else {
        triggerDownload(blob, filename)
      }
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setGenerandoPdf(null)
    }
  }

  const cargarAlumnosGrupo = async (grupoId: string) => {
    if (!grupoId) { setAlumnosGrupo([]); return }
    try {
      // El id de asistencia es el de `users` (a.user.id), no el de la fila de `alumnos`
      // (a.id) — usar este último produciría un alumno_id inexistente en `users`.
      const detalle = await academicoApi.getGrupo(grupoId)
      const lista = (detalle.alumnos ?? [])
        .filter(a => a.user?.id)
        .map(a => ({ id: a.user!.id, name: a.user!.name, email: a.user!.email }))
      setAlumnosGrupo(lista)
      const init: Record<string, EstatusAsistencia> = {}
      lista.forEach(a => { init[a.id] = 'presente' })
      setAsistenciasForm(init)
    } catch {
      setAlumnosGrupo([])
    }
  }

  const openNueva = () => {
    setFormSesion({ grupo_id: '', fecha: new Date().toISOString().slice(0, 10), hora_inicio: '', hora_fin: '', tema: '' })
    setAsistenciasForm({})
    setAlumnosGrupo([])
    setCarreraSel('')
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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Asistencias</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {esDocente ? 'Pasa lista de tus grupos y revisa tu historial de sesiones.' : 'Registro de sesiones de clase y control de asistencia.'}
          </p>
        </div>

        {/* Filtro periodo — se aplica a todas las pestañas de abajo */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
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

        {/* Pestañas — antes las 3 secciones (pase de lista, historial, herramientas de
            gestión) estaban todas apiladas en una sola página larga y el usuario se
            perdía entre tantos controles a la vez. */}
        <div className="flex gap-1.5 border-b border-slate-200">
          {puedePasarLista && (
            <button
              type="button"
              onClick={() => setTab('pase')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'pase' ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Pase de lista
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('sesiones')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'sesiones' ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sesiones registradas
          </button>
          {puedeGestionarEnvios && (
            <button
              type="button"
              onClick={() => setTab('gestion')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'gestion' ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Herramientas de gestión
            </button>
          )}
        </div>

        {/* 1. Pase de lista — la razón de ser de la página: el docente ve sus propios
            grupos y toma asistencia; un rol de gestión puede hacerlo por cualquiera
            (cubrir a un docente ausente). Al elegir un grupo se abre el pase con las
            fechas de clase ya precargadas del horario y el QR de auto-registro. */}
        {tab === 'pase' && puedePasarLista && (
          <PaseAsistenciaPanel cargas={cargasPase} cargandoCargas={cargandoCargasPase} periodo={periodoSel} />
        )}

        {/* 2. Historial de sesiones ya registradas (propias si eres docente — el backend
            ya las filtra por docente_id) + alta manual de una sesión fuera de horario. */}
        {tab === 'sesiones' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-slate-900 text-sm">Sesiones registradas</h2>
            <div className="flex items-center gap-2 shrink-0">
              <ViewToggle value={vista} onChange={setVista} />
              <button onClick={openNueva} className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                + Registrar sesión manual
              </button>
            </div>
          </div>

          {isLoading ? (
            <table className="w-full text-sm"><tbody><SkeletonRows cols={6} /></tbody></table>
          ) : sesiones.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">Aún no hay sesiones registradas en este periodo.</p>
          ) : vista === 'lista' ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tema</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Asistencias</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sesiones.map(s => {
                    const totalReg = s.asistencias?.length ?? 0
                    const presentes = s.asistencias?.filter(a => a.estatus === 'presente').length ?? 0
                    return (
                      <tr key={s.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{s.fecha}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800">{s.grupo?.clave ?? '—'}</p>
                          <p className="text-xs text-slate-400">{s.grupo?.carrera?.nombre}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{s.hora_inicio} – {s.hora_fin}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{s.tema ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {totalReg > 0 ? (
                            <span className="text-xs text-slate-600">{presentes}/{totalReg} presentes</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin registro</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {totalReg > 0 && (
                            <button
                              onClick={() => mutEnviarResumen.mutate(s.id)}
                              disabled={mutEnviarResumen.isPending}
                              className="text-xs text-slate-500 hover:underline mr-3 disabled:opacity-50"
                            >
                              Enviar resumen
                            </button>
                          )}
                          <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Ver detalle</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sesiones.map(s => {
                const totalReg = s.asistencias?.length ?? 0
                const presentes = s.asistencias?.filter(a => a.estatus === 'presente').length ?? 0
                return (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                    <p className="font-medium text-slate-800">{s.fecha}</p>
                    <p className="text-sm text-slate-600">{s.grupo?.clave ?? '—'} <span className="text-xs text-slate-400">({s.grupo?.carrera?.nombre})</span></p>
                    <p className="text-xs text-slate-500">{s.hora_inicio} – {s.hora_fin} · {s.tema ?? 'sin tema'}</p>
                    {totalReg > 0 ? (
                      <span className="text-xs text-slate-600">{presentes}/{totalReg} presentes</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin registro</span>
                    )}
                    <div className="flex gap-3 mt-1">
                      <button onClick={() => openEdit(s)} className="text-xs font-medium text-blue-600 hover:underline">Ver detalle</button>
                      {totalReg > 0 && (
                        <button
                          onClick={() => mutEnviarResumen.mutate(s.id)}
                          disabled={mutEnviarResumen.isPending}
                          className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-50"
                        >
                          Enviar resumen
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {/* 3. Herramientas de gestión — solo roles administrativos, no docente. */}
        {tab === 'gestion' && puedeGestionarEnvios && (
        <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Enviar listas de asistencia por correo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
              <CarreraSelect
                value={envioCarrera}
                onChange={v => { setEnvioCarrera(v); setEnvioGrupo(''); setEnvioCarga('') }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
              <GrupoSelect
                carreraId={envioCarrera}
                value={envioGrupo}
                onChange={v => { setEnvioGrupo(v); setEnvioCarga('') }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Materia (docente)</label>
              <CargaSelect grupoId={envioGrupo} value={envioCarga} onChange={setEnvioCarga} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contenido</label>
              <select value={envioTipo} onChange={e => setEnvioTipo(e.target.value as 'blanco' | 'reporte')} className={selectCls}>
                <option value="blanco">Lista en blanco (para pasar asistencia)</option>
                <option value="reporte">Reporte acumulado del grupo</option>
              </select>
            </div>
            <button
              onClick={() => mutEnviarLista.mutate()}
              disabled={!envioCarga || mutEnviarLista.isPending}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 disabled:opacity-50"
            >
              {mutEnviarLista.isPending ? 'Enviando…' : 'Enviar a este docente'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleVerPdf('previsualizar')}
              disabled={!envioCarga || generandoPdf !== null}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {generandoPdf === 'previsualizar' ? 'Generando…' : 'Vista previa'}
            </button>
            <button
              onClick={() => handleVerPdf('descargar')}
              disabled={!envioCarga || generandoPdf !== null}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {generandoPdf === 'descargar' ? 'Generando…' : 'Descargar'}
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
              <select value={masivoPeriodo} onChange={e => setMasivoPeriodo(e.target.value)} className={selectCls}>
                <option value="">Selecciona un periodo…</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contenido</label>
              <select value={masivoTipo} onChange={e => setMasivoTipo(e.target.value as 'blanco' | 'reporte')} className={selectCls}>
                <option value="blanco">Lista en blanco (para pasar asistencia)</option>
                <option value="reporte">Reporte acumulado del grupo</option>
              </select>
            </div>
            <button
              onClick={() => mutEnviarMasivo.mutate()}
              disabled={!masivoPeriodo || mutEnviarMasivo.isPending}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {mutEnviarMasivo.isPending ? 'Enviando…' : 'Enviar a todos los docentes del periodo'}
            </button>
          </div>
        </div>

        {/* Todas las listas de asistencia, agrupadas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Todas las listas de asistencia</h2>
              <p className="text-xs text-slate-500 mt-0.5">Vista previa y descarga de cualquier materia — grupo — docente del periodo.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Agrupar por</label>
              <select value={agruparPor} onChange={e => setAgruparPor(e.target.value as typeof agruparPor)} className={selectCls}>
                <option value="carrera">Carrera</option>
                <option value="grupo">Grupo</option>
                <option value="docente">Docente</option>
              </select>
            </div>
          </div>

          {!filtroPeriodo ? (
            <p className="text-sm text-slate-400 italic">Selecciona un periodo arriba para ver sus listas de asistencia.</p>
          ) : cargandoTodas ? (
            <p className="text-sm text-slate-400 italic">Cargando…</p>
          ) : filasAgrupadas.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Este periodo no tiene cargas académicas asignadas.</p>
          ) : (
            <div className="space-y-5">
              {filasAgrupadas.map(([grupoLabel, filas]) => (
                <div key={grupoLabel}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{grupoLabel}</h3>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {filas.map(({ key, carga, grupo }) => (
                      <div key={key} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {carga.materia?.nombre ?? '—'} — Grupo {grupo.clave}
                            </p>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${
                              grupo.alumnos_count ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {grupo.alumnos_count ? `${grupo.alumnos_count} alumno${grupo.alumnos_count === 1 ? '' : 's'}` : 'Sin alumnos'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {carga.docente?.name ?? 'Sin docente'} · {carreraNombrePorId[grupo.carrera_id] ?? ''}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleVerPdfFila(carga.id, key, 'previsualizar')}
                            disabled={generandoFila !== null}
                            title="Vista previa"
                            aria-label="Vista previa"
                            className="w-8 h-8 flex items-center justify-center border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {generandoFila === key ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleVerPdfFila(carga.id, key, 'descargar')}
                            disabled={generandoFila !== null}
                            title="Descargar"
                            aria-label="Descargar"
                            className="w-8 h-8 flex items-center justify-center border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {generandoFila === key ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        )}
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
              <Field label="Carrera *" full>
                <CarreraSelect
                  value={carreraSel}
                  onChange={v => {
                    setCarreraSel(v)
                    setFormSesion(f => ({ ...f, grupo_id: '' }))
                    setAlumnosGrupo([])
                    setAsistenciasForm({})
                  }}
                />
              </Field>
              <Field label="Grupo *" full>
                <GrupoSelect
                  carreraId={carreraSel}
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

function CarreraSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: carreras = [] } = useCarreras()
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}>
      <option value="">Selecciona una carrera…</option>
      {carreras.map(c => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  )
}

function GrupoSelect({ carreraId, value, onChange }: { carreraId: string; value: string; onChange: (v: string) => void }) {
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-por-carrera', carreraId],
    queryFn: () => apiClient.get('/grupos', { params: { carrera_id: carreraId } }).then(r => r.data.data as Grupo[]),
    enabled: !!carreraId,
  })
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={selectCls} disabled={!carreraId}>
      <option value="">{carreraId ? 'Seleccionar grupo…' : 'Primero selecciona una carrera'}</option>
      {grupos.map(g => (
        <option key={g.id} value={g.id}>
          {g.clave} — S{g.semestre} ({g.periodo?.nombre}) · {g.alumnos_count ? `${g.alumnos_count} alumno${g.alumnos_count === 1 ? '' : 's'}` : 'sin alumnos'}
        </option>
      ))}
    </select>
  )
}

function CargaSelect({ grupoId, value, onChange }: { grupoId: string; value: string; onChange: (v: string) => void }) {
  const { data: cargasRaw = [] } = useQuery({
    queryKey: ['cargas-por-grupo', grupoId],
    queryFn: (): Promise<CargaAcademica[]> => academicoApi.getCargas({ grupo_id: grupoId }),
    enabled: !!grupoId,
  })
  // Fusiona a los ids canónicos (ver mergeCargasPorAsignatura) — así el reporte/envío
  // se genera con el mismo carga_academica_id bajo el que se guardó la asistencia.
  const cargas = useMemo(() => mergeCargasPorAsignatura(cargasRaw), [cargasRaw])
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={selectCls} disabled={!grupoId}>
      <option value="">{grupoId ? 'Seleccionar materia…' : 'Primero selecciona un grupo'}</option>
      {cargas.map(c => (
        <option key={c.id} value={c.id}>
          {c.materia?.nombre ?? '—'} — {c.docente?.name ?? 'sin docente'}
        </option>
      ))}
    </select>
  )
}
