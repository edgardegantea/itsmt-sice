import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../services/auth'
import { CURP_REGEX } from '../../../utils/validaciones'

function PanelIzquierdo() {
  return (
    <div className="hidden lg:flex w-1/2 bg-[#1a3a5c] flex-col justify-between p-12">
      <div />
      <div>
        <h1 className="text-white text-4xl font-semibold leading-tight">
          Sistema Integral de Control Escolar
        </h1>
        <p className="text-white/50 text-sm mt-4">
          Instituto Tecnológico Superior de Martínez de la Torre
        </p>
      </div>
      <p className="text-white/25 text-xs">ITSMT © {new Date().getFullYear()}</p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [destino, setDestino]       = useState('')

  const { mutate, isPending, error } = useMutation({
    mutationFn: (id: string) => authApi.forgotPassword(id),
    onSuccess: (data) => setDestino(data.destino),
  })

  const esCurp = identifier && !identifier.includes('@')
  const curpCompleta = esCurp && identifier.length === 18 && CURP_REGEX.test(identifier)
  const curpIncompleta = esCurp && !curpCompleta

  const mensajeError = (() => {
    if (!error) return ''
    const msg = (error as { response?: { data?: { message?: string } } })
      ?.response?.data?.message
    return msg ?? 'Error al enviar. Intenta de nuevo.'
  })()

  return (
    <div className="min-h-screen flex">
      <PanelIzquierdo />

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">

          {destino ? (
            /* ── Estado éxito ── */
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl mx-auto mb-2">
                ✉
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-800 mb-1">Revisa tu correo</h2>
                <p className="text-sm text-slate-500">
                  Enviamos el enlace de recuperación a{' '}
                  <span className="font-mono font-medium text-slate-700">{destino}</span>
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
                <p>• El enlace expira en <strong>60 minutos</strong>.</p>
                <p>• Revisa también tu carpeta de spam.</p>
                {esCurp && (
                  <p>• El correo es el que registraste en tu solicitud de admisión.</p>
                )}
              </div>
              <Link
                to="/login"
                className="block w-full text-center py-2.5 text-sm font-medium text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-semibold text-slate-800">Recuperar contraseña</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Personal: ingresa tu correo institucional<br />
                  Alumnos: ingresa tu CURP
                </p>
              </div>

              <form
                onSubmit={e => { e.preventDefault(); mutate(identifier) }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Correo institucional o CURP
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    autoComplete="off"
                    placeholder="usuario@itsmt.edu.mx  o  ABCD991231HVZRXX00"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
                  />
                  {curpIncompleta && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      CURP: {identifier.length}/18 caracteres. Formato: ABCD991231HVZRXX00
                    </p>
                  )}
                  {curpCompleta && (
                    <p className="text-xs text-emerald-600 mt-1.5">
                      CURP válida. El enlace se enviará al correo de tu solicitud de admisión.
                    </p>
                  )}
                  {!esCurp && identifier.includes('@') && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      Solo para personal institucional (admin, docentes, directivos).
                    </p>
                  )}
                </div>

                {mensajeError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{mensajeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {isPending ? 'Verificando…' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-400">
                <Link to="/login" className="text-[#1a3a5c] hover:underline">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
