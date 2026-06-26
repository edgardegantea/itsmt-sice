import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../../../../components/ConfirmDialog'
import { academicoApi, type Materia, type MateriaTemaTema } from '../../services/academico'
import { parseTecnmPdf } from '../../utils/tecnmPdfParser'
import { Field, SkeletonRows, inputCls, selectCls, icls, ModalWrap, extractApiErrors, mutationError, useCarreras } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// ── Chevron ───────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

type DetailTab = 'general' | 'programa' | 'bibliografia'

function MateriaDetail({
  materia: initialMateria,
  onClose,
  onEditar,
  onEliminar,
  onExtractAndEdit,
}: {
  materia: Materia
  onClose: () => void
  onEditar: (m: Materia) => void
  onEliminar: (m: Materia) => void
  onExtractAndEdit: (base: Materia, file: File) => void
}) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<DetailTab>('general')
  const fileRef = useRef<HTMLInputElement>(null)
  const extractRef = useRef<HTMLInputElement>(null)

  // Fetch full data (includes temario, fuentes, etc.)
  const { data: materia = initialMateria } = useQuery({
    queryKey: ['materia', initialMateria.id],
    queryFn: () => academicoApi.getMateria(initialMateria.id),
    initialData: initialMateria,
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => academicoApi.subirDocumentoMateria(materia.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materias'] })
      qc.invalidateQueries({ queryKey: ['materia', materia.id] })
      addToast('Documento subido.', 'success')
    },
    onError: () => addToast('Error al subir el documento.', 'error'),
  })

  const deleteDoc = useMutation({
    mutationFn: () => academicoApi.eliminarDocumentoMateria(materia.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materias'] })
      qc.invalidateQueries({ queryKey: ['materia', materia.id] })
      addToast('Documento eliminado.', 'success')
    },
    onError: () => addToast('Error al eliminar el documento.', 'error'),
  })

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const totalHoras = materia.horas_teoria + materia.horas_practica

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'programa', label: 'Programa' },
    { id: 'bibliografia', label: 'Bibliografía' },
  ]

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div className={`fixed top-0 right-0 h-full z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{materia.clave}</span>
                {materia.clave_oficial_tecnm && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-mono">{materia.clave_oficial_tecnm}</span>
                )}
                {materia.satca && (
                  <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded font-mono">SATCA {materia.satca}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${materia.tipo === 'obligatoria' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {materia.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{materia.nombre}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {materia.carrera?.clave} · {materia.semestre}° semestre
              </p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0">&times;</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Tab: General ── */}
          {tab === 'general' && (
            <div className="px-6 py-5 space-y-5">
              {/* Créditos / horas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{materia.creditos}</div>
                  <div className="text-xs text-blue-500 mt-0.5">Créditos</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{materia.horas_teoria}</div>
                  <div className="text-xs text-slate-500 mt-0.5">H. Teoría</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{materia.horas_practica}</div>
                  <div className="text-xs text-slate-500 mt-0.5">H. Práctica</div>
                </div>
              </div>

              {/* Barra de distribución */}
              {totalHoras > 0 && (
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Distribución de horas</span>
                    <span className="font-medium text-slate-700">{totalHoras}h/sem</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: `${(materia.horas_teoria / totalHoras) * 100}%` }} />
                    <div className="h-full bg-teal-400" style={{ width: `${(materia.horas_practica / totalHoras) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Teoría ({materia.horas_teoria}h)</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />Práctica ({materia.horas_practica}h)</span>
                  </div>
                </div>
              )}

              {/* Datos básicos */}
              <div className="space-y-0 divide-y divide-slate-100">
                {[
                  ['Carrera', materia.carrera ? `${materia.carrera.clave} — ${materia.carrera.nombre}` : '—'],
                  ['Semestre', `${materia.semestre}° semestre`],
                  ['Tipo', materia.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'],
                  ['Clave interna', materia.clave],
                  materia.clave_oficial_tecnm ? ['Clave TecNM', materia.clave_oficial_tecnm] : null,
                  materia.satca ? ['SATCA', materia.satca] : null,
                ].filter((x): x is [string, string] => x !== null).map(([label, val]) => (
                  <div key={label as string} className="flex items-start gap-3 py-2.5">
                    <span className="text-xs text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-slate-900 font-medium flex-1 font-mono">{val}</span>
                  </div>
                ))}
                <div className="flex items-start gap-3 py-2.5">
                  <span className="text-xs text-slate-400 w-32 shrink-0 pt-0.5">Estado</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${materia.activa ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${materia.activa ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {materia.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>

              {/* Documento */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Documento del programa</span>
                  {materia.documento_url && (
                    <button
                      onClick={() => deleteDoc.mutate()}
                      disabled={deleteDoc.isPending}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {materia.documento_url ? (
                  <a
                    href={materia.documento_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors group"
                  >
                    <svg className="w-8 h-8 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-700 truncate">Programa de asignatura</div>
                      <div className="text-xs text-red-400">PDF · clic para abrir</div>
                    </div>
                    <svg className="w-4 h-4 text-red-400 group-hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                  >
                    <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-slate-500">
                      {uploadDoc.isPending ? 'Subiendo…' : 'Clic para subir PDF o DOCX'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Máx. 20 MB</p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadDoc.mutate(f)
                    e.target.value = ''
                  }}
                />

                {materia.documento_url && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadDoc.isPending}
                    className="mt-2 w-full text-xs text-slate-400 hover:text-blue-600 disabled:opacity-40"
                  >
                    {uploadDoc.isPending ? 'Subiendo…' : 'Reemplazar documento'}
                  </button>
                )}
              </div>

              {/* Extracción de campos desde PDF */}
              <div className="border border-violet-200 bg-violet-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-violet-700 mb-1">Extraer campos del programa</p>
                <p className="text-xs text-violet-500 mb-3 leading-relaxed">
                  Sube el PDF del programa TecNM y se llenará automáticamente: competencia, temario, prácticas, evaluación y fuentes.
                </p>
                <button
                  onClick={() => extractRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Subir PDF y extraer información
                </button>
                <input
                  ref={extractRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { onExtractAndEdit(materia, f); handleClose() }
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Tab: Programa ── */}
          {tab === 'programa' && (
            <div className="px-6 py-5 space-y-5">
              {materia.competencia_especifica && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Competencia específica</h3>
                  <p className="text-sm text-slate-700 leading-relaxed bg-blue-50 rounded-xl p-4 border border-blue-100">{materia.competencia_especifica}</p>
                </section>
              )}
              {materia.competencias_previas && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Competencias previas</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{materia.competencias_previas}</p>
                </section>
              )}
              {materia.caracterizacion && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Caracterización</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{materia.caracterizacion}</p>
                </section>
              )}
              {materia.intencion_didactica && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Intención didáctica</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{materia.intencion_didactica}</p>
                </section>
              )}
              {materia.temario && materia.temario.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Temario</h3>
                  <ol className="space-y-3">
                    {materia.temario.map((t, i) => (
                      <li key={i} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-sm font-semibold text-slate-900">{t.tema}</span>
                        </div>
                        {t.subtemas && t.subtemas.length > 0 && (
                          <ul className="ml-8 space-y-1">
                            {t.subtemas.map((s, j) => (
                              <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-slate-300 mt-0.5">·</span>{s}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {materia.practicas && materia.practicas.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Prácticas</h3>
                  <div className="space-y-3">
                    {materia.practicas.map((p, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-slate-600 mb-2">{p.tema}</div>
                        <ul className="space-y-1">
                          {p.lista.map((item, j) => (
                            <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="text-slate-300 mt-0.5 shrink-0">·</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {materia.proyecto_asignatura && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Proyecto de asignatura</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{materia.proyecto_asignatura}</p>
                </section>
              )}
              {materia.evaluacion && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Evaluación</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{materia.evaluacion}</p>
                </section>
              )}
              {!materia.competencia_especifica && !materia.temario?.length && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No hay información del programa cargada.
                  <br /><span className="text-xs">Edita la materia para agregar el programa.</span>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Bibliografía ── */}
          {tab === 'bibliografia' && (
            <div className="px-6 py-5">
              {materia.fuentes_informacion && materia.fuentes_informacion.length > 0 ? (
                <ol className="space-y-2">
                  {materia.fuentes_informacion.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700 py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-300 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No hay fuentes de información registradas.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={() => { handleClose(); setTimeout(() => onEditar(materia), 260) }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => { handleClose(); setTimeout(() => onEliminar(materia), 260) }}
            className="px-4 py-2 border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </>
  )
}

// ── Editor de temario ─────────────────────────────────────────────────────────

function TemarioEditor({ value, onChange }: { value: MateriaTemaTema[]; onChange: (v: MateriaTemaTema[]) => void }) {
  const addTema = () => onChange([...value, { tema: '', subtemas: [] }])
  const removeTema = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const setTema = (i: number, tema: string) => onChange(value.map((t, idx) => idx === i ? { ...t, tema } : t))
  const setSubtemas = (i: number, raw: string) =>
    onChange(value.map((t, idx) => idx === i ? { ...t, subtemas: raw.split('\n').map(s => s.trim()).filter(Boolean) } : t))

  return (
    <div className="space-y-3">
      {value.map((t, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <span className="text-xs font-bold text-blue-600 mt-2 w-5 shrink-0">{i + 1}.</span>
            <input
              className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm"
              placeholder="Nombre del tema…"
              value={t.tema}
              onChange={e => setTema(i, e.target.value)}
            />
            <button onClick={() => removeTema(i)} className="text-slate-300 hover:text-red-400 text-lg leading-none mt-1">×</button>
          </div>
          <textarea
            className="w-full border border-slate-100 rounded px-2 py-1.5 text-xs text-slate-600 resize-none"
            rows={3}
            placeholder="Subtemas (uno por línea)…"
            value={(t.subtemas ?? []).join('\n')}
            onChange={e => setSubtemas(i, e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addTema}
        className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Agregar tema
      </button>
    </div>
  )
}

// ── Sección de semestre ───────────────────────────────────────────────────────

function SemestreSection({ semestre, materias, onVerDetalle, onEditar, onEliminar }: {
  semestre: number; materias: Materia[]
  onVerDetalle: (m: Materia) => void; onEditar: (m: Materia) => void; onEliminar: (m: Materia) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <Chevron open={open} />
        <span className="text-sm font-semibold text-slate-700">{semestre}° Semestre</span>
        <span className="ml-auto text-xs text-slate-400">{materias.length} materia{materias.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-28">Clave</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Créd.</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">H.T/H.P</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Tipo</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {materias.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(m => (
              <tr key={m.id} onClick={() => onVerDetalle(m)} className="hover:bg-blue-50/50 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{m.clave}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {m.nombre}
                  {m.clave_oficial_tecnm && <span className="ml-2 text-xs text-slate-400 font-normal font-mono">{m.clave_oficial_tecnm}</span>}
                </td>
                <td className="px-4 py-2.5 text-center text-slate-600">{m.creditos}</td>
                <td className="px-4 py-2.5 text-center text-xs text-slate-400">{m.horas_teoria}/{m.horas_practica}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.tipo === 'obligatoria' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {m.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2" onClick={e => e.stopPropagation()}>
                  {m.documento_url && (
                    <a href={m.documento_url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:text-red-600" title="Ver PDF" onClick={e => e.stopPropagation()}>PDF</a>
                  )}
                  <button onClick={() => onEditar(m)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => onEliminar(m)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Sección de carrera ────────────────────────────────────────────────────────

function CarreraSection({ carrera, materias, onVerDetalle, onEditar, onEliminar }: {
  carrera: { id: string; nombre: string; clave: string }; materias: Materia[]
  onVerDetalle: (m: Materia) => void; onEditar: (m: Materia) => void; onEliminar: (m: Materia) => void
}) {
  const [open, setOpen] = useState(true)
  const porSemestre = useMemo(() => {
    const map = new Map<number, Materia[]>()
    for (const m of materias) {
      const sem = m.semestre ?? 0
      if (!map.has(sem)) map.set(sem, [])
      map.get(sem)!.push(m)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [materias])

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left">
        <Chevron open={open} />
        <div className="flex items-center gap-2.5 flex-1">
          <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-mono">{carrera.clave}</span>
          <span className="text-sm font-semibold text-slate-900">{carrera.nombre}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{materias.length} materias</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          {porSemestre.map(([sem, mats]) => (
            <SemestreSection key={sem} semestre={sem} materias={mats}
              onVerDetalle={onVerDetalle} onEditar={onEditar} onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MateriasPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { data: carreras = [] } = useCarreras()
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Partial<Materia> | null>(null)
  const [detalle, setDetalle] = useState<Materia | null>(null)
  const [modalTab, setModalTab] = useState<'basico' | 'programa' | 'temario' | 'practicas' | 'biblio'>('basico')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [extrayendo, setExtrayendo] = useState(false)
  const pdfExtractRef = useRef<HTMLInputElement>(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { data: materias = [], isLoading } = useQuery({
    queryKey: ['materias'],
    queryFn: () => academicoApi.getMaterias({}),
  })

  const materiasVistas = useMemo(() => {
    let list = materias as Materia[]
    if (filtroCarrera) list = list.filter(m => m.carrera_id === filtroCarrera)
    if (filtroSemestre) list = list.filter(m => String(m.semestre) === filtroSemestre)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(m =>
        m.nombre.toLowerCase().includes(q) ||
        m.clave.toLowerCase().includes(q) ||
        (m.clave_oficial_tecnm ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [materias, filtroCarrera, filtroSemestre, busqueda])

  const porCarrera = useMemo(() => {
    const map = new Map<string, { carrera: { id: string; nombre: string; clave: string }; materias: Materia[] }>()
    for (const m of materiasVistas) {
      const key = m.carrera?.id ?? 'sin-carrera'
      if (!map.has(key)) map.set(key, { carrera: m.carrera ?? { id: 'sin-carrera', nombre: 'Sin carrera', clave: '—' }, materias: [] })
      map.get(key)!.materias.push(m)
    }
    return [...map.values()].sort((a, b) => a.carrera.clave.localeCompare(b.carrera.clave))
  }, [materiasVistas])

  const save = useMutation({
    mutationFn: () => modal?.id
      ? academicoApi.updateMateria(modal.id!, modal)
      : academicoApi.createMateria(modal!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materias'] })
      addToast('Materia guardada.', 'success')
      setModal(null); setErrors({})
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteMateria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materias'] }); addToast('Materia eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof Materia, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  const handleExtractPdf = useCallback(async (file: File) => {
    setExtrayendo(true)
    try {
      const data = await parseTecnmPdf(file)
      setModal(prev => {
        const merged: Partial<Materia> = { ...prev }
        const keys: (keyof Materia)[] = [
          'nombre', 'clave_oficial_tecnm', 'satca', 'creditos',
          'horas_teoria', 'horas_practica', 'caracterizacion',
          'intencion_didactica', 'competencia_especifica',
          'competencias_previas', 'temario', 'actividades_aprendizaje',
          'practicas', 'proyecto_asignatura', 'evaluacion', 'fuentes_informacion',
        ]
        for (const k of keys) {
          const val = (data as Record<string, unknown>)[k]
          if (val !== null && val !== undefined && val !== '') {
            (merged as Record<string, unknown>)[k] = val
          }
        }
        return merged
      })
      addToast('Información extraída del PDF. Revisa y completa los campos.', 'success')
    } catch (e) {
      console.error(e)
      addToast('No se pudo leer el PDF. Verifica que no esté escaneado o protegido.', 'error')
    } finally {
      setExtrayendo(false)
    }
  }, [addToast])

  const openNuevo = () => {
    setModal({ tipo: 'obligatoria', semestre: 1, creditos: 6, horas_teoria: 2, horas_practica: 2, activa: true, temario: [], fuentes_informacion: [] })
    setModalTab('basico'); setErrors({})
  }
  const openEditar = (m: Materia) => { setModal(m); setModalTab('basico'); setErrors({}) }
  const openDetalle = (m: Materia) => setDetalle(m)

  const handleExtractAndEdit = useCallback(async (base: Materia, file: File) => {
    setModal(base)
    setModalTab('programa')
    setErrors({})
    await handleExtractPdf(file)
  }, [handleExtractPdf])
  const openEliminar = (m: Materia) => confirm({
    title: `¿Eliminar "${m.nombre}"?`,
    description: 'Se eliminará permanentemente del catálogo.',
    confirmLabel: 'Eliminar materia',
    onConfirm: () => del.mutateAsync(m.id),
  })

  const modalTabs = [
    { id: 'basico' as const, label: 'Datos básicos' },
    { id: 'programa' as const, label: 'Presentación' },
    { id: 'temario' as const, label: 'Temario' },
    { id: 'practicas' as const, label: 'Prácticas' },
    { id: 'biblio' as const, label: 'Bibliografía' },
  ]

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Materias</h1>
              <p className="text-sm text-slate-500 mt-0.5">Catálogo de asignaturas por carrera y semestre</p>
            </div>
            <button onClick={openNuevo} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
              + Nueva materia
            </button>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && materiasVistas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              ['Total', materiasVistas.length, 'text-slate-900'],
              ['Obligatorias', materiasVistas.filter(m => m.tipo === 'obligatoria').length, 'text-blue-700'],
              ['Optativas', materiasVistas.filter(m => m.tipo === 'optativa').length, 'text-amber-600'],
              ['Carreras', porCarrera.length, 'text-slate-900'],
              ['Con programa', materiasVistas.filter(m => m.documento_url).length, 'text-emerald-700'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
                <span className="text-slate-500">{label}</span>
                <span className={`ml-2 font-semibold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, clave…" className={inputCls} />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)} className={selectCls}>
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-32">
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestre</label>
            <select value={filtroSemestre} onChange={e => setFiltroSemestre(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><SkeletonRows cols={6} rows={8} /></tbody></table>
          </div>
        )}

        {!isLoading && porCarrera.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
            {busqueda || filtroCarrera || filtroSemestre ? 'Sin resultados para los filtros aplicados.' : 'No hay materias registradas.'}
          </div>
        )}

        {!isLoading && porCarrera.map(({ carrera, materias: mats }) => (
          <CarreraSection key={carrera.id} carrera={carrera} materias={mats}
            onVerDetalle={openDetalle} onEditar={openEditar} onEliminar={openEliminar} />
        ))}
      </div>

      {confirmDialog}

      {detalle && (
        <MateriaDetail materia={detalle} onClose={() => setDetalle(null)}
          onEditar={openEditar} onEliminar={openEliminar}
          onExtractAndEdit={handleExtractAndEdit} />
      )}

      {/* Modal crear/editar */}
      {modal !== null && (
        <ModalWrap
          title={modal.id ? `Editar: ${modal.nombre ?? ''}` : 'Nueva materia'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          {/* Extractor PDF + Tabs */}
          <div className="sm:col-span-2 -mt-1 mb-1 space-y-2">
            {/* Botón extraer */}
            <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <svg className="w-5 h-5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-violet-800">Extraer información del PDF</p>
                <p className="text-xs text-violet-500">Sube el programa TecNM y se rellenarán los campos automáticamente</p>
              </div>
              <button
                type="button"
                disabled={extrayendo}
                onClick={() => pdfExtractRef.current?.click()}
                className="shrink-0 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {extrayendo ? (
                  <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Extrayendo…</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Subir PDF</>
                )}
              </button>
              <input ref={pdfExtractRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleExtractPdf(f); e.target.value = '' }} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {modalTabs.map(t => (
                <button key={t.id} type="button" onClick={() => setModalTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${modalTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Datos básicos ── */}
          {modalTab === 'basico' && (<>
            <Field label="Carrera *" full error={errors.carrera_id}>
              <select className={icls(errors.carrera_id)} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
                <option value="">— Selecciona —</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Clave interna *" error={errors.clave}>
              <input className={icls(errors.clave)} value={modal.clave ?? ''} placeholder="SIS-001" onChange={e => set('clave', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Clave TecNM" error={errors.clave_oficial_tecnm}>
              <input className={icls(errors.clave_oficial_tecnm)} value={modal.clave_oficial_tecnm ?? ''} placeholder="SCA-1025" onChange={e => set('clave_oficial_tecnm', e.target.value.toUpperCase())} />
            </Field>
            <Field label="SATCA" error={errors.satca}>
              <input className={icls(errors.satca)} value={modal.satca ?? ''} placeholder="0-4-4" onChange={e => set('satca', e.target.value)} />
            </Field>
            <Field label="Nombre *" full error={errors.nombre}>
              <input className={icls(errors.nombre)} value={modal.nombre ?? ''} placeholder="Taller de base de datos" onChange={e => set('nombre', e.target.value)} />
            </Field>
            <Field label="Semestre" error={errors.semestre}>
              <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', +e.target.value)}>
                {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
              </select>
            </Field>
            <Field label="Tipo" error={errors.tipo}>
              <select className={icls(errors.tipo)} value={modal.tipo ?? 'obligatoria'} onChange={e => set('tipo', e.target.value)}>
                <option value="obligatoria">Obligatoria</option>
                <option value="optativa">Optativa</option>
              </select>
            </Field>
            <Field label="Créditos" error={errors.creditos}>
              <input className={icls(errors.creditos)} type="number" min={1} max={20} value={modal.creditos ?? 6} onChange={e => set('creditos', +e.target.value)} />
            </Field>
            <Field label="Horas teoría" error={errors.horas_teoria}>
              <input className={icls(errors.horas_teoria)} type="number" min={0} max={10} value={modal.horas_teoria ?? 2} onChange={e => set('horas_teoria', +e.target.value)} />
            </Field>
            <Field label="Horas práctica" error={errors.horas_practica}>
              <input className={icls(errors.horas_practica)} type="number" min={0} max={10} value={modal.horas_practica ?? 2} onChange={e => set('horas_practica', +e.target.value)} />
            </Field>
          </>)}

          {/* ── Presentación ── */}
          {modalTab === 'programa' && (<>
            <Field label="Competencia específica" full error={errors.competencia_especifica}>
              <textarea className={`${icls(errors.competencia_especifica)} resize-none`} rows={3}
                value={modal.competencia_especifica ?? ''}
                placeholder="Implementa bases de datos para apoyar la toma de decisiones…"
                onChange={e => set('competencia_especifica', e.target.value)} />
            </Field>
            <Field label="Competencias previas" full error={errors.competencias_previas}>
              <textarea className={`${icls(errors.competencias_previas)} resize-none`} rows={3}
                value={modal.competencias_previas ?? ''}
                placeholder="Analiza requerimientos y diseña bases de datos…"
                onChange={e => set('competencias_previas', e.target.value)} />
            </Field>
            <Field label="Caracterización" full error={errors.caracterizacion}>
              <textarea className={`${icls(errors.caracterizacion)} resize-none`} rows={4}
                value={modal.caracterizacion ?? ''}
                placeholder="Esta asignatura aporta al perfil…"
                onChange={e => set('caracterizacion', e.target.value)} />
            </Field>
            <Field label="Intención didáctica" full error={errors.intencion_didactica}>
              <textarea className={`${icls(errors.intencion_didactica)} resize-none`} rows={4}
                value={modal.intencion_didactica ?? ''}
                placeholder="En el Tema 1 se instala…"
                onChange={e => set('intencion_didactica', e.target.value)} />
            </Field>
          </>)}

          {/* ── Temario ── */}
          {modalTab === 'temario' && (
            <div className="sm:col-span-2">
              <TemarioEditor value={modal.temario ?? []} onChange={v => set('temario', v)} />
            </div>
          )}

          {/* ── Prácticas / Proyecto / Evaluación ── */}
          {modalTab === 'practicas' && (<>
            <div className="sm:col-span-2 space-y-3">
              <p className="text-xs text-slate-500">Las prácticas se extraen automáticamente del PDF. Puedes editarlas aquí como texto libre por tema.</p>
              {(modal.practicas ?? []).map((p, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
                      value={p.tema} placeholder="Tema N"
                      onChange={e => {
                        const next = [...(modal.practicas ?? [])]
                        next[i] = { ...next[i], tema: e.target.value }
                        set('practicas', next)
                      }} />
                    <button onClick={() => set('practicas', (modal.practicas ?? []).filter((_, idx) => idx !== i))}
                      className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
                  </div>
                  <textarea className="w-full border border-slate-100 rounded px-2 py-1.5 text-xs text-slate-600 resize-none" rows={4}
                    placeholder="Una práctica por línea…"
                    value={(p.lista ?? []).join('\n')}
                    onChange={e => {
                      const next = [...(modal.practicas ?? [])]
                      next[i] = { ...next[i], lista: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }
                      set('practicas', next)
                    }} />
                </div>
              ))}
              <button type="button"
                onClick={() => set('practicas', [...(modal.practicas ?? []), { tema: `Tema ${(modal.practicas ?? []).length + 1}`, lista: [] }])}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                + Agregar tema de prácticas
              </button>
            </div>
            <Field label="Proyecto de asignatura" full error={errors.proyecto_asignatura}>
              <textarea className={`${icls(errors.proyecto_asignatura)} resize-none`} rows={4}
                value={modal.proyecto_asignatura ?? ''}
                placeholder="El objetivo del proyecto…"
                onChange={e => set('proyecto_asignatura', e.target.value)} />
            </Field>
            <Field label="Evaluación por competencias" full error={errors.evaluacion}>
              <textarea className={`${icls(errors.evaluacion)} resize-none`} rows={4}
                value={modal.evaluacion ?? ''}
                placeholder="La evaluación debe ser permanente y continua…"
                onChange={e => set('evaluacion', e.target.value)} />
            </Field>
          </>)}

          {/* ── Bibliografía ── */}
          {modalTab === 'biblio' && (
            <Field label="Fuentes de información" full>
              <textarea
                className={`${inputCls} resize-none`}
                rows={10}
                value={(modal.fuentes_informacion ?? []).join('\n')}
                placeholder={'Post, Gerald V. (2006), "Sistemas de Administración para bases de datos".\nRaghu Ramakrishnan (2007), Sistemas de gestión de bases de datos.'}
                onChange={e => set('fuentes_informacion', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              />
              <p className="text-xs text-slate-400 mt-1">Una fuente por línea</p>
            </Field>
          )}
        </ModalWrap>
      )}
    </div>
  )
}
