import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vinculacionApi, type AsesoriaRp } from '../services/vinculacion'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'

function formatFecha(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function AsesoriasRpPage() {
  const [residenciaId, setResidenciaId] = useState('')
  const [filtroInput, setFiltroInput] = useState('')
  const [vista, setVista] = useViewMode('asesorias-rp')
  const [detalle, setDetalle] = useState<AsesoriaRp | null>(null)

  const { data: asesoriasResp, isLoading } = useQuery({
    queryKey: ['asesorias-rp', residenciaId],
    queryFn: () => vinculacionApi.getAsesoriasRp(residenciaId ? { residencia_id: residenciaId } : undefined),
  })
  const asesorias: AsesoriaRp[] = asesoriasResp?.data ?? []

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
        <ViewToggle value={vista} onChange={setVista} />
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

      {/* Listado */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-8 text-center text-slate-400">Cargando asesorías…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-8 text-center text-slate-400">No hay asesorías registradas.</div>
      ) : vista === 'lista' ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Alumno</th>
                <th className="px-4 py-3 text-left">Asesor</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Lugar</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-right" />
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetalle(a)} className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-800 truncate">{a.residencia?.alumno?.user?.name ?? '—'}</p>
                <span className="text-xs text-slate-400">#{a.num_asesoria}</span>
              </div>
              <p className="text-sm text-slate-600">{a.asesorInterno?.name ?? '—'}</p>
              <p className="text-xs text-slate-500">{formatFecha(a.fecha)} · {a.lugar ?? '—'}</p>
              <button onClick={() => setDetalle(a)} className="mt-1 text-xs font-medium text-blue-600 hover:underline self-start">Ver detalle</button>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <DetailModal
          title={`Asesoría #${detalle.num_asesoria}`}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Alumno', value: detalle.residencia?.alumno?.user?.name },
            { label: 'Asesor interno', value: detalle.asesorInterno?.name },
            { label: 'Fecha', value: formatFecha(detalle.fecha) },
            { label: 'Lugar', value: detalle.lugar },
            { label: 'Tipo', value: detalle.tipo },
            {
              label: 'Temas', full: true, value: detalle.temas?.length
                ? <ul className="list-disc list-inside">{detalle.temas.map((t, i) => <li key={i}>{t}</li>)}</ul>
                : '—',
            },
          ]}
        />
      )}
    </div>
  )
}
