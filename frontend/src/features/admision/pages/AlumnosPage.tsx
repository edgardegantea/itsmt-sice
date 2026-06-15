import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admisionApi, type Alumno, type EstatusAlumno, type ActualizarAlumnoPayload, type RegistrarCobroPayload } from '../services/admision'
import Modal from '../../../components/ui/Modal'
import { useCarreras } from '../hooks/useCarreras'
import { useCredencialPdf } from '../hooks/useCredencialPdf'
import { useLibroRegistroNcPdf } from '../hooks/useLibroRegistroNcPdf'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'

const ESTATUS_LABEL: Record<EstatusAlumno, string> = {
  activo:           'Activo',
  baja_temporal:    'Baja temporal',
  baja_definitiva:  'Baja definitiva',
  egresado:         'Egresado',
  titulado:         'Titulado',
}

const ESTATUS_COLOR: Record<EstatusAlumno, string> = {
  activo:          'bg-green-100 text-green-800',
  baja_temporal:   'bg-yellow-100 text-yellow-800',
  baja_definitiva: 'bg-red-100 text-red-800',
  egresado:        'bg-blue-100 text-blue-800',
  titulado:        'bg-purple-100 text-purple-800',
}

function nombreCompleto(a: Alumno) {
  const asp = a.inscripcion?.aspirante
  if (!asp) return '—'
  return [asp.nombres, asp.apellido_paterno, asp.apellido_materno].filter(Boolean).join(' ')
}

// ── Modal de edición ──────────────────────────────────────────────────────────

interface EditModalProps {
  alumno: Alumno
  onClose: () => void
}

function EditModal({ alumno, onClose }: EditModalProps) {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const { success, error: toastError } = useToastStore()
  const [form, setForm] = useState<ActualizarAlumnoPayload>({
    estatus:                            alumno.estatus,
    semestre_actual:                    alumno.semestre_actual,
    carrera_id:                         alumno.carrera?.id,
    pendiente_certificado_bachillerato: alumno.pendiente_certificado_bachillerato,
    observaciones_estatus:              alumno.observaciones_estatus ?? '',
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: ActualizarAlumnoPayload) => admisionApi.actualizarAlumno(alumno.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos'] })
      success('Datos del alumno actualizados correctamente.')
      onClose()
    },
    onError: () => toastError('Error al actualizar. Intenta de nuevo.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(form)
  }

  return (
    <Modal title={`Editar alumno — ${alumno.numero_control}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info alumno (sólo lectura) */}
        {alumno.inscripcion?.aspirante && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 space-y-0.5">
            <p className="font-medium text-slate-800">{nombreCompleto(alumno)}</p>
            <p className="text-xs">{alumno.inscripcion.aspirante.email} · CURP: {alumno.inscripcion.aspirante.curp}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select
              value={form.carrera_id ?? ''}
              onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 bg-white"
            >
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.clave})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestre actual</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.semestre_actual}
              onChange={e => setForm(f => ({ ...f, semestre_actual: Number(e.target.value) }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estatus</label>
            <select
              value={form.estatus}
              onChange={e => setForm(f => ({ ...f, estatus: e.target.value as EstatusAlumno }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 bg-white"
            >
              {Object.entries(ESTATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="cert"
            type="checkbox"
            checked={form.pendiente_certificado_bachillerato}
            onChange={e => setForm(f => ({ ...f, pendiente_certificado_bachillerato: e.target.checked }))}
            className="w-4 h-4 accent-[#1a3a5c]"
          />
          <label htmlFor="cert" className="text-sm text-slate-700">Pendiente certificado de bachillerato</label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
          <textarea
            rows={3}
            value={form.observaciones_estatus ?? ''}
            onChange={e => setForm(f => ({ ...f, observaciones_estatus: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 resize-none"
            placeholder="Motivo del cambio de estatus, notas…"
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

// ── Modal Cobro CFDI (S1-11) ──────────────────────────────────────────────────

interface CobroModalProps {
  alumno: Alumno
  onClose: () => void
}

function CobroModal({ alumno, onClose }: CobroModalProps) {
  const asp = alumno.inscripcion?.aspirante
  const nombrePagadorDefault = asp
    ? `${asp.apellido_paterno} ${asp.apellido_materno ?? ''} ${asp.nombres}`.trim()
    : ''

  const [form, setForm] = useState<Omit<RegistrarCobroPayload, 'inscripcion_id' | 'alumno_id'>>({
    folio_fiscal:           '',
    nombre_pagador:         nombrePagadorDefault,
    rfc_pagador:            '',
    concepto:               'Cuota de inscripción',
    importe:                0,
    sello_digital_cfdi:     '',
    numero_certificado_sat: '',
  })
  const [reciboId, setReciboId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const { success: toastSuccess, error: toastError } = useToastStore()

  const abrirPdf = async (reciboId: string) => {
    try {
      const resp = await apiClient.get(`/cobros-inscripcion/${reciboId}/recibo/pdf`, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = blobUrl
      a.target = '_blank'
      a.rel = 'noopener'
      a.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    } catch {
      toastError('No se pudo generar el recibo PDF.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const recibo = await admisionApi.registrarCobro({
        inscripcion_id: alumno.inscripcion_id,
        alumno_id:      alumno.id,
        ...form,
      })
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-700">Recibo registrado correctamente.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => abrirPdf(reciboId)}
              className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors"
            >
              Imprimir recibo PDF
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
            <input
              required
              value={form.folio_fiscal}
              onChange={e => setForm(f => ({ ...f, folio_fiscal: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del pagador *</label>
            <input
              required
              value={form.nombre_pagador}
              onChange={e => setForm(f => ({ ...f, nombre_pagador: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">RFC del pagador</label>
            <input
              value={form.rfc_pagador}
              onChange={e => setForm(f => ({ ...f, rfc_pagador: e.target.value.toUpperCase() }))}
              placeholder="XAXX010101000"
              maxLength={13}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Concepto *</label>
            <input
              required
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Importe (MXN) *</label>
            <input
              required
              type="number"
              min={0.01}
              step={0.01}
              value={form.importe || ''}
              onChange={e => setForm(f => ({ ...f, importe: parseFloat(e.target.value) }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">N° Certificado SAT</label>
            <input
              value={form.numero_certificado_sat}
              onChange={e => setForm(f => ({ ...f, numero_certificado_sat: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Sello Digital CFDI</label>
            <textarea
              rows={2}
              value={form.sello_digital_cfdi}
              onChange={e => setForm(f => ({ ...f, sello_digital_cfdi: e.target.value }))}
              placeholder="Cadena del sello digital emitida por el SAT…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors"
          >
            {cargando ? 'Registrando…' : 'Registrar cobro'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlumnosPage() {
  const [filtros, setFiltros] = useState({ search: '', estatus: '', semestre: '', page: 1 })
  const [editando, setEditando] = useState<Alumno | null>(null)
  const [cobrando, setCobrando] = useState<Alumno | null>(null)

  const { error: toastError } = useToastStore()

  const { descargar: descargarCredencial, generando: generandoCredencial } = useCredencialPdf()
  const { descargar: descargarLibroNc,   generando: generandoLibroNc }    = useLibroRegistroNcPdf()

  const { data, isLoading } = useQuery({
    queryKey: ['alumnos', filtros],
    queryFn: () => admisionApi.getAlumnos({
      search:   filtros.search   || undefined,
      estatus:  filtros.estatus  || undefined,
      semestre: filtros.semestre ? Number(filtros.semestre) : undefined,
      page:     filtros.page,
    }),
  })

  const alumnos = data?.data ?? []
  const totalPaginas = data?.last_page ?? 1

  const cambiarFiltro = (key: keyof typeof filtros, valor: string) =>
    setFiltros(f => ({ ...f, [key]: valor, page: 1 }))



  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Alumnos inscritos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.total} alumno${data.total !== 1 ? 's' : ''} registrado${data.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          onClick={() => descargarLibroNc()}
          disabled={generandoLibroNc}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {generandoLibroNc
            ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generando…</>
            : 'Libro Registro NC (PDF)'
          }
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por nombre o número de control…"
          value={filtros.search}
          onChange={e => cambiarFiltro('search', e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
        />
        <select
          value={filtros.estatus}
          onChange={e => cambiarFiltro('estatus', e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
        >
          <option value="">Todos los estatus</option>
          {Object.entries(ESTATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filtros.semestre}
          onChange={e => cambiarFiltro('semestre', e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
        >
          <option value="">Todos los semestres</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
            <option key={s} value={s}>Semestre {s}</option>
          ))}
        </select>
      </div>

      {/* Tabla — escritorio */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">N° Control</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sem.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estatus</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cert. Bach.</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Cargando…</td></tr>
            )}
            {!isLoading && alumnos.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Sin alumnos registrados.</td></tr>
            )}
            {alumnos.map(a => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.numero_control}</td>
                <td className="px-4 py-3 text-slate-800">{nombreCompleto(a)}</td>
                <td className="px-4 py-3 text-slate-600">{a.carrera?.clave ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 text-center">{a.semestre_actual}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[a.estatus]}`}>
                    {ESTATUS_LABEL[a.estatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {a.pendiente_certificado_bachillerato
                    ? <span className="text-orange-500 text-xs font-medium">Pendiente</span>
                    : <span className="text-green-600 text-xs">OK</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => descargarCredencial(a)} disabled={generandoCredencial === a.id} className="text-xs text-slate-500 hover:text-slate-700 hover:underline">Credencial</button>
                    <button onClick={() => setCobrando(a)}     className="text-xs text-slate-500 hover:text-slate-700 hover:underline">Cobro</button>
                    <button onClick={() => setEditando(a)}     className="text-xs text-[#1a3a5c] hover:underline font-medium">Editar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — móvil */}
      <div className="md:hidden space-y-3">
        {isLoading && <p className="text-center text-slate-400 py-10">Cargando…</p>}
        {!isLoading && alumnos.length === 0 && (
          <p className="text-center text-slate-400 py-10">Sin alumnos registrados.</p>
        )}
        {alumnos.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800 text-sm">{nombreCompleto(a)}</p>
                <p className="font-mono text-xs text-slate-500 mt-0.5">{a.numero_control}</p>
              </div>
              <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[a.estatus]}`}>
                {ESTATUS_LABEL[a.estatus]}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>{a.carrera?.clave}</span>
              <span>Sem. {a.semestre_actual}</span>
              {a.pendiente_certificado_bachillerato && (
                <span className="text-orange-500 font-medium">Cert. pendiente</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => descargarCredencial(a)} disabled={generandoCredencial === a.id} className="flex-1 text-center text-xs text-slate-600 border border-slate-300 rounded-lg py-1.5 hover:bg-slate-50 transition-colors">Credencial</button>
              <button onClick={() => setCobrando(a)}     className="flex-1 text-center text-xs text-slate-600 border border-slate-300 rounded-lg py-1.5 hover:bg-slate-50 transition-colors">Cobro</button>
              <button onClick={() => setEditando(a)}     className="flex-1 text-center text-xs text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg py-1.5 hover:bg-[#1a3a5c]/5 transition-colors font-medium">Editar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={filtros.page <= 1}
            onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">
            Página {filtros.page} de {totalPaginas}
          </span>
          <button
            disabled={filtros.page >= totalPaginas}
            onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modales */}
      {editando && (
        <EditModal alumno={editando} onClose={() => setEditando(null)} />
      )}
      {cobrando && (
        <CobroModal alumno={cobrando} onClose={() => setCobrando(null)} />
      )}
    </div>
  )
}
