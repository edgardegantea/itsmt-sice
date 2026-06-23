import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  admisionApi,
  type Alumno,
  type EstatusAlumno,
  type ActualizarAlumnoPayload,
} from '../services/admision'
import Modal from '../../../components/ui/Modal'
import { useCarrerasAdmin } from '../hooks/useCarreras'
import { useCredencialPdf } from '../hooks/useCredencialPdf'
import { useInscripcionPdf, type TipoInscripcionPdf } from '../hooks/useInscripcionPdf'
import { useToastStore } from '../../../store/toastStore'
import { useMutation } from '@tanstack/react-query'

// ── Catálogos ─────────────────────────────────────────────────────────────────

const ESTATUS_LABEL: Record<EstatusAlumno, string> = {
  activo:           'Activo',
  baja_temporal:    'Baja temporal',
  baja_definitiva:  'Baja definitiva',
  egresado:         'Egresado',
  titulado:         'Titulado',
}

const ESTATUS_STYLE: Record<EstatusAlumno, string> = {
  activo:           'bg-emerald-100 text-emerald-700',
  baja_temporal:    'bg-yellow-100 text-yellow-700',
  baja_definitiva:  'bg-red-100 text-red-700',
  egresado:         'bg-blue-100 text-blue-700',
  titulado:         'bg-purple-100 text-purple-700',
}

const DOCS: { tipo: TipoInscripcionPdf; label: string }[] = [
  { tipo: 'solicitud',             label: 'Solicitud inscripción' },
  { tipo: 'carta-compromiso',      label: 'Carta compromiso' },
  { tipo: 'carta-compromiso-docs', label: 'Carta compromiso docs.' },
  { tipo: 'contrato',              label: 'Contrato estudiante' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'
const LABEL_CLS = 'block text-xs font-medium text-slate-600 mb-1'

function apellidosNombre(a: Alumno) {
  const asp = a.inscripcion?.aspirante
  if (!asp) return '—'
  return [asp.apellido_paterno, asp.apellido_materno, ',', asp.nombres]
    .filter(Boolean).join(' ').replace(', ,', ',')
}

function Campo({ label, value, mono, highlight }: { label: string; value?: string | null; mono?: boolean; highlight?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? 'font-mono' : ''} ${value ? (highlight ?? 'text-slate-800') : 'text-slate-300'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

// ── Modal edición ─────────────────────────────────────────────────────────────

function EditModal({ alumno, onClose }: { alumno: Alumno; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarrerasAdmin()
  const { success, error: toastError } = useToastStore()
  const asp = alumno.inscripcion?.aspirante

  const [form, setForm] = useState<ActualizarAlumnoPayload>({
    estatus:                            alumno.estatus,
    semestre_actual:                    alumno.semestre_actual,
    carrera_id:                         alumno.carrera?.id,
    pendiente_certificado_bachillerato: alumno.pendiente_certificado_bachillerato,
    autorizacion_consulta_expediente:   alumno.autorizacion_consulta_expediente,
    observaciones_estatus:              alumno.observaciones_estatus ?? '',
  })

  const [aspForm, setAspForm] = useState({
    nombres:          asp?.nombres          ?? '',
    apellido_paterno: asp?.apellido_paterno ?? '',
    apellido_materno: asp?.apellido_materno ?? '',
    curp:             asp?.curp             ?? '',
    email:            asp?.email            ?? '',
    telefono:         asp?.telefono         ?? '',
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (p: ActualizarAlumnoPayload) => {
      const promises: Promise<unknown>[] = [admisionApi.actualizarAlumno(alumno.id, p)]
      const aspiranteId = alumno.inscripcion?.aspirante_id
      if (aspiranteId) promises.push(admisionApi.actualizarAspirante(aspiranteId, aspForm))
      await Promise.all(promises)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumno', alumno.id] })
      success('Alumno actualizado.')
      onClose()
    },
    onError: () => toastError('Error al actualizar. Intenta de nuevo.'),
  })

  return (
    <Modal title={`Editar alumno — ${alumno.numero_control}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); mutate(form) }} className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Nombres</label>
              <input value={aspForm.nombres} onChange={e => setAspForm(f => ({ ...f, nombres: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Apellido paterno</label>
              <input value={aspForm.apellido_paterno} onChange={e => setAspForm(f => ({ ...f, apellido_paterno: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Apellido materno</label>
              <input value={aspForm.apellido_materno} onChange={e => setAspForm(f => ({ ...f, apellido_materno: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>CURP</label>
              <input value={aspForm.curp} onChange={e => setAspForm(f => ({ ...f, curp: e.target.value.toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9]/g,'').slice(0,18) }))}
                className={`${INPUT_CLS} font-mono uppercase`} maxLength={18} />
            </div>
            <div>
              <label className={LABEL_CLS}>Teléfono</label>
              <input value={aspForm.telefono} onChange={e => setAspForm(f => ({ ...f, telefono: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Correo electrónico</label>
              <input type="email" value={aspForm.email} onChange={e => setAspForm(f => ({ ...f, email: e.target.value }))} className={INPUT_CLS} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos académicos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Carrera</label>
              <select value={form.carrera_id ?? ''} onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))} className={`${INPUT_CLS} bg-white`}>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Semestre actual</label>
              <input type="number" min={1} max={12} value={form.semestre_actual} onChange={e => setForm(f => ({ ...f, semestre_actual: Number(e.target.value) }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Estatus</label>
              <select value={form.estatus} onChange={e => setForm(f => ({ ...f, estatus: e.target.value as EstatusAlumno }))} className={`${INPUT_CLS} bg-white`}>
                {Object.entries(ESTATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input id="cert" type="checkbox" checked={form.pendiente_certificado_bachillerato} onChange={e => setForm(f => ({ ...f, pendiente_certificado_bachillerato: e.target.checked }))} className="w-4 h-4 accent-[#1a3a5c]" />
          <label htmlFor="cert" className="text-sm text-slate-700">Pendiente certificado de bachillerato</label>
        </div>

        <div>
          <label className={LABEL_CLS}>Autorización consulta de expediente</label>
          <select value={form.autorizacion_consulta_expediente ?? ''} onChange={e => setForm(f => ({ ...f, autorizacion_consulta_expediente: e.target.value }))} className={`${INPUT_CLS} bg-white`}>
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
          <textarea rows={3} value={form.observaciones_estatus ?? ''} onChange={e => setForm(f => ({ ...f, observaciones_estatus: e.target.value }))} className={`${INPUT_CLS} resize-none`} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function AlumnoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [modalEditar, setModalEditar] = useState(false)

  const { data: alumno, isLoading, isError } = useQuery({
    queryKey: ['alumno', id],
    queryFn: () => admisionApi.getAlumno(id!),
    enabled: !!id,
  })

  const { descargar: descargarCredencial, generando: generandoCredencial } = useCredencialPdf()
  const { descargar: descargarInscPdf, generando: generandoInscPdf }       = useInscripcionPdf()

  if (isLoading) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>

  if (isError || !alumno) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No se encontró el alumno.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">← Volver</button>
      </div>
    )
  }

  const asp    = alumno.inscripcion?.aspirante
  const nombre = apellidosNombre(alumno)

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/alumnos')}
          className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{nombre}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTATUS_STYLE[alumno.estatus]}`}>
              {ESTATUS_LABEL[alumno.estatus]}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">{alumno.numero_control}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalEditar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
            </svg>
            Editar
          </button>
        </div>
      </div>

      {/* ── Datos académicos ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos académicos</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="N° Control" value={alumno.numero_control} mono />
          <Campo label="Carrera" value={alumno.carrera ? `${alumno.carrera.clave} — ${alumno.carrera.nombre}` : null} />
          <Campo label="Semestre actual" value={alumno.semestre_actual ? `${alumno.semestre_actual}°` : null} />
          <Campo label="Periodo de ingreso" value={alumno.periodo_ingreso?.nombre} />
          <Campo label="Tipo de ingreso" value={alumno.inscripcion?.tipo_ingreso?.replace(/_/g, ' ')} />
          <Campo label="Fecha de inscripción" value={alumno.inscripcion?.fecha_inscripcion ? new Date(alumno.inscripcion.fecha_inscripcion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
          <div>
            <p className="text-xs text-slate-400">Certificado de bachillerato</p>
            <p className={`mt-0.5 text-sm font-semibold ${alumno.pendiente_certificado_bachillerato ? 'text-orange-600' : 'text-emerald-600'}`}>
              {alumno.pendiente_certificado_bachillerato ? 'Pendiente' : 'Entregado'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Autorización expediente</p>
            <p className={`mt-0.5 text-sm font-semibold capitalize ${alumno.autorizacion_consulta_expediente === 'nadie' ? 'text-red-700' : 'text-slate-700'}`}>
              {alumno.autorizacion_consulta_expediente === 'nadie'
                ? 'NADIE — NO entregar docs a terceros'
                : (alumno.autorizacion_consulta_expediente ?? '—')}
            </p>
          </div>
          {alumno.observaciones_estatus && (
            <div className="col-span-full">
              <p className="text-xs text-slate-400">Observaciones</p>
              <p className="mt-0.5 text-sm text-slate-600 italic">{alumno.observaciones_estatus}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Datos personales ── */}
      {asp && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos personales</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <Campo label="CURP" value={asp.curp} mono />
            <Campo label="Correo electrónico" value={asp.email} />
            <Campo label="Teléfono" value={asp.telefono} />
          </div>
        </div>
      )}

      {/* ── Documentos ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documentos</h2>
        </div>
        <div className="p-5 flex flex-wrap gap-2">
          <button
            onClick={() => descargarCredencial(alumno)}
            disabled={generandoCredencial === alumno.id}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-wait transition-colors"
          >
            {generandoCredencial === alumno.id ? <Spinner /> : <span className="text-base leading-none">🪪</span>}
            Credencial
          </button>

          {alumno.inscripcion?.id && DOCS.map(({ tipo, label }) => (
            <button
              key={tipo}
              onClick={() => descargarInscPdf(alumno.inscripcion!.id, tipo)}
              disabled={generandoInscPdf === tipo}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-wait transition-colors"
            >
              {generandoInscPdf === tipo
                ? <Spinner />
                : <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                  </svg>}
              {label}
            </button>
          ))}
        </div>
      </div>

      {modalEditar && <EditModal alumno={alumno} onClose={() => setModalEditar(false)} />}
    </div>
  )
}
