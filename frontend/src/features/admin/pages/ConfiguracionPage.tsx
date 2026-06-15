import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { configuracionApi, type ConfiguracionInstitucional } from '../services/configuracion'
import { useToastStore } from '../../../store/toastStore'
import { FONT_OPTIONS, loadGoogleFont, DEFAULT_FONT } from '../../../config/fonts'

type FormState = Omit<ConfiguracionInstitucional, 'id' | 'logo_principal' | 'logo_secundario' | 'url_logo_principal' | 'url_logo_secundario'>

// ── Componentes auxiliares fuera del componente padre para evitar re-montaje ──

function ColorField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  const hexDisplay = value ?? '#000000'

  const handleHexInput = (raw: string) => {
    const val = raw.startsWith('#') ? raw : `#${raw}`
    onChange(val)
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer shrink-0">
          <span
            className="block w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: isValidHex(hexDisplay) ? hexDisplay : '#cccccc' }}
          />
          <input
            type="color"
            value={isValidHex(hexDisplay) ? hexDisplay : '#000000'}
            onChange={e => onChange(e.target.value)}
            className="sr-only"
          />
        </label>

        <div className="flex-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-[#1a3a5c]/20 focus-within:border-[#1a3a5c] transition bg-white">
            <span className="text-slate-400 text-sm font-mono select-none">#</span>
            <input
              type="text"
              value={hexDisplay.replace(/^#/, '')}
              onChange={e => handleHexInput(e.target.value)}
              maxLength={6}
              placeholder="1a3a5c"
              className="flex-1 text-sm font-mono text-slate-800 uppercase tracking-widest bg-transparent outline-none placeholder-slate-300"
            />
            {!isValidHex(hexDisplay) && (
              <span className="text-[10px] text-rose-500 font-medium shrink-0">inválido</span>
            )}
          </div>
        </div>
      </div>

      {isValidHex(hexDisplay) && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {[hexDisplay, hexDisplay + 'cc', hexDisplay + '33'].map((c, i) => (
              <span key={i} className="block w-5 h-5 rounded" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">100% · 80% · 20% opacidad</span>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, type = 'text', placeholder, onChange }: {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition"
      />
    </div>
  )
}

function LogoUploader({
  label,
  url,
  tipo,
  onUploaded,
  onDeleted,
}: {
  label: string
  url: string | null
  tipo: 'principal' | 'secundario'
  onUploaded: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast: addToast } = useToastStore()

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      await configuracionApi.subirLogo(file, tipo)
      onUploaded()
      addToast('Logo actualizado.', 'success')
    } catch {
      addToast('Error al subir el logo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await configuracionApi.eliminarLogo(tipo)
      onDeleted()
      addToast('Logo eliminado.', 'success')
    } catch {
      addToast('Error al eliminar el logo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {url ? (
          <img src={url} alt={label} className="h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 12V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v12a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 18v-6Z" />
            </svg>
          </div>
        )}
        <p className="text-xs text-slate-400 text-center">
          {loading ? 'Subiendo…' : 'Haz clic para seleccionar (SVG, PNG, JPG — máx 2 MB)'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
        />
      </div>
      {url && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); handleDelete() }}
          disabled={loading}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Eliminar logo
        </button>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get,
    retry: 1,
  })

  const [form, setForm] = useState<FormState | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (data) {
      const { id, logo_principal, logo_secundario, url_logo_principal, url_logo_secundario, ...rest } = data as any
      setForm(rest)
    }
  }, [data])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(f => f ? { ...f, [field]: value } : f)
  }

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
    } finally {
      setGuardando(false)
    }
  }

  const invalidarConfig = () => qc.invalidateQueries({ queryKey: ['configuracion'] })

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando configuración…</div>
  }

  if (isError) {
    return <div className="p-6 text-sm text-red-500">Error al cargar la configuración. Verifica que el servidor esté activo.</div>
  }

  if (!form) {
    return <div className="p-6 text-sm text-slate-400">Cargando configuración…</div>
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Configuración institucional</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Información de la institución usada en documentos PDF, panel de control y vistas de usuarios.
        </p>
      </div>

      {/* Logotipos */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Logotipos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <LogoUploader
            label="Logo principal (institución)"
            url={data?.url_logo_principal ?? null}
            tipo="principal"
            onUploaded={invalidarConfig}
            onDeleted={invalidarConfig}
          />
          <LogoUploader
            label="Logo secundario (ej. TecNM)"
            url={data?.url_logo_secundario ?? null}
            tipo="secundario"
            onUploaded={invalidarConfig}
            onDeleted={invalidarConfig}
          />
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos generales */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Datos generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nombre oficial de la institución" value={form.nombre_institucion} onChange={v => handleChange('nombre_institucion', v)} placeholder="Instituto Tecnológico Superior de…" />
            </div>
            <Field label="Nombre corto / siglas" value={form.nombre_corto} onChange={v => handleChange('nombre_corto', v)} placeholder="ITSMT" />
            <Field label="Clave TecNM" value={form.clave_tecnm ?? ''} onChange={v => handleChange('clave_tecnm', v)} placeholder="30MSU0037C" />
            <div className="sm:col-span-2">
              <Field label="Dependencia / red" value={form.dependencia ?? ''} onChange={v => handleChange('dependencia', v)} placeholder="Tecnológico Nacional de México" />
            </div>
            <div className="sm:col-span-2">
              <Field label="Subdirección / departamento (para encabezados PDF)" value={form.subsistema ?? ''} onChange={v => handleChange('subsistema', v)} placeholder="Subdirección Académica · Departamento de Servicios Escolares · TecNM" />
            </div>
          </div>
        </section>

        {/* Ubicación y contacto */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Ubicación y contacto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Dirección" value={form.direccion ?? ''} onChange={v => handleChange('direccion', v)} placeholder="Av. Instituto Tecnológico s/n" />
            </div>
            <Field label="Ciudad" value={form.ciudad ?? ''} onChange={v => handleChange('ciudad', v)} placeholder="Martínez de la Torre" />
            <Field label="Estado" value={form.estado ?? ''} onChange={v => handleChange('estado', v)} placeholder="Veracruz" />
            <Field label="Código postal" value={form.cp ?? ''} onChange={v => handleChange('cp', v)} placeholder="93600" />
            <Field label="Teléfono" value={form.telefono ?? ''} onChange={v => handleChange('telefono', v)} placeholder="232 324 0000" />
            <Field label="Correo institucional" value={form.email_institucional ?? ''} onChange={v => handleChange('email_institucional', v)} type="email" placeholder="contacto@itsmt.edu.mx" />
            <Field label="Sitio web" value={form.sitio_web ?? ''} onChange={v => handleChange('sitio_web', v)} type="url" placeholder="https://www.itsmt.edu.mx" />
          </div>
        </section>

        {/* Tipografía de la interfaz */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Tipografía de la interfaz</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Solo afecta la interfaz del sistema. Los documentos PDF conservan siempre su tipografía oficial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FONT_OPTIONS.map(font => {
              loadGoogleFont(font.name)
              const selected = (form.fuente_interfaz ?? DEFAULT_FONT) === font.name
              return (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => handleChange('fuente_interfaz', font.name)}
                  className={`
                    text-left px-4 py-3 rounded-xl border-2 transition-all duration-150
                    ${selected
                      ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <p
                    className="text-base font-semibold text-slate-800 leading-tight"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    {font.label}
                  </p>
                  <p
                    className="text-xs text-slate-500 mt-1 leading-snug"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    {font.sample}
                  </p>
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

          {/* Vista previa en tiempo real */}
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            style={{ fontFamily: `"${form.fuente_interfaz ?? DEFAULT_FONT}", sans-serif` }}
          >
            <p className="text-[10px] font-sans text-slate-400 mb-2 uppercase tracking-wide">Vista previa</p>
            <p className="text-lg font-semibold text-slate-800">Instituto Tecnológico Superior</p>
            <p className="text-sm text-slate-600 mt-1">Control Escolar · Módulo de Admisión</p>
            <p className="text-xs text-slate-400 mt-2">
              El texto de la interfaz usa los pesos 400 · 500 · 600 · 700 de esta tipografía.
            </p>
          </div>
        </section>

        {/* Firmantes en documentos */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Firmantes en documentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Subdirector(a) Académico(a)" value={form.subdirector_academico ?? ''} onChange={v => handleChange('subdirector_academico', v)} placeholder="Nombre completo" />
            <Field label="Responsable de Servicios Escolares" value={form.responsable_servicios_escolares ?? ''} onChange={v => handleChange('responsable_servicios_escolares', v)} placeholder="Nombre completo" />
          </div>
          <p className="text-xs text-slate-400">Aparecen en la Lista de Aspirantes Aceptados (TecNM-AC-PO-001-01) y otros documentos oficiales.</p>
        </section>

        {/* Colores */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Colores del sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(['color_primario', 'color_secundario'] as const).map(campo => (
              <ColorField
                key={campo}
                label={campo === 'color_primario' ? 'Color primario' : 'Color secundario'}
                value={form[campo]}
                onChange={v => handleChange(campo, v)}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">Los colores se aplican al panel de control, vistas de usuarios y documentos PDF.</p>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
