import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import { usePeriodoActivo } from '../hooks/usePeriodoActivo'
import { useRegistrarAspirante } from '../hooks/useRegistrarAspirante'
import { validarCurp, validarEmail, validarTelefono, extraerErroresApi } from '../../../utils/validaciones'
import { catalogoPublico } from '../services/catalogo'

// ── CURP → datos derivados ────────────────────────────────────────────────────
const parsearCurp = (curp: string) => {
  if (curp.length !== 18) return null
  const yy = curp.substring(4, 6)
  const mm = curp.substring(6, 8)
  const dd = curp.substring(8, 10)
  const year = parseInt(yy) <= 30 ? `20${yy}` : `19${yy}`
  return {
    fechaNacimiento: `${year}-${mm}-${dd}`,
    sexo:            curp[10] === 'H' ? 'masculino' : 'femenino',
    claveCurpEstado: curp.substring(11, 13),
  }
}

// ── Componentes base ──────────────────────────────────────────────────────────
const CLS = (hasErr?: string) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
    hasErr ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]'
  }`

// ── SearchableSelect ──────────────────────────────────────────────────────────
// Combobox con búsqueda en tiempo real. Soporta agregar nueva entrada con onAdd.
// Usa `key` en el padre para forzar reset cuando cambia el contexto (p.e. nuevo estado).
interface SSOption { value: string; label: string }

function SearchableSelect({
  label, value, onChange, onAdd,
  options, placeholder = 'Busca o escribe…',
  error, allowCreate = false, createLabel = 'entrada', hint,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  onAdd?: (text: string) => void
  options: SSOption[]
  placeholder?: string
  error?: string
  allowCreate?: boolean
  createLabel?: string
  hint?: string
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Sincroniza label cuando el value cambia externamente
  useEffect(() => {
    const opt = options.find(o => o.value === value)
    setSearch(opt ? opt.label : '')
  }, [value, options])

  // Cierra al hacer click fuera; si dejó texto sin confirmar, limpia
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        // Si no hay valor seleccionado ni modo allowCreate, limpia el texto suelto
        if (!value && !allowCreate) setSearch('')
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [value, allowCreate])

  const lower      = search.toLowerCase()
  const filtered   = options.filter(o => o.label.toLowerCase().includes(lower))
  const exactMatch = options.some(o => o.label.toLowerCase() === lower)
  const showAdd    = allowCreate && search.trim() !== '' && !exactMatch
  const showList   = open && (filtered.length > 0 || showAdd)

  const select = (opt: SSOption) => {
    onChange(opt.value)
    setSearch(opt.label)
    setOpen(false)
  }

  const add = () => {
    const text = search.trim()
    onAdd?.(text)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setOpen(true)
          // Si borra todo, limpia el valor seleccionado
          if (!e.target.value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={CLS(error)}
      />
      {showList && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {filtered.length === 0 && !showAdd && (
            <li className="px-3 py-2 text-slate-400 italic">Sin resultados</li>
          )}
          {filtered.map(o => (
            <li key={o.value} onMouseDown={() => select(o)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                o.value === value
                  ? 'bg-[#1a3a5c]/10 text-[#1a3a5c] font-medium'
                  : 'hover:bg-slate-50 text-slate-800'
              }`}>
              {o.label}
            </li>
          ))}
          {showAdd && (
            <li onMouseDown={add}
              className="px-3 py-2 text-[#1a3a5c] font-medium cursor-pointer hover:bg-blue-50 border-t border-slate-100 flex items-center gap-1.5">
              <span className="text-base leading-none">+</span>
              Agregar {createLabel}: &ldquo;{search.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
      {hint  && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-slate-100 pb-1 mb-4">
      <h2 className="text-xs font-semibold tracking-wider text-[#1a3a5c] uppercase">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Field({ label, value, onChange, onBlur, type = 'text', required = false,
  placeholder, maxLength, error, readOnly }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void
  type?: string; required?: boolean; placeholder?: string; maxLength?: number
  error?: string; readOnly?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        required={required} placeholder={placeholder} maxLength={maxLength} readOnly={readOnly}
        className={CLS(error) + (readOnly ? ' bg-slate-50 text-slate-500' : '')} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, onBlur, options, required = false,
  disabled = false, placeholder = 'Selecciona…', error }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void
  options: { value: string; label: string }[]
  required?: boolean; disabled?: boolean; placeholder?: string; error?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        required={required} disabled={disabled}
        className={CLS(error) + ' bg-white disabled:bg-slate-50 disabled:text-slate-400'}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const DOCS = [
  { key: 'acta_nacimiento',          label: 'Acta de nacimiento (original)' },
  { key: 'curp',                     label: 'CURP (original)' },
  { key: 'certificado_bachillerato', label: 'Certificado de bachillerato (original)' },
  { key: 'fotografias',              label: 'Fotografías tamaño infantil (6)' },
  { key: 'comprobante_domicilio',    label: 'Comprobante de domicilio (máx. 3 meses)' },
  { key: 'identificacion',           label: 'Identificación oficial (INE / pasaporte)' },
  { key: 'nss',                      label: 'NSS — Número de Seguro Social (IMSS)' },
  { key: 'comprobante_pago',         label: 'Comprobante de pago de inscripción' },
]

// ── Página ────────────────────────────────────────────────────────────────────
export default function RegistroAspirantePage() {
  const { data: carreras = [], isLoading: cargandoCarreras } = useQuery({
    queryKey: ['carreras-publico'],
    queryFn: admisionApi.getCarrerasPublico,
    staleTime: 10 * 60 * 1000,
  })
  const { data: periodo,  isLoading: cargandoPeriodo }       = usePeriodoActivo()
  const { mutate, isPending, isSuccess, error, data: aspiranteRegistrado } = useRegistrarAspirante()

  // Catálogos
  const { data: estados = [] }  = useQuery({ queryKey: ['pub-estados'],  queryFn: catalogoPublico.getEstados })
  const { data: turnos  = [] }  = useQuery({ queryKey: ['pub-turnos'],   queryFn: catalogoPublico.getTurnos  })

  // Selección en cascada estado → municipio → escuela
  const [estadoId,    setEstadoId]    = useState<number | null>(null)
  const [municipioId, setMunicipioId] = useState<number | null>(null)

  // Claves para forzar reset de SearchableSelect al cambiar el nivel superior
  const [munResetKey, setMunResetKey] = useState(0)
  const [escResetKey, setEscResetKey] = useState(0)

  const { data: municipios = [] } = useQuery({
    queryKey: ['pub-municipios', estadoId],
    queryFn:  () => catalogoPublico.getMunicipios(estadoId ?? undefined),
    enabled:  estadoId !== null,
  })

  const { data: escuelas = [] } = useQuery({
    queryKey: ['pub-escuelas', municipioId, estadoId],
    queryFn:  () => catalogoPublico.getEscuelas(
      municipioId ? { municipio_id: municipioId }
      : estadoId  ? { estado_id:   estadoId    }
      : undefined
    ),
  })

  const queryClient = useQueryClient()

  // Form
  const [form, setForm] = useState({
    nombres: '', apellido_paterno: '', apellido_materno: '',
    curp: '', fecha_nacimiento: '', sexo: '', estado_civil: '',
    municipio_procedencia: '', calle: '', colonia: '', ciudad: '', estado_domicilio: '', codigo_postal: '',
    escuela_bachillerato: '',
    promedio_bachillerato: '', folio_exani: '', folio_preinscripcion_tecnm: '', puntaje_exani: '',
    area_bachillerato: '',
    turno_preferido: '', email: '', telefono: '',
    carrera_id: '',
    medio_enterado: '', medio_enterado_otro: '',
    tiene_equipo_computo: '',
  })
  const [constanciaFile, setConstanciaFile] = useState<File | null>(null)
  const [documentos, setDocumentos] = useState<Record<string, boolean>>({})
  const [errores,    setErrores]    = useState<Record<string, string>>({})
  const [tocados,    setTocados]    = useState<Record<string, boolean>>({})
  const [curpAlerta,    setCurpAlerta]    = useState<string | null>(null)
  const [renapoStatus,  setRenapoStatus]  = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  // Ref que registra la última CURP procesada para evitar re-ejecutar la lógica
  // cuando `estados` carga después del montaje (lo que borraría campos ya llenados).
  const curpProcesadaRef = useRef<string>('')

  const set   = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); if (errores[k]) setErrores(e => ({ ...e, [k]: '' })) }
  const tocar = (k: string) => setTocados(t => ({ ...t, [k]: true }))
  const err   = (k: string) => tocados[k] ? (errores[k] ?? '') : ''

  // ── Auto-fill desde CURP ──────────────────────────────────────────────────
  useEffect(() => {
    if (form.curp.length !== 18) {
      if (form.curp.length === 0) {
        setForm(f => ({ ...f, fecha_nacimiento: '', sexo: '', nombres: '', apellido_paterno: '', apellido_materno: '' } as typeof f))
        curpProcesadaRef.current = ''
      }
      setRenapoStatus('idle')
      setCurpAlerta(null)
      return
    }

    if (validarCurp(form.curp)) {
      setRenapoStatus('idle')
      return
    }

    // Si esta CURP ya fue procesada (p.e. el efecto re-disparó porque `estados`
    // cargó), no volvemos a sobrescribir ni a resetear la cascada.
    if (curpProcesadaRef.current === form.curp) return
    curpProcesadaRef.current = form.curp

    // 1. Derivar fecha y sexo desde la CURP (instantáneo, sin red)
    const parsed = parsearCurp(form.curp)
    if (!parsed) return

    setForm(f => ({
      ...f,
      fecha_nacimiento: parsed.fechaNacimiento,
      sexo:             parsed.sexo,
    }))
    setErrores(e => ({ ...e, fecha_nacimiento: '', sexo: '' }))

    // Detectar estado de nacimiento y pre-seleccionarlo (solo una vez)
    const edo = estados.find(e => e.clave_curp === parsed.claveCurpEstado)
    if (edo) {
      setEstadoId(edo.id)
      setMunResetKey(k => k + 1)
      setEscResetKey(k => k + 1)
    }

    // 2. Consultar RENAPO para nombres y apellidos
    setRenapoStatus('loading')
    Promise.all([
      catalogoPublico.consultarRenapo(form.curp),
      catalogoPublico.verificarCurp(form.curp),
    ]).then(([renapo, verificacion]) => {
      setForm(f => ({
        ...f,
        nombres:          renapo.nombres          ?? f.nombres,
        apellido_paterno: renapo.apellido_paterno ?? f.apellido_paterno,
        apellido_materno: renapo.apellido_materno ?? f.apellido_materno,
        fecha_nacimiento: renapo.fecha_nacimiento ?? f.fecha_nacimiento,
        sexo:             renapo.sexo             ?? f.sexo,
      }))
      setRenapoStatus(renapo.fuente === 'renapo' ? 'ok' : 'error')
      setCurpAlerta(
        verificacion.registrado
          ? `Esta CURP ya tiene una solicitud (${verificacion.estatus ?? ''}${verificacion.periodo ? ' — ' + verificacion.periodo : ''}).`
          : null
      )
    }).catch(() => {
      setRenapoStatus('error')
    })
  }, [form.curp, estados])

  // ── Cambio de estado — resetea municipio y escuela ───────────────────────
  const onEstadoSelect = (val: string) => {
    const id = val ? Number(val) : null
    setEstadoId(id)
    setMunicipioId(null)
    set('municipio_procedencia', '')
    set('escuela_bachillerato', '')
    setMunResetKey(k => k + 1)
    setEscResetKey(k => k + 1)
  }

  // ── Selección de municipio desde lista ────────────────────────────────────
  const onMunicipioSelect = (val: string) => {
    const id  = val ? Number(val) : null
    const mun = municipios.find(m => m.id === id)
    setMunicipioId(id)
    set('municipio_procedencia', mun?.nombre ?? '')
    set('escuela_bachillerato', '')
    setEscResetKey(k => k + 1)
    tocar('municipio_procedencia')
  }

  // ── Municipio nuevo tecleado — guarda en BD y recarga la lista ───────────
  const [guardandoMun, setGuardandoMun] = useState(false)

  const onMunicipioAdd = async (texto: string) => {
    setGuardandoMun(true)
    try {
      const nuevo = await catalogoPublico.crearMunicipio({ nombre: texto, estado_id: estadoId })
      // Recarga la lista de municipios del estado actual
      await queryClient.invalidateQueries({ queryKey: ['pub-municipios', estadoId] })
      // Selecciona el nuevo municipio igual que si viniera de la lista
      setMunicipioId(nuevo.id)
      set('municipio_procedencia', nuevo.nombre)
      set('escuela_bachillerato', '')
      setEscResetKey(k => k + 1)
      tocar('municipio_procedencia')
    } catch {
      // Si falla el guardado, igual captura el texto manualmente
      setMunicipioId(null)
      set('municipio_procedencia', texto)
      set('escuela_bachillerato', '')
      setEscResetKey(k => k + 1)
      tocar('municipio_procedencia')
    } finally {
      setGuardandoMun(false)
    }
  }

  // ── Selección de escuela desde lista ─────────────────────────────────────
  const onEscuelaSelect = (val: string) => {
    set('escuela_bachillerato', val)
    tocar('escuela_bachillerato')
  }

  // ── Escuela nueva tecleada — guarda en BD y recarga la lista ────────────
  const [guardandoEsc, setGuardandoEsc] = useState(false)

  const onEscuelaAdd = async (texto: string) => {
    setGuardandoEsc(true)
    try {
      const nueva = await catalogoPublico.crearEscuela({ nombre: texto, municipio_id: municipioId })
      // Recarga la lista de escuelas del municipio/estado actual
      await queryClient.invalidateQueries({ queryKey: ['pub-escuelas', municipioId, estadoId] })
      // Selecciona la escuela recién creada por nombre (que es el value en escuelasOpts)
      set('escuela_bachillerato', nueva.nombre)
      tocar('escuela_bachillerato')
    } catch {
      // Fallback: captura el texto manualmente aunque no se haya guardado
      set('escuela_bachillerato', texto)
      tocar('escuela_bachillerato')
    } finally {
      setGuardandoEsc(false)
    }
  }

  // ── Validación ────────────────────────────────────────────────────────────
  const validarFormulario = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.nombres.trim())              e.nombres              = 'El nombre es obligatorio.'
    if (!form.apellido_paterno.trim())     e.apellido_paterno     = 'El apellido paterno es obligatorio.'
    const eCurp = validarCurp(form.curp)
    if (eCurp)                             e.curp                 = eCurp
    if (!form.fecha_nacimiento)            e.fecha_nacimiento     = 'La fecha de nacimiento es obligatoria.'
    if (!form.sexo)                        e.sexo                 = 'El sexo es obligatorio.'
    if (!form.municipio_procedencia.trim()) e.municipio_procedencia = 'El municipio es obligatorio.'
    if (!form.escuela_bachillerato.trim()) e.escuela_bachillerato = 'La escuela es obligatoria.'
    if (!form.promedio_bachillerato)       e.promedio_bachillerato = 'El promedio es obligatorio.'
    else {
      const p = parseFloat(form.promedio_bachillerato)
      if (isNaN(p) || p < 6 || p > 10)    e.promedio_bachillerato = 'El promedio debe estar entre 6.0 y 10.0.'
    }
    if (form.puntaje_exani) {
      const p = Number(form.puntaje_exani)
      if (isNaN(p) || p < 0 || p > 1000)  e.puntaje_exani = 'El puntaje debe estar entre 0 y 1000.'
    }
    if (!form.turno_preferido)             e.turno_preferido      = 'El turno es obligatorio.'
    if (!form.carrera_id)                  e.carrera_id           = 'Selecciona una carrera.'
    if (!form.area_bachillerato)           e.area_bachillerato    = 'El área es obligatoria.'
    if (!form.estado_civil)                e.estado_civil         = 'El estado civil es obligatorio.'
    if (!form.medio_enterado)              e.medio_enterado       = 'Este campo es obligatorio.'
    if (form.medio_enterado === 'Otros' && !form.medio_enterado_otro.trim())
                                           e.medio_enterado_otro  = 'Especifica el medio.'
    if (!form.tiene_equipo_computo)        e.tiene_equipo_computo = 'Este campo es obligatorio.'
    if (!constanciaFile)                   e.constancia_bachillerato = 'La constancia de estudios es obligatoria.'
    else if (constanciaFile.size > 10 * 1024 * 1024)
                                           e.constancia_bachillerato = 'El archivo no puede pesar más de 10 MB.'
    const eEmail = validarEmail(form.email)
    if (eEmail)                            e.email                = eEmail
    const eTel = validarTelefono(form.telefono)
    if (eTel)                              e.telefono             = eTel
    setErrores(e)
    setTocados(Object.fromEntries(Object.keys(form).map(k => [k, true])))
    return Object.keys(e).length === 0
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodo) return
    if (!validarFormulario()) return
    mutate({
      ...form,
      periodo_id:             periodo.id,
      apellido_materno:       form.apellido_materno       || undefined,
      telefono:               form.telefono               || undefined,
      promedio_bachillerato:  parseFloat(form.promedio_bachillerato),
      folio_exani:            form.folio_exani            || undefined,
      folio_preinscripcion_tecnm: form.folio_preinscripcion_tecnm || undefined,
      puntaje_exani:          form.puntaje_exani ? Number(form.puntaje_exani) : undefined,
      tiene_equipo_computo:   form.tiene_equipo_computo,   // "1" o "0" — Laravel boolean acepta estos valores
      medio_enterado:         form.medio_enterado === 'Otros' ? form.medio_enterado_otro : form.medio_enterado,
      constancia_bachillerato: constanciaFile!,
      documentos:             Object.keys(documentos).length ? documentos : undefined,
    } as any, {
      onError: (err: any) => {
        console.error('422 detalle:', err?.response?.data)
        setErrores(extraerErroresApi(err))
      },
    })
  }

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">¡Solicitud enviada!</h2>
          {aspiranteRegistrado?.numero_ficha && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Número de folio</p>
              <p className="text-lg font-mono font-bold text-[#1a3a5c]">{aspiranteRegistrado.numero_ficha}</p>
              <p className="text-xs text-slate-400 mt-1">Guarda este folio para dar seguimiento a tu solicitud.</p>
            </div>
          )}
          <p className="text-sm text-slate-500 leading-relaxed mb-2">
            Tu solicitud fue registrada. Recibirás un correo de confirmación en <strong>{form.email}</strong>.
          </p>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Control Escolar revisará tu expediente y te notificará el resultado.
          </p>
          {periodo && (
            <span className="inline-block bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
              Periodo: {periodo.nombre}
            </span>
          )}
          <button onClick={() => window.location.reload()}
            className="mt-6 w-full bg-[#1a3a5c] hover:bg-[#234d7a] text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            Registrar otro aspirante
          </button>
        </div>
      </div>
    )
  }

  const cargando       = cargandoCarreras || cargandoPeriodo
  const turnosOpciones = turnos.length > 0
    ? turnos.map(t => ({ value: t.clave, label: t.nombre }))
    : [{ value: 'matutino', label: 'Matutino' }, { value: 'vespertino', label: 'Vespertino' }]

  const estadosOpts    = estados.map(e  => ({ value: String(e.id),  label: e.nombre  }))
  const municipiosOpts = municipios.map(m => ({ value: String(m.id), label: m.nombre }))
  // Para escuelas el value es el nombre (lo que guardamos en el campo de texto)
  const escuelasOpts   = escuelas.map(e  => ({ value: e.nombre,     label: e.nombre  }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Encabezado */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#1a3a5c] uppercase">ITSMT</p>
            <h1 className="text-lg font-semibold text-slate-800 leading-tight">Solicitud de admisión</h1>
          </div>
          <div className="text-right">
            {periodo ? (
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full ring-1 ring-emerald-200">
                {periodo.nombre}
              </span>
            ) : !cargandoPeriodo && (
              <span className="text-xs text-amber-600 font-medium">Sin periodo activo</span>
            )}
            <p className="text-xs text-slate-400 mt-1">
              ¿Ya estás inscrito?{' '}
              <a href="/login" className="text-[#1a3a5c] font-medium hover:underline">Iniciar sesión</a>
              {' · '}
              <a href="/aspirante/consulta" className="text-[#1a3a5c] font-medium hover:underline">Consultar estatus</a>
            </p>
          </div>
        </div>
      </header>

      {!periodo && !cargandoPeriodo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-3 text-center text-sm text-amber-700">
          No hay un periodo de inscripción activo. Consulta a Control Escolar.
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 lg:py-8">
        <form onSubmit={handleSubmit}>
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">

            {/* ── Columna principal ─────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Datos personales */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Datos personales" />

                {/* CURP — auto-llena fecha y sexo */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">CURP *</label>
                  <input value={form.curp}
                    onChange={e => set('curp', e.target.value.toUpperCase())}
                    onBlur={() => { tocar('curp'); setErrores(e => ({ ...e, curp: validarCurp(form.curp) })) }}
                    maxLength={18} placeholder="ABCD991231HVZRXX00"
                    className={CLS(err('curp')) + ' font-mono'} />
                  {err('curp') && <p className="mt-1 text-xs text-red-600">{err('curp')}</p>}
                  {curpAlerta && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <span>⚠</span> {curpAlerta}
                    </div>
                  )}
                  {form.curp.length === 18 && !validarCurp(form.curp) && renapoStatus === 'loading' && (
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-[#1a3a5c] rounded-full animate-spin" />
                      Consultando RENAPO…
                    </p>
                  )}
                  {form.curp.length === 18 && !validarCurp(form.curp) && renapoStatus === 'ok' && !curpAlerta && (
                    <p className="mt-1 text-xs text-emerald-600">✓ Datos obtenidos de RENAPO — verifica y corrige si es necesario</p>
                  )}
                  {form.curp.length === 18 && !validarCurp(form.curp) && renapoStatus === 'error' && !curpAlerta && (
                    <p className="mt-1 text-xs text-slate-400">Fecha y sexo completados — verifica tu nombre y apellidos</p>
                  )}
                  {form.curp.length > 0 && form.curp.length < 18 && (
                    <p className="mt-1 text-xs text-slate-400">{form.curp.length}/18 caracteres</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Nombres *" value={form.nombres}
                    onChange={v => set('nombres', v)} onBlur={() => tocar('nombres')}
                    required error={err('nombres')} />
                  <Field label="Apellido paterno *" value={form.apellido_paterno}
                    onChange={v => set('apellido_paterno', v)} onBlur={() => tocar('apellido_paterno')}
                    required error={err('apellido_paterno')} />
                  <Field label="Apellido materno" value={form.apellido_materno}
                    onChange={v => set('apellido_materno', v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Field label="Fecha de nacimiento *" type="date" value={form.fecha_nacimiento}
                    onChange={v => set('fecha_nacimiento', v)} onBlur={() => tocar('fecha_nacimiento')}
                    required error={err('fecha_nacimiento')} />
                  <SelectField label="Sexo *" value={form.sexo}
                    onChange={v => set('sexo', v)} onBlur={() => tocar('sexo')}
                    options={[{ value: 'masculino', label: 'Masculino' }, { value: 'femenino', label: 'Femenino' }]}
                    required error={err('sexo')} />
                </div>
              </div>

              {/* Procedencia académica */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Procedencia académica" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Estado — searchable, sin crear */}
                  <div>
                    <SearchableSelect
                      label="Estado de procedencia"
                      value={estadoId ? String(estadoId) : ''}
                      onChange={onEstadoSelect}
                      options={estadosOpts}
                      placeholder="Busca un estado…"
                    />
                    {form.curp.length === 18 && !validarCurp(form.curp) && estadoId && (
                      <p className="mt-1 text-xs text-emerald-600">✓ Detectado desde CURP</p>
                    )}
                  </div>

                  {/* Municipio — searchable + crear nuevo.
                      key=munResetKey fuerza re-montaje cuando cambia el estado. */}
                  <SearchableSelect
                    key={`mun-${munResetKey}`}
                    label="Municipio *"
                    value={municipioId ? String(municipioId) : ''}
                    onChange={onMunicipioSelect}
                    onAdd={onMunicipioAdd}
                    options={municipiosOpts}
                    placeholder={estadoId ? 'Busca o escribe el municipio…' : 'Primero selecciona el estado'}
                    error={err('municipio_procedencia')}
                    allowCreate
                    createLabel="municipio"
                    hint={
                      estadoId && municipiosOpts.length === 0
                        ? 'Sin municipios registrados para este estado — escríbelo para capturarlo'
                        : undefined
                    }
                  />
                </div>

                {/* Confirmación visual de municipio capturado manualmente */}
                {!municipioId && form.municipio_procedencia && (
                  <div className="mt-2 flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5">
                    <span>✓</span>
                    <span>Municipio: <strong>{form.municipio_procedencia}</strong></span>
                    <button type="button" onClick={() => { set('municipio_procedencia', ''); set('escuela_bachillerato', ''); setMunResetKey(k => k + 1); setEscResetKey(k => k + 1) }}
                      className="ml-auto text-emerald-500 hover:text-emerald-700">✕</button>
                  </div>
                )}

                {/* Escuela — searchable + crear nuevo.
                    key=escResetKey fuerza re-montaje cuando cambia el municipio. */}
                <div className="mt-4">
                  <SearchableSelect
                    key={`esc-${escResetKey}`}
                    label={guardandoEsc ? 'Escuela de bachillerato * — guardando…' : 'Escuela de bachillerato *'}
                    value={form.escuela_bachillerato}
                    onChange={onEscuelaSelect}
                    onAdd={onEscuelaAdd}
                    options={escuelasOpts}
                    placeholder={
                      guardandoEsc
                        ? 'Registrando escuela…'
                        : !estadoId && !form.municipio_procedencia
                          ? 'Primero selecciona el estado o municipio'
                          : 'Busca o escribe el nombre de la escuela…'
                    }
                    error={err('escuela_bachillerato')}
                    allowCreate
                    createLabel="escuela"
                    hint={
                      guardandoMun
                        ? 'Guardando municipio…'
                        : (estadoId || form.municipio_procedencia) && escuelasOpts.length === 0
                          ? 'Sin escuelas registradas — escríbela para capturarla'
                          : undefined
                    }
                  />
                </div>

                {/* Datos académicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Promedio bachillerato *</label>
                    <input
                      type="number" step="0.01" min="6" max="10"
                      value={form.promedio_bachillerato}
                      onChange={e => set('promedio_bachillerato', e.target.value)}
                      onBlur={() => tocar('promedio_bachillerato')}
                      placeholder="Ej. 8.5"
                      className={CLS(err('promedio_bachillerato'))}
                    />
                    {err('promedio_bachillerato') && <p className="mt-1 text-xs text-red-600">{err('promedio_bachillerato')}</p>}
                  </div>
                  <Field label="Folio EXANI-II" value={form.folio_exani}
                    onChange={v => set('folio_exani', v)}
                    placeholder="Opcional" />
                  <Field label="Folio de preinscripción TecNM" value={form.folio_preinscripcion_tecnm}
                    onChange={v => set('folio_preinscripcion_tecnm', v)}
                    placeholder="Opcional — ingreso.tecnm.mx" />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Puntaje EXANI-II</label>
                    <input
                      type="number" step="1" min="0" max="1000"
                      value={form.puntaje_exani}
                      onChange={e => set('puntaje_exani', e.target.value)}
                      onBlur={() => tocar('puntaje_exani')}
                      placeholder="Opcional"
                      className={CLS(err('puntaje_exani'))}
                    />
                    {err('puntaje_exani') && <p className="mt-1 text-xs text-red-600">{err('puntaje_exani')}</p>}
                  </div>
                </div>
              </div>

              {/* Constancia de estudios */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Constancia de estudios" />
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Adjunta la constancia de estudios de bachillerato, la boleta del semestre inmediato anterior,
                  o el Certificado en caso de haber egresado.
                </p>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer transition-colors ${
                  errores.constancia_bachillerato && tocados.constancia_bachillerato
                    ? 'border-red-300 bg-red-50'
                    : constanciaFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-[#1a3a5c] hover:bg-slate-50'
                }`}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null
                      setConstanciaFile(f)
                      tocar('constancia_bachillerato')
                      setErrores(prev => ({ ...prev, constancia_bachillerato: f && f.size > 10 * 1024 * 1024 ? 'El archivo no puede pesar más de 10 MB.' : '' }))
                    }} />
                  {constanciaFile ? (
                    <>
                      <span className="text-2xl">📄</span>
                      <span className="text-sm font-medium text-emerald-700">{constanciaFile.name}</span>
                      <span className="text-xs text-emerald-600">{(constanciaFile.size / 1024 / 1024).toFixed(2)} MB — haz clic para cambiar</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl text-slate-400">⬆</span>
                      <span className="text-sm font-medium text-slate-600">Haz clic para seleccionar el archivo</span>
                      <span className="text-xs text-slate-400">PDF, JPG, PNG o WEBP · máximo 10 MB</span>
                    </>
                  )}
                </label>
                {errores.constancia_bachillerato && tocados.constancia_bachillerato && (
                  <p className="mt-1.5 text-xs text-red-600">{errores.constancia_bachillerato}</p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  ¿Problemas para adjuntar el archivo? Comunícate por WhatsApp al{' '}
                  <a href="https://wa.me/522321017724" target="_blank" rel="noopener noreferrer"
                    className="text-[#1a3a5c] font-medium hover:underline">232 101 7724</a>
                </p>
              </div>

              {/* Solicitud */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Solicitud de admisión" />

                {/* Área de bachillerato */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-600 mb-2">Área *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['Físico-Matemáticas', 'Económico-Administrativo', 'Humanidades y Ciencias Sociales', 'Químico-Biológicas'].map(area => (
                      <label key={area} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="radio" name="area_bachillerato" value={area}
                          checked={form.area_bachillerato === area}
                          onChange={() => { set('area_bachillerato', area); tocar('area_bachillerato') }}
                          className="accent-[#1a3a5c]" />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{area}</span>
                      </label>
                    ))}
                  </div>
                  {err('area_bachillerato') && <p className="mt-1 text-xs text-red-600">{err('area_bachillerato')}</p>}
                </div>

                {/* Carrera */}
                <div className="mb-4">
                  <SelectField
                    label="Ingeniería a la que desea ingresar *"
                    value={form.carrera_id}
                    onChange={v => { set('carrera_id', v); tocar('carrera_id') }}
                    onBlur={() => tocar('carrera_id')}
                    options={carreras.map(c => ({ value: c.id, label: c.nombre }))}
                    placeholder={cargandoCarreras ? 'Cargando carreras…' : 'Selecciona una carrera'}
                    required
                    error={err('carrera_id')}
                  />
                </div>

                <SelectField label="Turno preferido *" value={form.turno_preferido}
                  onChange={v => set('turno_preferido', v)} onBlur={() => tocar('turno_preferido')}
                  options={turnosOpciones} required error={err('turno_preferido')} />
              </div>

              {/* Información complementaria */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Información complementaria" />

                {/* Estado civil */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-slate-600 mb-2">Estado civil *</p>
                  <div className="flex flex-wrap gap-4">
                    {['Soltero (a)', 'Casado (a)', 'Otros'].map(ec => (
                      <label key={ec} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="estado_civil" value={ec}
                          checked={form.estado_civil === ec}
                          onChange={() => { set('estado_civil', ec); tocar('estado_civil') }}
                          className="accent-[#1a3a5c]" />
                        <span className="text-sm text-slate-700">{ec}</span>
                      </label>
                    ))}
                  </div>
                  {err('estado_civil') && <p className="mt-1 text-xs text-red-600">{err('estado_civil')}</p>}
                </div>

                {/* Medio por el que se enteró */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-slate-600 mb-2">¿Por qué medio se enteró de nuestra oferta académica? *</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Radio', 'Redes Sociales', 'Periódico', 'Por medio de un conocido o familiar', 'Perifoneo', 'Otros'].map(m => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="medio_enterado" value={m}
                          checked={form.medio_enterado === m}
                          onChange={() => { set('medio_enterado', m); tocar('medio_enterado') }}
                          className="accent-[#1a3a5c]" />
                        <span className="text-sm text-slate-700">{m}</span>
                      </label>
                    ))}
                  </div>
                  {form.medio_enterado === 'Otros' && (
                    <input value={form.medio_enterado_otro}
                      onChange={e => set('medio_enterado_otro', e.target.value)}
                      onBlur={() => tocar('medio_enterado_otro')}
                      placeholder="Especifica el medio…"
                      className={CLS(err('medio_enterado_otro')) + ' mt-2'} />
                  )}
                  {err('medio_enterado') && <p className="mt-1 text-xs text-red-600">{err('medio_enterado')}</p>}
                  {err('medio_enterado_otro') && <p className="mt-1 text-xs text-red-600">{err('medio_enterado_otro')}</p>}
                </div>

                {/* Equipo de cómputo */}
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">¿Cuenta con equipo de cómputo e internet? *</p>
                  <div className="flex gap-6">
                    {[{ v: '1', l: 'Sí' }, { v: '0', l: 'No' }].map(({ v, l }) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="tiene_equipo_computo" value={v}
                          checked={form.tiene_equipo_computo === v}
                          onChange={() => { set('tiene_equipo_computo', v); tocar('tiene_equipo_computo') }}
                          className="accent-[#1a3a5c]" />
                        <span className="text-sm text-slate-700">{l}</span>
                      </label>
                    ))}
                  </div>
                  {err('tiene_equipo_computo') && <p className="mt-1 text-xs text-red-600">{err('tiene_equipo_computo')}</p>}
                </div>
              </div>

              {/* Contacto */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Datos de contacto"
                  subtitle="A este correo te enviaremos la confirmación de tu solicitud." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Correo electrónico *" type="email" value={form.email}
                    onChange={v => set('email', v)}
                    onBlur={() => { tocar('email'); setErrores(e => ({ ...e, email: validarEmail(form.email) })) }}
                    required error={err('email')} />
                  <Field label="Teléfono (10 dígitos)" type="tel" value={form.telefono}
                    onChange={v => set('telefono', v.replace(/\D/g, '').slice(0, 10))}
                    onBlur={() => { tocar('telefono'); setErrores(e => ({ ...e, telefono: validarTelefono(form.telefono) })) }}
                    placeholder="10 dígitos" maxLength={10} error={err('telefono')} />
                </div>
              </div>

              {/* Domicilio */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Domicilio" subtitle="Dirección de residencia actual." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Calle y número" value={form.calle}
                      onChange={v => set('calle', v)} placeholder="Av. Ejemplo 123" />
                  </div>
                  <Field label="Colonia" value={form.colonia}
                    onChange={v => set('colonia', v)} placeholder="Col. Centro" />
                  <Field label="Ciudad" value={form.ciudad}
                    onChange={v => set('ciudad', v)} placeholder="Martínez de la Torre" />
                  <Field label="Estado" value={form.estado_domicilio}
                    onChange={v => set('estado_domicilio', v)} placeholder="Veracruz" />
                  <Field label="Código postal" value={form.codigo_postal}
                    onChange={v => set('codigo_postal', v.replace(/\D/g, '').slice(0, 5))}
                    placeholder="93600" maxLength={5} />
                </div>
              </div>

              {/* Documentos */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <Section title="Documentos que presentarás"
                  subtitle="Marca los que llevarás el día de tu inscripción." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOCS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none group">
                      <input type="checkbox" checked={!!documentos[key]}
                        onChange={() => setDocumentos(d => ({ ...d, [key]: !d[key] }))}
                        className="w-4 h-4 accent-[#1a3a5c] shrink-0" />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error global de API */}
              {error && Object.keys(errores).length === 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  <span>⚠</span>
                  {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Error al enviar. Verifica que el correo o CURP no estén registrados.'}
                </div>
              )}
            </div>

            {/* ── Columna lateral sticky ────────────────────────────────── */}
            <div className="mt-6 lg:mt-0">
              <div className="lg:sticky lg:top-6 space-y-4">

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <button type="submit" disabled={isPending || cargando || !periodo}
                    className="w-full bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-colors">
                    {isPending ? 'Enviando…' : 'Enviar solicitud de admisión'}
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Recibirás un correo de confirmación al enviar.
                  </p>
                  {!periodo && !cargandoPeriodo && (
                    <p className="text-xs text-amber-600 text-center mt-1">Sin periodo activo</p>
                  )}
                </div>

                {/* Progreso */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Progreso</p>
                  <ul className="space-y-1.5 text-xs">
                    {([
                      ['CURP',            !validarCurp(form.curp)],
                      ['Nombre completo', !!form.nombres && !!form.apellido_paterno],
                      ['Fecha y sexo',    !!form.fecha_nacimiento && !!form.sexo],
                      ['Municipio',       !!form.municipio_procedencia],
                      ['Escuela',         !!form.escuela_bachillerato],
                      ['Promedio',        !!form.promedio_bachillerato && parseFloat(form.promedio_bachillerato) >= 6],
                      ['Carrera y turno', !!form.carrera_id && !!form.turno_preferido],
                      ['Correo',          !validarEmail(form.email)],
                    ] as [string, boolean][]).map(([label, ok]) => (
                      <li key={label} className="flex items-center gap-2">
                        <span className={ok ? 'text-emerald-500' : 'text-slate-300'}>{ok ? '✓' : '○'}</span>
                        <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documentos requeridos</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    {DOCS.map(d => <li key={d.key}>• {d.label}</li>)}
                  </ul>
                </div>

              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
