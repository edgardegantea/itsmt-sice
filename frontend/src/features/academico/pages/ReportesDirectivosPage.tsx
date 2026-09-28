import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls } from './tabs/shared'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ReportCardProps {
  title: string
  description: string
  onDownload: () => Promise<void>
  disabled?: boolean
}

function ReportCard({ title, description, onDownload, disabled }: ReportCardProps) {
  const [loading, setLoading] = useState(false)
  const toastError = useToastStore(s => s.error)

  async function handleClick() {
    setLoading(true)
    try {
      await onDownload()
    } catch {
      toastError(`Error al generar ${title}.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {loading ? 'Generando...' : 'Descargar PDF'}
      </button>
    </div>
  )
}

/** Tarjeta de indicadores de acreditación — necesita periodo (y opcionalmente
 * generación para eficiencia terminal), así que no encaja en el ReportCard genérico
 * de un solo clic. */
function ReporteAcreditacionCard() {
  const { data: periodoActivo } = usePeriodoActivo()
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo?: boolean }[]),
  })
  const [periodoId, setPeriodoId] = useState('')
  const [generacion, setGeneracion] = useState('')
  const [loading, setLoading] = useState(false)
  const toastError = useToastStore(s => s.error)

  const periodoSeleccionado = periodoId || periodoActivo?.id || ''

  async function handleDescargar() {
    if (!periodoSeleccionado) return
    setLoading(true)
    try {
      const blob = await academicoApi.descargarReporteAcreditacion({
        periodo_id: periodoSeleccionado,
        generacion: generacion ? Number(generacion) : undefined,
      })
      downloadBlob(blob, 'indicadores_acreditacion.pdf')
    } catch {
      toastError('Error al generar el reporte de acreditación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-[220px]">
        <h3 className="font-semibold text-slate-800">Indicadores de Acreditación (CACEI / ISO)</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Matrícula, promedio, % aprobación/reprobación, deserción y eficiencia terminal por carrera, en un solo PDF.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <select value={periodoSeleccionado} onChange={e => setPeriodoId(e.target.value)} className={`${selectCls} max-w-[220px]`}>
            <option value="">Selecciona un periodo…</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
          <input
            type="number"
            min={2000}
            max={2100}
            value={generacion}
            onChange={e => setGeneracion(e.target.value)}
            placeholder="Generación (opcional)"
            className={`${inputCls} max-w-[180px]`}
          />
        </div>
      </div>
      <button
        onClick={handleDescargar}
        disabled={loading || !periodoSeleccionado}
        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {loading ? 'Generando...' : 'Descargar PDF'}
      </button>
    </div>
  )
}

export default function ReportesDirectivosPage() {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes Directivos</h1>
          <p className="text-sm text-slate-500 mt-1">Descarga reportes institucionales en formato PDF</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Reportes de Matrícula</h2>
          <ReportCard
            title="Reporte de Matrícula"
            description="Listado completo de alumnos inscritos, reinscripciones y bajas del periodo activo."
            onDownload={async () => {
              const blob = await academicoApi.descargarReporteMatricula()
              downloadBlob(blob, 'reporte_matricula.pdf')
            }}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Reportes Académicos</h2>
          <ReportCard
            title="Reporte de Calificaciones"
            description="Calificaciones por grupo y materia. Jefes de carrera solo ven su carrera."
            onDownload={async () => {
              const blob = await academicoApi.descargarReporteCalificaciones()
              downloadBlob(blob, 'reporte_calificaciones.pdf')
            }}
          />
          <ReporteAcreditacionCard />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Directorios</h2>
          <ReportCard
            title="Directorio de Alumnos"
            description="Listado de alumnos activos con número de control, carrera, semestre y correo."
            onDownload={async () => {
              const blob = await academicoApi.descargarDirectorio('alumnos')
              downloadBlob(blob, 'directorio_alumnos.pdf')
            }}
          />
          <ReportCard
            title="Directorio de Docentes"
            description="Personal docente activo con especialidad, tipo de contrato y correo."
            onDownload={async () => {
              const blob = await academicoApi.descargarDirectorio('docentes')
              downloadBlob(blob, 'directorio_docentes.pdf')
            }}
          />
          <ReportCard
            title="Directorio de Egresados"
            description="Egresados registrados con situación laboral y datos de contacto actualizados."
            onDownload={async () => {
              const blob = await academicoApi.descargarDirectorio('egresados')
              downloadBlob(blob, 'directorio_egresados.pdf')
            }}
          />
        </div>
      </div>
    </div>
  )
}
