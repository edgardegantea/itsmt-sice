import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personalService, type Comision } from '../services/personal'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'
import BulkActionBar, { SelectCheckbox, ToggleSelectionButton } from '../../../components/ui/BulkActionBar'

export default function ComisionesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<Partial<Comision & { personal_nombre?: string }>>({
    con_viaticos: false,
  })
  const [personalId, setPersonalId] = useState('')
  const [vista, setVista] = useViewMode('comisiones')
  const [detalle, setDetalle] = useState<Comision | null>(null)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [descargandoLote, setDescargandoLote] = useState(false)
  const toggleSel = (id: string) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const { data: comResp, isLoading } = useQuery({
    queryKey: ['comisiones'],
    queryFn: () => personalService.getComisiones(),
  })
  const comisionesPage = (comResp?.data as { data?: { data?: Comision[] } | Comision[] })?.data
  const comisiones: Comision[] = Array.isArray(comisionesPage)
    ? comisionesPage
    : (comisionesPage?.data ?? [])

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

  async function descargarPdfLote() {
    setDescargandoLote(true)
    try {
      for (const com of comisiones.filter(c => seleccionados.has(c.id))) {
        await descargarPdf(com)
      }
    } finally {
      setDescargandoLote(false)
      setSeleccionados(new Set())
      setModoSeleccion(false)
    }
  }

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    crearMut.mutate({ ...form, personal_id: personalId })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Comisiones</h1>
        <div className="flex items-center gap-2">
          <ToggleSelectionButton active={modoSeleccion} onClick={() => { setModoSeleccion(v => !v); setSeleccionados(new Set()) }} />
          <ViewToggle value={vista} onChange={setVista} />
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm"
          >
            + Nueva Comisión
          </button>
        </div>
      </div>

      {modoSeleccion && seleccionados.size > 0 && (
        <BulkActionBar count={seleccionados.size} onCancel={() => { setSeleccionados(new Set()); setModoSeleccion(false) }}>
          <button
            onClick={descargarPdfLote}
            disabled={descargandoLote}
            className="px-3 py-1.5 text-xs font-medium bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {descargandoLote ? 'Descargando…' : 'Descargar PDF'}
          </button>
        </BulkActionBar>
      )}

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
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {crearMut.isPending ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando comisiones...</div>
      ) : comisiones.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm py-10 text-center text-gray-400">
          No hay comisiones registradas.
        </div>
      ) : vista === 'lista' ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {modoSeleccion && <th className="w-8" />}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Personal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fechas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Viáticos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Oficio</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {comisiones.map(com => (
                <tr key={com.id} className="hover:bg-gray-50">
                  {modoSeleccion && <td className="pl-4"><SelectCheckbox checked={seleccionados.has(com.id)} onChange={() => toggleSel(com.id)} /></td>}
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
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Descargar PDF
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetalle(com)} className="text-xs font-medium text-slate-500 hover:underline whitespace-nowrap">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comisiones.map(com => (
            <div key={com.id} className="bg-white border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {modoSeleccion && <SelectCheckbox checked={seleccionados.has(com.id)} onChange={() => toggleSel(com.id)} />}
                <p className="font-medium text-slate-800">{com.personal?.name ?? '—'}</p>
              </div>
              <p className="text-sm text-slate-600">{com.destino}</p>
              <p className="text-xs text-slate-500">{com.fecha_inicio} — {com.fecha_fin}</p>
              <p className="text-xs">
                {com.con_viaticos
                  ? <span className="text-green-700 font-medium">${com.monto_viaticos?.toFixed(2)} en viáticos</span>
                  : <span className="text-gray-400">Sin viáticos</span>}
              </p>
              <div className="flex gap-3 mt-1">
                <button onClick={() => descargarPdf(com)} className="text-brand-600 hover:underline text-xs">Descargar PDF</button>
                <button onClick={() => setDetalle(com)} className="text-xs font-medium text-slate-500 hover:underline">Ver detalle</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <DetailModal
          title={detalle.personal?.name ?? 'Comisión'}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Destino', value: detalle.destino },
            { label: 'Fecha inicio', value: detalle.fecha_inicio },
            { label: 'Fecha fin', value: detalle.fecha_fin },
            { label: 'Propósito', value: detalle.proposito, full: true },
            { label: 'Viáticos', value: detalle.con_viaticos ? `$${detalle.monto_viaticos?.toFixed(2)}` : 'No' },
          ]}
          footer={<button onClick={() => descargarPdf(detalle)} className="text-xs font-medium text-white bg-brand-600 px-3 py-1.5 rounded-lg">Descargar PDF</button>}
        />
      )}
    </div>
  )
}
