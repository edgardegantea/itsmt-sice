import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import { inputCls, mutationError } from '../../academico/pages/tabs/shared'

interface Estatus2FA {
  habilitado: boolean
  confirmado_en?: string | null
}

export default function SeguridadCuentaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [setupData, setSetupData] = useState<{ secreto: string; otpauth_url: string } | null>(null)
  const [codigoConfirmar, setCodigoConfirmar] = useState('')
  const [codigosRecuperacion, setCodigosRecuperacion] = useState<string[] | null>(null)
  const [passwordDeshabilitar, setPasswordDeshabilitar] = useState('')
  const [showDeshabilitar, setShowDeshabilitar] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ password_actual: '', password: '', password_confirmation: '' })

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

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Seguridad de mi cuenta</h1>
        <p className="text-sm text-slate-500 mt-0.5">Verificación en dos pasos y cambio de contraseña</p>
      </div>

      {/* 2FA */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Verificación en dos pasos (2FA)</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado: <span className={estatus?.habilitado ? 'text-green-700 font-medium' : 'text-slate-500'}>{estatus?.habilitado ? 'Activada' : 'Desactivada'}</span>
            </p>
          </div>
          {!estatus?.habilitado && !setupData && (
            <button onClick={() => mutConfigurar.mutate()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Activar
            </button>
          )}
          {estatus?.habilitado && (
            <button onClick={() => setShowDeshabilitar(true)} className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">
              Desactivar
            </button>
          )}
        </div>

        {setupData && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm text-slate-600">Escanea este código con Google Authenticator, Authy u otra app TOTP, o ingresa el secreto manualmente:</p>
            <p className="font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">{setupData.secreto}</p>
            <p className="text-xs text-slate-400 break-all">{setupData.otpauth_url}</p>
            <div className="flex gap-2">
              <input
                value={codigoConfirmar}
                onChange={e => setCodigoConfirmar(e.target.value)}
                placeholder="Código de 6 dígitos"
                className={`${inputCls} max-w-[180px] text-center tracking-widest`}
              />
              <button onClick={() => mutConfirmar.mutate()} disabled={mutConfirmar.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Confirmar
              </button>
            </div>
          </div>
        )}

        {codigosRecuperacion && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-amber-700">Guarda estos códigos de recuperación. No volverán a mostrarse:</p>
            <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-sm">
              {codigosRecuperacion.map(c => (
                <div key={c} className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center">{c}</div>
              ))}
            </div>
            <button onClick={() => setCodigosRecuperacion(null)} className="mt-3 text-xs text-slate-500 hover:underline">Ya los guardé</button>
          </div>
        )}

        {showDeshabilitar && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <input
              type="password"
              value={passwordDeshabilitar}
              onChange={e => setPasswordDeshabilitar(e.target.value)}
              placeholder="Confirma tu contraseña"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button onClick={() => mutDeshabilitar.mutate()} disabled={mutDeshabilitar.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                Confirmar desactivación
              </button>
              <button onClick={() => setShowDeshabilitar(false)} className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="font-semibold text-slate-800">Cambiar contraseña</p>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Contraseña actual</label>
          <input type="password" value={passwordForm.password_actual} onChange={e => setPasswordForm(f => ({ ...f, password_actual: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nueva contraseña</label>
          <input type="password" value={passwordForm.password} onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
          <p className="text-[11px] text-slate-400 mt-1">Mínimo 10 caracteres, mayúsculas, minúsculas, números y símbolos.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Confirmar nueva contraseña</label>
          <input type="password" value={passwordForm.password_confirmation} onChange={e => setPasswordForm(f => ({ ...f, password_confirmation: e.target.value }))} className={inputCls} />
        </div>
        <button onClick={() => mutCambiarPassword.mutate()} disabled={mutCambiarPassword.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Actualizar contraseña
        </button>
      </div>
    </div>
  )
}
