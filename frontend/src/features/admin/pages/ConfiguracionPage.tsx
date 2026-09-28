import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { configuracionApi, type ConfiguracionInstitucional } from '../services/configuracion'
import { useToastStore } from '../../../store/toastStore'
import { FONT_OPTIONS, loadGoogleFont, DEFAULT_FONT } from '../../../config/fonts'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'

type FormState = Partial<ConfiguracionInstitucional>

// Debe coincidir con la regla 'max:10240' de ConfiguracionController::subirLogo.
const MAX_IMAGEN_MB = 10

type TabId = 'institucion' | 'identidad' | 'login' | 'interfaz' | 'formularios' | 'firmantes' | 'sistema'

// ── Tab Firmantes (lee del Directorio) ────────────────────────────────────────

interface PersonaFirmante {
  id: string; nombre: string; cargo: string; clave_firma: string | null
  activo: boolean; orden: number
  directorio_area: { nombre: string } | null
}

const CLAVES_SISTEMA = [
  { clave: 'director_general',         label: 'Director(a) General' },
  { clave: 'subdirector_academico',    label: 'Subdirector(a) Académico(a)' },
  { clave: 'jefe_servicios_escolares', label: 'Jefe(a) de Servicios Escolares' },
  { clave: 'elaboro',                  label: 'Elaboró' },
  { clave: 'autorizo',                 label: 'Autorizó' },
]

function FirmantesTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const { data: directorio = [], isLoading } = useQuery<PersonaFirmante[]>({
    queryKey: ['directorio'],
    queryFn: () => apiClient.get('/admin/directorio').then(r => r.data.data),
  })

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [claveEdit, setClaveEdit] = useState('')
  const [saving, setSaving] = useState(false)

  const guardarClave = async (id: string) => {
    setSaving(true)
    try {
      await apiClient.patch(`/admin/directorio/${id}`, { clave_firma: claveEdit || null })
      qc.invalidateQueries({ queryKey: ['directorio'] })
      setEditandoId(null)
      addToast('Clave actualizada.', 'success')
    } catch {
      addToast('Error al guardar.', 'error')
    } finally { setSaving(false) }
  }

  if (isLoading) return <div className="text-sm text-slate-400 py-4">Cargando…</div>

  const sinClave = directorio.filter(p => !p.clave_firma)
  const conClave = directorio.filter(p => !!p.clave_firma)

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Firmantes en documentos PDF</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Las personas del Directorio con "Firma documentos" activado pueden aparecer en los PDF.
            Asigna aquí su rol (clave) para que el sistema sepa qué nombre imprimir en cada espacio.
          </p>
        </div>

        {conClave.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
            Ninguna persona del Directorio tiene asignada una clave de firma aún.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conClave.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800">{p.nombre}</span>
                    {!p.activo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">Inactivo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500">{p.cargo}</span>
                    {p.directorio_area && <span className="text-[10px] text-slate-400">{p.directorio_area.nombre}</span>}
                    {editandoId === p.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={claveEdit}
                          onChange={e => setClaveEdit(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        >
                          <option value="">— Sin clave —</option>
                          {CLAVES_SISTEMA.map(c => (
                            <option key={c.clave} value={c.clave}>{c.clave} — {c.label}</option>
                          ))}
                        </select>
                        <button onClick={() => guardarClave(p.id)} disabled={saving}
                          className="text-xs px-3 py-1 rounded-lg text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-primario)' }}>
                          {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditandoId(null)}
                          className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                        {p.clave_firma}
                      </span>
                    )}
                  </div>
                </div>
                {editandoId !== p.id && (
                  <button onClick={() => { setEditandoId(p.id); setClaveEdit(p.clave_firma ?? '') }}
                    className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition shrink-0">
                    Cambiar clave
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {sinClave.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 list-none flex items-center gap-1">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {sinClave.length} personas del directorio sin clave de firma asignada
            </summary>
            <div className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {sinClave.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.cargo}</p>
                  </div>
                  <button onClick={() => { setEditandoId(p.id); setClaveEdit('') }}
                    className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition shrink-0">
                    Asignar clave
                  </button>
                  {editandoId === p.id && (
                    <div className="flex items-center gap-2">
                      <select
                        value={claveEdit}
                        onChange={e => setClaveEdit(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      >
                        <option value="">— Selecciona —</option>
                        {CLAVES_SISTEMA.map(c => (
                          <option key={c.clave} value={c.clave}>{c.clave} — {c.label}</option>
                        ))}
                      </select>
                      <button onClick={() => guardarClave(p.id)} disabled={saving || !claveEdit}
                        className="text-xs px-3 py-1 rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-primario)' }}>
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditandoId(null)}
                        className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-600 font-medium mb-1">Claves reconocidas por el sistema</p>
          <ul className="text-xs text-slate-500 space-y-0.5">
            {CLAVES_SISTEMA.map(c => (
              <li key={c.clave}><span className="font-mono text-slate-700">{c.clave}</span> — {c.label}</li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400 mt-2">
            Para agregar o editar personas del directorio, ve a <strong>Directorio</strong> en el menú lateral.
          </p>
        </div>
      </section>
    </div>
  )
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  const hexDisplay = value ?? '#000000'
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer shrink-0">
          <span className="block w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: isValidHex(hexDisplay) ? hexDisplay : '#cccccc' }} />
          <input type="color" value={isValidHex(hexDisplay) ? hexDisplay : '#000000'}
            onChange={e => onChange(e.target.value)} className="sr-only" />
        </label>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-brand-600/20 focus-within:border-brand-600 transition bg-white">
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
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition" />
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function ImageUploader({ label, url, tipo, onUploaded, onDeleted, accept = '.svg,.png,.jpg,.jpeg,.webp', hint }: {
  label: string; url: string | null; tipo: 'principal' | 'secundario' | 'fondo'
  onUploaded: () => void; onDeleted: () => void; accept?: string; hint?: string
}) {
  const [loading, setLoading] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast: addToast } = useToastStore()

  const extensiones = accept.split(',').map(e => e.trim().replace('.', '').toLowerCase())

  const handleFile = async (file: File) => {
    // Validación local: evita el viaje al servidor para errores obvios.
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!extensiones.includes(ext)) {
      addToast(`Formato no permitido. Usa: ${extensiones.join(', ').toUpperCase()}.`, 'error')
      return
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      addToast(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGEN_MB} MB.`, 'error')
      return
    }
    setLoading(true)
    try {
      await configuracionApi.subirLogo(file, tipo)
      onUploaded()
      addToast('Imagen actualizada.', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.logo?.[0]
        || err?.response?.data?.errors?.tipo?.[0]
        || err?.response?.data?.message
        || 'Error al subir la imagen.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${label}"? Dejará de aparecer en el sistema y en los documentos PDF.`)) return
    setLoading(true)
    try {
      await configuracionApi.eliminarLogo(tipo)
      onDeleted()
      addToast('Imagen eliminada.', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al eliminar la imagen.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const abrirSelector = () => { if (!loading) inputRef.current?.click() }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div
        role="button" tabIndex={0} aria-label={`${url ? 'Reemplazar' : 'Subir'} ${label}`} aria-busy={loading}
        onClick={abrirSelector}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirSelector() } }}
        onDragOver={e => { e.preventDefault(); if (!loading) setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={e => {
          e.preventDefault(); setArrastrando(false)
          const f = e.dataTransfer.files?.[0]
          if (f && !loading) handleFile(f)
        }}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)]/40 ${
          arrastrando ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}>
        {url
          // Fondo de tablero: deja ver logos oscuros o con transparencia, que sobre gris se pierden.
          ? <div className="rounded-lg p-2 border border-slate-200"
              style={{ backgroundImage: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)', backgroundSize: '16px 16px' }}>
              <img src={url} alt={label} className="h-20 max-w-full object-contain" />
            </div>
          : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 12V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v12a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 18v-6Z" />
              </svg>
            </div>
        }
        <p className="text-xs text-slate-500 text-center">
          {arrastrando ? 'Suelta la imagen aquí'
            : url ? <>Haz clic o arrastra una imagen para <strong className="font-medium">reemplazarla</strong></>
            : <>Haz clic o arrastra una imagen aquí</>}
        </p>
        {hint && <p className="text-[11px] text-slate-400 text-center">{hint}</p>}
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-white/80 flex items-center justify-center gap-2 text-xs text-slate-600">
            <span className="w-4 h-4 border-2 border-slate-300 border-t-[var(--color-primario)] rounded-full animate-spin" />
            Procesando…
          </div>
        )}
      </div>
      {url && (
        <button type="button" onClick={handleDelete}
          disabled={loading} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
          Eliminar imagen
        </button>
      )}
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const PRESET_TEMAS = [
  {
    id: 'tecnm_oficial',
    nombre: 'TecNM Oficial',
    descripcion: 'Estilo clásico institucional del Tecnológico Nacional de México.',
    primario: '#1B396A',
    secundario: '#8B1D41',
    focusRing: '#1B396A',
    radius: 'lg',
    density: 'comfortable',
    bgStyle: 'white',
    borderTone: 'slate-200',
  },
  {
    id: 'tecnm_oro',
    nombre: 'TecNM Elegante Oro',
    descripcion: 'Detalles dorados en resaltados y enfoque institucional.',
    primario: '#1B396A',
    secundario: '#B38E5D',
    focusRing: '#B38E5D',
    radius: 'xl',
    density: 'comfortable',
    bgStyle: 'slate',
    borderTone: 'primary-tint',
  },
  {
    id: 'ejecutivo_slate',
    nombre: 'Azul Ejecutivo',
    descripcion: 'Contraste alto y densidad compacta para trabajo administrativo ágil.',
    primario: '#0F172A',
    secundario: '#2563EB',
    focusRing: '#2563EB',
    radius: 'md',
    density: 'compact',
    bgStyle: 'white',
    borderTone: 'slate-300',
  },
  {
    id: 'esmeralda_institucional',
    nombre: 'Esmeralda Académico',
    descripcion: 'Tonalidad verde esmeralda y ámbar cálido de alto confort visual.',
    primario: '#064E3B',
    secundario: '#D97706',
    focusRing: '#059669',
    radius: 'lg',
    density: 'comfortable',
    bgStyle: 'tint',
    borderTone: 'primary-tint',
  },
  {
    id: 'borgona_real',
    nombre: 'Borgoña Distinción',
    descripcion: 'Tonalidades púrpura vino y bordes fluidos redondeados.',
    primario: '#581C87',
    secundario: '#DB2777',
    focusRing: '#9333EA',
    radius: 'xl',
    density: 'spacious',
    bgStyle: 'white',
    borderTone: 'slate-200',
  },
  {
    id: 'noche_moderno',
    nombre: 'Noche Profunda / Neón',
    descripcion: 'Estilo oscuro con acentos ámbar neón de máxima legibilidad.',
    primario: '#18181B',
    secundario: '#F59E0B',
    focusRing: '#F59E0B',
    radius: 'full',
    density: 'comfortable',
    bgStyle: 'slate',
    borderTone: 'dark',
  },
]

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; superadminOnly?: boolean }[] = [
  { id: 'institucion',  label: 'Institución' },
  { id: 'identidad',    label: 'Identidad visual' },
  { id: 'login',        label: 'Pantalla de inicio' },
  { id: 'interfaz',     label: 'Interfaz' },
  { id: 'formularios', label: 'Formularios & Tonalidades', superadminOnly: true },
  { id: 'firmantes',    label: 'Firmantes' },
  { id: 'sistema',      label: 'Sistema', superadminOnly: true },
]

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const [searchParams, setSearchParams] = useSearchParams()
  const tabActiva = (TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'institucion') as TabId
  const setTabActiva = (id: TabId) => setSearchParams(p => { p.set('tab', id); return p }, { replace: true })
  const [form, setForm] = useState<FormState | null>(null)
  const [original, setOriginal] = useState<FormState | null>(null)
  const [guardando, setGuardando] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get,
    retry: 1,
  })

  const mutRecordatorios = useMutation({
    mutationFn: (activo: boolean) => configuracionApi.toggleRecordatoriosAsistencia(activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      addToast('Preferencia de recordatorios actualizada.', 'success')
    },
    onError: () => addToast('No se pudo actualizar la preferencia.', 'error'),
  })

  useEffect(() => {
    if (data) {
      const { id, logo_principal, logo_secundario, login_imagen_fondo,
        url_logo_principal, url_logo_secundario, url_login_imagen_fondo, logo_base64, ...rest } = data
      const toDate = (s: string | null | undefined) => s ? s.slice(0, 10) : ''
      const inicial: FormState = {
        ...rest,
        login_opacidad_fondo: rest.login_opacidad_fondo ?? 0.70,
        fecha_inicio_actualizacion_datos: toDate(rest.fecha_inicio_actualizacion_datos),
        fecha_fin_actualizacion_datos:    toDate(rest.fecha_fin_actualizacion_datos),
      }
      setForm(inicial)
      setOriginal(inicial)
    }
  }, [data])

  const set = (field: keyof FormState, value: string | number) =>
    setForm(f => f ? { ...f, [field]: value } : f)

  // Campos que difieren de lo guardado; alimenta el aviso de "cambios sin guardar".
  const camposModificados = useMemo(() => {
    if (!form || !original) return 0
    return (Object.keys(form) as (keyof FormState)[])
      .filter(k => (form[k] ?? '') !== (original[k] ?? '')).length
  }, [form, original])
  const hayCambios = camposModificados > 0

  // Aviso del navegador al cerrar o recargar con cambios pendientes.
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  const descartarCambios = () => setForm(original)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setGuardando(true)
    try {
      await configuracionApi.update(form)
      setOriginal(form)
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      addToast('Configuración guardada.', 'success')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast(msg ? `No se guardó: ${msg}` : 'Error al guardar la configuración.', 'error')
    } finally { setGuardando(false) }
  }

  const invalidarConfig = () => qc.invalidateQueries({ queryKey: ['configuracion'] })

  if (isError) return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between gap-4">
        <span>No se pudo cargar la configuración.</span>
        <button type="button" onClick={() => qc.invalidateQueries({ queryKey: ['configuracion'] })}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100">
          Reintentar
        </button>
      </div>
    </div>
  )
  if (isLoading || !form) return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando configuración">
      <div className="h-6 w-64 bg-slate-200 rounded" />
      <div className="h-10 w-full bg-slate-100 rounded" />
      <div className="h-64 w-full bg-slate-100 rounded-xl" />
    </div>
  )

  const tabsVisibles = esSuperadmin ? TABS : TABS.filter(t => !t.superadminOnly)
  const opacidad = form.login_opacidad_fondo ?? 0.70

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Configuración institucional</h1>
        <p className="text-sm text-slate-500 mt-0.5">Personaliza la institución, identidad visual y comportamiento del sistema.</p>
      </div>

      {/* Tabs nav */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex gap-0 overflow-x-auto" role="tablist" aria-label="Secciones de configuración">
          {tabsVisibles.map(tab => (
            <button key={tab.id} type="button" onClick={() => setTabActiva(tab.id)}
              role="tab" aria-selected={tabActiva === tab.id}
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
                  <Field label="Nombre oficial de la institución" value={form.nombre_institucion ?? ''}
                    onChange={v => set('nombre_institucion', v)} placeholder="Instituto Tecnológico Superior de…" />
                </div>
                <Field label="Nombre corto / siglas" value={form.nombre_corto ?? ''}
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
                  hint={`SVG, PNG, JPG o WebP — máx ${MAX_IMAGEN_MB} MB · Para los PDF se recomienda PNG`} />
                <ImageUploader label="Logo secundario (ej. TecNM)" url={data?.url_logo_secundario ?? null}
                  tipo="secundario" onUploaded={invalidarConfig} onDeleted={invalidarConfig}
                  hint={`SVG, PNG, JPG o WebP — máx ${MAX_IMAGEN_MB} MB · Para los PDF se recomienda PNG`} />
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-slate-700">Colores del sistema</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Paletas oficiales TecNM:</span>
                  <button
                    type="button"
                    onClick={() => { set('color_primario', '#1B396A'); set('color_secundario', '#8B1D41') }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B1D41]" />
                    <span>Azul y Vino</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { set('color_primario', '#1B396A'); set('color_secundario', '#B38E5D') }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B38E5D]" />
                    <span>Azul y Oro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { set('color_primario', '#8B1D41'); set('color_secundario', '#B38E5D') }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B1D41]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B38E5D]" />
                    <span>Vino y Oro</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ColorField label="Color primario (Azul Marino TecNM)" value={form.color_primario ?? '#1B396A'} onChange={v => set('color_primario', v)} />
                <ColorField label="Color secundario (Vino / Oro TecNM)" value={form.color_secundario ?? '#8B1D41'} onChange={v => set('color_secundario', v)} />
              </div>
              <p className="text-xs text-slate-400">Se aplican al panel de control, vistas de usuarios y documentos PDF según el Manual de Identidad Gráfica del TecNM.</p>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition resize-none" />
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
                hint={`JPG, PNG o WebP — máx ${MAX_IMAGEN_MB} MB · Recomendado: 800×1200 px`} />

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
                    backgroundColor: form.color_primario ?? '#1b396a',
                    backgroundImage: data?.url_login_imagen_fondo ? `url(${data.url_login_imagen_fondo})` : undefined,
                  }}>
                  {/* Capa de color con opacidad controlada */}
                  <div className="absolute inset-0"
                    style={{ backgroundColor: form.color_primario ?? '#1b396a', opacity: opacidad }} />
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

        {/* ── Tab: Formularios & Tonalidades (solo superadmin) ── */}
        {tabActiva === 'formularios' && esSuperadmin && (
          <div className="space-y-6">
            {/* Header banner superadmin */}
            <div className="bg-gradient-to-r from-brand-600 to-[#2563eb] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                    Exclusivo Superusuario
                  </span>
                  <h2 className="text-lg font-bold tracking-tight">Personalización Visual de Formularios y Tonalidades</h2>
                </div>
                <p className="text-xs text-brand-100 mt-1 max-w-2xl leading-relaxed">
                  Controla la geometría, densidad, tonalidades y comportamiento visual de todos los formularios de la plataforma. 
                  Los cambios aplicados aquí se propagan en tiempo real a todas las vistas del sistema.
                </p>
              </div>
            </div>

            {/* Presets de Temas Visuales */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Paletas y Temas Predefinidos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Selecciona un tema institucional prémium o ajusta individualmente los controles abajo.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRESET_TEMAS.map(t => {
                  const esActivo = form.color_primario === t.primario && form.color_secundario === t.secundario
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        set('color_primario', t.primario)
                        set('color_secundario', t.secundario)
                        set('form_focus_ring_color', t.focusRing)
                        set('form_border_radius', t.radius)
                        set('form_density', t.density)
                        set('form_bg_style', t.bgStyle)
                        set('form_border_tone', t.borderTone)
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 relative overflow-hidden ${
                        esActivo
                          ? 'border-[var(--color-primario)] bg-slate-50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-bold text-slate-800">{t.nombre}</p>
                        {esActivo && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-600 text-white">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{t.descripcion}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          <span className="w-5 h-5 rounded-full border border-white shadow-xs inline-block" style={{ backgroundColor: t.primario }} />
                          <span className="w-5 h-5 rounded-full border border-white shadow-xs inline-block" style={{ backgroundColor: t.secundario }} />
                          <span className="w-5 h-5 rounded-full border border-white shadow-xs inline-block" style={{ backgroundColor: t.focusRing }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{t.radius} · {t.density}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Geometría y Aspecto Físico de Formularios */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-800">Geometría y Estilo de Campos de Formulario</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Radio de bordes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Curvatura / Radio de Bordes (Border Radius)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'sm', label: '2px', name: 'Recto' },
                      { id: 'md', label: '6px', name: 'Medio' },
                      { id: 'lg', label: '8px', name: 'Estándar' },
                      { id: 'xl', label: '12px', name: 'Fluido' },
                      { id: 'full', label: 'Pill', name: 'Cápsula' },
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => set('form_border_radius', r.id)}
                        className={`py-2 px-1 text-center text-xs rounded-lg font-medium transition ${
                          (form.form_border_radius ?? 'lg') === r.id
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div>{r.name}</div>
                        <div className="text-[10px] opacity-60 font-mono">{r.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Densidad y Padding */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Densidad de Espaciado (Form Padding & Size)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'compact', label: 'Compacto', sub: 'Tabla / Alta densidad' },
                      { id: 'comfortable', label: 'Cómodo', sub: 'Estándar equilibrado' },
                      { id: 'spacious', label: 'Espacioso', sub: 'Pantallas táctiles' },
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => set('form_density', d.id)}
                        className={`py-2 px-2 text-center text-xs rounded-lg transition ${
                          (form.form_density ?? 'comfortable') === d.id
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div>{d.label}</div>
                        <div className="text-[9px] opacity-60 truncate">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estilo de Fondo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Fondo de los Campos (Input Background)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'white', label: 'Blanco' },
                      { id: 'slate', label: 'Gris tenue' },
                      { id: 'glass', label: 'Cristal' },
                      { id: 'tint', label: 'Tono Primario' },
                    ].map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => set('form_bg_style', b.id)}
                        className={`py-2 px-1 text-center text-xs rounded-lg transition ${
                          (form.form_bg_style ?? 'white') === b.id
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color de Resplandor al Enfocar */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <ColorField
                    label="Resplandor de Enfoque (Focus Ring Color)"
                    value={form.form_focus_ring_color ?? form.color_primario ?? '#1b396a'}
                    onChange={v => set('form_focus_ring_color', v)}
                  />
                </div>

                {/* Tonalidad del Borde Inactivo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Tonalidad de Borde Inactivo
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'slate-200', label: 'Sutil' },
                      { id: 'slate-300', label: 'Definido' },
                      { id: 'primary-tint', label: 'Matizado' },
                      { id: 'dark', label: 'Alto contraste' },
                    ].map(bt => (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => set('form_border_tone', bt.id)}
                        className={`py-2 px-1 text-center text-xs rounded-lg transition ${
                          (form.form_border_tone ?? 'slate-200') === bt.id
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Peso de Etiquetas */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Peso Tipográfico de Etiquetas (Label Weight)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'normal', label: 'Normal' },
                      { id: 'medium', label: 'Medio' },
                      { id: 'semibold', label: 'Semibold' },
                      { id: 'bold', label: 'Negrita' },
                    ].map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => set('form_label_weight', w.id)}
                        className={`py-2 px-1 text-center text-xs rounded-lg transition ${
                          (form.form_label_weight ?? 'medium') === w.id
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </section>

            {/* Vista Previa Interactiva en Tiempo Real (Live Interactive Form Preview) */}
            <section className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-lg border border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Vista previa interactiva en tiempo real
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">Demostración Visual del Formulario</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Los cambios se aplican al instante</span>
              </div>

              <div className="bg-white text-slate-800 p-6 rounded-xl space-y-4 shadow-inner" style={{
                fontFamily: `"${form.fuente_interfaz ?? DEFAULT_FONT}", sans-serif`
              }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1.5 text-slate-700" style={{
                      fontWeight: form.form_label_weight === 'bold' ? 700 : form.form_label_weight === 'semibold' ? 600 : form.form_label_weight === 'normal' ? 400 : 500
                    }}>
                      Nombre Completo del Estudiante
                    </label>
                    <input
                      type="text"
                      defaultValue="Juan Pérez González"
                      className="w-full transition focus:outline-none"
                      style={{
                        borderRadius: form.form_border_radius === 'sm' ? '0.25rem' : form.form_border_radius === 'md' ? '0.375rem' : form.form_border_radius === 'xl' ? '0.75rem' : form.form_border_radius === 'full' ? '1.25rem' : '0.5rem',
                        padding: form.form_density === 'compact' ? '0.375rem 0.625rem' : form.form_density === 'spacious' ? '0.75rem 1rem' : '0.5rem 0.875rem',
                        fontSize: form.form_density === 'compact' ? '0.8125rem' : form.form_density === 'spacious' ? '0.9375rem' : '0.875rem',
                        backgroundColor: form.form_bg_style === 'slate' ? '#f8fafc' : form.form_bg_style === 'tint' ? 'rgba(27,57,106,0.04)' : '#ffffff',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: form.form_border_tone === 'slate-300' ? '#cbd5e1' : form.form_border_tone === 'primary-tint' ? 'rgba(27,57,106,0.3)' : form.form_border_tone === 'dark' ? '#475569' : '#e2e8f0'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1.5 text-slate-700" style={{
                      fontWeight: form.form_label_weight === 'bold' ? 700 : form.form_label_weight === 'semibold' ? 600 : form.form_label_weight === 'normal' ? 400 : 500
                    }}>
                      Carrera / Programa Educativo
                    </label>
                    <select
                      className="w-full transition focus:outline-none"
                      style={{
                        borderRadius: form.form_border_radius === 'sm' ? '0.25rem' : form.form_border_radius === 'md' ? '0.375rem' : form.form_border_radius === 'xl' ? '0.75rem' : form.form_border_radius === 'full' ? '1.25rem' : '0.5rem',
                        padding: form.form_density === 'compact' ? '0.375rem 0.625rem' : form.form_density === 'spacious' ? '0.75rem 1rem' : '0.5rem 0.875rem',
                        fontSize: form.form_density === 'compact' ? '0.8125rem' : form.form_density === 'spacious' ? '0.9375rem' : '0.875rem',
                        backgroundColor: form.form_bg_style === 'slate' ? '#f8fafc' : form.form_bg_style === 'tint' ? 'rgba(27,57,106,0.04)' : '#ffffff',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: form.form_border_tone === 'slate-300' ? '#cbd5e1' : form.form_border_tone === 'primary-tint' ? 'rgba(27,57,106,0.3)' : form.form_border_tone === 'dark' ? '#475569' : '#e2e8f0'
                      }}
                    >
                      <option>Ingeniería en Sistemas Computacionales</option>
                      <option>Ingeniería Industrial</option>
                      <option>Licenciatura en Administración</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5 text-slate-700" style={{
                    fontWeight: form.form_label_weight === 'bold' ? 700 : form.form_label_weight === 'semibold' ? 600 : form.form_label_weight === 'normal' ? 400 : 500
                  }}>
                    Observaciones de la Solicitud
                  </label>
                  <textarea
                    rows={2}
                    defaultValue="Documentación verificada y completa. Candidato apto para reinscripción."
                    className="w-full transition focus:outline-none resize-none"
                    style={{
                      borderRadius: form.form_border_radius === 'sm' ? '0.25rem' : form.form_border_radius === 'md' ? '0.375rem' : form.form_border_radius === 'xl' ? '0.75rem' : form.form_border_radius === 'full' ? '1.25rem' : '0.5rem',
                      padding: form.form_density === 'compact' ? '0.375rem 0.625rem' : form.form_density === 'spacious' ? '0.75rem 1rem' : '0.5rem 0.875rem',
                      fontSize: form.form_density === 'compact' ? '0.8125rem' : form.form_density === 'spacious' ? '0.9375rem' : '0.875rem',
                      backgroundColor: form.form_bg_style === 'slate' ? '#f8fafc' : form.form_bg_style === 'tint' ? 'rgba(27,57,106,0.04)' : '#ffffff',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: form.form_border_tone === 'slate-300' ? '#cbd5e1' : form.form_border_tone === 'primary-tint' ? 'rgba(27,57,106,0.3)' : form.form_border_tone === 'dark' ? '#475569' : '#e2e8f0'
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded text-brand-600 focus:ring-0"
                      style={{ accentColor: form.form_focus_ring_color || form.color_primario }}
                    />
                    <span className="text-xs text-slate-600 font-medium">Acepto los términos de control escolar</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-xs"
                      style={{
                        backgroundColor: form.color_primario || '#1b396a',
                        borderRadius: form.form_border_radius === 'sm' ? '0.25rem' : form.form_border_radius === 'md' ? '0.375rem' : form.form_border_radius === 'xl' ? '0.75rem' : form.form_border_radius === 'full' ? '1.25rem' : '0.5rem',
                      }}
                    >
                      Guardar Solicitud
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Firmantes ── */}
        {tabActiva === 'firmantes' && <FirmantesTab />}

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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de cierre</label>
                  <input type="date" value={form.fecha_fin_actualizacion_datos ?? ''}
                    onChange={e => set('fecha_fin_actualizacion_datos', e.target.value || '')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition" />
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

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    Recordatorios de asistencia por correo
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 uppercase tracking-wide">
                      Superadmin
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    El sistema envía un correo al docente ~10 minutos antes de que inicie cada una de sus clases,
                    recordándole pasar lista. Este interruptor lo activa o desactiva para <strong>todos los docentes</strong>
                    — puedes hacer excepciones individuales desde la ficha de cada docente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => mutRecordatorios.mutate(!(data?.recordatorios_asistencia_global_activo ?? true))}
                  disabled={mutRecordatorios.isPending}
                  className={`shrink-0 relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                    (data?.recordatorios_asistencia_global_activo ?? true) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  role="switch" aria-checked={data?.recordatorios_asistencia_global_activo ?? true}
                  aria-label="Recordatorios de asistencia para todos los docentes"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      (data?.recordatorios_asistencia_global_activo ?? true) ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs">
                Estado actual:{' '}
                {(data?.recordatorios_asistencia_global_activo ?? true) ? (
                  <span className="text-emerald-700 font-medium">Activado para todos los docentes</span>
                ) : (
                  <span className="text-slate-500 font-medium">Desactivado para todos los docentes</span>
                )}
              </p>
            </section>
          </div>
        )}

        {/* Barra de guardado fija con estado de cambios. Los cambios de todas las pestañas se guardan juntos. */}
        {tabActiva !== 'firmantes' && (
          <div className={`sticky bottom-0 z-20 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 border-t backdrop-blur flex items-center justify-between gap-3 flex-wrap transition-colors ${
            hayCambios ? 'bg-amber-50/95 border-amber-200' : 'bg-white/90 border-slate-200'
          }`}>
            <p className="text-xs" aria-live="polite">
              {hayCambios
                ? <span className="text-amber-800 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2 align-middle" />
                    {camposModificados === 1 ? '1 cambio sin guardar' : `${camposModificados} cambios sin guardar`}
                  </span>
                : <span className="text-slate-400">Todos los cambios están guardados.</span>}
            </p>
            <div className="flex items-center gap-2">
              {hayCambios && (
                <button type="button" onClick={descartarCambios} disabled={guardando}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                  Descartar
                </button>
              )}
              <button type="submit" disabled={guardando || !hayCambios}
                className="disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primario)' }}>
                {guardando && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
