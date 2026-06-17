import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type EncuestaSocioeconomica, type GastosMensuales, type Vehiculo } from '../services/permanencia'
import { useConfiguracion } from '../../../hooks/useConfiguracion'

// ── Estilos base ──────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 transition'
const selectCls = inputCls

// ── Catálogos ─────────────────────────────────────────────────────────────────

const NIVEL_EDUCATIVO = [
  { value: 'sin_estudios', label: 'Sin estudios' },
  { value: 'primaria',     label: 'Primaria' },
  { value: 'secundaria',   label: 'Secundaria' },
  { value: 'bachiller',    label: 'Bachillerato / Técnico' },
  { value: 'superior',     label: 'Licenciatura' },
  { value: 'postgrado',    label: 'Posgrado' },
]

const SITUACION_LABORAL = [
  { value: 'empleado',     label: 'Empleado' },
  { value: 'autonomo',     label: 'Trabajador autónomo' },
  { value: 'jubilado',     label: 'Jubilado / Pensionado' },
  { value: 'desempleado',  label: 'Desempleado' },
  { value: 'incapacitado', label: 'Incapacitado' },
  { value: 'fallecido',    label: 'Fallecido' },
]

const VIVIENDA_TIPO = [
  { value: 'propia',         label: 'Propia' },
  { value: 'alquilada',      label: 'Alquilada / Rentada' },
  { value: 'alquiler_venta', label: 'En alquiler-venta' },
  { value: 'invasion',       label: 'En invasión / prestada' },
  { value: 'familiar',       label: 'Familiar sin pago' },
]

const VIVIENDA_PROP = [
  { value: 'casa_independiente', label: 'Casa independiente' },
  { value: 'condominio',         label: 'Condominio' },
  { value: 'dpto_edificio',      label: 'Depto. en edificio' },
  { value: 'dpto_otra_casa',     label: 'Depto. en otra casa' },
  { value: 'cuarto',             label: 'Cuarto' },
  { value: 'otro',               label: 'Otro' },
]

const TRASLADO = [
  { value: 'vehiculo_propio',    label: 'Vehículo propio' },
  { value: 'bicicleta',          label: 'Bicicleta' },
  { value: 'motocicleta',        label: 'Motocicleta' },
  { value: 'a_pie',              label: 'A pie' },
  { value: 'transporte_publico', label: 'Transporte público' },
]

const GASTOS_LABELS: Record<keyof GastosMensuales, string> = {
  luz:              'Energía eléctrica',
  agua:             'Agua',
  tel_fija:         'Teléfono fijo',
  tel_celular:      'Celular',
  internet:         'Internet',
  tv_cable:         'TV / Streaming',
  renta:            'Renta / Hipoteca',
  transporte:       'Transporte',
  material_escolar: 'Material escolar',
  salud:            'Salud / Med.',
  alimentacion:     'Alimentación',
  otros:            'Otros',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ventanaAbierta(inicio: string | null, fin: string | null) {
  if (!inicio && !fin) return true
  const hoy = new Date().toISOString().slice(0, 10)
  return (!inicio || hoy >= inicio) && (!fin || hoy <= fin)
}

function calcProgreso(form: Partial<EncuestaSocioeconomica>): number {
  const campos = [
    'dp_curp', 'dp_fecha_nacimiento', 'dp_sexo', 'dp_estado_civil',
    'dp_telefono', 'dp_email', 'dp_municipio_procedencia', 'dp_escuela_bachillerato',
    'con_quien_vive', 'padre_nivel_educativo', 'padre_situacion_laboral',
    'madre_nivel_educativo', 'madre_situacion_laboral',
    'familia_total_integrantes', 'vivienda_calle', 'vivienda_municipio',
    'vivienda_tipo', 'traslado_escuela', 'salud_estado',
  ]
  const llenos = campos.filter(c => {
    const v = form[c as keyof EncuestaSocioeconomica]
    return v !== null && v !== undefined && v !== ''
  }).length
  return Math.round((llenos / campos.length) * 100)
}

// ── Componentes UI ────────────────────────────────────────────────────────────

function Section({ icon, title, children, cols = 2 }: {
  icon: string
  title: string
  children: React.ReactNode
  cols?: 2 | 3 | 4
}) {
  const gridCls = cols === 4
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
    : cols === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-slate-800 text-sm tracking-wide">{title}</h2>
      </div>
      <div className={`p-6 ${gridCls}`}>{children}</div>
    </div>
  )
}

function Field({ label, children, span }: {
  label: string
  children: React.ReactNode
  span?: 'full' | 2
}) {
  const cls = span === 'full'
    ? 'col-span-full'
    : span === 2
      ? 'sm:col-span-2'
      : ''
  return (
    <div className={cls}>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 font-medium">
        {value || '—'}
      </div>
    </div>
  )
}

// ── Indicador de pasos ────────────────────────────────────────────────────────

function StepIndicator({ step, progreso }: { step: 1 | 2; progreso: number }) {
  const steps = [
    { n: 1, label: 'Datos personales', icon: '👤' },
    { n: 2, label: 'Cuestionario',     icon: '📋' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-0 mb-4">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                step === s.n
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                  : step > s.n
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {step > s.n ? '✓' : s.icon}
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${
                step === s.n ? 'text-blue-700' : step > s.n ? 'text-green-700' : 'text-slate-400'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-5 rounded transition-colors ${step > s.n ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Progreso de llenado</span>
          <span className="font-semibold text-blue-600">{progreso}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progreso}%`,
              background: progreso === 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #3b82f6, #2563eb)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Foto ──────────────────────────────────────────────────────────────────────

function FotoUpload({ disabled, existingUrl, onFile }: {
  disabled: boolean
  existingUrl?: string | null
  onFile: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!preview && existingUrl) setPreview(existingUrl)
  }, [existingUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    onFile(file)
    if (file) setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="col-span-full">
      <label className="block text-xs font-medium text-slate-500 mb-2">
        Fotografía tamaño infantil a color
        <span className="ml-1 text-red-500">*</span>
        <span className="ml-1 text-slate-400 font-normal">(JPG o PNG, máx. 4 MB)</span>
      </label>
      <div className="flex items-start gap-5">
        <div className={`w-24 h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 ${
          preview ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
        }`}>
          {preview
            ? <img src={preview} alt="Foto" className="w-full h-full object-cover" />
            : <div className="text-center p-2"><div className="text-3xl text-slate-200 mb-1">📷</div><span className="text-xs text-slate-400">Sin foto</span></div>
          }
        </div>
        <div className="flex-1 space-y-2">
          {!disabled && (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => ref.current?.click()}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
                {preview ? '🔄 Cambiar fotografía' : '📁 Seleccionar fotografía'}
              </button>
              {preview && (
                <button type="button"
                  onClick={() => { setPreview(null); onFile(null); if (ref.current) ref.current.value = '' }}
                  className="text-xs text-red-500 hover:text-red-700 transition">
                  Quitar
                </button>
              )}
            </div>
          )}
          <input ref={ref} type="file" accept="image/jpeg,image/png" className="hidden" disabled={disabled} onChange={handleChange} />
          <p className="text-xs text-slate-400 leading-relaxed">
            Foto reciente, a color, fondo blanco, rostro visible. Se guardará en tu expediente.
          </p>
          {preview && existingUrl && preview === existingUrl && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span>✓</span> Fotografía ya registrada
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Barra de estado de guardado ───────────────────────────────────────────────

function SaveStatus({ isPending, isSuccess, isError, lastSaved }: {
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  lastSaved: Date | null
}) {
  if (isPending) return (
    <div className="flex items-center gap-1.5 text-xs text-blue-600">
      <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Guardando…
    </div>
  )
  if (isError) return <div className="text-xs text-red-600">Error al guardar</div>
  if (isSuccess && lastSaved) return (
    <div className="text-xs text-green-600 flex items-center gap-1">
      <span>✓</span>
      Guardado a las {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
  return null
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function EncuestaSocioeconomicaPage() {
  const qc = useQueryClient()
  const { config } = useConfiguracion()

  const { data, isLoading } = useQuery({
    queryKey: ['mi-encuesta'],
    queryFn:  () => permanenciaApi.getMiEncuesta(),
  })

  const periodo   = data?.periodo
  const alumno    = data?.alumno
  const aspirante = alumno?.inscripcion?.aspirante
  const enviada   = !!data?.encuesta?.enviada_at
  const bloqueado = !ventanaAbierta(config.fecha_inicio_actualizacion_datos, config.fecha_fin_actualizacion_datos)

  const [step, setStep]         = useState<1 | 2>(1)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad   = useRef(true)

  const [form, setForm] = useState<Partial<EncuestaSocioeconomica>>({
    semestre: 1,
    tiene_beca: false,
    tiene_vehiculo: false,
    salud_problema_familiar: false,
    vehiculos: [],
    gastos_mensuales: {},
  })

  useEffect(() => {
    if (data?.encuesta) {
      setForm({
        ...data.encuesta,
        vehiculos:       data.encuesta.vehiculos       ?? [],
        gastos_mensuales: data.encuesta.gastos_mensuales ?? {},
      })
    } else if (data?.alumno) {
      setForm(f => ({
        ...f,
        semestre:                 alumno?.inscripcion?.semestre_actual ?? 1,
        periodo_id:               periodo?.id ?? '',
        dp_curp:                  aspirante?.curp               ?? '',
        dp_fecha_nacimiento:      aspirante?.fecha_nacimiento    ?? '',
        dp_sexo:                  aspirante?.sexo                ?? '',
        dp_estado_civil:          aspirante?.estado_civil        ?? '',
        dp_telefono:              aspirante?.telefono            ?? '',
        dp_email:                 aspirante?.email               ?? '',
        dp_municipio_procedencia: aspirante?.municipio_procedencia ?? '',
        dp_escuela_bachillerato:  aspirante?.escuela_bachillerato  ?? '',
      }))
    }
    isFirstLoad.current = false
  }, [data])

  const guardar = useMutation({
    mutationFn: (f: Partial<EncuestaSocioeconomica>) =>
      permanenciaApi.guardarEncuesta({ ...f, periodo_id: periodo?.id }, fotoFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-encuesta'] })
      setFotoFile(null)
      setLastSaved(new Date())
    },
  })

  const enviar = useMutation({
    mutationFn: () => permanenciaApi.enviarEncuesta(data!.encuesta!.id!),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['mi-encuesta'] }),
  })

  const set = useCallback((key: keyof EncuestaSocioeconomica, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const setGasto = useCallback((key: keyof GastosMensuales, value: number) => {
    setForm(f => ({ ...f, gastos_mensuales: { ...f.gastos_mensuales, [key]: value } }))
  }, [])

  // Auto-guardado con debounce 1.5s
  useEffect(() => {
    if (isFirstLoad.current || enviada || bloqueado) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      guardar.mutate(form)
    }, 1500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form])

  const gastos     = (form.gastos_mensuales ?? {}) as GastosMensuales
  const totalGastos = Object.values(gastos).reduce((s, v) => s + (Number(v) || 0), 0)
  const progreso   = calcProgreso(form)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm">Cargando encuesta…</span>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Encuesta Socioeconómica</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Periodo: <span className="font-medium">{periodo?.nombre ?? '—'}</span>
            {enviada && (
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Enviada
              </span>
            )}
          </p>
        </div>
        {!enviada && !bloqueado && (
          <SaveStatus
            isPending={guardar.isPending}
            isSuccess={guardar.isSuccess}
            isError={guardar.isError}
            lastSaved={lastSaved}
          />
        )}
      </div>

      {/* Avisos */}
      {enviada && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-start gap-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="font-semibold">Encuesta enviada correctamente</p>
            <p className="text-green-700 mt-0.5">Tu información ha sido registrada. Podrás actualizarla al inicio del siguiente semestre.</p>
          </div>
        </div>
      )}

      {!enviada && bloqueado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <div>
            <p className="font-semibold">Período de actualización cerrado</p>
            <p className="text-amber-700 mt-0.5">
              La ventana de captura no está abierta en este momento.
              {config.fecha_inicio_actualizacion_datos && (
                <> Apertura: <strong>{new Date(config.fecha_inicio_actualizacion_datos + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Indicador de pasos + progreso */}
      <StepIndicator step={step} progreso={progreso} />

      {/* ══════════════════════════════════════════
          PASO 1 — Datos Personales
      ══════════════════════════════════════════ */}
      {step === 1 && (
        <>
          {/* I. Identificación (solo lectura) */}
          <Section icon="🎓" title="I. Datos de Identificación" cols={4}>
            <ReadonlyField label="Nombre completo" value={alumno?.user?.name ?? ''} />
            <ReadonlyField label="Número de control" value={alumno?.numero_control ?? ''} />
            <ReadonlyField label="Carrera" value={alumno?.inscripcion?.carrera?.nombre ?? ''} />
            <Field label="Semestre actual">
              <input className={inputCls} type="number" min={1} max={12}
                value={form.semestre ?? ''}
                disabled={enviada}
                onChange={e => set('semestre', Number(e.target.value))} />
            </Field>
          </Section>

          {/* II. Datos personales */}
          <Section icon="📝" title="II. Datos Personales del Estudiante" cols={3}>
            <Field label="CURP">
              <input className={inputCls} placeholder="18 caracteres" maxLength={18}
                value={form.dp_curp ?? ''} disabled={enviada}
                onChange={e => set('dp_curp', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input className={inputCls} type="date"
                value={form.dp_fecha_nacimiento ?? ''} disabled={enviada}
                onChange={e => set('dp_fecha_nacimiento', e.target.value)} />
            </Field>
            <Field label="Lugar de nacimiento">
              <input className={inputCls} placeholder="Ciudad, Estado"
                value={form.dp_lugar_nacimiento ?? ''} disabled={enviada}
                onChange={e => set('dp_lugar_nacimiento', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select className={selectCls} value={form.dp_sexo ?? ''} disabled={enviada}
                onChange={e => set('dp_sexo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </Field>
            <Field label="Estado civil">
              <select className={selectCls} value={form.dp_estado_civil ?? ''} disabled={enviada}
                onChange={e => set('dp_estado_civil', e.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="union_libre">Unión libre</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
              </select>
            </Field>
            <Field label="Municipio de procedencia">
              <input className={inputCls} placeholder="Municipio de origen"
                value={form.dp_municipio_procedencia ?? ''} disabled={enviada}
                onChange={e => set('dp_municipio_procedencia', e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input className={inputCls} type="tel" placeholder="10 dígitos"
                value={form.dp_telefono ?? ''} disabled={enviada}
                onChange={e => set('dp_telefono', e.target.value)} />
            </Field>
            <Field label="Correo electrónico personal">
              <input className={inputCls} type="email" placeholder="correo@ejemplo.com"
                value={form.dp_email ?? ''} disabled={enviada}
                onChange={e => set('dp_email', e.target.value)} />
            </Field>
            <Field label="Escuela de bachillerato" span="full">
              <input className={inputCls} placeholder="Nombre completo de la preparatoria / CBTIS / CONALEP…"
                value={form.dp_escuela_bachillerato ?? ''} disabled={enviada}
                onChange={e => set('dp_escuela_bachillerato', e.target.value)} />
            </Field>
            <FotoUpload disabled={enviada} existingUrl={data?.encuesta?.foto_infantil_url} onFile={setFotoFile} />
          </Section>

          {/* Navegación */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {!enviada && !bloqueado && 'Los cambios se guardan automáticamente'}
            </div>
            <button type="button"
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
              onClick={() => setStep(2)}>
              Siguiente: Cuestionario →
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          PASO 2 — Cuestionario Socioeconómico
      ══════════════════════════════════════════ */}
      {step === 2 && (
        <>
          {/* III. Situación del alumno */}
          <Section icon="🎒" title="III. Situación del Alumno" cols={3}>
            <Field label="¿Con quién vive?">
              <input className={inputCls} placeholder="Ej. Padres, Solo, Familia extendida…"
                value={form.con_quien_vive ?? ''} disabled={enviada}
                onChange={e => set('con_quien_vive', e.target.value)} />
            </Field>
            <Field label="¿Tiene beca?">
              <select className={selectCls} value={form.tiene_beca ? 'si' : 'no'} disabled={enviada}
                onChange={e => set('tiene_beca', e.target.value === 'si')}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </Field>
            {form.tiene_beca && (
              <Field label="Nombre / tipo de beca">
                <input className={inputCls} placeholder="Ej. Beca Benito Juárez…"
                  value={form.beca ?? ''} disabled={enviada}
                  onChange={e => set('beca', e.target.value)} />
              </Field>
            )}
            <Field label="Ingreso propio" span={form.tiene_beca ? undefined : 'full'}>
              <input className={inputCls} placeholder="Describe si trabajas o tienes ingreso propio (o deja en blanco)"
                value={form.ingreso_propio ?? ''} disabled={enviada}
                onChange={e => set('ingreso_propio', e.target.value)} />
            </Field>
          </Section>

          {/* IV. Padre */}
          <Section icon="👨" title="IV. Padre o Tutor" cols={4}>
            <Field label="Nivel educativo">
              <select className={selectCls} value={form.padre_nivel_educativo ?? ''} disabled={enviada}
                onChange={e => set('padre_nivel_educativo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {NIVEL_EDUCATIVO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Situación laboral">
              <select className={selectCls} value={form.padre_situacion_laboral ?? ''} disabled={enviada}
                onChange={e => set('padre_situacion_laboral', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {SITUACION_LABORAL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Ocupación">
              <input className={inputCls} value={form.padre_ocupacion ?? ''} disabled={enviada}
                onChange={e => set('padre_ocupacion', e.target.value)} />
            </Field>
            <Field label="Centro de trabajo">
              <input className={inputCls} value={form.padre_centro_trabajo ?? ''} disabled={enviada}
                onChange={e => set('padre_centro_trabajo', e.target.value)} />
            </Field>
            <Field label="Cargo / puesto">
              <input className={inputCls} value={form.padre_cargo ?? ''} disabled={enviada}
                onChange={e => set('padre_cargo', e.target.value)} />
            </Field>
            <Field label="Tiempo de servicio">
              <input className={inputCls} placeholder="Ej. 5 años" value={form.padre_tiempo_servicio ?? ''} disabled={enviada}
                onChange={e => set('padre_tiempo_servicio', e.target.value)} />
            </Field>
            <Field label="Ingresos mensuales ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.padre_ingresos_mensuales ?? ''} disabled={enviada}
                onChange={e => set('padre_ingresos_mensuales', Number(e.target.value))} />
            </Field>
            <Field label="Otros ingresos">
              <input className={inputCls} placeholder="Ej. renta, pensión…"
                value={form.padre_otros_ingresos ?? ''} disabled={enviada}
                onChange={e => set('padre_otros_ingresos', e.target.value)} />
            </Field>
          </Section>

          {/* V. Madre */}
          <Section icon="👩" title="V. Madre" cols={4}>
            <Field label="Nivel educativo">
              <select className={selectCls} value={form.madre_nivel_educativo ?? ''} disabled={enviada}
                onChange={e => set('madre_nivel_educativo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {NIVEL_EDUCATIVO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Situación laboral">
              <select className={selectCls} value={form.madre_situacion_laboral ?? ''} disabled={enviada}
                onChange={e => set('madre_situacion_laboral', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {SITUACION_LABORAL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Ocupación">
              <input className={inputCls} value={form.madre_ocupacion ?? ''} disabled={enviada}
                onChange={e => set('madre_ocupacion', e.target.value)} />
            </Field>
            <Field label="Centro de trabajo">
              <input className={inputCls} value={form.madre_centro_trabajo ?? ''} disabled={enviada}
                onChange={e => set('madre_centro_trabajo', e.target.value)} />
            </Field>
            <Field label="Cargo / puesto">
              <input className={inputCls} value={form.madre_cargo ?? ''} disabled={enviada}
                onChange={e => set('madre_cargo', e.target.value)} />
            </Field>
            <Field label="Tiempo de servicio">
              <input className={inputCls} placeholder="Ej. 10 años" value={form.madre_tiempo_servicio ?? ''} disabled={enviada}
                onChange={e => set('madre_tiempo_servicio', e.target.value)} />
            </Field>
            <Field label="Ingresos mensuales ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.madre_ingresos_mensuales ?? ''} disabled={enviada}
                onChange={e => set('madre_ingresos_mensuales', Number(e.target.value))} />
            </Field>
            <Field label="Otros ingresos">
              <input className={inputCls} placeholder="Ej. renta, pensión…"
                value={form.madre_otros_ingresos ?? ''} disabled={enviada}
                onChange={e => set('madre_otros_ingresos', e.target.value)} />
            </Field>
          </Section>

          {/* VI. Familia */}
          <Section icon="👨‍👩‍👧‍👦" title="VI. Datos de la Familia" cols={4}>
            <Field label="Total de integrantes">
              <input className={inputCls} type="number" min={1}
                value={form.familia_total_integrantes ?? ''} disabled={enviada}
                onChange={e => set('familia_total_integrantes', Number(e.target.value))} />
            </Field>
            <Field label="Número de hijos">
              <input className={inputCls} type="number" min={0}
                value={form.familia_num_hijos ?? ''} disabled={enviada}
                onChange={e => set('familia_num_hijos', Number(e.target.value))} />
            </Field>
            <Field label="Edades de los hijos">
              <input className={inputCls} placeholder="Ej. 8, 14, 19"
                value={form.familia_edades_hijos ?? ''} disabled={enviada}
                onChange={e => set('familia_edades_hijos', e.target.value)} />
            </Field>
            <Field label="Hijos estudiando">
              <input className={inputCls} type="number" min={0}
                value={form.familia_num_estudiantes ?? ''} disabled={enviada}
                onChange={e => set('familia_num_estudiantes', Number(e.target.value))} />
            </Field>
          </Section>

          {/* VII. Vivienda */}
          <Section icon="🏠" title="VII. Vivienda y Transporte" cols={4}>
            <Field label="Calle">
              <input className={inputCls} value={form.vivienda_calle ?? ''} disabled={enviada}
                onChange={e => set('vivienda_calle', e.target.value)} />
            </Field>
            <Field label="Número">
              <input className={inputCls} value={form.vivienda_numero ?? ''} disabled={enviada}
                onChange={e => set('vivienda_numero', e.target.value)} />
            </Field>
            <Field label="Colonia">
              <input className={inputCls} value={form.vivienda_colonia ?? ''} disabled={enviada}
                onChange={e => set('vivienda_colonia', e.target.value)} />
            </Field>
            <Field label="Municipio">
              <input className={inputCls} value={form.vivienda_municipio ?? ''} disabled={enviada}
                onChange={e => set('vivienda_municipio', e.target.value)} />
            </Field>
            <Field label="Tipo de vivienda">
              <select className={selectCls} value={form.vivienda_tipo ?? ''} disabled={enviada}
                onChange={e => set('vivienda_tipo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {VIVIENDA_TIPO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo de propiedad">
              <select className={selectCls} value={form.vivienda_tipo_propiedad ?? ''} disabled={enviada}
                onChange={e => set('vivienda_tipo_propiedad', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {VIVIENDA_PROP.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Traslado a la escuela">
              <select className={selectCls} value={form.traslado_escuela ?? ''} disabled={enviada}
                onChange={e => set('traslado_escuela', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {TRASLADO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="¿Tiene vehículo?">
              <select className={selectCls} value={form.tiene_vehiculo ? 'si' : 'no'} disabled={enviada}
                onChange={e => {
                  const val = e.target.value === 'si'
                  set('tiene_vehiculo', val)
                  if (!val) set('vehiculos', [])
                }}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </Field>
            <Field label="Otras propiedades" span="full">
              <input className={inputCls} placeholder="Terrenos, locales, etc. (opcional)"
                value={form.vivienda_otras_propiedades ?? ''} disabled={enviada}
                onChange={e => set('vivienda_otras_propiedades', e.target.value)} />
            </Field>

            {form.tiene_vehiculo && (
              <div className="col-span-full space-y-2">
                <p className="text-xs font-medium text-slate-500 mb-1">Vehículos registrados</p>
                {(form.vehiculos ?? []).map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center bg-slate-50 rounded-lg p-2">
                    <input className={inputCls} placeholder="Tipo (auto, moto…)" value={v.tipo} disabled={enviada}
                      onChange={e => { const arr = [...(form.vehiculos ?? [])]; arr[i] = { ...arr[i], tipo: e.target.value }; set('vehiculos', arr) }} />
                    <input className={inputCls} placeholder="Marca" value={v.marca} disabled={enviada}
                      onChange={e => { const arr = [...(form.vehiculos ?? [])]; arr[i] = { ...arr[i], marca: e.target.value }; set('vehiculos', arr) }} />
                    <div className="flex gap-2">
                      <input className={inputCls} type="number" placeholder="Año" value={v.anio || ''} disabled={enviada}
                        onChange={e => { const arr = [...(form.vehiculos ?? [])]; arr[i] = { ...arr[i], anio: Number(e.target.value) }; set('vehiculos', arr) }} />
                      {!enviada && (
                        <button type="button" className="text-red-400 hover:text-red-600 text-lg px-1 transition"
                          onClick={() => set('vehiculos', (form.vehiculos ?? []).filter((_, j) => j !== i))}>×</button>
                      )}
                    </div>
                  </div>
                ))}
                {!enviada && (
                  <button type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                    onClick={() => set('vehiculos', [...(form.vehiculos ?? []), { tipo: '', marca: '', anio: 0 } as Vehiculo])}>
                    + Agregar vehículo
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* VIII. Ingresos y gastos */}
          <Section icon="💰" title="VIII. Ingresos y Egresos Familiares" cols={2}>
            <Field label="Total ingresos mensuales familiares ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.total_ingresos_familia ?? ''} disabled={enviada}
                onChange={e => set('total_ingresos_familia', Number(e.target.value))} />
            </Field>
            <Field label="Otros ingresos ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.otros_ingresos_familia ?? ''} disabled={enviada}
                onChange={e => set('otros_ingresos_familia', Number(e.target.value))} />
            </Field>
            <div className="col-span-full">
              <p className="text-xs font-medium text-slate-500 mb-3">Gastos mensuales detallados</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(Object.keys(GASTOS_LABELS) as Array<keyof GastosMensuales>).map(k => (
                  <div key={k} className="bg-slate-50 rounded-lg p-3">
                    <label className="block text-xs text-slate-500 mb-1.5">{GASTOS_LABELS[k]}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        className="w-full border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                        type="number" min={0} step={50}
                        value={gastos[k] ?? ''} disabled={enviada}
                        onChange={e => setGasto(k, Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                <div className="text-sm">
                  <span className="text-slate-500">Total egresos mensuales: </span>
                  <span className="font-bold text-blue-700 text-base">${totalGastos.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* IX. Salud */}
          <Section icon="🏥" title="IX. Salud Familiar" cols={3}>
            <Field label="Estado de salud familiar">
              <select className={selectCls} value={form.salud_estado ?? ''} disabled={enviada}
                onChange={e => set('salud_estado', e.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="buena">Buena</option>
                <option value="regular">Regular</option>
                <option value="deficiente">Deficiente</option>
              </select>
            </Field>
            <Field label="¿Algún problema de salud en la familia?">
              <select className={selectCls} value={form.salud_problema_familiar ? 'si' : 'no'} disabled={enviada}
                onChange={e => set('salud_problema_familiar', e.target.value === 'si')}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </Field>
            {form.salud_problema_familiar && (
              <Field label="Especifique el problema de salud">
                <textarea className={inputCls} rows={2} value={form.salud_especifique ?? ''} disabled={enviada}
                  onChange={e => set('salud_especifique', e.target.value)} />
              </Field>
            )}
          </Section>

          {/* X. Información adicional */}
          <Section icon="💬" title="X. Información Adicional" cols={2}>
            <Field label="Comentarios u observaciones" span="full">
              <textarea className={inputCls} rows={4}
                placeholder="Cualquier información adicional que consideres relevante para la evaluación socioeconómica…"
                value={form.informacion_adicional ?? ''} disabled={enviada}
                onChange={e => set('informacion_adicional', e.target.value)} />
            </Field>
          </Section>

          {/* Navegación y envío */}
          <div className="flex items-center justify-between gap-4">
            <button type="button"
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              onClick={() => setStep(1)}>
              ← Datos personales
            </button>

            {!enviada && (
              <div className="flex items-center gap-3">
                <SaveStatus
                  isPending={guardar.isPending}
                  isSuccess={guardar.isSuccess}
                  isError={guardar.isError}
                  lastSaved={lastSaved}
                />
                <button type="button"
                  disabled={!data?.encuesta?.id || enviar.isPending}
                  title={!data?.encuesta?.id ? 'Primero se guardará automáticamente' : ''}
                  className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                  onClick={() => {
                    if (window.confirm('Al enviar la encuesta no podrás modificarla. ¿Deseas continuar?')) {
                      enviar.mutate()
                    }
                  }}>
                  {enviar.isPending ? 'Enviando…' : '✓ Enviar encuesta'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
