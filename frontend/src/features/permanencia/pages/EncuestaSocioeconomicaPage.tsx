import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type EncuestaSocioeconomica, type GastosMensuales, type Vehiculo } from '../services/permanencia'
import { useConfiguracion } from '../../../hooks/useConfiguracion'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
        <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500'
const selectCls = inputCls

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
  { value: 'alquilada',      label: 'Alquilada/Rentada' },
  { value: 'alquiler_venta', label: 'En alquiler-venta' },
  { value: 'invasion',       label: 'En invasión/prestada' },
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
  tel_celular:      'Teléfono celular',
  internet:         'Internet',
  tv_cable:         'TV cable/streaming',
  renta:            'Renta/hipoteca',
  transporte:       'Transporte',
  material_escolar: 'Material escolar',
  salud:            'Salud/medicamentos',
  alimentacion:     'Alimentación',
  otros:            'Otros',
}

// ── Indicador de pasos ────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Datos Personales' },
    { n: 2, label: 'Cuestionario Socioeconómico' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
              step === s.n
                ? 'bg-blue-600 border-blue-600 text-white'
                : step > s.n
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
            }`}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span className={`mt-1.5 text-xs font-medium text-center leading-tight max-w-[90px] ${
              step === s.n ? 'text-blue-700' : step > s.n ? 'text-green-700' : 'text-slate-400'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${step > s.n ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Componente de carga de foto ───────────────────────────────────────────────

function FotoUpload({
  disabled, existingUrl, onFile,
}: {
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
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium text-slate-600 mb-2">
        Fotografía tamaño infantil a color
        <span className="ml-1 text-red-500">*</span>
        <span className="ml-1 text-slate-400 font-normal">(JPG o PNG, máx. 4 MB)</span>
      </label>
      <div className="flex items-start gap-5">
        {/* Preview */}
        <div className={`w-24 h-28 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 ${
          preview ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}>
          {preview ? (
            <img src={preview} alt="Fotografía" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <div className="text-2xl text-slate-300 mb-1">📷</div>
              <span className="text-xs text-slate-400">Sin foto</span>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex-1 space-y-2">
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                {preview ? 'Cambiar fotografía' : 'Seleccionar fotografía'}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={() => { setPreview(null); onFile(null); if (ref.current) ref.current.value = '' }}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  Quitar
                </button>
              )}
            </>
          )}
          <input
            ref={ref}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            disabled={disabled}
            onChange={handleChange}
          />
          <p className="text-xs text-slate-400 leading-relaxed">
            La fotografía debe ser reciente, a color, fondo blanco o claro, rostro visible. Se guardará en tu expediente escolar.
          </p>
          {preview && existingUrl && preview === existingUrl && (
            <p className="text-xs text-green-600 font-medium">Fotografía ya registrada.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

function ventanaActualizacionAbierta(inicio: string | null, fin: string | null): boolean {
  if (!inicio && !fin) return true
  const hoy = new Date().toISOString().slice(0, 10)
  return (!inicio || hoy >= inicio) && (!fin || hoy <= fin)
}

export default function EncuestaSocioeconomicaPage() {
  const qc = useQueryClient()
  const { config } = useConfiguracion()

  const { data, isLoading } = useQuery({
    queryKey: ['mi-encuesta'],
    queryFn: () => permanenciaApi.getMiEncuesta(),
  })

  const periodo  = data?.periodo
  const alumno   = data?.alumno
  const aspirante = alumno?.inscripcion?.aspirante
  const enviada  = !!data?.encuesta?.enviada_at

  const ventanaAbierta = ventanaActualizacionAbierta(
    config.fecha_inicio_actualizacion_datos,
    config.fecha_fin_actualizacion_datos,
  )
  // Si la ventana está cerrada, el formulario es de sólo lectura
  const bloqueado = !ventanaAbierta

  const [step, setStep] = useState<1 | 2>(1)
  const [fotoFile, setFotoFile] = useState<File | null>(null)

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
        vehiculos: data.encuesta.vehiculos ?? [],
        gastos_mensuales: data.encuesta.gastos_mensuales ?? {},
      })
    } else if (data?.alumno) {
      // Pre-llenar desde el aspirante si aún no hay encuesta guardada
      setForm(f => ({
        ...f,
        semestre: alumno?.inscripcion?.semestre_actual ?? 1,
        periodo_id: periodo?.id ?? '',
        dp_curp:                 aspirante?.curp ?? '',
        dp_fecha_nacimiento:     aspirante?.fecha_nacimiento ?? '',
        dp_sexo:                 aspirante?.sexo ?? '',
        dp_estado_civil:         aspirante?.estado_civil ?? '',
        dp_telefono:             aspirante?.telefono ?? '',
        dp_email:                aspirante?.email ?? '',
        dp_municipio_procedencia: aspirante?.municipio_procedencia ?? '',
        dp_escuela_bachillerato: aspirante?.escuela_bachillerato ?? '',
      }))
    }
  }, [data])

  const set = (key: keyof EncuestaSocioeconomica, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  const setGasto = (key: keyof GastosMensuales, value: number) =>
    setForm(f => ({ ...f, gastos_mensuales: { ...f.gastos_mensuales, [key]: value } }))

  const guardar = useMutation({
    mutationFn: () => permanenciaApi.guardarEncuesta(
      { ...form, periodo_id: periodo?.id },
      fotoFile
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-encuesta'] })
      setFotoFile(null)
    },
  })

  const enviar = useMutation({
    mutationFn: () => permanenciaApi.enviarEncuesta(data!.encuesta!.id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mi-encuesta'] }),
  })

  const gastos = (form.gastos_mensuales ?? {}) as GastosMensuales
  const totalGastos = Object.values(gastos).reduce((s, v) => s + (Number(v) || 0), 0)

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-sm">Cargando encuesta…</div>
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Encuesta Socioeconómica</h1>
        <p className="text-sm text-slate-500 mt-1">
          Periodo: <span className="font-medium">{periodo?.nombre ?? '—'}</span>
          {enviada && (
            <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Enviada
            </span>
          )}
        </p>
      </div>

      {enviada && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          Tu encuesta ya fue enviada para este periodo. Podrás actualizarla al inicio del siguiente semestre.
        </div>
      )}

      {!enviada && bloqueado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Período de actualización cerrado</p>
          <p>
            La ventana de actualización de datos no está abierta en este momento.
            {config.fecha_inicio_actualizacion_datos && (
              <> Inicio: <strong>{new Date(config.fecha_inicio_actualizacion_datos + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</>
            )}
            {config.fecha_fin_actualizacion_datos && (
              <> Cierre: <strong>{new Date(config.fecha_fin_actualizacion_datos + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</>
            )}
          </p>
        </div>
      )}

      {/* Indicador de pasos */}
      <StepIndicator step={step} />

      {/* ══ FASE 1: Datos Personales ══ */}
      {step === 1 && (
        <>
          {/* Datos de identificación (sólo lectura) */}
          <Section title="I. Datos de Identificación">
            <Field label="Nombre completo">
              <input className={inputCls} value={alumno?.user?.name ?? ''} disabled />
            </Field>
            <Field label="Número de control">
              <input className={inputCls} value={alumno?.numero_control ?? ''} disabled />
            </Field>
            <Field label="Carrera">
              <input className={inputCls} value={alumno?.inscripcion?.carrera?.nombre ?? ''} disabled />
            </Field>
            <Field label="Semestre actual">
              <input className={inputCls} type="number" min={1} max={12}
                value={form.semestre ?? ''}
                disabled={enviada}
                onChange={e => set('semestre', Number(e.target.value))} />
            </Field>
          </Section>

          {/* Datos personales editables */}
          <Section title="II. Datos Personales del Estudiante">
            <Field label="CURP">
              <input className={inputCls}
                placeholder="18 caracteres"
                maxLength={18}
                value={form.dp_curp ?? ''}
                disabled={enviada}
                onChange={e => set('dp_curp', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input className={inputCls} type="date"
                value={form.dp_fecha_nacimiento ?? ''}
                disabled={enviada}
                onChange={e => set('dp_fecha_nacimiento', e.target.value)} />
            </Field>
            <Field label="Lugar de nacimiento">
              <input className={inputCls}
                placeholder="Ciudad, Estado"
                value={form.dp_lugar_nacimiento ?? ''}
                disabled={enviada}
                onChange={e => set('dp_lugar_nacimiento', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select className={selectCls}
                value={form.dp_sexo ?? ''}
                disabled={enviada}
                onChange={e => set('dp_sexo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </Field>
            <Field label="Estado civil">
              <select className={selectCls}
                value={form.dp_estado_civil ?? ''}
                disabled={enviada}
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
              <input className={inputCls}
                placeholder="Municipio de origen"
                value={form.dp_municipio_procedencia ?? ''}
                disabled={enviada}
                onChange={e => set('dp_municipio_procedencia', e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input className={inputCls}
                type="tel"
                placeholder="10 dígitos"
                value={form.dp_telefono ?? ''}
                disabled={enviada}
                onChange={e => set('dp_telefono', e.target.value)} />
            </Field>
            <Field label="Correo electrónico personal">
              <input className={inputCls}
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.dp_email ?? ''}
                disabled={enviada}
                onChange={e => set('dp_email', e.target.value)} />
            </Field>
            <Field label="Escuela bachillerato de procedencia" full>
              <input className={inputCls}
                placeholder="Nombre completo de la preparatoria / CBTIS / CONALEP…"
                value={form.dp_escuela_bachillerato ?? ''}
                disabled={enviada}
                onChange={e => set('dp_escuela_bachillerato', e.target.value)} />
            </Field>

            {/* Foto infantil */}
            <FotoUpload
              disabled={enviada}
              existingUrl={data?.encuesta?.foto_infantil_url}
              onFile={setFotoFile}
            />
          </Section>

          {/* Acciones fase 1 */}
          {!enviada && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                disabled={guardar.isPending}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                onClick={() => guardar.mutate()}
              >
                {guardar.isPending ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <div className="flex items-center gap-3">
                {guardar.isSuccess && !guardar.isPending && (
                  <span className="text-xs text-green-600">Borrador guardado</span>
                )}
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  onClick={() => setStep(2)}
                >
                  Siguiente: Cuestionario →
                </button>
              </div>
            </div>
          )}
          {enviada && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                onClick={() => setStep(2)}
              >
                Ver cuestionario →
              </button>
            </div>
          )}
        </>
      )}

      {/* ══ FASE 2: Cuestionario Socioeconómico ══ */}
      {step === 2 && (
        <>
          {/* III. Datos del alumno (socioeconómico) */}
          <Section title="III. Situación del Alumno">
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
              <Field label="Nombre / tipo de beca" full>
                <input className={inputCls} placeholder="Ej. Beca Benito Juárez, CONACYT…"
                  value={form.beca ?? ''} disabled={enviada}
                  onChange={e => set('beca', e.target.value)} />
              </Field>
            )}
            <Field label="Ingreso propio" full>
              <input className={inputCls}
                placeholder="Describe si tienes trabajo o ingreso propio (o deja en blanco)"
                value={form.ingreso_propio ?? ''} disabled={enviada}
                onChange={e => set('ingreso_propio', e.target.value)} />
            </Field>
          </Section>

          {/* IV. Padre */}
          <Section title="IV. Padre o Tutor">
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
          <Section title="V. Madre">
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
          <Section title="VI. Datos de la Familia">
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
            <Field label="Hijos estudiando actualmente">
              <input className={inputCls} type="number" min={0}
                value={form.familia_num_estudiantes ?? ''} disabled={enviada}
                onChange={e => set('familia_num_estudiantes', Number(e.target.value))} />
            </Field>
          </Section>

          {/* VII. Vivienda */}
          <Section title="VII. Vivienda">
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
            <Field label="Otras propiedades" full>
              <textarea className={inputCls} rows={2}
                placeholder="Describe si la familia tiene otras propiedades (terrenos, locales, etc.)"
                value={form.vivienda_otras_propiedades ?? ''} disabled={enviada}
                onChange={e => set('vivienda_otras_propiedades', e.target.value)} />
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
            <Field label="Traslado a la escuela">
              <select className={selectCls} value={form.traslado_escuela ?? ''} disabled={enviada}
                onChange={e => set('traslado_escuela', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {TRASLADO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            {form.tiene_vehiculo && (
              <div className="sm:col-span-2 space-y-3">
                <p className="text-xs font-medium text-slate-600">Vehículos</p>
                {(form.vehiculos ?? []).map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <input className={inputCls} placeholder="Tipo (auto, moto…)" value={v.tipo} disabled={enviada}
                      onChange={e => {
                        const arr = [...(form.vehiculos ?? [])]
                        arr[i] = { ...arr[i], tipo: e.target.value }
                        set('vehiculos', arr)
                      }} />
                    <input className={inputCls} placeholder="Marca" value={v.marca} disabled={enviada}
                      onChange={e => {
                        const arr = [...(form.vehiculos ?? [])]
                        arr[i] = { ...arr[i], marca: e.target.value }
                        set('vehiculos', arr)
                      }} />
                    <div className="flex gap-2">
                      <input className={inputCls} type="number" placeholder="Año" value={v.anio || ''} disabled={enviada}
                        onChange={e => {
                          const arr = [...(form.vehiculos ?? [])]
                          arr[i] = { ...arr[i], anio: Number(e.target.value) }
                          set('vehiculos', arr)
                        }} />
                      {!enviada && (
                        <button type="button" className="text-red-500 hover:text-red-700 text-sm px-1"
                          onClick={() => set('vehiculos', (form.vehiculos ?? []).filter((_, j) => j !== i))}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!enviada && (
                  <button type="button" className="text-sm text-blue-600 hover:underline"
                    onClick={() => set('vehiculos', [...(form.vehiculos ?? []), { tipo: '', marca: '', anio: 0 } as Vehiculo])}>
                    + Agregar vehículo
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* VIII. Ingresos y egresos */}
          <Section title="VIII. Ingresos y Egresos Familiares">
            <Field label="Total ingresos mensuales ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.total_ingresos_familia ?? ''} disabled={enviada}
                onChange={e => set('total_ingresos_familia', Number(e.target.value))} />
            </Field>
            <Field label="Otros ingresos ($)">
              <input className={inputCls} type="number" min={0} step={100}
                value={form.otros_ingresos_familia ?? ''} disabled={enviada}
                onChange={e => set('otros_ingresos_familia', Number(e.target.value))} />
            </Field>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-600 mb-2">Gastos mensuales detallados</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(GASTOS_LABELS) as Array<keyof GastosMensuales>).map(k => (
                  <div key={k}>
                    <label className="block text-xs text-slate-500 mb-1">{GASTOS_LABELS[k]}</label>
                    <input className={inputCls} type="number" min={0} step={50}
                      value={gastos[k] ?? ''} disabled={enviada}
                      onChange={e => setGasto(k, Number(e.target.value))} />
                  </div>
                ))}
              </div>
              <p className="text-right text-sm font-medium text-slate-700 mt-2">
                Total egresos: <span className="text-blue-700">${totalGastos.toLocaleString()}</span>
              </p>
            </div>
          </Section>

          {/* IX. Salud */}
          <Section title="IX. Salud">
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
              <Field label="Especifique" full>
                <textarea className={inputCls} rows={2} value={form.salud_especifique ?? ''} disabled={enviada}
                  onChange={e => set('salud_especifique', e.target.value)} />
              </Field>
            )}
          </Section>

          {/* X. Información adicional */}
          <Section title="X. Información Adicional">
            <Field label="Comentarios u observaciones adicionales" full>
              <textarea className={inputCls} rows={4}
                placeholder="Cualquier información adicional que consideres relevante para la evaluación socioeconómica…"
                value={form.informacion_adicional ?? ''} disabled={enviada}
                onChange={e => set('informacion_adicional', e.target.value)} />
            </Field>
          </Section>

          {/* Acciones fase 2 */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              onClick={() => setStep(1)}
            >
              ← Datos Personales
            </button>

            {!enviada && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={guardar.isPending}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => guardar.mutate()}
                >
                  {guardar.isPending ? 'Guardando…' : 'Guardar borrador'}
                </button>
                {guardar.isSuccess && !guardar.isPending && (
                  <span className="text-xs text-green-600">Borrador guardado</span>
                )}
                <button
                  type="button"
                  disabled={!data?.encuesta?.id || enviar.isPending}
                  title={!data?.encuesta?.id ? 'Primero guarda un borrador' : ''}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => {
                    if (window.confirm('Al enviar la encuesta no podrás modificarla. ¿Deseas continuar?')) {
                      enviar.mutate()
                    }
                  }}
                >
                  {enviar.isPending ? 'Enviando…' : 'Enviar encuesta'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
