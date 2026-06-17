import { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../../config/apiClient'
import { useConfiguracion } from '../../../hooks/useConfiguracion'

const ESTATUS_LABEL: Record<string, string> = {
  pendiente:  'En revisión',
  aceptado:   'Aceptado',
  rechazado:  'No admitido',
  inscrito:   'Inscrito',
  lista_espera: 'Lista de espera',
}

const ESTATUS_COLOR: Record<string, string> = {
  pendiente:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  aceptado:    'bg-green-100 text-green-800 border-green-200',
  rechazado:   'bg-red-100 text-red-800 border-red-200',
  inscrito:    'bg-blue-100 text-blue-800 border-blue-200',
  lista_espera:'bg-slate-100 text-slate-700 border-slate-200',
}

interface ResultadoConsulta {
  folio: string
  nombre: string
  estatus: string
  carrera: string | null
  periodo: string | null
  observaciones: string | null
  motivo_rechazo: string | null
}

export default function ConsultaAspirantePage() {
  const { config } = useConfiguracion()
  const [curp, setCurp] = useState('')
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)

  const logoUrl = config.url_logo_principal ?? null

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault()
    const curpLimpia = curp.trim().toUpperCase()
    if (curpLimpia.length !== 18) {
      setError('Ingresa los 18 caracteres de tu CURP.')
      return
    }
    setBuscando(true)
    setError(null)
    setResultado(null)
    try {
      const { data } = await apiClient.get(`/aspirantes/consultar-estatus?curp=${curpLimpia}`)
      setResultado(data.data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo consultar. Intenta más tarde.'
      setError(msg)
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header institucional */}
      <header className="bg-[#1a3a5c] text-white px-4 py-4 flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={config.nombre_corto} className="h-9 w-9 object-contain" />
        ) : (
          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            {(config.nombre_corto ?? 'IT').slice(0, 2)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold leading-tight">{config.nombre_corto}</p>
          <p className="text-white/50 text-xs">Control Escolar</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-800">Consulta de estatus</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ingresa tu CURP para conocer el estado de tu solicitud de admisión.
            </p>
          </div>

          <form onSubmit={consultar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CURP</label>
              <input
                type="text"
                value={curp}
                onChange={e => setCurp(e.target.value.toUpperCase())}
                maxLength={18}
                placeholder="XXXX000000XXXXXX00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition uppercase"
                required
              />
              <p className="text-xs text-slate-400 mt-1">{curp.length}/18 caracteres</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={buscando}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-primario)' }}
            >
              {buscando ? 'Consultando…' : 'Consultar estatus'}
            </button>
          </form>

          {resultado && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Nombre</p>
                  <p className="text-slate-800 font-semibold">{resultado.nombre}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ESTATUS_COLOR[resultado.estatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {ESTATUS_LABEL[resultado.estatus] ?? resultado.estatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {resultado.carrera && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Carrera</p>
                    <p className="text-sm text-slate-700">{resultado.carrera}</p>
                  </div>
                )}
                {resultado.periodo && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Periodo</p>
                    <p className="text-sm text-slate-700">{resultado.periodo}</p>
                  </div>
                )}
              </div>

              {resultado.estatus === 'aceptado' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-green-800 mb-1">¡Felicidades! Fuiste aceptado</p>
                  <p className="text-xs text-green-700">
                    Preséntate en Control Escolar con tu documentación completa para continuar con tu inscripción.
                  </p>
                </div>
              )}

              {resultado.estatus === 'inscrito' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Ya estás inscrito</p>
                  <p className="text-xs text-blue-700">
                    Tu proceso de admisión está completo. Inicia sesión con tu número de control para acceder a tu portal de alumno.
                  </p>
                </div>
              )}

              {resultado.estatus === 'rechazado' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-red-800 mb-1">Solicitud no admitida</p>
                  {resultado.motivo_rechazo && (
                    <p className="text-xs text-red-700">{resultado.motivo_rechazo}</p>
                  )}
                </div>
              )}

              {resultado.estatus === 'lista_espera' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700 mb-1">En lista de espera</p>
                  <p className="text-xs text-slate-600">
                    Tu solicitud está en lista de espera. Te contactaremos si hay disponibilidad.
                  </p>
                </div>
              )}

              {resultado.observaciones && resultado.estatus === 'pendiente' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-yellow-700">{resultado.observaciones}</p>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            <Link to="/login" className="text-[#1a3a5c] hover:underline">Iniciar sesión</Link>
            {' · '}
            <Link to="/registro" className="text-[#1a3a5c] hover:underline">Registrar solicitud</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
