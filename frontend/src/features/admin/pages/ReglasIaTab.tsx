import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Building2, GraduationCap, UserRound, UsersRound, Trash2, Plus, Info } from 'lucide-react'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'

type Ambito = 'global' | 'carrera' | 'docente' | 'grupo'

interface Regla {
  id: string
  ambito: Ambito
  referencia_id: string | null
  referencia: string
  habilitada: boolean
  nota: string | null
  actualizada_por: string | null
  updated_at: string
}

const AMBITO: Record<Ambito, { label: string; icono: typeof Building2 }> = {
  global:  { label: 'Institución', icono: Building2 },
  carrera: { label: 'Carrera', icono: GraduationCap },
  docente: { label: 'Docente', icono: UserRound },
  grupo:   { label: 'Grupo', icono: UsersRound },
}

const errorDe = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo guardar.'

function Interruptor({ activo, onCambiar, etiqueta, deshabilitado }: {
  activo: boolean; onCambiar: (v: boolean) => void; etiqueta: string; deshabilitado?: boolean
}) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado}
      onClick={() => onCambiar(!activo)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${activo ? 'translate-x-4' : ''}`} />
    </button>
  )
}

/**
 * Activar/desactivar el asistente de IA de la instrumentación didáctica por institución,
 * carrera, docente o grupo. Gana la regla más específica (grupo > docente > carrera >
 * institución); sin reglas, la IA está activa.
 */
export default function ReglasIaTab() {
  const qc = useQueryClient()
  const { toast } = useToastStore()
  const { data: periodo } = usePeriodoActivo()

  const { data: reglas = [], isLoading } = useQuery({
    queryKey: ['reglas-ia'],
    queryFn: () => apiClient.get('/admin/ia/reglas').then(r => r.data.data as Regla[]),
  })

  const guardar = useMutation({
    mutationFn: (d: { ambito: Ambito; referencia_id: string | null; habilitada: boolean; nota?: string | null }) =>
      apiClient.put('/admin/ia/reglas', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reglas-ia'] }); qc.invalidateQueries({ queryKey: ['ia-disponibilidad'] }); toast('Regla guardada.', 'success') },
    onError: e => toast(errorDe(e), 'error'),
  })
  const quitar = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/ia/reglas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reglas-ia'] }); qc.invalidateQueries({ queryKey: ['ia-disponibilidad'] }); toast('Regla eliminada; ahora hereda del nivel superior.', 'success') },
    onError: e => toast(errorDe(e), 'error'),
  })

  const global = reglas.find(r => r.ambito === 'global')
  const iaGlobal = global?.habilitada ?? true
  const especificas = reglas.filter(r => r.ambito !== 'global')

  // ── Formulario de nueva regla ─────────────────────────────────────────────
  const [ambito, setAmbito] = useState<Exclude<Ambito, 'global'>>('docente')
  const [referencia, setReferencia] = useState('')
  const [filtro, setFiltro] = useState('')
  const [habilitada, setHabilitada] = useState(false)
  const [nota, setNota] = useState('')

  const { data: carreras = [] } = useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
    enabled: ambito === 'carrera', staleTime: 60_000,
  })
  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes-ia'],
    queryFn: () => apiClient.get('/admin/docentes').then(r => r.data.data as { id: string; name: string; email: string }[]),
    enabled: ambito === 'docente', staleTime: 60_000,
  })
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-ia', periodo?.id],
    queryFn: () => apiClient.get('/grupos', { params: periodo ? { periodo_id: periodo.id } : {} })
      .then(r => r.data.data as { id: string; clave: string; semestre?: number; carrera?: { clave: string } }[]),
    enabled: ambito === 'grupo', staleTime: 60_000,
  })

  const opciones = useMemo(() => {
    const lista = ambito === 'carrera' ? carreras.map(c => ({ id: c.id, texto: `${c.clave} — ${c.nombre}` }))
      : ambito === 'docente' ? docentes.map(d => ({ id: d.id, texto: `${d.name} (${d.email})` }))
      : grupos.map(g => ({ id: g.id, texto: `${g.clave}${g.carrera ? ` · ${g.carrera.clave}` : ''}${g.semestre ? ` · ${g.semestre}° sem.` : ''}` }))
    const q = filtro.trim().toLowerCase()
    return (q ? lista.filter(o => o.texto.toLowerCase().includes(q)) : lista).slice(0, 200)
  }, [ambito, carreras, docentes, grupos, filtro])

  const agregar = () => {
    if (!referencia) return
    guardar.mutate({ ambito, referencia_id: referencia, habilitada, nota: nota.trim() || null }, {
      onSuccess: () => { setReferencia(''); setFiltro(''); setNota('') },
    })
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600'

  return (
    <div className="space-y-6">
      {/* Interruptor institucional */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Asistente de IA en la instrumentación didáctica</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Controla los botones "Mejorar con IA", "Sugerir actividad", "Crear con IA" y similares del editor de
                planeación. Si lo desactivas aquí, se desactiva para toda la institución salvo las excepciones de abajo.
              </p>
            </div>
          </div>
          <Interruptor activo={iaGlobal} etiqueta="Asistente de IA para toda la institución" deshabilitado={guardar.isPending || isLoading}
            onCambiar={v => guardar.mutate({ ambito: 'global', referencia_id: null, habilitada: v, nota: global?.nota })} />
        </div>
        <p className={`mt-3 text-xs font-medium ${iaGlobal ? 'text-emerald-700' : 'text-slate-600'}`}>
          {iaGlobal ? 'Activo para toda la institución' : 'Desactivado para toda la institución'}
          {especificas.length > 0 && ` · ${especificas.length} excepción(es)`}
        </p>
      </section>

      {/* Excepciones */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Excepciones por carrera, docente o grupo</h2>
          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            Gana la regla más específica: <strong className="font-medium text-slate-700">grupo › docente › carrera › institución</strong>.
            Por ejemplo, puedes desactivar la IA para una carrera y dejarla activa para un docente de esa carrera.
          </p>
        </div>

        {/* Nueva excepción */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <label className="lg:col-span-2 text-xs font-medium text-slate-600">
            Aplicar a
            <select value={ambito} onChange={e => { setAmbito(e.target.value as typeof ambito); setReferencia(''); setFiltro('') }} className={`${inputCls} mt-1 bg-white`}>
              <option value="carrera">Carrera</option>
              <option value="docente">Docente</option>
              <option value="grupo">Grupo{periodo ? ` (${periodo.nombre})` : ''}</option>
            </select>
          </label>
          <div className="lg:col-span-4 text-xs font-medium text-slate-600">
            <span>{AMBITO[ambito].label}</span>
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar…" className={`${inputCls} mt-1 bg-white`} aria-label={`Buscar ${AMBITO[ambito].label.toLowerCase()}`} />
            <select value={referencia} onChange={e => setReferencia(e.target.value)} className={`${inputCls} mt-1.5 bg-white`} aria-label={`Seleccionar ${AMBITO[ambito].label.toLowerCase()}`}>
              <option value="">— Selecciona ({opciones.length}) —</option>
              {opciones.map(o => <option key={o.id} value={o.id}>{o.texto}</option>)}
            </select>
          </div>
          <label className="lg:col-span-3 text-xs font-medium text-slate-600">
            Motivo (opcional, lo ve el docente)
            <input value={nota} onChange={e => setNota(e.target.value)} maxLength={255} placeholder="p. ej. Evaluación sin asistencia" className={`${inputCls} mt-1 bg-white`} />
          </label>
          <div className="lg:col-span-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Interruptor activo={habilitada} onCambiar={setHabilitada} etiqueta="IA activa para esta excepción" />
              {habilitada ? 'IA activa' : 'IA desactivada'}
            </label>
            <button type="button" onClick={agregar} disabled={!referencia || guardar.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              <Plus className="w-4 h-4" aria-hidden="true" /> Agregar
            </button>
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : especificas.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            Sin excepciones: todos siguen la configuración institucional.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {especificas.map(r => {
              const Icono = AMBITO[r.ambito].icono
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center" title={AMBITO[r.ambito].label}>
                    <Icono className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mr-1.5">{AMBITO[r.ambito].label}</span>
                      {r.referencia}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.nota ? `“${r.nota}” · ` : ''}{r.actualizada_por ? `por ${r.actualizada_por} · ` : ''}{new Date(r.updated_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <span className={`hidden sm:inline text-xs font-medium ${r.habilitada ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {r.habilitada ? 'IA activa' : 'IA desactivada'}
                  </span>
                  <Interruptor activo={r.habilitada} etiqueta={`IA para ${r.referencia}`} deshabilitado={guardar.isPending}
                    onCambiar={v => guardar.mutate({ ambito: r.ambito, referencia_id: r.referencia_id, habilitada: v, nota: r.nota })} />
                  <button type="button" onClick={() => quitar.mutate(r.id)} disabled={quitar.isPending}
                    title="Quitar excepción (vuelve a heredar)" aria-label={`Quitar excepción de ${r.referencia}`}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
