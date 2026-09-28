import { useRef, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'
import { useAuthStore } from '../../../../store/authStore'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { useToastStore } from '../../../../store/toastStore'
import { Field, icls, mutationError, extractApiErrors } from '../tabs/shared'
import { academicoApi } from '../../services/academico'
import type { FichaDocente } from '../../services/academico'
import {
  useDocente, useCarreras, useFichaDocente, useFichaSindical,
  HorarioSemanalPanel, DisponibilidadPanel, CvPanel,
  NOMBRAMIENTO_OPTS, TIPO_HORAS_OPTS, SEXO_OPTS, ESTADO_CIVIL_OPTS, initials,
} from './docenteShared'

type Tab = 'personal' | 'laboral' | 'academica' | 'cv' | 'disponibilidad' | 'horario' | 'cuenta'

export default function DocenteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const esSuperadmin = useAuthStore(s => s.user?.roles?.includes('superadmin')) ?? false

  const { data: docente, isLoading } = useDocente(id)
  const { data: carreras = [] } = useCarreras()
  const { data: periodoActivo } = usePeriodoActivo()
  const { data: ficha, isLoading: cargandoFicha } = useFichaDocente(id)
  const { data: fichaSindical, isLoading: cargandoFichaSindical } = useFichaSindical(id)

  const periodoId = searchParams.get('periodo_id') || periodoActivo?.id || ''

  const TABS: { id: Tab; label: string }[] = [
    { id: 'personal',       label: 'Datos personales' },
    { id: 'laboral',        label: 'Datos laborales' },
    { id: 'academica',      label: 'Datos académicos' },
    { id: 'cv',             label: 'CV' },
    { id: 'disponibilidad', label: 'Disponibilidad' },
    { id: 'horario',        label: 'Horario semanal' },
    ...(esSuperadmin ? [{ id: 'cuenta' as Tab, label: 'Cuenta' }] : []),
  ]

  const [tab, setTab] = useState<Tab>('personal')

  // ── Formulario: datos personales ──────────────────────────────────────────
  const [formPersonal, setFormPersonal] = useState<{
    name: string; email: string; curp: string; rfc: string; fecha_nacimiento: string;
    sexo: string; estado_civil: string; direccion: string; telefono: string;
    contacto_emergencia_nombre: string; contacto_emergencia_telefono: string;
  } | null>(null)
  const [errorsPersonal, setErrorsPersonal] = useState<Record<string, string>>({})
  const fotoInputRef = useRef<HTMLInputElement>(null)

  if (docente && formPersonal === null) {
    setFormPersonal({
      name: docente.name,
      email: docente.email,
      curp: docente.curp ?? '',
      rfc: docente.rfc ?? '',
      fecha_nacimiento: docente.fecha_nacimiento ? docente.fecha_nacimiento.slice(0, 10) : '',
      sexo: docente.sexo ?? '',
      estado_civil: docente.estado_civil ?? '',
      direccion: docente.direccion ?? '',
      telefono: docente.telefono ?? '',
      contacto_emergencia_nombre: docente.contacto_emergencia_nombre ?? '',
      contacto_emergencia_telefono: docente.contacto_emergencia_telefono ?? '',
    })
  }
  const setP = (k: keyof NonNullable<typeof formPersonal>, v: string) => setFormPersonal(f => f ? { ...f, [k]: v } : f)

  const guardarPersonal = useMutation({
    mutationFn: () => apiClient.patch(`/admin/usuarios/${id}`, {
      ...formPersonal,
      curp: formPersonal?.curp || null,
      rfc: formPersonal?.rfc || null,
      fecha_nacimiento: formPersonal?.fecha_nacimiento || null,
      sexo: formPersonal?.sexo || null,
      estado_civil: formPersonal?.estado_civil || null,
      direccion: formPersonal?.direccion || null,
      telefono: formPersonal?.telefono || null,
      contacto_emergencia_nombre: formPersonal?.contacto_emergencia_nombre || null,
      contacto_emergencia_telefono: formPersonal?.contacto_emergencia_telefono || null,
    }),
    onSuccess: () => {
      addToast('Datos personales actualizados.', 'success')
      setErrorsPersonal({})
      qc.invalidateQueries({ queryKey: ['docente-detalle', id] })
      qc.invalidateQueries({ queryKey: ['docentes-gestion'] })
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrorsPersonal(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const subirFoto = useMutation({
    mutationFn: (file: File) => academicoApi.subirFotoUsuario(id!, file),
    onSuccess: () => {
      addToast('Foto actualizada.', 'success')
      qc.invalidateQueries({ queryKey: ['docente-detalle', id] })
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  // ── Formulario: datos laborales (institucionales + ficha sindical) ────────
  const [formLaboral, setFormLaboral] = useState<{
    clave_empleado: string; no_huella: string; nombramiento: string; tipo_horas: string; carrera_id: string;
  } | null>(null)
  const [carreraAsignaciones, setCarreraAsignaciones] = useState<Record<string, string> | null>(null)
  const [errorsLaboral, setErrorsLaboral] = useState<Record<string, string>>({})

  if (docente && formLaboral === null) {
    setFormLaboral({
      clave_empleado: docente.clave_empleado ?? '',
      no_huella: docente.no_huella ?? '',
      nombramiento: docente.nombramiento ?? '',
      tipo_horas: docente.tipo_horas ?? '',
      carrera_id: docente.carrera_id ?? '',
    })
    setCarreraAsignaciones(Object.fromEntries(
      (docente.carreras ?? []).map(c => [c.id, c.pivot?.horas_asignadas != null ? String(c.pivot.horas_asignadas) : ''])
    ))
  }
  const setL = (k: keyof NonNullable<typeof formLaboral>, v: string) => setFormLaboral(f => f ? { ...f, [k]: v } : f)

  const toggleCarrera = (carreraId: string) =>
    setCarreraAsignaciones(map => {
      const actual = map ?? {}
      if (carreraId in actual) {
        const { [carreraId]: _omit, ...resto } = actual
        return resto
      }
      return { ...actual, [carreraId]: '' }
    })
  const setHorasCarrera = (carreraId: string, horas: string) =>
    setCarreraAsignaciones(map => ({ ...(map ?? {}), [carreraId]: horas }))

  const guardarLaboral = useMutation({
    mutationFn: () => apiClient.patch(`/admin/usuarios/${id}`, {
      clave_empleado: formLaboral?.clave_empleado || null,
      no_huella: formLaboral?.no_huella || null,
      nombramiento: formLaboral?.nombramiento || null,
      tipo_horas: formLaboral?.tipo_horas || null,
      carrera_id: formLaboral?.carrera_id || null,
      carreras: Object.entries(carreraAsignaciones ?? {}).map(([cid, horas]) => ({
        id: cid,
        horas_asignadas: horas === '' ? null : Number(horas),
      })),
    }),
    onSuccess: () => {
      addToast('Datos laborales actualizados.', 'success')
      setErrorsLaboral({})
      qc.invalidateQueries({ queryKey: ['docente-detalle', id] })
      qc.invalidateQueries({ queryKey: ['docentes-gestion'] })
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrorsLaboral(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  // ── Formulario: ficha sindical ─────────────────────────────────────────────
  const [formSindical, setFormSindical] = useState<{
    clave_plaza: string; tipo_nombramiento: string; categoria_tbc: string; nivel_tbc: string;
    numero_issste: string; fecha_ingreso_sep: string; fecha_ingreso_tecnm: string; activo: boolean;
  } | null>(null)
  const [errorsSindical, setErrorsSindical] = useState<Record<string, string>>({})

  if (fichaSindical !== undefined && formSindical === null) {
    setFormSindical({
      clave_plaza: fichaSindical?.clave_plaza ?? '',
      tipo_nombramiento: fichaSindical?.tipo_nombramiento ?? 'Base',
      categoria_tbc: fichaSindical?.categoria_tbc ?? '',
      nivel_tbc: fichaSindical?.nivel_tbc ?? '',
      numero_issste: fichaSindical?.numero_issste ?? '',
      fecha_ingreso_sep: fichaSindical?.fecha_ingreso_sep ? fichaSindical.fecha_ingreso_sep.slice(0, 10) : '',
      fecha_ingreso_tecnm: fichaSindical?.fecha_ingreso_tecnm ? fichaSindical.fecha_ingreso_tecnm.slice(0, 10) : '',
      activo: fichaSindical?.activo ?? true,
    })
  }
  const setS = (k: keyof NonNullable<typeof formSindical>, v: string | boolean) => setFormSindical(f => f ? { ...f, [k]: v } as typeof f : f)

  const guardarSindical = useMutation({
    mutationFn: () => {
      const payload = {
        clave_plaza: formSindical!.clave_plaza,
        tipo_nombramiento: formSindical!.tipo_nombramiento as 'Base' | 'Interino' | 'Hora-Clase' | 'Medio-Tiempo',
        categoria_tbc: formSindical!.categoria_tbc || undefined,
        nivel_tbc: formSindical!.nivel_tbc || undefined,
        numero_issste: formSindical!.numero_issste || undefined,
        fecha_ingreso_sep: formSindical!.fecha_ingreso_sep,
        fecha_ingreso_tecnm: formSindical!.fecha_ingreso_tecnm || undefined,
        activo: formSindical!.activo,
      }
      return fichaSindical
        ? academicoApi.actualizarFichaSindical(id!, payload)
        : academicoApi.registrarFichaSindical(id!, payload)
    },
    onSuccess: () => {
      addToast('Ficha sindical guardada.', 'success')
      setErrorsSindical({})
      qc.invalidateQueries({ queryKey: ['ficha-sindical', id] })
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrorsSindical(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  // ── Formulario: datos académicos (FichaDocente) ────────────────────────────
  const [formAcademica, setFormAcademica] = useState<{
    tipo_contrato: string; categoria: string; fecha_ingreso: string; especialidades: string; activo: boolean;
  } | null>(null)
  const [errorsAcademica, setErrorsAcademica] = useState<Record<string, string>>({})

  if (ficha !== undefined && formAcademica === null) {
    setFormAcademica({
      tipo_contrato: ficha?.tipo_contrato ?? 'hora_clase',
      categoria: ficha?.categoria ?? '',
      fecha_ingreso: ficha?.fecha_ingreso ? ficha.fecha_ingreso.slice(0, 10) : '',
      especialidades: (ficha?.especialidades ?? []).join(', '),
      activo: ficha?.activo ?? true,
    })
  }
  const setA = (k: keyof NonNullable<typeof formAcademica>, v: string | boolean) => setFormAcademica(f => f ? { ...f, [k]: v } as typeof f : f)

  const guardarAcademica = useMutation({
    mutationFn: () => {
      const payload: Partial<FichaDocente> = {
        tipo_contrato: formAcademica!.tipo_contrato as FichaDocente['tipo_contrato'],
        categoria: formAcademica!.categoria || null,
        fecha_ingreso: formAcademica!.fecha_ingreso || null,
        especialidades: formAcademica!.especialidades
          ? formAcademica!.especialidades.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        activo: formAcademica!.activo,
      }
      return ficha
        ? academicoApi.actualizarFichaDocente(id!, payload)
        : academicoApi.crearFichaDocente({ ...payload, docente_id: id })
    },
    onSuccess: () => {
      addToast('Datos académicos guardados.', 'success')
      setErrorsAcademica({})
      qc.invalidateQueries({ queryKey: ['ficha-docente', id] })
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrorsAcademica(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  // ── Formulario: cuenta (solo superadmin) ──────────────────────────────────
  const [cuenta, setCuenta] = useState({ email: '', password: '', confirmar: '' })
  const [errorCuenta, setErrorCuenta] = useState('')

  const guardarCuenta = useMutation({
    mutationFn: () => {
      if (cuenta.password && cuenta.password !== cuenta.confirmar) {
        throw new Error('Las contraseñas no coinciden.')
      }
      const payload: { email?: string; password?: string } = {}
      if (cuenta.email) payload.email = cuenta.email
      if (cuenta.password) payload.password = cuenta.password
      if (!Object.keys(payload).length) throw new Error('Proporciona un correo o contraseña nueva.')
      return apiClient.patch(`/admin/usuarios/${id}/credenciales`, payload)
    },
    onSuccess: () => {
      addToast('Credenciales actualizadas. Se cerraron las sesiones activas del docente.', 'success')
      setErrorCuenta('')
      setCuenta({ email: '', password: '', confirmar: '' })
      qc.invalidateQueries({ queryKey: ['docente-detalle', id] })
    },
    onError: (e) => setErrorCuenta(e instanceof Error && !('response' in e) ? e.message : mutationError(e)),
  })

  const guardarRecordatorio = useMutation({
    mutationFn: (valor: boolean | null) =>
      apiClient.patch(`/admin/usuarios/${id}/recordatorio-asistencia`, { recordatorio_asistencia_activo: valor }),
    onSuccess: () => {
      addToast('Preferencia de recordatorio actualizada.', 'success')
      qc.invalidateQueries({ queryKey: ['docente-detalle', id] })
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  if (isLoading || !docente || !formPersonal || !formLaboral) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center text-slate-400 text-sm">
        Cargando docente…
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/admin/gestion-academica" className="hover:text-slate-800 transition-colors">Gestión Académica</Link>
          <span className="text-slate-300">/</span>
          <Link to="/admin/gestion-academica/docentes" className="hover:text-slate-800 transition-colors">Docentes</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium">{docente.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <button onClick={() => fotoInputRef.current?.click()} title="Cambiar foto"
              className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold shrink-0 overflow-hidden relative group">
              {docente.foto_url
                ? <img src={docente.foto_url} alt={docente.name} className="w-full h-full object-cover" />
                : initials(docente.name)}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-medium">
                {subirFoto.isPending ? '…' : 'Editar'}
              </span>
            </button>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto.mutate(f) }} />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{docente.name}</h1>
              <p className="text-sm text-slate-500 truncate">{docente.email}</p>
            </div>
            <button onClick={() => navigate('/admin/gestion-academica/docentes')}
              className="ml-auto px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 shrink-0">
              ← Volver a Docentes
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre completo *" full error={errorsPersonal.name}>
                    <input className={icls(errorsPersonal.name)} value={formPersonal.name} onChange={e => setP('name', e.target.value)} />
                  </Field>
                  <Field label="Correo electrónico *" full error={errorsPersonal.email}>
                    <input className={icls(errorsPersonal.email)} type="email" value={formPersonal.email} onChange={e => setP('email', e.target.value)} />
                  </Field>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Identificación</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="CURP" error={errorsPersonal.curp}>
                      <input className={icls(errorsPersonal.curp)} value={formPersonal.curp} maxLength={18}
                        onChange={e => setP('curp', e.target.value.toUpperCase())} />
                    </Field>
                    <Field label="RFC" error={errorsPersonal.rfc}>
                      <input className={icls(errorsPersonal.rfc)} value={formPersonal.rfc} maxLength={13}
                        onChange={e => setP('rfc', e.target.value.toUpperCase())} />
                    </Field>
                    <Field label="Fecha de nacimiento" error={errorsPersonal.fecha_nacimiento}>
                      <input className={icls(errorsPersonal.fecha_nacimiento)} type="date" value={formPersonal.fecha_nacimiento}
                        onChange={e => setP('fecha_nacimiento', e.target.value)} />
                    </Field>
                    <Field label="Sexo" error={errorsPersonal.sexo}>
                      <select className={icls(errorsPersonal.sexo)} value={formPersonal.sexo} onChange={e => setP('sexo', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {SEXO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                    <Field label="Estado civil" error={errorsPersonal.estado_civil}>
                      <select className={icls(errorsPersonal.estado_civil)} value={formPersonal.estado_civil} onChange={e => setP('estado_civil', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {ESTADO_CIVIL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Domicilio y contacto</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Dirección" full error={errorsPersonal.direccion}>
                      <input className={icls(errorsPersonal.direccion)} value={formPersonal.direccion} onChange={e => setP('direccion', e.target.value)} />
                    </Field>
                    <Field label="Teléfono" error={errorsPersonal.telefono}>
                      <input className={icls(errorsPersonal.telefono)} value={formPersonal.telefono} onChange={e => setP('telefono', e.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Contacto de emergencia</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nombre" error={errorsPersonal.contacto_emergencia_nombre}>
                      <input className={icls(errorsPersonal.contacto_emergencia_nombre)} value={formPersonal.contacto_emergencia_nombre}
                        onChange={e => setP('contacto_emergencia_nombre', e.target.value)} />
                    </Field>
                    <Field label="Teléfono" error={errorsPersonal.contacto_emergencia_telefono}>
                      <input className={icls(errorsPersonal.contacto_emergencia_telefono)} value={formPersonal.contacto_emergencia_telefono}
                        onChange={e => setP('contacto_emergencia_telefono', e.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={() => guardarPersonal.mutate()} disabled={guardarPersonal.isPending}
                    className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                    {guardarPersonal.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'laboral' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos institucionales</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Clave de empleado" error={errorsLaboral.clave_empleado}>
                      <input className={icls(errorsLaboral.clave_empleado)} value={formLaboral.clave_empleado}
                        placeholder="Ej. EMP-001" onChange={e => setL('clave_empleado', e.target.value)} />
                    </Field>
                    <Field label="No. de huella" error={errorsLaboral.no_huella}>
                      <input className={icls(errorsLaboral.no_huella)} value={formLaboral.no_huella}
                        placeholder="ID biométrico" onChange={e => setL('no_huella', e.target.value)} />
                    </Field>
                    <Field label="Nombramiento" error={errorsLaboral.nombramiento}>
                      <select className={icls(errorsLaboral.nombramiento)} value={formLaboral.nombramiento}
                        onChange={e => setL('nombramiento', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {NOMBRAMIENTO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                    <Field label="Tipo de horas" error={errorsLaboral.tipo_horas}>
                      <select className={icls(errorsLaboral.tipo_horas)} value={formLaboral.tipo_horas}
                        onChange={e => setL('tipo_horas', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {TIPO_HORAS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Adscripción</p>
                  <Field label="Carrera / Departamento (jefe de carrera)" error={errorsLaboral.carrera_id}>
                    <select className={icls(errorsLaboral.carrera_id)} value={formLaboral.carrera_id}
                      onChange={e => setL('carrera_id', e.target.value)}>
                      <option value="">— Sin adscripción —</option>
                      {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Carreras asignadas (docencia)</p>
                  <p className="text-xs text-slate-400 mb-3">Un docente puede estar asignado a una o varias carreras, cada una con su propia cantidad de horas asignadas. Solo aparece como seleccionable al crear cargas académicas de esas carreras.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {carreras.map(c => {
                      const seleccionada = carreraAsignaciones ? c.id in carreraAsignaciones : false
                      return (
                        <div key={c.id} className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer flex-1 min-w-0">
                            <input type="checkbox" checked={seleccionada} onChange={() => toggleCarrera(c.id)} className="rounded shrink-0" />
                            <span className="truncate">{c.clave} — {c.nombre}</span>
                          </label>
                          {seleccionada && (
                            <input
                              type="number" min="0" max="80"
                              value={carreraAsignaciones?.[c.id] ?? ''}
                              onChange={e => setHorasCarrera(c.id, e.target.value)}
                              placeholder="hrs"
                              title="Horas asignadas en esta carrera"
                              className="w-16 shrink-0 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {errorsLaboral.carreras && <p className="text-red-500 text-xs mt-1">{errorsLaboral.carreras}</p>}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(docente.roles ?? []).map(r => (
                      <span key={r.name} className="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full font-medium">{r.name}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Para cambiar roles, usa el módulo de Usuarios.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={() => guardarLaboral.mutate()} disabled={guardarLaboral.isPending}
                    className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                    {guardarLaboral.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>

                {cargandoFichaSindical || !formSindical ? (
                  <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando ficha sindical…</div>
                ) : (
                  <div className="border-t border-slate-200 mt-6 pt-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ficha sindical</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Clave de plaza *" error={errorsSindical.clave_plaza}>
                        <input className={icls(errorsSindical.clave_plaza)} value={formSindical.clave_plaza}
                          onChange={e => setS('clave_plaza', e.target.value)} />
                      </Field>
                      <Field label="Tipo de nombramiento *" error={errorsSindical.tipo_nombramiento}>
                        <select className={icls(errorsSindical.tipo_nombramiento)} value={formSindical.tipo_nombramiento}
                          onChange={e => setS('tipo_nombramiento', e.target.value)}>
                          {['Base', 'Interino', 'Hora-Clase', 'Medio-Tiempo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </Field>
                      <Field label="Categoría TBC" error={errorsSindical.categoria_tbc}>
                        <input className={icls(errorsSindical.categoria_tbc)} value={formSindical.categoria_tbc}
                          onChange={e => setS('categoria_tbc', e.target.value)} />
                      </Field>
                      <Field label="Nivel TBC" error={errorsSindical.nivel_tbc}>
                        <input className={icls(errorsSindical.nivel_tbc)} value={formSindical.nivel_tbc}
                          onChange={e => setS('nivel_tbc', e.target.value)} />
                      </Field>
                      <Field label="Número ISSSTE" error={errorsSindical.numero_issste}>
                        <input className={icls(errorsSindical.numero_issste)} value={formSindical.numero_issste}
                          onChange={e => setS('numero_issste', e.target.value)} />
                      </Field>
                      <Field label="Fecha de ingreso SEP *" error={errorsSindical.fecha_ingreso_sep}>
                        <input type="date" className={icls(errorsSindical.fecha_ingreso_sep)} value={formSindical.fecha_ingreso_sep}
                          onChange={e => setS('fecha_ingreso_sep', e.target.value)} />
                      </Field>
                      <Field label="Fecha de ingreso TecNM" error={errorsSindical.fecha_ingreso_tecnm}>
                        <input type="date" className={icls(errorsSindical.fecha_ingreso_tecnm)} value={formSindical.fecha_ingreso_tecnm}
                          onChange={e => setS('fecha_ingreso_tecnm', e.target.value)} />
                      </Field>
                      <Field label="Activo">
                        <select className={icls()} value={formSindical.activo ? '1' : '0'}
                          onChange={e => setS('activo', e.target.value === '1')}>
                          <option value="1">Sí</option>
                          <option value="0">No</option>
                        </select>
                      </Field>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button onClick={() => guardarSindical.mutate()} disabled={guardarSindical.isPending}
                        className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                        {guardarSindical.isPending ? 'Guardando…' : (fichaSindical ? 'Guardar ficha sindical' : 'Registrar ficha sindical')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'academica' && (
              <div className="space-y-4">
                {cargandoFicha || !formAcademica ? (
                  <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Cargando datos académicos…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Tipo de contrato *" error={errorsAcademica.tipo_contrato}>
                        <select className={icls(errorsAcademica.tipo_contrato)} value={formAcademica.tipo_contrato}
                          onChange={e => setA('tipo_contrato', e.target.value)}>
                          {['base', 'interino', 'hora_clase', 'medio_tiempo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </Field>
                      <Field label="Categoría" error={errorsAcademica.categoria}>
                        <input className={icls(errorsAcademica.categoria)} value={formAcademica.categoria}
                          onChange={e => setA('categoria', e.target.value)} />
                      </Field>
                      <Field label="Fecha de ingreso" error={errorsAcademica.fecha_ingreso}>
                        <input type="date" className={icls(errorsAcademica.fecha_ingreso)} value={formAcademica.fecha_ingreso}
                          onChange={e => setA('fecha_ingreso', e.target.value)} />
                      </Field>
                      <Field label="Activo">
                        <select className={icls()} value={formAcademica.activo ? '1' : '0'}
                          onChange={e => setA('activo', e.target.value === '1')}>
                          <option value="1">Sí</option>
                          <option value="0">No</option>
                        </select>
                      </Field>
                      <Field label="Especialidades" full error={errorsAcademica.especialidades}>
                        <input className={icls(errorsAcademica.especialidades)} value={formAcademica.especialidades}
                          placeholder="Separadas por coma" onChange={e => setA('especialidades', e.target.value)} />
                      </Field>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button onClick={() => guardarAcademica.mutate()} disabled={guardarAcademica.isPending}
                        className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                        {guardarAcademica.isPending ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'disponibilidad' && periodoId && (
              <DisponibilidadPanel docenteId={docente.id} periodoId={periodoId} />
            )}

            {tab === 'horario' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Horario del periodo actual. Para modificar, usa el módulo de Cargas Académicas.</p>
                {periodoId && <HorarioSemanalPanel docenteId={docente.id} periodoId={periodoId} />}
              </div>
            )}

            {tab === 'cv' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">El docente mantiene su propio CV actualizado desde su portal.</p>
                {/* No existe endpoint admin para consultar el CV de otro docente por id
                    (solo /mi-ficha-docente, de autoservicio) — se muestra el estado vacío
                    de CvPanel en vez de reusar `ficha` (que es la ficha académica/contrato,
                    de forma distinta, y mostrarla aquí como si fuera el CV era engañoso). */}
                <CvPanel ficha={null} isLoading={false} />
              </div>
            )}

            {tab === 'cuenta' && esSuperadmin && (
              <div className="space-y-4 max-w-md">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                  Cambiar el correo o la contraseña cierra todas las sesiones activas del docente.
                </div>
                <Field label="Nuevo correo (opcional)">
                  <input className={icls()} type="email" value={cuenta.email}
                    placeholder={docente.email}
                    onChange={e => setCuenta(c => ({ ...c, email: e.target.value }))} />
                </Field>
                <Field label="Nueva contraseña (dejar en blanco para no cambiar)">
                  <input className={icls()} type="password" value={cuenta.password}
                    onChange={e => setCuenta(c => ({ ...c, password: e.target.value }))} />
                </Field>
                <Field label="Confirmar contraseña">
                  <input className={icls()} type="password" value={cuenta.confirmar}
                    onChange={e => setCuenta(c => ({ ...c, confirmar: e.target.value }))} />
                </Field>
                {errorCuenta && <p className="text-xs text-red-600">{errorCuenta}</p>}
                <div className="flex justify-end pt-2">
                  <button onClick={() => guardarCuenta.mutate()} disabled={guardarCuenta.isPending}
                    className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                    {guardarCuenta.isPending ? 'Guardando…' : 'Actualizar credenciales'}
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Recordatorio de asistencia por correo</p>
                  <p className="text-xs text-slate-500 mb-3">
                    Correo automático ~10 minutos antes de cada clase de este docente, recordándole pasar lista.
                    Por defecto sigue la configuración global.
                  </p>
                  <div className="flex gap-2">
                    {([
                      { valor: null,  label: 'Usar configuración global' },
                      { valor: true,  label: 'Activado' },
                      { valor: false, label: 'Desactivado' },
                    ] as const).map(opt => {
                      const actual = docente.recordatorio_asistencia_activo ?? null
                      const activo = actual === opt.valor
                      return (
                        <button
                          key={String(opt.valor)}
                          type="button"
                          onClick={() => guardarRecordatorio.mutate(opt.valor)}
                          disabled={guardarRecordatorio.isPending}
                          className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                            activo
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
