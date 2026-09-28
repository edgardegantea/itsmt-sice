import { useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { academicoApi } from '../../academico/services/academico'

function archivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Best-effort: si el navegador la niega o tarda, seguimos sin ubicación — nunca
 * bloquea el check-in, es un dato adicional cuando está disponible. */
function obtenerUbicacion(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(undefined)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 4000 }
    )
  })
}

/** Página que abre el alumno al escanear el QR que su docente proyecta en clase —
 * confirma su propia asistencia sin que el docente tenga que pasar lista uno por uno.
 * La foto es opcional y solo queda como evidencia adjunta al registro — NO es
 * reconocimiento facial ni biometría, nadie la compara contra nada. */
export default function AsistenciaCheckinPage() {
  const { sesionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [codigo, setCodigo] = useState(searchParams.get('codigo') ?? '')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutCheckin = useMutation({
    mutationFn: async () => {
      const geo = await obtenerUbicacion()
      return academicoApi.checkinSesion(sesionId, codigo, fotoPreview ?? undefined, geo)
    },
  })

  async function onFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoPreview(await archivoABase64(file))
  }

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

            <div className="border-t border-slate-100 pt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={onFotoSeleccionada}
                className="hidden"
              />
              {fotoPreview ? (
                <div className="flex items-center gap-3">
                  <img src={fotoPreview} alt="Foto de evidencia" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-slate-600">Foto de evidencia lista</p>
                    <button onClick={() => setFotoPreview(null)} className="text-xs text-red-500 hover:underline">Quitar</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg py-2 hover:bg-slate-50"
                >
                  📷 Agregar foto de evidencia (opcional)
                </button>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Solo queda como evidencia adjunta — no se usa reconocimiento facial.</p>
            </div>

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
