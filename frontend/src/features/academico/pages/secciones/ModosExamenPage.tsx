import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { useToastStore } from '../../../../store/toastStore'
import { formatFecha } from '../../../../utils/date'
import { ChevronLeft } from 'lucide-react'

function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

/** Activa/desactiva, para una fecha puntual, verificación reforzada del check-in QR
 * (foto obligatoria + geolocalización) — sin tocar ninguna configuración permanente. */
export default function ModosExamenPage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [fecha, setFecha] = useState(fechaHoy())

  const { data: modos = [], isLoading } = useQuery({
    queryKey: ['modos-examen', periodoActivo?.id],
    queryFn: () => academicoApi.getModosExamen({ periodo_id: periodoActivo?.id }),
    enabled: !!periodoActivo?.id,
  })

  const mutActivar = useMutation({
    mutationFn: () => academicoApi.activarModoExamen({ periodo_id: periodoActivo!.id, fecha }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modos-examen'] })
      addToast('Modo examen activado para esa fecha.', 'success')
    },
    onError: () => addToast('No se pudo activar.', 'error'),
  })

  const mutDesactivar = useMutation({
    mutationFn: (id: string) => academicoApi.desactivarModoExamen(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modos-examen'] })
      addToast('Modo examen desactivado.', 'success')
    },
    onError: () => addToast('No se pudo desactivar.', 'error'),
  })

  const hoyActivo = modos.some(m => m.fecha.slice(0, 10) === fechaHoy())

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">🔒 Modo Día de Examen</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Para las fechas activadas, el check-in QR exige foto de evidencia obligatoria y captura la ubicación del alumno.
          </p>
        </div>

        {hoyActivo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            🔒 Hoy tiene el modo examen <strong>activo</strong> — el check-in exige foto en todas las sesiones de hoy.
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button
            onClick={() => mutActivar.mutate()}
            disabled={!periodoActivo?.id || mutActivar.isPending}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-[#15304c] disabled:opacity-50"
          >
            {mutActivar.isPending ? 'Activando…' : 'Activar modo examen esta fecha'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <p className="text-sm text-slate-400 p-6">Cargando…</p>
          ) : modos.length === 0 ? (
            <p className="text-sm text-slate-400 p-6">Sin fechas activadas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {modos.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatFecha(m.fecha)}</p>
                    <p className="text-xs text-slate-400">Activado por {m.activado_por?.name ?? '—'}</p>
                  </div>
                  <button
                    onClick={() => mutDesactivar.mutate(m.id)}
                    disabled={mutDesactivar.isPending}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
