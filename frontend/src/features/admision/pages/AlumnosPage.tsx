import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  admisionApi,
  type Alumno,
  type EstatusAlumno,
  type ActualizarAlumnoPayload,
  type RegistrarCobroPayload,
} from '../services/admision'
import Modal from '../../../components/ui/Modal'
import { useCarreras } from '../hooks/useCarreras'
import { useCredencialPdf } from '../hooks/useCredencialPdf'
import { useLibroRegistroNcPdf } from '../hooks/useLibroRegistroNcPdf'
import { useInscripcionPdf, type TipoInscripcionPdf } from '../hooks/useInscripcionPdf'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'

// ── Catálogos de estatus ──────────────────────────────────────────────────────

const ESTATUS_LABEL: Record<EstatusAlumno, string> = {
  activo:           'Activo',
  baja_temporal:    'Baja temporal',
  baja_definitiva:  'Baja definitiva',
  egresado:         'Egresado',
  titulado:         'Titulado',
}

const ESTATUS_STYLE: Record<EstatusAlumno, string> = {
  activo:           'bg-emerald-100 text-emerald-700',
  baja_temporal:    'bg-yellow-100  text-yellow-700',
  baja_definitiva:  'bg-red-100     text-red-700',
  egresado:         'bg-blue-100    text-blue-700',
  titulado:         'bg-purple-100  text-purple-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function apellidosNombre(a: Alumno) {
  const asp = a.inscripcion?.aspirante
  if (!asp) return '—'
  return [asp.apellido_paterno, asp.apellido_materno, ',', asp.nombres]
    .filter(Boolean).join(' ').replace(', ,', ',')
}

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

// ── Modal edición ─────────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'
const LABEL_CLS = 'block text-xs font-medium text-slate-600 mb-1'

interface AspiranteForm {
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  curp: string
  email: string
  telefono: string
}

function EditModal({ alumno, onClose }: { alumno: Alumno; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const { success, error: toastError } = useToastStore()

  const asp = alumno.inscripcion?.aspirante

  const [form, setForm] = useState<ActualizarAlumnoPayload>({
    estatus:                              alumno.estatus,
    semestre_actual:                      alumno.semestre_actual,
    carrera_id:                           alumno.carrera?.id,
    pendiente_certificado_bachillerato:   alumno.pendiente_certificado_bachillerato,
    autorizacion_consulta_expediente:     alumno.autorizacion_consulta_expediente,
    observaciones_estatus:                alumno.observaciones_estatus ?? '',
  })

  const [aspForm, setAspForm] = useState<AspiranteForm>({
    nombres:          asp?.nombres          ?? '',
    apellido_paterno: asp?.apellido_paterno ?? '',
    apellido_materno: asp?.apellido_materno ?? '',
    curp:             asp?.curp             ?? '',
    email:            asp?.email            ?? '',
    telefono:         asp?.telefono         ?? '',
  })

  const aspiranteId = alumno.inscripcion?.aspirante_id

  const { mutate, isPending } = useMutation({
    mutationFn: async (p: ActualizarAlumnoPayload) => {
      const promises: Promise<unknown>[] = [admisionApi.actualizarAlumno(alumno.id, p)]
      if (aspiranteId) {
        promises.push(admisionApi.actualizarAspirante(aspiranteId, aspForm))
      }
      await Promise.all(promises)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumnos'] }); success('Alumno actualizado.'); onClose() },
    onError:   () => toastError('Error al actualizar. Intenta de nuevo.'),
  })

  return (
    <Modal title={`Editar alumno — ${alumno.numero_control}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutate(form) }} className="space-y-5">

        {/* Datos personales */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Nombres</label>
              <input
                value={aspForm.nombres}
                onChange={e => setAspForm(f => ({ ...f, nombres: e.target.value }))}
                className={INPUT_CLS}
                placeholder="Nombres"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Apellido paterno</label>
              <input
                value={aspForm.apellido_paterno}
                onChange={e => setAspForm(f => ({ ...f, apellido_paterno: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Apellido materno</label>
              <input
                value={aspForm.apellido_materno}
                onChange={e => setAspForm(f => ({ ...f, apellido_materno: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>CURP</label>
              <input
                value={aspForm.curp}
                onChange={e => setAspForm(f => ({ ...f, curp: e.target.value.toUpperCase() }))}
                className={`${INPUT_CLS} font-mono uppercase`}
                maxLength={18}
                placeholder="18 caracteres"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Teléfono</label>
              <input
                value={aspForm.telefono}
                onChange={e => setAspForm(f => ({ ...f, telefono: e.target.value }))}
                className={INPUT_CLS}
                placeholder="10 dígitos"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Correo electrónico</label>
              <input
                type="email"
                value={aspForm.email}
                onChange={e => setAspForm(f => ({ ...f, email: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
          </div>
        </div>

        {/* Datos académicos */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos académicos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Carrera</label>
              <select
                value={form.carrera_id ?? ''}
                onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))}
                className={`${INPUT_CLS} bg-white`}
              >
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Semestre actual</label>
              <input
                type="number" min={1} max={12}
                value={form.semestre_actual}
                onChange={e => setForm(f => ({ ...f, semestre_actual: Number(e.target.value) }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Estatus</label>
              <select
                value={form.estatus}
                onChange={e => setForm(f => ({ ...f, estatus: e.target.value as EstatusAlumno }))}
                className={`${INPUT_CLS} bg-white`}
              >
                {Object.entries(ESTATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="cert" type="checkbox"
            checked={form.pendiente_certificado_bachillerato}
            onChange={e => setForm(f => ({ ...f, pendiente_certificado_bachillerato: e.target.checked }))}
            className="w-4 h-4 accent-[#1a3a5c]"
          />
          <label htmlFor="cert" className="text-sm text-slate-700">Pendiente certificado de bachillerato</label>
        </div>

        <div>
          <label className={LABEL_CLS}>Autorización consulta de expediente (TecNM-AC-PO-001-04)</label>
          <select
            value={form.autorizacion_consulta_expediente ?? ''}
            onChange={e => setForm(f => ({ ...f, autorizacion_consulta_expediente: e.target.value }))}
            className={`${INPUT_CLS} bg-white`}
          >
            <option value="padre">Padre</option>
            <option value="madre">Madre</option>
            <option value="ambos">Ambos (padre y madre)</option>
            <option value="tutor">Tutor legal</option>
            <option value="otro">Otro</option>
            <option value="nadie">Nadie — No entregar documentos a terceros</option>
          </select>
          {form.autorizacion_consulta_expediente === 'nadie' && (
            <p className="mt-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5 font-medium">
              RESTRICCIÓN TOTAL: No entregar documentos a terceros aunque presenten carta poder.
            </p>
          )}
        </div>

        <div>
          <label className={LABEL_CLS}>Observaciones</label>
          <textarea
            rows={3}
            value={form.observaciones_estatus ?? ''}
            onChange={e => setForm(f => ({ ...f, observaciones_estatus: e.target.value }))}
            className={`${INPUT_CLS} resize-none`}
            placeholder="Motivo del cambio de estatus, notas…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal cobro ───────────────────────────────────────────────────────────────

function CobroModal({ alumno, onClose }: { alumno: Alumno; onClose: () => void }) {
  const asp = alumno.inscripcion?.aspirante
  const [form, setForm] = useState<Omit<RegistrarCobroPayload, 'inscripcion_id' | 'alumno_id'>>({
    folio_fiscal:           '',
    nombre_pagador:         asp ? `${asp.apellido_paterno} ${asp.apellido_materno ?? ''} ${asp.nombres}`.trim() : '',
    rfc_pagador:            '',
    concepto:               'Cuota de inscripción',
    importe:                0,
    sello_digital_cfdi:     '',
    numero_certificado_sat: '',
  })
  const [reciboId, setReciboId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const { success: toastSuccess, error: toastError } = useToastStore()

  const abrirPdf = async (id: string) => {
    try {
      const resp = await apiClient.get(`/cobros-inscripcion/${id}/recibo/pdf`, { responseType: 'blob' })
      openPdfPreview(new Blob([resp.data], { type: 'application/pdf' }), `recibo-${alumno.numero_control}.pdf`)
    } catch {
      toastError('No se pudo generar el recibo PDF.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const recibo = await admisionApi.registrarCobro({ inscripcion_id: alumno.inscripcion_id, alumno_id: alumno.id, ...form })
      setReciboId(recibo.id)
      toastSuccess('Cobro CFDI registrado correctamente.')
    } catch {
      toastError('Error al registrar el cobro. Verifica que el Folio Fiscal no esté duplicado.')
    } finally {
      setCargando(false)
    }
  }

  if (reciboId) {
    return (
      <Modal title="Cobro registrado" onClose={onClose}>
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p className="text-sm text-slate-700">Recibo registrado correctamente.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => abrirPdf(reciboId)} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors">
              Ver recibo PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Registrar cobro — ${alumno.numero_control}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Folio Fiscal (UUID CFDI del SAT) *</label>
            <input required value={form.folio_fiscal} onChange={e => setForm(f => ({ ...f, folio_fiscal: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del pagador *</label>
            <input required value={form.nombre_pagador} onChange={e => setForm(f => ({ ...f, nombre_pagador: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">RFC del pagador</label>
            <input value={form.rfc_pagador} onChange={e => setForm(f => ({ ...f, rfc_pagador: e.target.value.toUpperCase() }))}
              placeholder="XAXX010101000" maxLength={13}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Concepto *</label>
            <input required value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Importe (MXN) *</label>
            <input required type="number" min={0.01} step={0.01} value={form.importe || ''}
              onChange={e => setForm(f => ({ ...f, importe: parseFloat(e.target.value) }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">N° Certificado SAT</label>
            <input value={form.numero_certificado_sat} onChange={e => setForm(f => ({ ...f, numero_certificado_sat: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Sello Digital CFDI</label>
            <textarea rows={2} value={form.sello_digital_cfdi} onChange={e => setForm(f => ({ ...f, sello_digital_cfdi: e.target.value }))}
              placeholder="Cadena del sello digital emitida por el SAT…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={cargando} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors">
            {cargando ? 'Registrando…' : 'Registrar cobro'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Fila expandible ───────────────────────────────────────────────────────────

const DOCS_INSCRIPCION: { tipo: TipoInscripcionPdf; label: string; icon: string }[] = [
  { tipo: 'solicitud',             label: 'Solicitud inscripción', icon: '📋' },
  { tipo: 'carta-compromiso',      label: 'Carta compromiso',      icon: '✍️' },
  { tipo: 'carta-compromiso-docs', label: 'Carta docs',            icon: '📄' },
  { tipo: 'contrato',              label: 'Contrato',              icon: '📝' },
]

function FilaAlumno({
  alumno,
  expanded,
  onToggle,
  onEditar,
  onCobro,
  onCredencial,
  generandoCredencial,
  onInscripcionPdf,
  generandoInscPdf,
}: {
  alumno: Alumno
  expanded: boolean
  onToggle: () => void
  onEditar: () => void
  onCobro: () => void
  onCredencial: () => void
  generandoCredencial: string | null
  onInscripcionPdf: (tipo: TipoInscripcionPdf) => void
  generandoInscPdf: TipoInscripcionPdf | null
}) {
  const asp = alumno.inscripcion?.aspirante

  return (
    <>
      {/* ── Fila principal ── */}
      <tr
        onClick={onToggle}
        className={`cursor-pointer select-none transition-colors ${
          expanded ? 'bg-[#1a3a5c]/10' : 'hover:bg-blue-50/60'
        }`}
      >
        {/* Chevron */}
        <td className={`pl-4 pr-2 py-3.5 w-8 border-l-4 ${expanded ? 'border-[#1a3a5c]' : 'border-transparent'}`}>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90 text-[#1a3a5c]' : 'text-slate-400'}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
          </svg>
        </td>

        {/* N° Control */}
        <td className="px-3 py-3.5">
          <span className={`font-mono text-xs font-semibold ${expanded ? 'text-[#1a3a5c]' : 'text-slate-700'}`}>{alumno.numero_control}</span>
        </td>

        {/* Nombre */}
        <td className="px-3 py-3.5">
          <p className={`font-medium text-sm leading-snug ${expanded ? 'text-[#1a3a5c]' : 'text-slate-800'}`}>{apellidosNombre(alumno)}</p>
          {asp && <p className="text-xs text-slate-400 mt-0.5">{asp.email}</p>}
        </td>

        {/* Carrera */}
        <td className="px-3 py-3.5 hidden sm:table-cell">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-600">
            {alumno.carrera?.clave ?? '—'}
          </span>
        </td>

        {/* Semestre */}
        <td className="px-3 py-3.5 hidden md:table-cell">
          <span className="text-sm font-semibold text-slate-600">{alumno.semestre_actual}°</span>
        </td>

        {/* Cert. */}
        <td className="px-3 py-3.5 hidden lg:table-cell">
          {alumno.pendiente_certificado_bachillerato
            ? <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                </svg>
                Pendiente
              </span>
            : <span className="text-xs text-emerald-600 font-medium">✓ OK</span>
          }
        </td>

        {/* Estatus */}
        <td className="px-3 py-3.5 pr-5 text-right">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_STYLE[alumno.estatus]}`}>
            {ESTATUS_LABEL[alumno.estatus]}
          </span>
        </td>
      </tr>

      {/* ── Panel expandido ── */}
      {expanded && (
        <tr className="bg-[#1a3a5c]/[0.07]">
          <td colSpan={7} className="px-0 pb-0 border-l-4 border-[#1a3a5c]">
            <div className="mx-4 mb-4 mt-2 bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">

              {/* Datos */}
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos del alumno</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Nombre completo</p>
                    <p className="font-medium text-slate-700 mt-0.5">{apellidosNombre(alumno)}</p>
                  </div>
                  {asp && (
                    <>
                      <div>
                        <p className="text-xs text-slate-400">CURP</p>
                        <p className="font-mono text-xs text-slate-600 mt-0.5">{asp.curp}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Correo electrónico</p>
                        <p className="text-slate-700 text-xs mt-0.5">{asp.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Teléfono</p>
                        <p className="text-slate-700 mt-0.5">{asp.telefono ?? '—'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">N° Control</p>
                    <p className="font-mono font-semibold text-slate-700 mt-0.5">{alumno.numero_control}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Carrera</p>
                    <p className="text-slate-700 mt-0.5">
                      <span className="font-mono font-semibold">{alumno.carrera?.clave}</span>
                      <span className="text-xs text-slate-400 ml-1">— {alumno.carrera?.nombre}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Semestre actual</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{alumno.semestre_actual}°</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Periodo de ingreso</p>
                    <p className="text-slate-700 text-xs mt-0.5">{alumno.periodo_ingreso?.nombre ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tipo de ingreso</p>
                    <p className="text-slate-700 capitalize mt-0.5">
                      {alumno.inscripcion?.tipo_ingreso?.replace(/_/g, ' ') ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Fecha de inscripción</p>
                    <p className="text-slate-700 mt-0.5">{alumno.inscripcion?.fecha_inscripcion ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Certificado bachillerato</p>
                    <p className={`mt-0.5 text-sm font-medium ${alumno.pendiente_certificado_bachillerato ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {alumno.pendiente_certificado_bachillerato ? 'Pendiente' : 'Entregado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Autorización expediente</p>
                    <p className={`mt-0.5 text-sm font-semibold capitalize ${alumno.autorizacion_consulta_expediente === 'nadie' ? 'text-red-700' : 'text-slate-700'}`}>
                      {alumno.autorizacion_consulta_expediente === 'nadie' ? 'NADIE — NO entregar docs a terceros' : (alumno.autorizacion_consulta_expediente ?? '—')}
                    </p>
                  </div>
                  {alumno.observaciones_estatus && (
                    <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                      <p className="text-xs text-slate-400">Observaciones</p>
                      <p className="text-slate-600 text-xs mt-0.5 italic">{alumno.observaciones_estatus}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-slate-50/60">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Acciones</span>

                <button
                  onClick={(e) => { e.stopPropagation(); onEditar() }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
                  </svg>
                  Editar
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onCobro() }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>
                  </svg>
                  Registrar cobro
                </button>

                <div className="flex flex-wrap items-center gap-1.5 ml-1 pl-3 border-l border-slate-200">
                  <span className="text-xs text-slate-400 mr-0.5">Documentos:</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCredencial() }}
                    disabled={generandoCredencial === alumno.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-wait"
                  >
                    {generandoCredencial === alumno.id ? <Spinner className="w-3 h-3" /> : <span className="text-sm leading-none">🪪</span>}
                    Credencial
                  </button>
                  {alumno.inscripcion?.id && DOCS_INSCRIPCION.map(({ tipo, label, icon }) => (
                    <button
                      key={tipo}
                      onClick={(e) => { e.stopPropagation(); onInscripcionPdf(tipo) }}
                      disabled={generandoInscPdf === tipo}
                      title={label}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-wait"
                    >
                      {generandoInscPdf === tipo ? <Spinner className="w-3 h-3" /> : <span className="text-sm leading-none">{icon}</span>}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlumnosPage() {
  const [filtros, setFiltros]       = useState({ search: '', estatus: '', semestre: '', carrera_id: '', page: 1 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editando, setEditando]     = useState<Alumno | null>(null)
  const [cobrando, setCobrando]     = useState<Alumno | null>(null)

  const { descargar: descargarCredencial, generando: generandoCredencial } = useCredencialPdf()
  const { descargar: descargarLibroNc,   generando: generandoLibroNc }    = useLibroRegistroNcPdf()
  const { descargar: descargarInscPdf,   generando: generandoInscPdf }    = useInscripcionPdf()
  const { data: carreras = [] } = useCarreras()

  const { data, isLoading } = useQuery({
    queryKey: ['alumnos', filtros],
    queryFn: () => admisionApi.getAlumnos({
      search:     filtros.search     || undefined,
      estatus:    filtros.estatus    || undefined,
      semestre:   filtros.semestre   ? Number(filtros.semestre) : undefined,
      carrera_id: filtros.carrera_id || undefined,
      page:       filtros.page,
    }),
  })

  const alumnos      = data?.data       ?? []
  const totalPaginas = data?.last_page  ?? 1

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Alumnos inscritos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.total} alumno${data.total !== 1 ? 's' : ''} registrado${data.total !== 1 ? 's' : ''}` : 'Gestión de alumnos'}
          </p>
        </div>

        <button
          onClick={() => descargarLibroNc()}
          disabled={generandoLibroNc}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {generandoLibroNc ? <Spinner /> : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
            </svg>
          )}
          Libro Registro NC
        </button>
      </div>

      {/* ── Card ── */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">

        {/* Filtros */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre o número de control…"
              value={filtros.search}
              onChange={e => setFiltros(f => ({ ...f, search: e.target.value, page: 1 }))}
              className="flex-1 min-w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
            <select
              value={filtros.carrera_id}
              onChange={e => setFiltros(f => ({ ...f, carrera_id: e.target.value, page: 1 }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 bg-white"
            >
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
            <select
              value={filtros.estatus}
              onChange={e => setFiltros(f => ({ ...f, estatus: e.target.value, page: 1 }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 bg-white"
            >
              <option value="">Todos los estatus</option>
              {Object.entries(ESTATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              value={filtros.semestre}
              onChange={e => setFiltros(f => ({ ...f, semestre: e.target.value, page: 1 }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 bg-white"
            >
              <option value="">Todos los semestres</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
                <option key={s} value={s}>Semestre {s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cargando */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400 text-sm">
            <Spinner /> Cargando alumnos…
          </div>
        )}

        {/* Vacío */}
        {!isLoading && alumnos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
            </svg>
            <p className="text-sm">Sin alumnos registrados con los filtros seleccionados.</p>
          </div>
        )}

        {/* Tabla */}
        {!isLoading && alumnos.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-8 pl-4"/>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">N° Control</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Alumno</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Carrera</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Sem.</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Certificado</th>
                  <th className="text-right px-3 pr-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alumnos.map((a) => (
                  <FilaAlumno
                    key={a.id}
                    alumno={a}
                    expanded={expandedId === a.id}
                    onToggle={() => toggle(a.id)}
                    onEditar={() => { setEditando(a) }}
                    onCobro={() => { setCobrando(a) }}
                    onCredencial={() => descargarCredencial(a)}
                    generandoCredencial={generandoCredencial}
                    onInscripcionPdf={(tipo) => {
                      const inscId = a.inscripcion?.id
                      if (inscId) descargarInscPdf(inscId, tipo)
                    }}
                    generandoInscPdf={generandoInscPdf}
                  />
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Página <span className="font-medium text-slate-600">{filtros.page}</span> de {totalPaginas}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-medium text-slate-600">{data?.total}</span> resultados
                </p>
                <div className="flex gap-1.5 justify-center">
                  <button
                    disabled={filtros.page <= 1}
                    onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
                    </svg>
                    Anterior
                  </button>
                  <button
                    disabled={filtros.page >= totalPaginas}
                    onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editando && <EditModal  alumno={editando} onClose={() => setEditando(null)} />}
      {cobrando && <CobroModal alumno={cobrando} onClose={() => setCobrando(null)} />}
    </div>
  )
}
