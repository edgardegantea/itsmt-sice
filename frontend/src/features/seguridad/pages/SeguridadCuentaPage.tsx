import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import { inputCls } from '../../academico/pages/tabs/shared'
import { mutationError } from '@/utils/apiErrors'
import { Check, CircleDashed, Eye, EyeOff, Lock } from 'lucide-react'

interface Estatus2FA {
  habilitado: boolean
  confirmado_en?: string | null
}

/** Ícono de sección: cuadro con degradado (56px), en vez de la simple barrita de color —
 * le da a cada tarjeta un punto focal en vez de depender solo del borde/sombra. */
function IconoSeccion({ tono, path }: { tono: 'sky' | 'emerald' | 'amber'; path: string }) {
  const degradado = {
    sky: 'from-brand-600 to-sky-600 shadow-brand-600/30',
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
  }[tono]
  return (
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${degradado} text-white flex items-center justify-center shrink-0 shadow-sm`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </div>
  )
}

const PATH_ESCUDO = 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z'
const PATH_LLAVE = 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z'

/** Input de contraseña con ícono de candado y botón de mostrar/ocultar — reemplaza el
 * <input type="password"> plano, con el mismo estilo de campo usado en el resto del sistema. */
function CampoPassword({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} aria-hidden="true" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40 transition-colors"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {visible ? (
          <EyeOff className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Eye className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

/** Fuerza aproximada de la nueva contraseña, solo como referencia visual (la validación
 * real de longitud/complejidad la hace el backend al guardar). */
function fuerzaPassword(v: string): { nivel: number; etiqueta: string; color: string } {
  let puntos = 0
  if (v.length >= 10) puntos++
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos++
  if (/\d/.test(v)) puntos++
  if (/[^A-Za-z0-9]/.test(v)) puntos++
  const niveles = [
    { etiqueta: 'Muy débil', color: 'bg-red-400' },
    { etiqueta: 'Débil', color: 'bg-orange-400' },
    { etiqueta: 'Aceptable', color: 'bg-amber-400' },
    { etiqueta: 'Buena', color: 'bg-emerald-400' },
    { etiqueta: 'Excelente', color: 'bg-emerald-500' },
  ]
  const nivel = Math.min(4, puntos)
  return { nivel: nivel + 1, ...niveles[nivel] }
}

export default function SeguridadCuentaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [setupData, setSetupData] = useState<{ secreto: string; otpauth_url: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [codigoConfirmar, setCodigoConfirmar] = useState('')
  const [codigosRecuperacion, setCodigosRecuperacion] = useState<string[] | null>(null)
  const [passwordDeshabilitar, setPasswordDeshabilitar] = useState('')
  const [showDeshabilitar, setShowDeshabilitar] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ password_actual: '', password: '', password_confirmation: '' })

  // El QR se genera en el navegador a partir del otpauth_url que ya devuelve el backend —
  // no requiere ningún endpoint ni dependencia nueva en el servidor (el secreto nunca sale
  // del navegador salvo dentro de esa misma URL que el backend ya entregó).
  useEffect(() => {
    if (!setupData) { setQrDataUrl(null); return }
    let cancelado = false
    QRCode.toDataURL(setupData.otpauth_url, { width: 220, margin: 1 })
      .then(url => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => { if (!cancelado) setQrDataUrl(null) })
    return () => { cancelado = true }
  }, [setupData])

  const { data: estatus } = useQuery<Estatus2FA>({
    queryKey: ['2fa-estatus'],
    queryFn: () => apiClient.get('/2fa/estatus').then(r => r.data.data),
  })

  const mutConfigurar = useMutation({
    mutationFn: () => apiClient.post('/2fa/configurar').then(r => r.data.data),
    onSuccess: (data) => setSetupData(data),
    onError: (e) => toastError(mutationError(e)),
  })

  const mutConfirmar = useMutation({
    mutationFn: () => apiClient.post('/2fa/confirmar', { codigo: codigoConfirmar }).then(r => r.data.data),
    onSuccess: (data) => {
      setCodigosRecuperacion(data.codigos_recuperacion)
      setSetupData(null)
      setCodigoConfirmar('')
      qc.invalidateQueries({ queryKey: ['2fa-estatus'] })
      toastSuccess('Verificación en dos pasos activada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutDeshabilitar = useMutation({
    mutationFn: () => apiClient.post('/2fa/deshabilitar', { password: passwordDeshabilitar }),
    onSuccess: () => {
      setShowDeshabilitar(false)
      setPasswordDeshabilitar('')
      qc.invalidateQueries({ queryKey: ['2fa-estatus'] })
      toastSuccess('Verificación en dos pasos desactivada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCambiarPassword = useMutation({
    mutationFn: () => apiClient.patch('/auth/cambiar-password', passwordForm),
    onSuccess: () => {
      setPasswordForm({ password_actual: '', password: '', password_confirmation: '' })
      toastSuccess('Contraseña actualizada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const fuerza = fuerzaPassword(passwordForm.password)

  return (
    <div className="relative min-h-full bg-gradient-to-b from-slate-50 via-white to-white p-6 space-y-5 overflow-hidden">
      {/* Manchas decorativas de fondo — sutiles, para que la pantalla no se sienta un
          simple formulario blanco sobre blanco. */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 w-72 h-72 rounded-full bg-emerald-200/20 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-600/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={PATH_ESCUDO} />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Seguridad de mi cuenta</h1>
          <p className="text-sm text-slate-500 mt-0.5">Verificación en dos pasos y cambio de contraseña</p>
        </div>
      </div>

      {/* 2FA */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70 overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${estatus?.habilitado ? 'from-emerald-500 via-emerald-400 to-teal-400' : 'from-brand-600 via-sky-500 to-emerald-400'}`} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconoSeccion tono={estatus?.habilitado ? 'emerald' : 'sky'} path={PATH_ESCUDO} />
              <div>
                <p className="font-semibold text-slate-800">Verificación en dos pasos (2FA)</p>
                <p className="text-xs text-slate-500 mt-0.5">Protege tu cuenta con un código adicional generado en tu teléfono.</p>
                <span className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${estatus?.habilitado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {estatus?.habilitado ? (
                    <Check className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <CircleDashed className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                  )}
                  {estatus?.habilitado ? 'Activada' : 'Desactivada'}
                </span>
              </div>
            </div>
            {!estatus?.habilitado && !setupData && (
              <button onClick={() => mutConfigurar.mutate()} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md transition-all shrink-0">
                Activar
              </button>
            )}
            {estatus?.habilitado && (
              <button onClick={() => setShowDeshabilitar(true)} className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors shrink-0">
                Desactivar
              </button>
            )}
          </div>

          {setupData && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-sm text-slate-600">Escanea este código con Google Authenticator, Authy u otra app TOTP, o ingresa el secreto manualmente:</p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="shrink-0 bg-white border-2 border-sky-100 rounded-xl shadow-sm shadow-sky-100/60 p-2 w-[236px] h-[236px] flex items-center justify-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Código QR para activar la verificación en dos pasos" width={220} height={220} />
                  ) : (
                    <span className="text-xs text-slate-400">Generando código QR…</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 mb-1">O ingresa este secreto manualmente</p>
                    <p className="font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">{setupData.secreto}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={codigoConfirmar}
                      onChange={e => setCodigoConfirmar(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      className={`${inputCls} max-w-[180px] text-center tracking-widest`}
                    />
                    <button onClick={() => mutConfirmar.mutate()} disabled={mutConfirmar.isPending} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md transition-all disabled:opacity-50">
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {codigosRecuperacion && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
                Guarda estos códigos de recuperación. No volverán a mostrarse:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-sm">
                {codigosRecuperacion.map(c => (
                  <div key={c} className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-center shadow-sm shadow-amber-100">{c}</div>
                ))}
              </div>
              <button onClick={() => setCodigosRecuperacion(null)} className="mt-3 text-xs text-slate-500 hover:underline">Ya los guardé</button>
            </div>
          )}

          {showDeshabilitar && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="max-w-xs">
                <CampoPassword value={passwordDeshabilitar} onChange={setPasswordDeshabilitar} placeholder="Confirma tu contraseña" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => mutDeshabilitar.mutate()} disabled={mutDeshabilitar.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-red-600/30 hover:bg-red-700 hover:shadow-md transition-all disabled:opacity-50">
                  Confirmar desactivación
                </button>
                <button onClick={() => setShowDeshabilitar(false)} className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <IconoSeccion tono="emerald" path={PATH_LLAVE} />
            <div>
              <p className="font-semibold text-slate-800">Cambiar contraseña</p>
              <p className="text-xs text-slate-500 mt-0.5">Usa una contraseña que no reutilices en otros sitios.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-1">
            <div className="sm:col-span-2 max-w-sm">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Contraseña actual</label>
              <CampoPassword value={passwordForm.password_actual} onChange={v => setPasswordForm(f => ({ ...f, password_actual: v }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nueva contraseña</label>
              <CampoPassword value={passwordForm.password} onChange={v => setPasswordForm(f => ({ ...f, password: v }))} />
              {passwordForm.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`flex-1 rounded-full transition-colors ${i < fuerza.nivel ? fuerza.color : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{fuerza.etiqueta}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Mínimo 10 caracteres, mayúsculas, minúsculas, números y símbolos.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Confirmar nueva contraseña</label>
              <CampoPassword value={passwordForm.password_confirmation} onChange={v => setPasswordForm(f => ({ ...f, password_confirmation: v }))} />
            </div>
          </div>

          <button onClick={() => mutCambiarPassword.mutate()} disabled={mutCambiarPassword.isPending} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md transition-all disabled:opacity-50">
            Actualizar contraseña
          </button>
        </div>
      </div>
    </div>
  )
}
