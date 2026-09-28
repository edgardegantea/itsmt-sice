import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { admisionApi } from '../services/admision'
import EstatusModal from '../components/EstatusModal'
import InscribirModal from '../components/InscribirModal'
import EditarAspiranteModal from '../components/EditarAspiranteModal'
import Badge from '../../../components/ui/Badge'
import { useInscripcionPdf, type TipoInscripcionPdf } from '../hooks/useInscripcionPdf'
import { ArrowLeft, CircleCheck, FileText, Loader2, Pencil, Plus } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function nombre(asp: { nombres: string; apellido_paterno: string; apellido_materno?: string | null }) {
  return [asp.apellido_paterno, asp.apellido_materno, ',', asp.nombres]
    .filter(Boolean).join(' ').replace(', ,', ',')
}

function Campo({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? 'font-mono' : ''} ${value ? 'text-slate-800' : 'text-slate-300'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
  )
}

const DOCS: { tipo: TipoInscripcionPdf; label: string }[] = [
  { tipo: 'solicitud',             label: 'Solicitud de inscripción' },
  { tipo: 'carta-compromiso',      label: 'Carta compromiso' },
  { tipo: 'carta-compromiso-docs', label: 'Carta compromiso docs.' },
  { tipo: 'contrato',              label: 'Contrato estudiante' },
]

// ── Página ────────────────────────────────────────────────────────────────────

export default function AspiranteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [modalEstatus,   setModalEstatus]   = useState(false)
  const [modalEditar,    setModalEditar]    = useState(false)
  const [modalInscribir, setModalInscribir] = useState(false)

  const { data: asp, isLoading, isError } = useQuery({
    queryKey: ['aspirante', id],
    queryFn: () => admisionApi.getAspirante(id!),
    enabled: !!id,
  })

  const { descargar, generando } = useInscripcionPdf()

  if (isLoading) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>

  if (isError || !asp) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No se encontró el aspirante.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-brand-600 hover:underline">← Volver</button>
      </div>
    )
  }

  const nombreCompleto = nombre(asp)
  const inscripcionId  = asp.inscripcion?.id ?? null

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/aspirantes')}
          className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{nombreCompleto}</h1>
            <Badge value={asp.estatus} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{asp.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalEditar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Editar
          </button>
          <button
            onClick={() => setModalEstatus(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <CircleCheck className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Cambiar estatus
          </button>
          {asp.estatus === 'aceptado' && !asp.inscripcion && (
            <button
              onClick={() => setModalInscribir(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <Plus className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Inscribir
            </button>
          )}
        </div>
      </div>

      {/* ── Datos personales ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos personales</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="CURP" value={asp.curp} mono />
          <Campo label="Fecha de nacimiento" value={asp.fecha_nacimiento ? new Date(asp.fecha_nacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null} />
          <Campo label="Sexo" value={asp.sexo ? asp.sexo.charAt(0).toUpperCase() + asp.sexo.slice(1) : null} />
          <Campo label="Estado civil" value={asp.estado_civil} />
          <Campo label="Teléfono" value={asp.telefono} />
          <Campo label="Municipio de procedencia" value={asp.municipio_procedencia} />
          <Campo label="Bachillerato de procedencia" value={asp.escuela_bachillerato} />
          <Campo label="Promedio de bachillerato" value={asp.promedio_bachillerato?.toFixed(1)} />
        </div>
      </div>

      {/* ── Datos de admisión ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos de admisión</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Carrera solicitada" value={asp.carrera?.nombre} />
          <Campo label="Periodo" value={asp.periodo?.nombre} />
          <Campo label="Turno preferido" value={asp.turno_preferido ? asp.turno_preferido.charAt(0).toUpperCase() + asp.turno_preferido.slice(1) : null} />
          <Campo label="N° ficha" value={asp.numero_ficha} mono />
          <Campo label="Folio preinscripción TecNM" value={asp.folio_preinscripcion_tecnm} mono />
          <Campo label="Folio EXANI-II" value={asp.folio_exani} mono />
          <Campo label="Puntaje EXANI-II" value={asp.puntaje_exani != null ? `${asp.puntaje_exani} pts` : null} />
          {asp.autorizacion_consulta_expediente && (
            <div className={`col-span-2 p-3 rounded-lg text-sm ${asp.autorizacion_consulta_expediente === 'nadie' ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Autorización consulta de expediente</p>
              <p className={`font-semibold capitalize ${asp.autorizacion_consulta_expediente === 'nadie' ? 'text-red-700' : 'text-slate-700'}`}>
                {asp.autorizacion_consulta_expediente === 'nadie'
                  ? 'NADIE — No entregar documentos a terceros bajo ninguna circunstancia'
                  : asp.autorizacion_consulta_expediente}
              </p>
            </div>
          )}
          {asp.observaciones && (
            <div className="col-span-full">
              <p className="text-xs text-slate-400">Observaciones</p>
              <p className="mt-0.5 text-sm text-slate-600 italic">{asp.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Documentos PDF ── */}
      {inscripcionId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documentos de inscripción</h2>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            {DOCS.map(({ tipo, label }) => (
              <button
                key={tipo}
                onClick={() => descargar(inscripcionId, tipo)}
                disabled={generando === tipo}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-wait transition-colors"
              >
                {generando === tipo
                  ? <Spinner />
                  : <FileText className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {modalEstatus && <EstatusModal aspirante={asp} onClose={() => setModalEstatus(false)} />}
      {modalEditar  && <EditarAspiranteModal aspirante={asp} onClose={() => setModalEditar(false)} />}
      {modalInscribir && <InscribirModal aspirante={asp} onClose={() => setModalInscribir(false)} />}
    </div>
  )
}
