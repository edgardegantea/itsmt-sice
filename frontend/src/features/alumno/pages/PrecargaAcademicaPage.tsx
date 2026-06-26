import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi } from '../../academico/services/academico'
import type { CargaAcademica, Horario } from '../../academico/services/academico'
import { useState } from 'react'
import { useToastStore } from '../../../store/toastStore'

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS: Horario['dia_semana'][] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
const HORA_INICIO = 7
const HORA_FIN = 20
const SLOT_PX = 52

const COLORES = [
  { bg: 'bg-blue-100',    border: 'border-blue-400',    text: 'text-blue-900',    dimBg: 'bg-blue-50',    dimBorder: 'border-blue-200' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', dimBg: 'bg-emerald-50', dimBorder: 'border-emerald-200' },
  { bg: 'bg-violet-100',  border: 'border-violet-400',  text: 'text-violet-900',  dimBg: 'bg-violet-50',  dimBorder: 'border-violet-200' },
  { bg: 'bg-amber-100',   border: 'border-amber-400',   text: 'text-amber-900',   dimBg: 'bg-amber-50',   dimBorder: 'border-amber-200' },
  { bg: 'bg-pink-100',    border: 'border-pink-400',    text: 'text-pink-900',    dimBg: 'bg-pink-50',    dimBorder: 'border-pink-200' },
  { bg: 'bg-cyan-100',    border: 'border-cyan-400',    text: 'text-cyan-900',    dimBg: 'bg-cyan-50',    dimBorder: 'border-cyan-200' },
  { bg: 'bg-orange-100',  border: 'border-orange-400',  text: 'text-orange-900',  dimBg: 'bg-orange-50',  dimBorder: 'border-orange-200' },
  { bg: 'bg-rose-100',    border: 'border-rose-400',    text: 'text-rose-900',    dimBg: 'bg-rose-50',    dimBorder: 'border-rose-200' },
]

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ── HorarioGrid ───────────────────────────────────────────────────────────────

function HorarioGrid({
  cargas,
  colorMap,
  seleccionIds,
  onToggle,
  readonly = false,
}: {
  cargas: CargaAcademica[]
  colorMap: Record<string, typeof COLORES[0]>
  seleccionIds?: Set<string>
  onToggle?: (id: string) => void
  readonly?: boolean
}) {
  const horasRange = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const totalH = (HORA_FIN - HORA_INICIO) * SLOT_PX

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex" style={{ marginLeft: 52 }}>
          {DIAS.map(d => (
            <div key={d} className="flex-1 text-center text-xs font-semibold text-slate-500 py-1.5 border-b border-slate-200 uppercase tracking-wide">
              {DIA_LABEL[d]}
            </div>
          ))}
        </div>
        <div className="flex">
          <div className="shrink-0" style={{ width: 52 }}>
            {horasRange.map(h => (
              <div key={h} className="flex items-start justify-end pr-2 text-[10px] text-slate-400 border-b border-dashed border-slate-100"
                style={{ height: SLOT_PX }}>
                <span className="-translate-y-1.5">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {DIAS.map(dia => (
            <div key={dia} className="flex-1 relative border-l border-slate-100" style={{ height: totalH }}>
              {horasRange.map(h => (
                <div key={h} className="absolute left-0 right-0 border-b border-dashed border-slate-100"
                  style={{ top: (h - HORA_INICIO) * SLOT_PX }} />
              ))}
              {cargas.flatMap(c =>
                (c.horarios ?? [])
                  .filter(h => h.dia_semana === dia)
                  .map(h => {
                    const iniMin = toMin(h.hora_inicio)
                    const finMin = toMin(h.hora_fin)
                    const top = (iniMin - HORA_INICIO * 60) / 60 * SLOT_PX
                    const height = (finMin - iniMin) / 60 * SLOT_PX - 3
                    const col = colorMap[c.id] ?? COLORES[0]
                    const selected = readonly || (seleccionIds?.has(c.id) ?? false)
                    return (
                      <div key={h.id}
                        onClick={() => !readonly && onToggle?.(c.id)}
                        className={`absolute left-0.5 right-0.5 rounded border-l-4 px-1 py-0.5 text-[10px] leading-tight overflow-hidden
                          ${selected ? `${col.bg} ${col.border}` : `${col.dimBg} ${col.dimBorder}`}
                          ${col.text} ${selected ? '' : 'opacity-50'}
                          ${!readonly ? 'cursor-pointer hover:opacity-100 transition-opacity' : ''}`}
                        style={{ top, height }}
                        title={!readonly ? (selected ? 'Quitar de mi precarga' : 'Agregar a mi precarga') : undefined}
                      >
                        <div className="font-semibold truncate">{c.materia?.nombre}</div>
                        {c.aula && <div className="opacity-70 truncate">{c.aula.nombre}</div>}
                        <div className="opacity-60">{h.hora_inicio.slice(0,5)}–{h.hora_fin.slice(0,5)}</div>
                      </div>
                    )
                  })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── TablaAsignaturas ──────────────────────────────────────────────────────────

function TablaAsignaturas({
  cargas,
  colorMap,
  seleccionIds,
  onToggle,
  readonly = false,
  pendientes = false,
}: {
  cargas: CargaAcademica[]
  colorMap: Record<string, typeof COLORES[0]>
  seleccionIds: Set<string>
  onToggle: (id: string) => void
  readonly?: boolean
  pendientes?: boolean
}) {
  if (cargas.length === 0) return (
    <p className="px-4 py-6 text-sm text-slate-400 text-center">
      {pendientes ? 'No hay materias pendientes ofertadas en este periodo.' : 'No hay asignaturas disponibles.'}
    </p>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
          <tr>
            {!readonly && <th className="px-4 py-3 w-10"></th>}
            <th className="px-4 py-3 text-left">Asignatura</th>
            {pendientes && <th className="px-4 py-3 text-left">Semestre</th>}
            <th className="px-4 py-3 text-left">Docente</th>
            <th className="px-4 py-3 text-left">Aula</th>
            <th className="px-4 py-3 text-center">Hrs/sem</th>
            <th className="px-4 py-3 text-left">Horarios</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cargas.map(c => {
            const col = colorMap[c.id] ?? COLORES[0]
            const selected = seleccionIds.has(c.id)
            return (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!readonly && selected ? 'bg-blue-50/40' : ''}`}>
                {!readonly && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggle(c.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                        ${selected ? `${col.bg} ${col.text} ${col.border} border` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      title={selected ? 'Quitar de mi precarga' : 'Agregar a mi precarga'}
                    >
                      {selected ? '✓' : '+'}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${col.bg} border ${col.border}`}
                      style={{ opacity: selected || readonly ? 1 : 0.4 }} />
                    <div>
                      <div className={`font-medium ${selected || readonly ? 'text-slate-800' : 'text-slate-400'}`}>
                        {c.materia?.nombre}
                      </div>
                      <div className="text-xs text-slate-400">{c.materia?.clave}</div>
                    </div>
                  </div>
                </td>
                {pendientes && (
                  <td className="px-4 py-3">
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {c.grupo?.semestre}° sem
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-slate-600">{c.docente?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.aula?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-center text-slate-700">{c.horas_semana}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.horarios ?? []).map(h => (
                      <span key={h.id}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${col.bg} ${col.border} ${col.text}
                          ${!readonly && !selected ? 'opacity-40' : ''}`}>
                        {DIA_LABEL[h.dia_semana] ?? h.dia_semana} {h.hora_inicio.slice(0,5)}–{h.hora_fin.slice(0,5)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrecargaAcademicaPage() {
  const qc = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToastStore()
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['precarga-academica'],
    queryFn: academicoApi.getPrecargaAcademica,
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, seleccionado }: { id: string; seleccionado: boolean }) =>
      seleccionado ? academicoApi.deseleccionarCarga(id) : academicoApi.seleccionarCarga(id),
    onSuccess: (_, { seleccionado }) => {
      qc.invalidateQueries({ queryKey: ['precarga-academica'] })
      toastSuccess(seleccionado ? 'Asignatura quitada de tu precarga.' : 'Asignatura agregada a tu precarga.')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toastError(e?.response?.data?.message ?? 'No se pudo actualizar la selección.')
    },
  })

  function handleToggle(cargaId: string) {
    const yaSeleccionado = data?.seleccion_ids?.includes(cargaId) ?? false
    toggleMut.mutate({ id: cargaId, seleccionado: yaSeleccionado })
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await academicoApi.downloadPrecargaPdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `precarga-${data?.alumno?.numero_control ?? 'alumno'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError('Error al descargar el PDF.')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Cargando precarga académica…</div>
  )

  if (error || !data) return (
    <div className="p-6 text-red-600 bg-red-50 rounded-lg">
      Error al cargar la precarga académica. Intenta más tarde.
    </div>
  )

  if (!data.liberado) return (
    <div className="max-w-xl mx-auto mt-16 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Horarios no disponibles aún</h2>
      <p className="text-slate-500">
        La administración aún no ha liberado los horarios para el periodo{' '}
        <span className="font-medium text-slate-700">{data.periodo?.nombre}</span>.
        Revisa más tarde.
      </p>
    </div>
  )

  const modoSeleccion = data.modo === 'seleccion'
  const seleccionIds = new Set(data.seleccion_ids ?? [])

  // Semestre 1: lista única. Semestre 2+: separada en actuales + pendientes.
  const cargasSemestre  = modoSeleccion ? (data.cargas_semestre ?? []) : (data.cargas ?? [])
  const cargasPendientes = data.cargas_pendientes ?? []
  const tienePendientes  = data.tiene_pendientes ?? false
  const todasLasCargas  = data.cargas ?? []   // unión para el grid visual

  // Mapa de colores: primero semestre actual, luego pendientes con shift de índice
  const colorMap: Record<string, typeof COLORES[0]> = {}
  todasLasCargas.forEach((c, i) => { colorMap[c.id] = COLORES[i % COLORES.length] })

  const cargasSeleccionadas = todasLasCargas.filter(c => seleccionIds.has(c.id))
  const pdfDisabled = downloading || (modoSeleccion ? seleccionIds.size === 0 : todasLasCargas.length === 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pre-carga Académica</h1>
          <p className="text-slate-500 mt-1">
            Periodo: <span className="font-medium text-slate-700">{data.periodo.nombre}</span>
            {' · '}Semestre {data.alumno?.semestre}
            {modoSeleccion && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Selección libre
              </span>
            )}
            {tienePendientes && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Tienes materias pendientes
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={pdfDisabled}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloading
            ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
          }
          Descargar PDF
        </button>
      </div>

      {/* Aviso modo selección */}
      {modoSeleccion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-blue-800">
            Usa el botón <strong>+</strong> en la tabla o haz clic en un bloque del horario para agregar o quitar asignaturas.
            {tienePendientes && <> Las <strong>materias pendientes</strong> de semestres anteriores aparecen en la sección inferior.</>}
            {' '}El sistema bloquea automáticamente los conflictos de horario.
          </p>
        </div>
      )}

      {todasLasCargas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          No hay asignaturas disponibles para tu carrera y semestre en este periodo.
        </div>
      ) : (
        <>
          {/* ── Asignaturas del semestre actual ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-700">
                  {modoSeleccion
                    ? `Asignaturas del semestre ${data.alumno?.semestre}`
                    : 'Asignaturas del Semestre'}
                </h2>
                {modoSeleccion && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Puedes seleccionar las que quieras cursar
                  </p>
                )}
              </div>
              {modoSeleccion && (
                <span className="text-xs text-slate-500">
                  {cargasSemestre.filter(c => seleccionIds.has(c.id)).length} de {cargasSemestre.length} seleccionadas
                </span>
              )}
            </div>
            <TablaAsignaturas
              cargas={cargasSemestre}
              colorMap={colorMap}
              seleccionIds={seleccionIds}
              onToggle={handleToggle}
              readonly={!modoSeleccion}
            />
          </div>

          {/* ── Materias pendientes (repetidores) ── */}
          {modoSeleccion && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50">
                <div>
                  <h2 className="font-semibold text-amber-800">Materias pendientes de semestres anteriores</h2>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Asignaturas que reprobaste y están disponibles este periodo · Sin empalme de horario permitido
                  </p>
                </div>
                {cargasPendientes.length > 0 && (
                  <span className="text-xs text-amber-700 font-medium bg-amber-100 px-2 py-1 rounded-full">
                    {cargasPendientes.filter(c => seleccionIds.has(c.id)).length} de {cargasPendientes.length} seleccionadas
                  </span>
                )}
              </div>
              <TablaAsignaturas
                cargas={cargasPendientes}
                colorMap={colorMap}
                seleccionIds={seleccionIds}
                onToggle={handleToggle}
                pendientes
              />
            </div>
          )}

          {/* ── Horario semanal visual ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">
                {modoSeleccion ? 'Vista de horario — haz clic para seleccionar' : 'Horario Semanal'}
              </h2>
              {modoSeleccion && seleccionIds.size > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {seleccionIds.size} asignatura{seleccionIds.size !== 1 ? 's' : ''} en tu precarga
                </span>
              )}
            </div>
            <div className="p-3">
              <HorarioGrid
                cargas={todasLasCargas}
                colorMap={colorMap}
                seleccionIds={modoSeleccion ? seleccionIds : undefined}
                onToggle={modoSeleccion ? handleToggle : undefined}
                readonly={!modoSeleccion}
              />
            </div>
          </div>

          {/* ── Resumen de selección ── */}
          {modoSeleccion && cargasSeleccionadas.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">Mi precarga seleccionada</h2>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {cargasSeleccionadas.map(c => {
                    const col = colorMap[c.id] ?? COLORES[0]
                    const esPendiente = cargasPendientes.some(p => p.id === c.id)
                    return (
                      <div key={c.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm
                          ${col.bg} ${col.border} ${col.text}`}>
                        {esPendiente && <span className="text-[10px] bg-amber-200 text-amber-800 px-1 rounded">PEND</span>}
                        <span className="font-medium">{c.materia?.nombre}</span>
                        <button
                          onClick={() => handleToggle(c.id)}
                          disabled={toggleMut.isPending}
                          className="opacity-60 hover:opacity-100 transition-opacity font-bold"
                        >×</button>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400">
                  Total: {cargasSeleccionadas.reduce((s, c) => s + c.horas_semana, 0)} horas/semana
                  · {cargasSeleccionadas.length} asignatura{cargasSeleccionadas.length !== 1 ? 's' : ''}
                  {cargasSeleccionadas.some(c => cargasPendientes.some(p => p.id === c.id)) && (
                    <span className="ml-2 text-amber-600">
                      · incluye materias pendientes
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
