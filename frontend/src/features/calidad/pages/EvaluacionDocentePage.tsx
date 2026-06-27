import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calidadApi, type GrupoEvaluacion } from '../services/calidad'

const PREGUNTAS = [
  { key: 'puntualidad',        label: 'Puntualidad y asistencia' },
  { key: 'dominio_tema',       label: 'Dominio del tema' },
  { key: 'claridad',           label: 'Claridad en la explicación' },
  { key: 'disponibilidad',     label: 'Disponibilidad para asesorías' },
  { key: 'material_didactico', label: 'Material didáctico utilizado' },
  { key: 'evaluacion_justa',   label: 'Evaluación justa y objetiva' },
  { key: 'puntaje_global',     label: 'Evaluación global del docente' },
]

const ESCALA = [1, 2, 3, 4, 5]
const ESCALA_LABEL: Record<number, string> = {
  1: 'Deficiente',
  2: 'Regular',
  3: 'Bueno',
  4: 'Muy bueno',
  5: 'Excelente',
}

export default function EvaluacionDocentePage() {
  const qc = useQueryClient()
  const [grupoActivo, setGrupoActivo] = useState<GrupoEvaluacion | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, number>>({})
  const [enviado, setEnviado] = useState(false)

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['evaluaciones-docentes'],
    queryFn: calidadApi.getGruposParaEvaluar,
  })

  const enviarMut = useMutation({
    mutationFn: calidadApi.enviarEvaluacion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones-docentes'] })
      setGrupoActivo(null)
      setRespuestas({})
      setEnviado(true)
    },
  })

  const totalPendientes = grupos.filter(g => !g.ya_evaluado).length
  const todosEvaluados  = grupos.length > 0 && totalPendientes === 0

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Cargando…</div>
  }

  if (grupoActivo) {
    const completo = PREGUNTAS.every(p => respuestas[p.key] !== undefined)
    const docentes = grupoActivo.materias.map(m => m.docente).filter(Boolean).join(', ')

    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => { setGrupoActivo(null); setRespuestas({}) }}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          ← Regresar
        </button>

        <div className="bg-[#1a3a5c] rounded-2xl px-6 py-5 text-white">
          <p className="text-xs text-blue-200 uppercase tracking-wide font-medium mb-1">Evaluando grupo</p>
          <h2 className="text-xl font-bold">{grupoActivo.clave} — Semestre {grupoActivo.semestre}</h2>
          {docentes && <p className="text-blue-200 text-sm mt-1">Docente(s): {docentes}</p>}
          <p className="text-xs text-blue-300 mt-2">Tu evaluación es completamente anónima (Art. 7 Frac. VIII Reglamento TecNM)</p>
        </div>

        <div className="space-y-4">
          {PREGUNTAS.map(p => (
            <div key={p.key} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">{p.label}</p>
              <div className="flex gap-2 flex-wrap">
                {ESCALA.map(v => (
                  <button
                    key={v}
                    onClick={() => setRespuestas(prev => ({ ...prev, [p.key]: v }))}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg border text-sm transition-colors ${
                      respuestas[p.key] === v
                        ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-bold">{v}</span>
                    <span className="text-xs mt-0.5 opacity-80">{ESCALA_LABEL[v]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {enviarMut.isError && (
          <p className="text-sm text-red-600">
            {(enviarMut.error as any)?.response?.data?.message ?? 'Error al enviar.'}
          </p>
        )}

        <button
          onClick={() => enviarMut.mutate({ grupo_id: grupoActivo.grupo_id, respuestas })}
          disabled={!completo || enviarMut.isPending}
          className="w-full bg-[#1a3a5c] text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50 hover:bg-[#15304e] transition-colors"
        >
          {enviarMut.isPending ? 'Enviando…' : 'Enviar evaluación de forma anónima'}
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Evaluación Docente</h1>
        <p className="text-sm text-slate-500 mt-1">
          Evalúa a tus docentes de forma anónima al cierre del periodo (obligatorio por Reglamento TecNM)
        </p>
      </div>

      {enviado && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 text-sm">
          ✓ Evaluación enviada correctamente. ¡Gracias por tu participación!
        </div>
      )}

      {grupos.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          No tienes grupos asignados en el periodo activo.
        </div>
      ) : todosEvaluados ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 text-sm">
          ✓ Ya evaluaste a todos tus docentes este periodo. ¡Gracias!
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
          Tienes {totalPendientes} evaluación{totalPendientes !== 1 ? 'es' : ''} pendiente{totalPendientes !== 1 ? 's' : ''}.
        </div>
      )}

      <div className="space-y-3">
        {grupos.map(g => {
          const docentes = g.materias.map(m => m.docente).filter(Boolean).join(', ')
          return (
            <div
              key={g.grupo_id}
              className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 ${
                g.ya_evaluado ? 'border-slate-200 opacity-70' : 'border-slate-200'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  Grupo {g.clave} — Semestre {g.semestre}
                </p>
                {docentes && <p className="text-xs text-slate-500 mt-0.5">{docentes}</p>}
              </div>
              {g.ya_evaluado ? (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  ✓ Evaluado
                </span>
              ) : (
                <button
                  onClick={() => { setGrupoActivo(g); setRespuestas({}); setEnviado(false) }}
                  className="text-xs bg-[#1a3a5c] text-white px-4 py-2 rounded-lg hover:bg-[#15304e] transition-colors"
                >
                  Evaluar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
