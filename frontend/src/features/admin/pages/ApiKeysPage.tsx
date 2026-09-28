import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'

interface ApiKeyRow {
  id: string
  nombre: string
  key_prefix: string
  activa: boolean
  ultimo_uso_en: string | null
  created_at: string
  creado_por?: { name: string }
}

const api = {
  list: () => apiClient.get('/admin/api-keys').then(r => r.data.data as ApiKeyRow[]),
  create: (nombre: string) => apiClient.post('/admin/api-keys', { nombre }).then(r => r.data.data as { api_key: ApiKeyRow; llave: string }),
  revocar: (id: string) => apiClient.patch(`/admin/api-keys/${id}/revocar`).then(r => r.data.data as ApiKeyRow),
}

const BI_ENDPOINTS = [
  { path: '/bi/indicadores-carrera.csv', label: 'Indicadores por carrera (matrícula, promedio, % reprobación)' },
  { path: '/bi/incidencias.csv', label: 'Incidencias de prefectura' },
  { path: '/bi/asistencia.csv', label: 'Asistencia por sesión' },
  { path: '/bi/ocupacion-aulas.csv', label: 'Ocupación de aulas' },
]

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)
  const [nombreNueva, setNombreNueva] = useState('')
  const [llaveGenerada, setLlaveGenerada] = useState<string | null>(null)

  const { data: llaves = [], isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: api.list })

  const mutCrear = useMutation({
    mutationFn: () => api.create(nombreNueva),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setLlaveGenerada(data.llave)
      setNombreNueva('')
    },
    onError: () => toastError('No se pudo generar la llave.'),
  })

  const mutRevocar = useMutation({
    mutationFn: (id: string) => api.revocar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toastSuccess('Llave revocada.')
    },
    onError: () => toastError('No se pudo revocar la llave.'),
  })

  const baseUrl = apiClient.defaults.baseURL ?? ''

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportación de datos (Power BI / Looker Studio)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Genera una llave de acceso para conectar herramientas externas a un feed de datos en vivo, sin tener que exportar reportes manualmente cada vez.
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-brand-900">Cómo conectar</p>
        <p className="text-sm text-brand-800">
          <strong>Power BI</strong>: Obtener datos → Web → pega la URL del endpoint. En "Encabezados HTTP" agrega <code className="bg-white px-1 rounded">X-Api-Key</code> con tu llave.
        </p>
        <p className="text-sm text-brand-800">
          <strong>Looker Studio / Google Sheets</strong>: usa <code className="bg-white px-1 rounded">=IMPORTDATA("URL?api_key=TU_LLAVE")</code> en una hoja de Sheets y conecta Looker Studio a esa hoja.
        </p>
        <div className="pt-1 space-y-1">
          {BI_ENDPOINTS.map(e => (
            <div key={e.path} className="text-xs font-mono bg-white border border-brand-100 rounded px-2 py-1 text-slate-600">
              {baseUrl}{e.path}?periodo_id=... <span className="text-slate-400 font-sans">— {e.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crear llave */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Nueva llave de acceso</h2>
        <div className="flex gap-2">
          <input
            value={nombreNueva}
            onChange={e => setNombreNueva(e.target.value)}
            placeholder="Ej. Dashboard Power BI Dirección"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => mutCrear.mutate()}
            disabled={!nombreNueva.trim() || mutCrear.isPending}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {mutCrear.isPending ? 'Generando…' : 'Generar llave'}
          </button>
        </div>

        {llaveGenerada && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-800">Cópiala ahora — no se volverá a mostrar:</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1.5 break-all">{llaveGenerada}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(llaveGenerada); toastSuccess('Copiada al portapapeles.') }}
                className="text-xs bg-amber-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-amber-700"
              >
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de llaves */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-slate-400 p-6">Cargando…</p>
        ) : llaves.length === 0 ? (
          <p className="text-sm text-slate-400 p-6">Sin llaves generadas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Prefijo</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Último uso</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {llaves.map(k => (
                <tr key={k.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{k.nombre}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{k.key_prefix}…</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${k.activa ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {k.activa ? 'Activa' : 'Revocada'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {k.ultimo_uso_en ? new Date(k.ultimo_uso_en).toLocaleString('es-MX') : 'Nunca usada'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {k.activa && (
                      <button
                        onClick={() => { if (window.confirm(`¿Revocar "${k.nombre}"? Dejará de funcionar de inmediato.`)) mutRevocar.mutate(k.id) }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Revocar
                      </button>
                    )}
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
