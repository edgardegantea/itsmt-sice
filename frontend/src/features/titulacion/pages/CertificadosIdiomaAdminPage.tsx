import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { titulacionApi, type CertificadoIdioma } from '../services/titulacion'

function Badge({ validado }: { validado: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${validado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
      {validado ? 'Validado' : 'Pendiente'}
    </span>
  )
}

export default function CertificadosIdiomaAdminPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['certificados-idioma-admin'],
    queryFn:  () => titulacionApi.getCertificadosIdioma(),
  })

  const mutValidar = useMutation({
    mutationFn: (id: string) => titulacionApi.validarCertificado(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['certificados-idioma-admin'] }),
  })

  const registros: CertificadoIdioma[] = data?.data ?? data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Certificados de Lengua Extranjera</h1>
        <p className="text-sm text-slate-500 mt-0.5">Validación de certificados B1 MCER — prerequisito de titulación (Cap. 14.4.1.2).</p>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      {registros.length === 0 && !isLoading && (
        <p className="text-slate-400 text-sm">No hay certificados registrados.</p>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alumno</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Idioma / Nivel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Institución Certificadora</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Expedición</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((cert: CertificadoIdioma) => (
              <tr key={cert.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{cert.alumno?.user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-400 font-mono">{cert.alumno?.numero_control}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{cert.idioma}</span>
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{cert.nivel}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{cert.institucion_certificadora}</td>
                <td className="px-4 py-3 text-slate-500">{cert.fecha_expedicion}</td>
                <td className="px-4 py-3">
                  <Badge validado={cert.validado} />
                  {cert.validado && cert.validadoPor && (
                    <p className="text-xs text-slate-400 mt-0.5">Por: {cert.validadoPor.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!cert.validado && (
                    <button
                      onClick={() => mutValidar.mutate(cert.id)}
                      disabled={mutValidar.isPending}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Validar
                    </button>
                  )}
                  {cert.url_documento && (
                    <a href={cert.url_documento} target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-xs text-blue-600 hover:underline">
                      Ver doc.
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
