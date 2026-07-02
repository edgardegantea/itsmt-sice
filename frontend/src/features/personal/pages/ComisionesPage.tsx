import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personalService, type Comision } from '../services/personal'

export default function ComisionesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<Partial<Comision & { personal_nombre?: string }>>({
    con_viaticos: false,
  })
  const [personalId, setPersonalId] = useState('')

  const { data: comResp, isLoading } = useQuery({
    queryKey: ['comisiones'],
    queryFn: () => personalService.getComisiones(),
  })
  const comisiones: Comision[] = (comResp?.data as { data?: Comision[] })?.data ?? []

  const crearMut = useMutation({
    mutationFn: (d: any) => personalService.crearComision(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comisiones'] })
      setShowForm(false)
      setForm({ con_viaticos: false })
      setPersonalId('')
    },
  })

  const descargarPdf = async (com: Comision) => {
    const resp = await personalService.descargarOficioPdf(com.id)
    const url  = URL.createObjectURL(resp.data as Blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `comision_${com.id.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    crearMut.mutate({ ...form, personal_id: personalId })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Comisiones</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Nueva Comisión
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Registrar Comisión Oficial</h2>
          <form onSubmit={handleCrear} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del Personal</label>
              <input
                required
                type="text"
                placeholder="UUID del usuario"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={personalId}
                onChange={e => setPersonalId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <input
                required
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.destino ?? ''}
                onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                required
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_inicio ?? ''}
                onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input
                required
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_fin ?? ''}
                onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Propósito</label>
              <textarea
                required
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.proposito ?? ''}
                onChange={e => setForm(f => ({ ...f, proposito: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.con_viaticos ?? false}
                  onChange={e => setForm(f => ({ ...f, con_viaticos: e.target.checked, monto_viaticos: undefined }))}
                />
                <span className="text-sm">Con viáticos</span>
              </label>
              {form.con_viaticos && (
                <div>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Monto $"
                    className="border rounded-lg px-3 py-2 text-sm w-36"
                    value={form.monto_viaticos ?? ''}
                    onChange={e => setForm(f => ({ ...f, monto_viaticos: parseFloat(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMut.isPending ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando comisiones...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Personal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fechas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Viáticos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Oficio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comisiones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    No hay comisiones registradas.
                  </td>
                </tr>
              ) : comisiones.map(com => (
                <tr key={com.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{com.personal?.name ?? '—'}</td>
                  <td className="px-4 py-3">{com.destino}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {com.fecha_inicio} — {com.fecha_fin}
                  </td>
                  <td className="px-4 py-3">
                    {com.con_viaticos
                      ? <span className="text-green-700 font-medium">${com.monto_viaticos?.toFixed(2)}</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => descargarPdf(com)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Descargar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
