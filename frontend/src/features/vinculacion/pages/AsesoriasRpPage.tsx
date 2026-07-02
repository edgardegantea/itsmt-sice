import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vinculacionApi, type AsesoriaRp } from '../services/vinculacion'

function formatFecha(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function AsesoriasRpPage() {
  const [residenciaId, setResidenciaId] = useState('')
  const [filtroInput, setFiltroInput] = useState('')

  const { data: asesorias = [], isLoading } = useQuery<AsesoriaRp[]>({
    queryKey: ['asesorias-rp', residenciaId],
    queryFn: () => vinculacionApi.getAsesoriasRp(residenciaId ? { residencia_id: residenciaId } : undefined),
  })

  const filtered = asesorias.filter(a => {
    if (!filtroInput) return true
    const q = filtroInput.toLowerCase()
    return (
      a.residencia?.alumno?.user?.name?.toLowerCase().includes(q) ||
      a.asesorInterno?.name?.toLowerCase().includes(q) ||
      a.fecha?.includes(filtroInput)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asesorías de Residencia Profesional</h1>
          <p className="text-sm text-slate-500 mt-1">Registro de asesorías por residencia</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por alumno, asesor o fecha…"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-72"
          value={filtroInput}
          onChange={e => setFiltroInput(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por ID de residencia"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-72"
          value={residenciaId}
          onChange={e => setResidenciaId(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando asesorías…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay asesorías registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Alumno</th>
                <th className="px-4 py-3 text-left">Asesor</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Lugar</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Temas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{a.num_asesoria}</td>
                  <td className="px-4 py-3">
                    {a.residencia?.alumno?.user?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">{a.asesorInterno?.name ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatFecha(a.fecha)}</td>
                  <td className="px-4 py-3">{a.lugar ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{a.tipo ?? '—'}</td>
                  <td className="px-4 py-3">
                    {a.temas?.length
                      ? <ul className="list-disc list-inside text-xs text-slate-600">
                          {a.temas.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
