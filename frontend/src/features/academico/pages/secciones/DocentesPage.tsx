import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SkeletonRows, inputCls, selectCls, usePeriodos } from '../tabs/shared'
import { useDocentes, useCarreras, initials, type Docente } from './docenteShared'
import { ChevronLeft } from 'lucide-react'

// ── Página principal ──────────────────────────────────────────────────────────

export default function DocentesPage() {
  const navigate = useNavigate()
  const { data: docentes = [], isLoading } = useDocentes()
  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [periodoId, setPeriodoId] = useState('')

  // Seleccionar periodo activo por defecto
  useMemo(() => {
    if (!periodoId && periodos.length) {
      const activo = periodos.find((p: { id: string; nombre: string; activo: boolean }) => p.activo)
      setPeriodoId(activo?.id ?? periodos[0].id)
    }
  }, [periodos, periodoId])

  const docentesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return docentes.filter((d: Docente) => {
      if (filtroCarrera && !(d.carreras ?? []).some(c => c.id === filtroCarrera)) return false
      if (q && !d.name.toLowerCase().includes(q) &&
          !d.email.toLowerCase().includes(q) &&
          !(d.clave_empleado ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [docentes, busqueda, filtroCarrera])

  const sinDatos = docentes.filter((d: Docente) => !d.clave_empleado || !d.nombramiento).length

  const irADetalle = (id: string) => navigate(`/admin/gestion-academica/docentes/${id}${periodoId ? `?periodo_id=${periodoId}` : ''}`)

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Docentes</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestión de datos institucionales y horarios del personal docente</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Total docentes</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{docentes.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Con datos completos</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{docentes.length - sinDatos}</p>
          </div>
          <div className={`border rounded-xl px-4 py-3 ${sinDatos > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs ${sinDatos > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Datos incompletos</p>
            <p className={`text-2xl font-bold mt-0.5 ${sinDatos > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{sinDatos}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Carreras cubiertas</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{new Set(docentes.flatMap((d: Docente) => (d.carreras ?? []).map(c => c.id))).size}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
              <input className={inputCls} placeholder="Nombre, correo, clave…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
              <select className={selectCls} value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
                <option value="">Todas las carreras</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo (para horario)</label>
              <select className={selectCls} value={periodoId} onChange={e => setPeriodoId(e.target.value)}>
                {periodos.map((p: { id: string; nombre: string; activo: boolean }) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><SkeletonRows cols={6} /></tbody></table>
          </div>
        ) : docentesFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400">
            <p className="text-sm">No hay docentes con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombramiento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo hrs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Carreras asignadas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">No. huella</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docentesFiltrados.map((d: Docente) => {
                  const incompleto = !d.clave_empleado || !d.nombramiento
                  return (
                    <tr key={d.id}
                      onClick={() => irADetalle(d.id)}
                      className="hover:bg-brand-50/50 cursor-pointer transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials(d.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{d.name}</p>
                            <p className="text-xs text-slate-400 truncate">{d.email}</p>
                          </div>
                          {incompleto && (
                            <span className="ml-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                              incompleto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.clave_empleado ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{d.nombramiento ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {d.tipo_horas ? (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">{d.tipo_horas}</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px]">
                        {(d.carreras ?? []).length > 0
                          ? (d.carreras ?? []).map(c => c.clave).join(', ')
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.no_huella ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); irADetalle(d.id) }}
                          className="text-xs text-brand-600 hover:underline font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
