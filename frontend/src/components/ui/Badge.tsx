const STYLES: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  aceptado:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rechazado: 'bg-red-50 text-red-600 ring-red-200',
  inscrito:  'bg-blue-50 text-blue-700 ring-blue-200',
}

const LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptado:  'Aceptado',
  rechazado: 'Rechazado',
  inscrito:  'Inscrito',
}

export default function Badge({ value }: { value: string }) {
  const cls = STYLES[value] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {LABELS[value] ?? value}
    </span>
  )
}
