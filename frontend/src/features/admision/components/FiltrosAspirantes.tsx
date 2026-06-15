import { useCarreras } from '../hooks/useCarreras'

interface Props {
  carrera_id: string
  estatus: string
  onChange: (key: string, value: string) => void
}

const SELECT = 'px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition'

export default function FiltrosAspirantes({ carrera_id, estatus, onChange }: Props) {
  const { data: carreras = [] } = useCarreras()

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filtrar:</span>

      <select value={carrera_id} onChange={(e) => onChange('carrera_id', e.target.value)} className={SELECT}>
        <option value="">Todas las carreras</option>
        {carreras.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      <select value={estatus} onChange={(e) => onChange('estatus', e.target.value)} className={SELECT}>
        <option value="">Todos los estatus</option>
        <option value="pendiente">Pendiente</option>
        <option value="aceptado">Aceptado</option>
        <option value="rechazado">Rechazado</option>
      </select>
    </div>
  )
}
