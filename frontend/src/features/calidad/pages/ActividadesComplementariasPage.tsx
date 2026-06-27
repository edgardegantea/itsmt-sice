import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calidadApi, type ActividadComplementaria, type NivelDesempeno } from '../services/calidad'
import { useAuthStore } from '../../../store/authStore'
import { usePuedeEliminar } from '../../../hooks/usePermisos'

const ESTATUS_BADGE: Record<string, string> = {
  registrada: 'bg-yellow-100 text-yellow-800',
  validada:   'bg-green-100 text-green-800',
  rechazada:  'bg-red-100 text-red-800',
}

const NIVEL_LABEL: Record<NivelDesempeno, string> = {
  excelente:    'Excelente',
  notable:      'Notable',
  bueno:        'Bueno',
  suficiente:   'Suficiente',
  insuficiente: 'Insuficiente',
}

const NIVEL_OPTIONS: NivelDesempeno[] = ['excelente', 'notable', 'bueno', 'suficiente', 'insuficiente']

export default function ActividadesComplementariasPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const puedeEliminar = usePuedeEliminar()
  const esAlumno = user?.roles.includes('alumno')
  const esAdmin  = user?.roles.some(r => ['admin', 'superadmin'].includes(r))

  const [showForm, setShowForm] = useState(false)
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [validandoId, setValidandoId] = useState<string | null>(null)
  const [formNivel, setFormNivel] = useState<NivelDesempeno>('bueno')
  const [formObs, setFormObs] = useState('')
  const [formEstatusValidar, setFormEstatusValidar] = useState<'validada' | 'rechazada'>('validada')

  // Formulario registro
  const [tipoId, setTipoId] = useState('')
  const [horas, setHoras] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState('')

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-actividad'],
    queryFn: calidadApi.getTiposActividad,
  })

  const { data: actividades, isLoading } = useQuery({
    queryKey: ['actividades-complementarias', filtroEstatus],
    queryFn: () => calidadApi.getActividades(filtroEstatus ? { estatus: filtroEstatus } : undefined),
  })

  const registrarMut = useMutation({
    mutationFn: calidadApi.registrarActividad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades-complementarias'] })
      setShowForm(false)
      setTipoId('')
      setHoras('')
      setEvidenciaUrl('')
    },
  })

  const validarMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => calidadApi.validarActividad(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades-complementarias'] })
      setValidandoId(null)
    },
  })

  const lista: ActividadComplementaria[] = Array.isArray(actividades)
    ? actividades
    : actividades?.data ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Actividades Complementarias</h1>
          <p className="text-sm text-slate-500 mt-1">
            {esAlumno
              ? 'Registra tus actividades de los 12 tipos oficiales TecNM (semestres 1-6)'
              : 'Valida y acredita las actividades de los alumnos'}
          </p>
        </div>
        {esAlumno && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#1a3a5c] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
          >
            + Nueva actividad
          </button>
        )}
      </div>

      {/* Formulario de registro */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-700">Registrar actividad complementaria</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Tipo de actividad</label>
              <select
                value={tipoId}
                onChange={e => setTipoId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un tipo…</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.horas_requeridas}h requeridas)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Horas realizadas</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={horas}
                onChange={e => setHoras(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">URL de evidencia (opcional)</label>
              <input
                type="url"
                value={evidenciaUrl}
                onChange={e => setEvidenciaUrl(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://drive.google.com/…"
              />
            </div>
          </div>
          {registrarMut.isError && (
            <p className="text-sm text-red-600">
              {(registrarMut.error as any)?.response?.data?.message ?? 'Error al registrar.'}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => registrarMut.mutate({ tipo_id: tipoId, horas: Number(horas), evidencia_url: evidenciaUrl || undefined })}
              disabled={!tipoId || !horas || registrarMut.isPending}
              className="bg-[#1a3a5c] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#15304e] transition-colors"
            >
              {registrarMut.isPending ? 'Guardando…' : 'Registrar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtro */}
      {!esAlumno && (
        <div className="flex gap-2 flex-wrap">
          {['', 'registrada', 'validada', 'rechazada'].map(e => (
            <button
              key={e}
              onClick={() => setFiltroEstatus(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroEstatus === e
                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {e === '' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando actividades…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          {esAlumno ? 'No tienes actividades registradas. ¡Comienza registrando una!' : 'No hay actividades en este estado.'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((ac) => (
            <div key={ac.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{ac.tipo?.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_BADGE[ac.estatus]}`}>
                      {ac.estatus}
                    </span>
                    {ac.nivel_desempeno && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {NIVEL_LABEL[ac.nivel_desempeno]}
                      </span>
                    )}
                  </div>
                  {!esAlumno && ac.alumno && (
                    <p className="text-xs text-slate-500 mt-1">
                      {ac.alumno.user.name} · {ac.alumno.numero_control} · {ac.alumno.carrera?.nombre}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {ac.horas} horas · Semestre {ac.semestre_alumno_al_registrar}
                    {ac.evidencia_url && (
                      <>
                        {' · '}
                        <a href={ac.evidencia_url} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline">
                          Ver evidencia
                        </a>
                      </>
                    )}
                  </p>
                  {ac.observaciones_validacion && (
                    <p className="text-xs text-slate-500 mt-1 italic">Obs: {ac.observaciones_validacion}</p>
                  )}
                </div>

                {/* Botón validar (admin) */}
                {esAdmin && ac.estatus === 'registrada' && (
                  <button
                    onClick={() => setValidandoId(ac.id)}
                    className="shrink-0 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Validar
                  </button>
                )}
              </div>

              {/* Panel de validación */}
              {validandoId === ac.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name="ev" value="validada"
                             checked={formEstatusValidar === 'validada'}
                             onChange={() => setFormEstatusValidar('validada')} />
                      Validada
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name="ev" value="rechazada"
                             checked={formEstatusValidar === 'rechazada'}
                             onChange={() => setFormEstatusValidar('rechazada')} />
                      Rechazada
                    </label>
                  </div>
                  {formEstatusValidar === 'validada' && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Nivel de desempeño</label>
                      <select
                        value={formNivel}
                        onChange={e => setFormNivel(e.target.value as NivelDesempeno)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                      >
                        {NIVEL_OPTIONS.map(n => (
                          <option key={n} value={n}>{NIVEL_LABEL[n]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <textarea
                    value={formObs}
                    onChange={e => setFormObs(e.target.value)}
                    placeholder="Observaciones (opcional)"
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => validarMut.mutate({
                        id: ac.id,
                        data: {
                          estatus: formEstatusValidar,
                          nivel_desempeno: formEstatusValidar === 'validada' ? formNivel : undefined,
                          observaciones_validacion: formObs || undefined,
                        },
                      })}
                      disabled={validarMut.isPending}
                      className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-emerald-700"
                    >
                      {validarMut.isPending ? 'Guardando…' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setValidandoId(null)}
                      className="border border-slate-300 px-3 py-1.5 rounded-lg text-sm text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
