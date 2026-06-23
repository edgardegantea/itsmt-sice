import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../../../components/ui/Modal'
import {
  admisionApi,
  type Aspirante,
  type ActualizarAspirantePayload,
} from '../services/admision'
import { useCarreras } from '../hooks/useCarreras'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'

interface Props {
  aspirante: Aspirante
  onClose: () => void
}

const INPUT =
  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition bg-white'
const INPUT_OK  = `${INPUT} border-slate-300`
const INPUT_ERR = `${INPUT} border-red-400`
const inp = (e?: string) => e ? INPUT_ERR : INPUT_OK
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'
const ErrMsg = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null

const MUNICIPIOS = [
  'Cazones',
  'Coatzintla',
  'Gutiérrez Zamora',
  'Jalapa',
  'Martínez de la Torre',
  'Misantla',
  'Nautla',
  'Papantla',
  'Poza Rica',
  'Tecolutla',
  'Tihuatlán',
  'Tuxpan',
  'Vega de Alatorre',
  'Veracruz',
]

const BACHILLERATOS = [
  'Bachillerato UNAM',
  'CBGUP',
  'CBTis 166',
  'CBTis 75',
  'CECyTE Veracruz',
  'CETMAR 04',
  'COBAEV 07',
  'COBAEV 15',
  'COBAEV 31',
  'CONALEP Martínez',
  'Centro de Bachillerato Tecnológico 48',
  'Colegio de Bachilleres Plantel 22',
  'PREPARATORIA PARTICULAR SAN JUAN',
  'Prepa Regional ITSMT',
  'Prepa Veracruzana',
]

const CURP_REGEX =
  /^([A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d])\d$/

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim()
}

function normalizeCurp(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 18)
}

function parseOptionalNumber(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export default function EditarAspiranteModal({ aspirante, onClose }: Props) {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const { success, error: toastError } = useToastStore()

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/periodos')
      return data.data as { id: string; nombre: string }[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const initialForm = useMemo<ActualizarAspirantePayload>(
    () => ({
      nombres: normalizeText(aspirante.nombres),
      apellido_paterno: normalizeText(aspirante.apellido_paterno),
      apellido_materno: normalizeText(aspirante.apellido_materno),
      curp: normalizeCurp(aspirante.curp),
      fecha_nacimiento: aspirante.fecha_nacimiento?.substring(0, 10) ?? '',
      sexo: aspirante.sexo,
      municipio_procedencia: normalizeText(aspirante.municipio_procedencia),
      escuela_bachillerato: normalizeText(aspirante.escuela_bachillerato),
      promedio_bachillerato: aspirante.promedio_bachillerato ?? undefined,
      turno_preferido: aspirante.turno_preferido,
      email: normalizeText(aspirante.email),
      telefono: normalizeText(aspirante.telefono),
      folio_preinscripcion_tecnm: normalizeText(aspirante.folio_preinscripcion_tecnm),
      folio_exani: normalizeText(aspirante.folio_exani),
      puntaje_exani: aspirante.puntaje_exani ?? undefined,
      carrera_id: aspirante.carrera.id,
      periodo_id: aspirante.periodo.id,
      observaciones: normalizeText(aspirante.observaciones),
    }),
    [aspirante]
  )

  const [form, setForm]     = useState<ActualizarAspirantePayload>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setField = <K extends keyof ActualizarAspirantePayload>(
    key: K,
    value: ActualizarAspirantePayload[K]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key as string]) setErrors(prev => { const n = { ...prev }; delete n[key as string]; return n })
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: ActualizarAspirantePayload) =>
      admisionApi.actualizarAspirante(aspirante.id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['aspirantes'] })
      success('Datos del aspirante actualizados correctamente.')
      onClose()
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      const errs = err.response?.data?.errors
      if (errs) {
        setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])))
      } else {
        toastError(err.response?.data?.message ?? 'Error al guardar. Verifica los datos e intenta de nuevo.')
      }
    },
  })

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()

  const curp = normalizeCurp(form.curp)
  const newErrors: Record<string, string> = {}

  if (curp.length !== 18) {
    newErrors.curp = 'La CURP debe tener exactamente 18 caracteres.'
  } else if (!CURP_REGEX.test(curp)) {
    newErrors.curp = 'La CURP no tiene un formato válido (ej. ABCD991231HVZRXX09).'
  }

  const promedio =
    typeof form.promedio_bachillerato === 'number' &&
    Number.isFinite(form.promedio_bachillerato)
      ? form.promedio_bachillerato
      : undefined

  if (promedio === undefined || promedio < 6 || promedio > 10) {
    newErrors.promedio_bachillerato = 'El promedio debe estar entre 6.00 y 10.00.'
  }

  if (Object.keys(newErrors).length) {
    setErrors(newErrors)
    return
  }

  const payload: ActualizarAspirantePayload = {
    ...form,
    nombres: normalizeText(form.nombres),
    apellido_paterno: normalizeText(form.apellido_paterno),
    apellido_materno: normalizeText(form.apellido_materno) || null,
    curp,
    fecha_nacimiento: normalizeText(form.fecha_nacimiento),
    municipio_procedencia: normalizeText(form.municipio_procedencia),
    escuela_bachillerato: normalizeText(form.escuela_bachillerato),
    email: normalizeText(form.email),
    telefono: normalizeText(form.telefono) || null,
    folio_preinscripcion_tecnm:
      normalizeText(form.folio_preinscripcion_tecnm) || null,
    folio_exani: normalizeText(form.folio_exani) || null,
    observaciones: normalizeText(form.observaciones) || null,
    promedio_bachillerato: promedio,
    puntaje_exani:
      typeof form.puntaje_exani === 'number' && Number.isFinite(form.puntaje_exani)
        ? form.puntaje_exani
        : undefined,
    carrera_id: form.carrera_id ? String(form.carrera_id) : undefined,
    periodo_id: form.periodo_id ? String(form.periodo_id) : undefined,
  }

  mutate(payload)
}

  return (
    <Modal
      title={`Editar aspirante — ${aspirante.nombres} ${aspirante.apellido_paterno}`}
      onClose={onClose}
      size="xl"
    >
      <datalist id="dl-municipios">
        {MUNICIPIOS.map(m => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <datalist id="dl-bachilleratos">
        {BACHILLERATOS.map(b => (
          <option key={b} value={b} />
        ))}
      </datalist>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">
            Datos personales
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Apellido paterno *</label>
              <input
                className={inp(errors.apellido_paterno)}
                value={form.apellido_paterno ?? ''}
                onChange={e => setField('apellido_paterno', e.target.value)}
                required
              />
              <ErrMsg msg={errors.apellido_paterno} />
            </div>

            <div>
              <label className={LABEL}>Apellido materno</label>
              <input
                className={inp(errors.apellido_materno)}
                value={form.apellido_materno ?? ''}
                onChange={e => setField('apellido_materno', e.target.value)}
              />
              <ErrMsg msg={errors.apellido_materno} />
            </div>

            <div>
              <label className={LABEL}>Nombre(s) *</label>
              <input
                className={inp(errors.nombres)}
                value={form.nombres ?? ''}
                onChange={e => setField('nombres', e.target.value)}
                required
              />
              <ErrMsg msg={errors.nombres} />
            </div>

            <div>
              <label className={LABEL}>CURP *</label>
              <input
                className={inp(errors.curp)}
                value={form.curp ?? ''}
                onChange={e => setField('curp', normalizeCurp(e.target.value))}
                maxLength={18}
                required
              />
              <ErrMsg msg={errors.curp} />
            </div>

            <div>
              <label className={LABEL}>Fecha de nacimiento *</label>
              <input
                type="date"
                className={inp(errors.fecha_nacimiento)}
                value={form.fecha_nacimiento ?? ''}
                onChange={e => setField('fecha_nacimiento', e.target.value)}
                required
              />
              <ErrMsg msg={errors.fecha_nacimiento} />
            </div>

            <div>
              <label className={LABEL}>Sexo *</label>
              <select
                className={inp(errors.sexo)}
                value={form.sexo ?? ''}
                onChange={e => setField('sexo', e.target.value)}
                required
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
              <ErrMsg msg={errors.sexo} />
            </div>

            <div>
              <label className={LABEL}>Correo electrónico *</label>
              <input
                type="email"
                className={inp(errors.email)}
                value={form.email ?? ''}
                onChange={e => setField('email', e.target.value)}
                required
              />
              <ErrMsg msg={errors.email} />
            </div>

            <div>
              <label className={LABEL}>Teléfono</label>
              <input
                className={inp(errors.telefono)}
                value={form.telefono ?? ''}
                onChange={e =>
                  setField(
                    'telefono',
                    e.target.value.replace(/[^\d+\-\s()]/g, '').slice(0, 15)
                  )
                }
                maxLength={15}
              />
              <ErrMsg msg={errors.telefono} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">
            Procedencia académica
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Municipio de procedencia *</label>
              <input
                list="dl-municipios"
                className={inp(errors.municipio_procedencia)}
                value={form.municipio_procedencia ?? ''}
                onChange={e => setField('municipio_procedencia', e.target.value)}
                placeholder="Selecciona o escribe un municipio"
                required
              />
              <ErrMsg msg={errors.municipio_procedencia} />
            </div>

            <div>
              <label className={LABEL}>Promedio bachillerato *</label>
              <input
                type="number"
                step="0.01"
                min={6}
                max={10}
                className={inp(errors.promedio_bachillerato)}
                value={form.promedio_bachillerato ?? ''}
                onChange={e =>
                  setField(
                    'promedio_bachillerato',
                    parseOptionalNumber(e.target.value)
                  )
                }
                required
              />
              <ErrMsg msg={errors.promedio_bachillerato} />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>Escuela de bachillerato *</label>
              <input
                list="dl-bachilleratos"
                className={inp(errors.escuela_bachillerato)}
                value={form.escuela_bachillerato ?? ''}
                onChange={e => setField('escuela_bachillerato', e.target.value)}
                placeholder="Selecciona o escribe la escuela"
                required
              />
              <ErrMsg msg={errors.escuela_bachillerato} />
            </div>

            <div>
              <label className={LABEL}>Turno preferido *</label>
              <select
                className={inp(errors.turno_preferido)}
                value={form.turno_preferido ?? ''}
                onChange={e => setField('turno_preferido', e.target.value)}
                required
              >
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
              </select>
              <ErrMsg msg={errors.turno_preferido} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">
            Solicitud de admisión
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Carrera *</label>
              <select
                className={inp(errors.carrera_id)}
                value={form.carrera_id ?? ''}
                onChange={e => setField('carrera_id', e.target.value)}
                required
              >
                {carreras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.clave})
                  </option>
                ))}
              </select>
              <ErrMsg msg={errors.carrera_id} />
            </div>

            <div>
              <label className={LABEL}>Periodo *</label>
              <select
                className={inp(errors.periodo_id)}
                value={form.periodo_id ?? ''}
                onChange={e => setField('periodo_id', e.target.value)}
                required
              >
                {periodos.length === 0 && (
                  <option value={aspirante.periodo.id}>
                    {aspirante.periodo.nombre}
                  </option>
                )}
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <ErrMsg msg={errors.periodo_id} />
            </div>

            <div>
              <label className={LABEL}>Folio preinscripción TecNM</label>
              <input
                className={inp(errors.folio_preinscripcion_tecnm)}
                value={form.folio_preinscripcion_tecnm ?? ''}
                onChange={e => setField('folio_preinscripcion_tecnm', e.target.value)}
              />
              <ErrMsg msg={errors.folio_preinscripcion_tecnm} />
            </div>

            <div>
              <label className={LABEL}>Folio EXANI-II</label>
              <input
                className={inp(errors.folio_exani)}
                value={form.folio_exani ?? ''}
                onChange={e => setField('folio_exani', e.target.value)}
              />
              <ErrMsg msg={errors.folio_exani} />
            </div>

            <div>
              <label className={LABEL}>Puntaje EXANI-II</label>
              <input
                type="number"
                min={0}
                max={1000}
                className={inp(errors.puntaje_exani)}
                value={form.puntaje_exani ?? ''}
                onChange={e =>
                  setField('puntaje_exani', parseOptionalNumber(e.target.value))
                }
              />
              <ErrMsg msg={errors.puntaje_exani} />
            </div>
          </div>
        </fieldset>

        <div>
          <label className={LABEL}>Observaciones</label>
          <textarea
            rows={2}
            className={`${INPUT} resize-none`}
            value={form.observaciones ?? ''}
            onChange={e => setField('observaciones', e.target.value)}
            placeholder="Notas adicionales sobre el aspirante…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}