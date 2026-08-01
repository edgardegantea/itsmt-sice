import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { academicoApi } from '../../academico/services/academico'

/** Página que abre el alumno al escanear el QR que su docente proyecta en clase —
 * confirma su propia asistencia sin que el docente tenga que pasar lista uno por uno. */
export default function AsistenciaCheckinPage() {
  const { sesionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [codigo, setCodigo] = useState(searchParams.get('codigo') ?? '')

  const mutCheckin = useMutation({
    mutationFn: () => academicoApi.checkinSesion(sesionId, codigo),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-center">
        <h1 className="text-lg font-bold text-slate-900">Confirmar asistencia</h1>

        {mutCheckin.isSuccess ? (
          <div className="py-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl">✓</div>
            <p className="text-sm text-slate-700 mt-3">{mutCheckin.data.message ?? 'Asistencia registrada.'}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Escribe el código que tu docente proyectó en clase para marcarte como presente.
            </p>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Código"
              maxLength={8}
              className="w-full text-center tracking-widest font-mono text-lg border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {mutCheckin.isError && (
              <p className="text-xs text-red-600">
                {(mutCheckin.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                  ?? 'No se pudo registrar tu asistencia.'}
              </p>
            )}
            <button
              onClick={() => mutCheckin.mutate()}
              disabled={!codigo.trim() || mutCheckin.isPending}
              className="w-full px-4 py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#234d7a] disabled:opacity-50"
            >
              {mutCheckin.isPending ? 'Confirmando…' : 'Confirmar mi asistencia'}
            </button>
          </>
        )}

        <Link to="/alumno/dashboard" className="block text-xs text-blue-600 hover:underline pt-2">
          Ir a mi panel
        </Link>
      </div>
    </div>
  )
}
