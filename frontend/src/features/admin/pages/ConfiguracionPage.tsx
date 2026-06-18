import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { configuracionApi, type ConfiguracionInstitucional } from '../services/configuracion'
import { useToastStore } from '../../../store/toastStore'
import { FONT_OPTIONS, loadGoogleFont, DEFAULT_FONT } from '../../../config/fonts'
import { useAuthStore } from '../../../store/authStore'

type TabId = 'institucion' | 'identidad' | 'login' | 'interfaz' | 'sistema'

// ── Paletas predefinidas ───────────────────────────────────────────────────────

const PALETAS = [
  { nombre: 'Océano',    primario: '#1a3a5c', secundario: '#2d6a9f', acento: '#f59e0b', sidebar: null },
  { nombre: 'Esmeralda', primario: '#064e3b', secundario: '#047857', acento: '#f97316', sidebar: null },
  { nombre: 'Morado',    primario: '#3b0764', secundario: '#7c3aed', acento: '#f43f5e', sidebar: null },
  { nombre: 'Pizarra',   primario: '#0f172a', secundario: '#334155', acento: '#38bdf8', sidebar: null },
  { nombre: 'Coral',     primario: '#7f1d1d', secundario: '#b91c1c', acento: '#fbbf24', sidebar: '#b91c1c' },
  { nombre: 'Teal',      primario: '#134e4a', secundario: '#0d9488', acento: '#f59e0b', sidebar: '#0d9488' },
  { nombre: 'Índigo',    primario: '#1e1b4b', secundario: '#4338ca', acento: '#f59e0b', sidebar: null },
  { nombre: 'Neutral',   primario: '#1c1917', secundario: '#57534e', acento: '#0ea5e9', sidebar: null },
]

const RADIO_BORDES_OPTS = [
  { valor: 'cuadrado',   label: 'Cuadrado',   preview: '2px' },
  { valor: 'moderado',   label: 'Moderado',   preview: '6px' },
  { valor: 'redondeado', label: 'Redondeado', preview: '12px' },
  { valor: 'pill',       label: 'Pill',       preview: '9999px' },
]

type FormState = Omit<
  ConfiguracionInstitucional,
  'id' | 'logo_principal' | 'logo_secundario' | 'login_imagen_fondo' |
  'url_logo_principal' | 'url_logo_secundario' | 'url_login_imagen_fondo' | 'logo_base64'
> & {
  color_acento: string
  color_sidebar: string | null
  radio_bordes: 'cuadrado' | 'moderado' | 'redondeado' | 'pill'
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  const hexDisplay = value ?? '#000000'
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer shrink-0">
          <span className="block w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: isValidHex(hexDisplay) ? hexDisplay : '#cccccc' }} />
          <input type="color" value={isValidHex(hexDisplay) ? hexDisplay : '#000000'}
            onChange={e => onChange(e.target.value)} className="sr-only" />
        </label>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-[#1a3a5c]/20 focus-within:border-[#1a3a5c] transition bg-white">
            <span className="text-slate-400 text-sm font-mono select-none">#</span>
            <input type="text" value={hexDisplay.replace(/^#/, '')}
              onChange={e => onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
              maxLength={6} placeholder="1a3a5c"
              className="flex-1 text-sm font-mono text-slate-800 uppercase tracking-widest bg-transparent outline-none placeholder-slate-300" />
            {!isValidHex(hexDisplay) && <span className="text-[10px] text-rose-500 font-medium shrink-0">inválido</span>}
          </div>
        </div>
      </div>
      {isValidHex(hexDisplay) && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {[hexDisplay, hexDisplay + 'cc', hexDisplay + '33'].map((c, i) => (
              <span key={i} className="block w-5 h-5 rounded" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">100% · 80% · 20% opacidad</span>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, type = 'text', placeholder, onChange, hint }: {
  label: string; value: string; type?: string; placeholder?: string; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition" />
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function ImageUploader({ label, url, tipo, onUploaded, onDeleted, accept = '.svg,.png,.jpg,.jpeg,.webp', hint }: {
  label: string; url: string | null; tipo: 'principal' | 'secundario' | 'fondo'
  onUploaded: () => void; onDeleted: () => void; accept?: string; hint?: string
}) {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast: addToast } = useToastStore()

  const handleFile = async (file: File) => {
    setLoading(true)
    try { await configuracionApi.subirLogo(file, tipo); onUploaded(); addToast('Imagen actualizada.', 'success') }
    catch { addToast('Error al subir la imagen.', 'error') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await configuracionApi.eliminarLogo(tipo); onDeleted(); addToast('Imagen eliminada.', 'success') }
    catch { addToast('Error al eliminar la imagen.', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors"
        onClick={() => !loading && inputRef.current?.click()}>
        {url
          ? <img src={url} alt={label} className="h-20 object-contain rounded" />
          : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 12V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v12a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 18v-6Z" />
              </svg>
            </div>
        }
        <p className="text-xs text-slate-400 text-center">{loading ? 'Subiendo…' : 'Haz clic para seleccionar'}</p>
        {hint && <p className="text-[11px] text-slate-400 text-center">{hint}</p>}
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      </div>
      {url && (
        <button type="button" onClick={e => { e.stopPropagation(); handleDelete() }}
          disabled={loading} className="text-xs text-red-500 hover:text-red-700 transition-colors">
          Eliminar imagen
        </button>
      )}
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'institucion', label: 'Institución' },
  { id: 'identidad',   label: 'Identidad visual' },
  { id: 'login',       label: 'Pantalla de inicio' },
  { id: 'interfaz',    label: 'Interfaz' },
  { id: 'sistema',     label: 'Sistema' },
]

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const [tabActiva, setTabActiva] = useState<TabId>('institucion')
  const [form, setForm] = useState<FormState | null>(null)
  const [guardando, setGuardando] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get,
    retry: 1,
  })

  useEffect(() => {
    if (data) {
      const { id, logo_principal, logo_secundario, login_imagen_fondo,
        url_logo_principal, url_logo_secundario, url_login_imagen_fondo, logo_base64, ...rest } = data as any
      const toDate = (s: string | null | undefined) => s ? s.slice(0, 10) : ''
      setForm({
        ...rest,
        login_opacidad_fondo: rest.login_opacidad_fondo ?? 0.70,
        fecha_inicio_actualizacion_datos: toDate(rest.fecha_inicio_actualizacion_datos),
        fecha_fin_actualizacion_datos:    toDate(rest.fecha_fin_actualizacion_datos),
        color_acento:  rest.color_acento  ?? '#f59e0b',
        color_sidebar: rest.color_sidebar ?? null,
        radio_bordes:  rest.radio_bordes  ?? 'redondeado',
      })
    }
  }, [data])

  const set = (field: keyof FormState, value: string | number | null) =>
    setForm(f => f ? { ...f, [field]: value } : f)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setGuardando(true)
    try {
      await configuracionApi.update(form)
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      addToast('Configuración guardada.', 'success')
    } catch {
      addToast('Error al guardar la configuración.', 'error')
    } finally { setGuardando(false) }
  }

  const invalidarConfig = () => qc.invalidateQueries({ queryKey: ['configuracion'] })

  if (isLoading || !form) return <div className="p-6 text-sm text-slate-400">Cargando configuración…</div>
  if (isError) return <div className="p-6 text-sm text-red-500">Error al cargar la configuración.</div>

  const tabsVisibles = esSuperadmin ? TABS : TABS.filter(t => t.id !== 'sistema')
  const opacidad = form.login_opacidad_fondo ?? 0.70

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Configuración institucional</h1>
        <p className="text-sm text-slate-500 mt-0.5">Personaliza la institución, identidad visual y comportamiento del sistema.</p>
      </div>

      {/* Tabs nav */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {tabsVisibles.map(tab => (
            <button key={tab.id} type="button" onClick={() => setTabActiva(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tabActiva === tab.id
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Tab: Institución ── */}
        {tabActiva === 'institucion' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Datos generales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Nombre oficial de la institución" value={form.nombre_institucion}
                    onChange={v => set('nombre_institucion', v)} placeholder="Instituto Tecnológico Superior de…" />
                </div>
                <Field label="Nombre corto / siglas" value={form.nombre_corto}
                  onChange={v => set('nombre_corto', v)} placeholder="ITSMT" />
                <Field label="Clave TecNM" value={form.clave_tecnm ?? ''}
                  onChange={v => set('clave_tecnm', v)} placeholder="30MSU0037C" />
                <div className="sm:col-span-2">
                  <Field label="Dependencia / red" value={form.dependencia ?? ''}
                    onChange={v => set('dependencia', v)} placeholder="Tecnológico Nacional de México" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Subdirección / departamento (encabezados PDF)" value={form.subsistema ?? ''}
                    onChange={v => set('subsistema', v)}
                    placeholder="Subdirección Académica · Departamento de Servicios Escolares" />
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Ubicación y contacto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Dirección" value={form.direccion ?? ''}
                    onChange={v => set('direccion', v)} placeholder="Av. Instituto Tecnológico s/n" />
                </div>
                <Field label="Ciudad" value={form.ciudad ?? ''} onChange={v => set('ciudad', v)} placeholder="Martínez de la Torre" />
                <Field label="Estado" value={form.estado ?? ''} onChange={v => set('estado', v)} placeholder="Veracruz" />
                <Field label="Código postal" value={form.cp ?? ''} onChange={v => set('cp', v)} placeholder="93600" />
                <Field label="Teléfono" value={form.telefono ?? ''} onChange={v => set('telefono', v)} placeholder="232 324 0000" />
                <Field label="Correo institucional" value={form.email_institucional ?? ''}
                  onChange={v => set('email_institucional', v)} type="email" placeholder="contacto@itsmt.edu.mx" />
                <Field label="Sitio web" value={form.sitio_web ?? ''}
                  onChange={v => set('sitio_web', v)} type="url" placeholder="https://www.itsmt.edu.mx" />
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Firmantes en documentos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Subdirector(a) Académico(a)" value={form.subdirector_academico ?? ''}
                  onChange={v => set('subdirector_academico', v)} placeholder="Nombre completo" />
                <Field label="Responsable de Servicios Escolares" value={form.responsable_servicios_escolares ?? ''}
                  onChange={v => set('responsable_servicios_escolares', v)} placeholder="Nombre completo" />
              </div>
              <p className="text-xs text-slate-400">Aparecen en la Lista de Aspirantes Aceptados y otros documentos oficiales.</p>
            </section>
          </div>
        )}

        {/* ── Tab: Identidad visual ── */}
        {tabActiva === 'identidad' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Logotipos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ImageUploader label="Logo principal (institución)" url={data?.url_logo_principal ?? null}
                  tipo="principal" onUploaded={invalidarConfig} onDeleted={invalidarConfig}
                  hint="SVG, PNG, JPG — máx 4 MB" />
                <ImageUploader label="Logo secundario (ej. TecNM)" url={data?.url_logo_secundario ?? null}
                  tipo="secundario" onUploaded={invalidarConfig} onDeleted={invalidarConfig}
                  hint="SVG, PNG, JPG — máx 4 MB" />
              </div>
            </section>

            {/* Paletas predefinidas */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Paletas predefinidas</h2>
                <p className="text-xs text-slate-400 mt-0.5">Aplica un conjunto de colores con un clic. Luego puedes ajustar cada color individualmente.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PALETAS.map(p => {
                  const activa =
                    form.color_primario === p.primario &&
                    form.color_secundario === p.secundario &&
                    form.color_acento === p.acento
                  return (
                    <button key={p.nombre} type="button"
                      onClick={() => setForm(f => f ? {
                        ...f,
                        color_primario:   p.primario,
                        color_secundario: p.secundario,
                        color_acento:     p.acento,
                        color_sidebar:    p.sidebar,
                      } : f)}
                      className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                        activa ? 'border-[var(--color-primario)] shadow-md' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <div className="flex gap-1 mb-2">
                        <span className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.primario }} />
                        <span className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.secundario }} />
                        <span className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.acento }} />
                      </div>
                      <p className="text-xs font-medium text-slate-700">{p.nombre}</p>
                      {activa && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: p.primario }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-5.121-5.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Colores individuales */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Colores del sistema</h2>
                <p className="text-xs text-slate-400 mt-0.5">Se aplican al panel de control, vistas de usuarios y documentos PDF.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ColorField label="Color primario" value={form.color_primario} onChange={v => set('color_primario', v)} />
                <ColorField label="Color secundario" value={form.color_secundario} onChange={v => set('color_secundario', v)} />
                <ColorField label="Color de acento" value={form.color_acento} onChange={v => set('color_acento', v)} />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-600">Color del sidebar</label>
                    <button type="button" onClick={() => set('color_sidebar', '')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                      Usar color primario
                    </button>
                  </div>
                  <ColorField label="" value={form.color_sidebar ?? form.color_primario}
                    onChange={v => set('color_sidebar', v)} />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {!form.color_sidebar ? 'Usando el color primario como base.' : 'Color independiente activo.'}
                  </p>
                </div>
              </div>

              {/* Vista previa mini de colores */}
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1">Vista previa</p>
                <div className="flex divide-x divide-white/20">
                  <div className="flex-1 p-3" style={{ backgroundColor: form.color_primario }}>
                    <p className="text-[9px] font-mono text-white/60 mb-1">Primario</p>
                    <p className="text-xs font-bold text-white">{form.color_primario}</p>
                  </div>
                  <div className="flex-1 p-3" style={{ backgroundColor: form.color_secundario }}>
                    <p className="text-[9px] font-mono text-white/60 mb-1">Secundario</p>
                    <p className="text-xs font-bold text-white">{form.color_secundario}</p>
                  </div>
                  <div className="flex-1 p-3" style={{ backgroundColor: form.color_acento }}>
                    <p className="text-[9px] font-mono text-white/60 mb-1">Acento</p>
                    <p className="text-xs font-bold text-white">{form.color_acento}</p>
                  </div>
                  <div className="flex-1 p-3" style={{ backgroundColor: form.color_sidebar ?? form.color_primario }}>
                    <p className="text-[9px] font-mono text-white/60 mb-1">Sidebar</p>
                    <p className="text-xs font-bold text-white">{form.color_sidebar ?? '(primario)'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Estilo de bordes */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Estilo de bordes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Afecta botones, tarjetas, campos de texto y otros elementos de la interfaz.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RADIO_BORDES_OPTS.map(opt => {
                  const selected = (form.radio_bordes ?? 'redondeado') === opt.valor
                  return (
                    <button key={opt.valor} type="button"
                      onClick={() => set('radio_bordes', opt.valor)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selected ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/5' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <div className="w-10 h-6 border-2 border-slate-400 bg-slate-100"
                        style={{ borderRadius: opt.preview }} />
                      <p className="text-xs font-medium text-slate-700">{opt.label}</p>
                      {selected && (
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-primario)' }}>Activo</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Pantalla de inicio ── */}
        {tabActiva === 'login' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Textos de bienvenida</h2>
                <p className="text-xs text-slate-400 mt-0.5">Aparecen en el panel izquierdo de la pantalla de inicio de sesión.</p>
              </div>
              <Field label="Título principal" value={form.login_titulo ?? ''}
                onChange={v => set('login_titulo', v)}
                placeholder="Sistema Integral de Control Escolar"
                hint="Si se deja vacío se usa el valor por defecto." />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subtítulo / mensaje de bienvenida</label>
                <textarea value={form.login_subtitulo ?? ''}
                  onChange={e => set('login_subtitulo', e.target.value)}
                  placeholder="Bienvenido al sistema de gestión escolar…" rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition resize-none" />
                <p className="text-[11px] text-slate-400 mt-1">Si se deja vacío se muestra el nombre de la institución.</p>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Imagen de fondo</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aparece detrás del panel izquierdo. La capa de color primario se superpone con la opacidad configurada.
                </p>
              </div>

              <ImageUploader label="Imagen de fondo (panel izquierdo)" url={data?.url_login_imagen_fondo ?? null}
                tipo="fondo" onUploaded={invalidarConfig} onDeleted={invalidarConfig}
                accept=".jpg,.jpeg,.png,.webp"
                hint="JPG, PNG, WebP — máx 4 MB · Recomendado: 800×1200 px" />

              {/* Slider opacidad */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">
                    Opacidad de la capa de color sobre la imagen
                  </label>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-primario)' }}>
                    {Math.round(opacidad * 100)}%
                  </span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={opacidad}
                  onChange={e => set('login_opacidad_fondo', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-primario)]" />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% — imagen completamente visible</span>
                  <span>100% — solo color institucional</span>
                </div>
              </div>

              {/* Vista previa mini */}
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Vista previa</p>
                <div className="relative h-40 rounded-xl overflow-hidden bg-cover bg-center shadow-sm"
                  style={{
                    backgroundColor: form.color_primario ?? '#1a3a5c',
                    backgroundImage: data?.url_login_imagen_fondo ? `url(${data.url_login_imagen_fondo})` : undefined,
                  }}>
                  {/* Capa de color con opacidad controlada */}
                  <div className="absolute inset-0"
                    style={{ backgroundColor: form.color_primario ?? '#1a3a5c', opacity: opacidad }} />
                  <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      {data?.url_logo_principal
                        ? <img src={data.url_logo_principal} alt="" className="h-7 w-7 object-contain" />
                        : <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center text-[9px] font-bold text-white">
                            {(form.nombre_corto ?? 'IT').slice(0, 2)}
                          </div>
                      }
                      <span className="text-white text-xs font-semibold">{form.nombre_corto || 'ITSMT'}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-snug">
                        {form.login_titulo || 'Sistema Integral de Control Escolar'}
                      </p>
                      <p className="text-white/70 text-[10px] mt-1 line-clamp-2">
                        {form.login_subtitulo || form.nombre_institucion || 'Instituto Tecnológico Superior'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Interfaz ── */}
        {tabActiva === 'interfaz' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Tipografía de la interfaz</h2>
                <p className="text-xs text-slate-400 mt-0.5">Solo afecta la interfaz del sistema. Los documentos PDF conservan siempre su tipografía oficial.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FONT_OPTIONS.map(font => {
                  loadGoogleFont(font.name)
                  const selected = (form.fuente_interfaz ?? DEFAULT_FONT) === font.name
                  return (
                    <button key={font.name} type="button" onClick={() => set('fuente_interfaz', font.name)}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                        selected
                          ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      <p className="text-base font-semibold text-slate-800 leading-tight"
                        style={{ fontFamily: `"${font.name}", sans-serif` }}>{font.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug"
                        style={{ fontFamily: `"${font.name}", sans-serif` }}>{font.sample}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-sans">{font.category}</p>
                      {selected && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-[var(--color-primario)]">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-5.121-5.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Activa
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                style={{ fontFamily: `"${form.fuente_interfaz ?? DEFAULT_FONT}", sans-serif` }}>
                <p className="text-[10px] font-sans text-slate-400 mb-2 uppercase tracking-wide">Vista previa</p>
                <p className="text-lg font-semibold text-slate-800">Instituto Tecnológico Superior</p>
                <p className="text-sm text-slate-600 mt-1">Control Escolar · Módulo de Admisión</p>
                <p className="text-xs text-slate-400 mt-2">El texto usa los pesos 400 · 500 · 600 · 700 de esta tipografía.</p>
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Sistema (solo superadmin) ── */}
        {tabActiva === 'sistema' && esSuperadmin && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Período de actualización de datos del estudiante
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 uppercase tracking-wide">
                    Superadmin
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Define el rango de fechas en que los alumnos pueden editar su encuesta socioeconómica.
                  Fuera de este período el formulario se muestra en sólo lectura.
                  Deja ambas fechas vacías para mantenerlo siempre abierto.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de inicio</label>
                  <input type="date" value={form.fecha_inicio_actualizacion_datos ?? ''}
                    onChange={e => set('fecha_inicio_actualizacion_datos', e.target.value || '')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de cierre</label>
                  <input type="date" value={form.fecha_fin_actualizacion_datos ?? ''}
                    onChange={e => set('fecha_fin_actualizacion_datos', e.target.value || '')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition" />
                </div>
              </div>
              {(() => {
                const hoy = new Date().toISOString().slice(0, 10)
                const inicio = form.fecha_inicio_actualizacion_datos
                const fin = form.fecha_fin_actualizacion_datos
                if (!inicio && !fin) return (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    Sin restricción de fechas — el formulario está siempre abierto para los alumnos.
                  </p>
                )
                const abierto = (!inicio || hoy >= inicio) && (!fin || hoy <= fin)
                return abierto ? (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    El período está <strong>abierto</strong> ahora mismo.
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    El período está <strong>cerrado</strong>. Los alumnos verán el formulario en sólo lectura.
                  </p>
                )
              })()}
            </section>
          </div>
        )}

        <div className="flex justify-end mt-6 pb-4">
          <button type="submit" disabled={guardando}
            className="disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-primario)' }}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
