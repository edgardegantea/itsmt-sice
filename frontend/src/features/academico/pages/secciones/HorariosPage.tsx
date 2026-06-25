import { Link } from 'react-router-dom'
import HorariosTab from '../tabs/HorariosTab'

export default function HorariosPage() {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Horarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Asignación de bloques horarios a cargas académicas por periodo</p>
        </div>
        <HorariosTab />
      </div>
    </div>
  )
}
