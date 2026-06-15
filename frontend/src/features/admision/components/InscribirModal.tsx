import Modal from '../../../components/ui/Modal'
import { useInscribir } from '../hooks/useAspirantes'
import { useToastStore } from '../../../store/toastStore'
import type { Aspirante } from '../services/admision'

interface Props {
  aspirante: Aspirante
  onClose: () => void
}

export default function InscribirModal({ aspirante, onClose }: Props) {
  const { mutate, isPending, isSuccess, data } = useInscribir()
  const { success, error: toastError }         = useToastStore()

  if (isSuccess && data) {
    return (
      <Modal title="Inscripción completada" onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            <span className="font-medium text-slate-800">
              {aspirante.nombres} {aspirante.apellido_paterno}
            </span>{' '}
            ha sido inscrito correctamente.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200 mb-5">
            <p className="text-xs text-slate-500 mb-1">Número de control asignado</p>
            <p className="text-2xl font-bold tracking-widest text-[#1a3a5c]">{data.numero_control}</p>
            <p className="text-xs text-slate-400 mt-1">{data.carrera.nombre}</p>
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-[#1a3a5c] hover:bg-[#234d7a] text-white text-sm font-medium rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Confirmar inscripción" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
          <p className="text-base font-semibold text-slate-800">
            {aspirante.nombres} {aspirante.apellido_paterno} {aspirante.apellido_materno ?? ''}
          </p>
          <p className="text-sm text-slate-500 mt-1">{aspirante.carrera.nombre}</p>
          <p className="text-xs text-slate-400 mt-0.5">{aspirante.periodo.nombre}</p>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 text-xs text-amber-700">
          <span className="mt-0.5">⚠</span>
          Se generará un número de control único. Esta acción no se puede deshacer.
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => mutate(aspirante.id, {
              onSuccess: () => success(`NC asignado a ${aspirante.nombres} ${aspirante.apellido_paterno}.`),
              onError:   () => toastError('Error al inscribir. Verifica que el estatus sea "aceptado".'),
            })}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {isPending ? 'Procesando…' : 'Confirmar inscripción'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
