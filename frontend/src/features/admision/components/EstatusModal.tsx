import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import { useActualizarEstatus } from '../hooks/useAspirantes'
import { useToastStore } from '../../../store/toastStore'
import type { Aspirante, EstatusAspirante } from '../services/admision'

interface Props {
  aspirante: Aspirante
  onClose: () => void
}

const SELECT = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition'

const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
}

export default function EstatusModal({ aspirante, onClose }: Props) {
  const [estatus, setEstatus]             = useState<EstatusAspirante>(aspirante.estatus)
  const [observaciones, setObservaciones] = useState(aspirante.observaciones ?? '')
  const { mutate, isPending }             = useActualizarEstatus()
  const { success, error: toastError }    = useToastStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(
      { id: aspirante.id, payload: { estatus, observaciones: observaciones || undefined } },
      {
        onSuccess: () => {
          success(`Estatus actualizado a "${ESTATUS_LABEL[estatus]}" correctamente.`)
          onClose()
        },
        onError: () => toastError('Error al actualizar el estatus. Intenta de nuevo.'),
      },
    )
  }

  return (
    <Modal title="Actualizar estatus" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-5">
        <span className="font-medium text-slate-800">
          {aspirante.nombres} {aspirante.apellido_paterno}
        </span>
        {' · '}
        {aspirante.carrera.clave}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nuevo estatus</label>
          <select value={estatus} onChange={(e) => setEstatus(e.target.value as EstatusAspirante)} className={SELECT}>
            <option value="pendiente">Pendiente</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Motivo de aceptación, rechazo o notas adicionales…"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
          />
        </div>

        {estatus === 'rechazado' && !observaciones && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Se recomienda incluir el motivo del rechazo en las observaciones.
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg transition-colors">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
