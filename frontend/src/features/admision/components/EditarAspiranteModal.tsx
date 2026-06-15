import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../../../components/ui/Modal'
import { admisionApi, type Aspirante, type ActualizarAspirantePayload } from '../services/admision'
import { useCarreras } from '../hooks/useCarreras'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'

interface Props {
  aspirante: Aspirante
  onClose: () => void
}

const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition bg-white'
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'

const MUNICIPIOS = [
  'Cazones','Coatzintla','Gutiérrez Zamora','Jalapa','Martínez de la Torre',
  'Misantla','Nautla','Papantla','Poza Rica','Tecolutla','Tihuatlán','Tuxpan',
  'Vega de Alatorre','Veracruz',
]

const BACHILLERATOS = [
  'Bachillerato UNAM','CBGUP','CBTis 166','CBTis 75','CECyTE Veracruz',
  'CETMAR 04','COBAEV 07','COBAEV 15','COBAEV 31','CONALEP Martínez',
  'Centro de Bachillerato Tecnológico 48','Colegio de Bachilleres Plantel 22',
  'PREPARATORIA PARTICULAR SAN JUAN','Prepa Regional ITSMT','Prepa Veracruzana',
]

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

  const [form, setForm] = useState<ActualizarAspirantePayload>({
    nombres:                    aspirante.nombres,
    apellido_paterno:           aspirante.apellido_paterno,
    apellido_materno:           aspirante.apellido_materno ?? '',
    curp:                       aspirante.curp,
    fecha_nacimiento:           aspirante.fecha_nacimiento?.substring(0, 10),
    sexo:                       aspirante.sexo,
    municipio_procedencia:      aspirante.municipio_procedencia,
    escuela_bachillerato:       aspirante.escuela_bachillerato,
    promedio_bachillerato:      aspirante.promedio_bachillerato,
    turno_preferido:            aspirante.turno_preferido,
    email:                      aspirante.email,
    telefono:                   aspirante.telefono ?? '',
    folio_preinscripcion_tecnm: aspirante.folio_preinscripcion_tecnm ?? '',
    folio_exani:                aspirante.folio_exani ?? '',
    puntaje_exani:              aspirante.puntaje_exani ?? undefined,
    carrera_id:                 aspirante.carrera.id,
    periodo_id:                 aspirante.periodo.id,
    observaciones:              aspirante.observaciones ?? '',
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: ActualizarAspirantePayload) =>
      admisionApi.actualizarAspirante(aspirante.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aspirantes'] })
      success('Datos del aspirante actualizados correctamente.')
      onClose()
    },
    onError: () => toastError('Error al guardar. Verifica los datos e intenta de nuevo.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: ActualizarAspirantePayload = { ...form }
    if (!payload.apellido_materno)           payload.apellido_materno = null
    if (!payload.telefono)                   payload.telefono = null
    if (!payload.observaciones)              payload.observaciones = null
    if (!payload.folio_preinscripcion_tecnm) payload.folio_preinscripcion_tecnm = null
    if (!payload.folio_exani)               payload.folio_exani = null
    mutate(payload)
  }

  return (
    <Modal title={`Editar aspirante — ${aspirante.nombres} ${aspirante.apellido_paterno}`} onClose={onClose} size="xl">
      {/* datalists para autocompletar */}
      <datalist id="dl-municipios">{MUNICIPIOS.map(m => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-bachilleratos">{BACHILLERATOS.map(b => <option key={b} value={b} />)}</datalist>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Datos personales ── */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">Datos personales</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Apellido paterno *</label>
              <input className={INPUT} value={form.apellido_paterno ?? ''} onChange={e => set('apellido_paterno', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>Apellido materno</label>
              <input className={INPUT} value={form.apellido_materno ?? ''} onChange={e => set('apellido_materno', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Nombre(s) *</label>
              <input className={INPUT} value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>CURP *</label>
              <input className={INPUT} value={form.curp ?? ''} onChange={e => set('curp', e.target.value.toUpperCase())} maxLength={18} required />
            </div>
            <div>
              <label className={LABEL}>Fecha de nacimiento *</label>
              <input type="date" className={INPUT} value={form.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>Sexo *</label>
              <select className={INPUT} value={form.sexo ?? ''} onChange={e => set('sexo', e.target.value)} required>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Correo electrónico *</label>
              <input type="email" className={INPUT} value={form.email ?? ''} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>Teléfono</label>
              <input className={INPUT} value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)} maxLength={15} />
            </div>
          </div>
        </fieldset>

        {/* ── Procedencia académica ── */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">Procedencia académica</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Municipio de procedencia *</label>
              <input
                list="dl-municipios"
                className={INPUT}
                value={form.municipio_procedencia ?? ''}
                onChange={e => set('municipio_procedencia', e.target.value)}
                placeholder="Selecciona o escribe un municipio"
                required
              />
            </div>
            <div>
              <label className={LABEL}>Promedio bachillerato *</label>
              <input type="number" step="0.01" min={6} max={10} className={INPUT}
                value={form.promedio_bachillerato ?? ''} onChange={e => set('promedio_bachillerato', parseFloat(e.target.value))} required />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Escuela de bachillerato *</label>
              <input
                list="dl-bachilleratos"
                className={INPUT}
                value={form.escuela_bachillerato ?? ''}
                onChange={e => set('escuela_bachillerato', e.target.value)}
                placeholder="Selecciona o escribe la escuela"
                required
              />
            </div>
            <div>
              <label className={LABEL}>Turno preferido *</label>
              <select className={INPUT} value={form.turno_preferido ?? ''} onChange={e => set('turno_preferido', e.target.value)} required>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* ── Solicitud de admisión ── */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100 w-full block">Solicitud de admisión</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Carrera *</label>
              <select className={INPUT} value={form.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)} required>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Periodo *</label>
              <select className={INPUT} value={form.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)} required>
                {periodos.length === 0 && (
                  <option value={aspirante.periodo.id}>{aspirante.periodo.nombre}</option>
                )}
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Folio preinscripción TecNM</label>
              <input className={INPUT} value={form.folio_preinscripcion_tecnm ?? ''} onChange={e => set('folio_preinscripcion_tecnm', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Folio EXANI-II</label>
              <input className={INPUT} value={form.folio_exani ?? ''} onChange={e => set('folio_exani', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Puntaje EXANI-II</label>
              <input type="number" min={0} max={1000} className={INPUT}
                value={form.puntaje_exani ?? ''} onChange={e => set('puntaje_exani', e.target.value ? parseFloat(e.target.value) : undefined)} />
            </div>
          </div>
        </fieldset>

        {/* ── Observaciones ── */}
        <div>
          <label className={LABEL}>Observaciones</label>
          <textarea rows={2} className={`${INPUT} resize-none`}
            value={form.observaciones ?? ''} onChange={e => set('observaciones', e.target.value)}
            placeholder="Notas adicionales sobre el aspirante…" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
