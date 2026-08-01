import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { academicoApi, type CargaAcademica, type DiaSemana, type AlumnoGrupo } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import { mutationError } from './tabs/shared'
import { openPdfPreview, triggerDownload } from '../../../utils/pdfHelpers'

type EstatusAsistencia = 'presente' | 'ausente' | 'retardo' | 'justificado'

const ESTATUS_COLORS: Record<EstatusAsistencia, string> = {
  presente:    'bg-green-100 text-green-700',
  ausente:     'bg-red-100 text-red-700',
  retardo:     'bg-yellow-100 text-yellow-700',
  justificado: 'bg-blue-100 text-blue-700',
}

const DIA_POR_INDICE: (DiaSemana | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const MES_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
// Cabecera lunes-primero — domingo (índice 0 de Date.getDay()) no tiene clase en este modelo.
const DIA_SEMANA_LABEL_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Calendario mensual que solo permite elegir los días que corresponden al horario
 * asignado a la materia (p. ej. si se imparte lunes y miércoles, solo esos días del mes
 * quedan seleccionables) — así el docente ve de un vistazo el histórico de sus sesiones
 * de clase reales, en vez de tener que escribir cualquier fecha a mano. */
function CalendarioClases({
  mesVisto, onCambiarMes, diasClase, sesionesPorFecha, fechaSel, onSeleccionar, hoyIso,
}: {
  mesVisto: Date
  onCambiarMes: (d: Date) => void
  diasClase: Set<DiaSemana>
  sesionesPorFecha: Set<string>
  fechaSel: string | null
  onSeleccionar: (fecha: string) => void
  hoyIso: string
}) {
  const anio = mesVisto.getFullYear()
  const mes = mesVisto.getMonth()
  const primerDia = new Date(anio, mes, 1)
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const offset = (primerDia.getDay() + 6) % 7 // lunes = 0

  const celdas: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(anio, mes, i + 1)),
  ]

  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onCambiarMes(new Date(anio, mes - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="text-xs font-semibold text-slate-700">{MES_LABEL[mes]} {anio}</p>
        <button
          type="button"
          onClick={() => onCambiarMes(new Date(anio, mes + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DIA_SEMANA_LABEL_CORTO.map(d => (
          <div key={d} className="text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
        {celdas.map((d, i) => {
          if (!d) return <div key={i} />

          const f = iso(d)
          const diaSemana = DIA_POR_INDICE[d.getDay()]
          const esDiaClase = diasClase.size === 0 || (diaSemana !== null && diasClase.has(diaSemana))
          const esFuturo = f > hoyIso
          const habilitada = esDiaClase && !esFuturo
          const registrada = sesionesPorFecha.has(f)
          const seleccionada = fechaSel === f
          const esHoy = f === hoyIso

          return (
            <button
              key={f}
              type="button"
              disabled={!habilitada}
              onClick={() => onSeleccionar(f)}
              title={esFuturo ? 'Aún no llega este día' : registrada ? 'Sesión registrada' : esDiaClase ? 'Día de clase' : 'No hay clase este día'}
              className={`relative h-9 rounded-lg text-xs font-medium transition-colors ${
                !habilitada
                  ? 'text-slate-300 cursor-not-allowed'
                  : seleccionada
                    ? 'bg-[#1a3a5c] text-white'
                    : esHoy
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {d.getDate()}
              {registrada && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${seleccionada ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface PeriodoRango { id: string; fecha_inicio: string; fecha_fin: string }

export default function PaseAsistenciaGrupo({
  carga, grupo, periodo,
}: {
  carga: CargaAcademica
  grupo: { id: string; clave: string }
  periodo: PeriodoRango
}) {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)
  // La tabla de alumnos se muestra de inmediato con la fecha de hoy — el docente no
  // tiene que elegir una fecha primero para ver a quién le va a pasar lista.
  const hoyIso = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState<string | null>(hoyIso)
  const [mesVisto, setMesVisto] = useState(() => new Date())
  const [asistencias, setAsistencias] = useState<Record<string, EstatusAsistencia>>({})
  const [qr, setQr] = useState<{ url: string; codigo: string } | null>(null)
  const [qrPantallaCompleta, setQrPantallaCompleta] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState<'pdf' | 'excel' | null>(null)
  // Rango de fechas para el reporte — vacío por defecto (todo el periodo); el docente
  // puede acotarlo, por ejemplo, a un solo parcial.
  const [reporteDesde, setReporteDesde] = useState('')
  const [reporteHasta, setReporteHasta] = useState('')

  // Días de la semana en que se imparte la materia según el horario asignado — el
  // calendario solo deja elegir esos días (si no hay horario, deja elegir cualquiera).
  const diasClase = useMemo(() => {
    return new Set((carga.horarios ?? []).map(h => h.dia_semana))
  }, [carga])

  const { data: grupoDetalle, isLoading: cargandoAlumnos } = useQuery({
    queryKey: ['grupo-detalle-pase', grupo.id],
    queryFn: () => academicoApi.getGrupo(grupo.id),
  })
  // Nombres ya precargados y en mayúsculas — el docente pasa lista sin tener que teclear nada.
  const alumnos: AlumnoGrupo[] = (grupoDetalle?.alumnos ?? [])
    .filter(a => a.user?.id)
    .sort((a, b) => a.numero_control.localeCompare(b.numero_control))
  const nombreAlumno = (a: AlumnoGrupo) => (a.user?.name ?? a.numero_control).toUpperCase()

  const { data: sesionesData } = useQuery({
    queryKey: ['sesiones-grupo-pase', grupo.id, periodo.id],
    queryFn: () => academicoApi.getSesionesClase({ grupo_id: grupo.id, periodo_id: periodo.id }),
  })
  const sesiones = sesionesData?.data ?? []
  const sesionSel = sesiones.find(s => s.fecha === fecha)
  const sesionesPorFecha = useMemo(() => new Set(sesiones.map(s => s.fecha)), [sesiones])

  // Resumen rápido del grupo — rellena el espacio bajo el calendario en vez de
  // dejarlo vacío, y le ahorra al docente un viaje a "Sesiones registradas".
  const resumenGrupo = useMemo(() => {
    let presentes = 0
    let totalRegistros = 0
    sesiones.forEach(s => (s.asistencias ?? []).forEach(a => {
      totalRegistros++
      if (a.estatus === 'presente') presentes++
    }))
    return {
      totalAlumnos: alumnos.length,
      totalSesiones: sesiones.length,
      porcentajeAsistencia: totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 100) : null,
    }
  }, [sesiones, alumnos.length])

  useEffect(() => {
    setQr(null)
    setQrPantallaCompleta(false)
    if (!fecha) { setAsistencias({}); return }
    const init: Record<string, EstatusAsistencia> = {}
    alumnos.forEach(a => {
      const previa = sesionSel?.asistencias?.find(as => as.alumno_id === a.user!.id)
      init[a.user!.id] = previa?.estatus ?? 'ausente'
    })
    setAsistencias(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, sesionSel, alumnos.length])

  const bloqueDelDia = (dia: DiaSemana) => (carga.horarios ?? []).find(h => h.dia_semana === dia)
  // El backend valida hora_inicio/hora_fin con el formato estricto "H:i" (sin segundos),
  // pero Horario los expone como "HH:mm:ss" — truncar o el guardado falla con 422.
  const hhmm = (v?: string) => (v ? v.slice(0, 5) : undefined)

  // Cuando la fecha no tiene un bloque de horario asociado (fecha elegida manualmente,
  // o un domingo sin clase), "00:00"-"00:00" haría fallar la validación del backend
  // (hora_fin debe ser estrictamente posterior a hora_inicio) — se usa un bloque
  // genérico de una hora en su lugar.
  const horasParaFecha = (f: string) => {
    const dia = DIA_POR_INDICE[new Date(f + 'T00:00:00').getDay()]
    const bloque = dia ? bloqueDelDia(dia) : undefined
    return {
      hora_inicio: hhmm(bloque?.hora_inicio) ?? '07:00',
      hora_fin: hhmm(bloque?.hora_fin) ?? '08:00',
    }
  }

  const mutGuardar = useMutation({
    mutationFn: () => {
      const lista = Object.entries(asistencias).map(([alumno_id, estatus]) => ({ alumno_id, estatus }))
      if (sesionSel) return academicoApi.actualizarAsistencia(sesionSel.id, lista)
      return academicoApi.crearSesionClase({
        grupo_id: grupo.id,
        carga_academica_id: carga.id,
        fecha: fecha!,
        ...horasParaFecha(fecha!),
        asistencias: lista,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesiones-grupo-pase', grupo.id, periodo.id] })
      toastSuccess('Asistencia guardada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutQr = useMutation({
    mutationFn: async () => {
      // El código requiere que ya exista la sesión — si aún no se ha guardado, se crea
      // primero con la asistencia actual (todos ausentes por defecto) y luego se genera el QR.
      const sesion = sesionSel ?? await academicoApi.crearSesionClase({
        grupo_id: grupo.id,
        carga_academica_id: carga.id,
        fecha: fecha!,
        ...horasParaFecha(fecha!),
        asistencias: Object.entries(asistencias).map(([alumno_id, estatus]) => ({ alumno_id, estatus })),
      })
      return academicoApi.generarCheckinSesion(sesion.id)
    },
    onSuccess: async (sesion) => {
      qc.invalidateQueries({ queryKey: ['sesiones-grupo-pase', grupo.id, periodo.id] })
      const url = `${window.location.origin}/asistencia/checkin/${sesion.id}?codigo=${sesion.codigo_checkin}`
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 })
      setQr({ url: dataUrl, codigo: sesion.codigo_checkin ?? '' })
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const rangoReporte = { desde: reporteDesde || undefined, hasta: reporteHasta || undefined }

  const verReportePdf = async () => {
    setGenerandoReporte('pdf')
    try {
      const blob = await academicoApi.getListaAsistenciaPdf(carga.id, 'reporte', rangoReporte)
      openPdfPreview(blob, `reporte_asistencia_${grupo.clave}.pdf`)
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setGenerandoReporte(null)
    }
  }

  const descargarReporteExcel = async () => {
    setGenerandoReporte('excel')
    try {
      const blob = await academicoApi.getReporteAsistenciaExcel(carga.id, rangoReporte)
      triggerDownload(blob, `reporte_asistencia_${grupo.clave}.xlsx`)
    } catch (e) {
      toastError(mutationError(e))
    } finally {
      setGenerandoReporte(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
      {/* Columna izquierda: calendario, sticky para que acompañe el scroll de la tabla */}
      <div className="lg:sticky lg:top-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Histórico de clases {diasClase.size > 0 && '(días según el horario asignado)'}
        </p>
        {diasClase.size === 0 && (
          <p className="text-xs text-slate-400 mb-2">
            Esta materia no tiene horario asignado en el constructor de horarios — puedes elegir cualquier día del mes.
          </p>
        )}
        <CalendarioClases
          mesVisto={mesVisto}
          onCambiarMes={setMesVisto}
          diasClase={diasClase}
          sesionesPorFecha={sesionesPorFecha}
          fechaSel={fecha}
          onSeleccionar={setFecha}
          hoyIso={hoyIso}
        />
        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Sesión registrada</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200" /> Hoy</span>
        </div>

        {/* Resumen del grupo — aprovecha el espacio bajo el calendario */}
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen del grupo</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-lg py-2.5">
              <p className="text-lg font-bold text-slate-900">{resumenGrupo.totalAlumnos}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Alumnos</p>
            </div>
            <div className="bg-slate-50 rounded-lg py-2.5">
              <p className="text-lg font-bold text-slate-900">{resumenGrupo.totalSesiones}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Sesiones</p>
            </div>
            <div className="bg-slate-50 rounded-lg py-2.5">
              <p className={`text-lg font-bold ${
                resumenGrupo.porcentajeAsistencia === null ? 'text-slate-300'
                  : resumenGrupo.porcentajeAsistencia >= 80 ? 'text-emerald-600'
                  : resumenGrupo.porcentajeAsistencia >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {resumenGrupo.porcentajeAsistencia === null ? '—' : `${resumenGrupo.porcentajeAsistencia}%`}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Asistencia</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
            <Link
              to={`/admin/gestion-academica/grupos/${grupo.id}`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Ver detalle del grupo →
            </Link>
            <Link
              to={`/admin/gestion-academica/asistencias?periodo=${periodo.id}`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Ver todas las sesiones registradas →
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] text-slate-500">
              Rango de fechas del reporte <span className="text-slate-400">(opcional — vacío = todo el periodo)</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={reporteDesde}
                onChange={e => setReporteDesde(e.target.value)}
                max={reporteHasta || undefined}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 w-full"
                aria-label="Desde"
              />
              <input
                type="date"
                value={reporteHasta}
                onChange={e => setReporteHasta(e.target.value)}
                min={reporteDesde || undefined}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 w-full"
                aria-label="Hasta"
              />
            </div>
            <button
              type="button"
              onClick={verReportePdf}
              disabled={generandoReporte !== null}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-medium"
            >
              {generandoReporte === 'pdf' ? 'Generando…' : '📄 Ver reporte de asistencia (PDF)'}
            </button>
            <button
              type="button"
              onClick={descargarReporteExcel}
              disabled={generandoReporte !== null}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-medium"
            >
              {generandoReporte === 'excel' ? 'Generando…' : '📊 Descargar reporte (Excel)'}
            </button>
          </div>
        </div>

        {qr && (
          <div className="mt-4 flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
            <img src={qr.url} alt="Código QR de asistencia" className="w-32 h-32" />
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Código: {qr.codigo}</p>
              <p className="mt-1">Los alumnos escanean este QR desde su cuenta para marcarse presentes. Válido 30 minutos.</p>
              <p className="mt-1 text-slate-400">Actualiza la lista para ver quién ya se registró.</p>
            </div>
            <button
              type="button"
              onClick={() => setQrPantallaCompleta(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white font-medium"
            >
              Ver en pantalla completa
            </button>
          </div>
        )}
      </div>

      {qr && qrPantallaCompleta && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 p-6"
          onClick={() => setQrPantallaCompleta(false)}
        >
          <img src={qr.url} alt="Código QR de asistencia" className="w-full max-w-md aspect-square bg-white rounded-xl p-4" />
          <p className="text-white font-semibold text-lg">Código: {qr.codigo}</p>
          <button
            type="button"
            onClick={() => setQrPantallaCompleta(false)}
            className="text-sm px-4 py-2 rounded-lg bg-white text-slate-800 font-medium hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Columna derecha: lista de alumnos, aprovecha todo el ancho disponible */}
      <div>
        {!fecha ? (
          <p className="text-sm text-slate-400 italic">Elige una fecha en el calendario para pasar lista.</p>
        ) : cargandoAlumnos ? (
          <p className="text-sm text-slate-400">Cargando alumnos…</p>
        ) : alumnos.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Sin alumnos inscritos en este grupo.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-slate-700">Lista — {fecha} ({alumnos.length} alumnos)</p>
              <button
                type="button"
                onClick={() => mutQr.mutate()}
                disabled={mutQr.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {mutQr.isPending ? 'Generando…' : 'Generar código QR'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Tabla completa — pantallas medianas en adelante */}
              <table className="w-full text-sm hidden sm:table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-12">#</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-40">N° Control</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Nombre del alumno</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-2.5">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumnos.map((a, i) => (
                    <tr key={a.user!.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.numero_control}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{nombreAlumno(a)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 justify-end">
                          {(['presente', 'ausente', 'retardo', 'justificado'] as EstatusAsistencia[]).map(est => (
                            <button
                              key={est}
                              onClick={() => setAsistencias(f => ({ ...f, [a.user!.id]: est }))}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                asistencias[a.user!.id] === est
                                  ? `${ESTATUS_COLORS[est]} border-current font-semibold`
                                  : 'border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {est.slice(0, 3).toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tarjetas — pantallas pequeñas, evita que los botones de estatus se corten */}
              <div className="sm:hidden divide-y divide-slate-100">
                {alumnos.map((a, i) => (
                  <div key={a.user!.id} className="p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm leading-tight">{nombreAlumno(a)}</p>
                        <p className="font-mono text-xs text-slate-500 mt-0.5">{a.numero_control}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">#{i + 1}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['presente', 'ausente', 'retardo', 'justificado'] as EstatusAsistencia[]).map(est => (
                        <button
                          key={est}
                          onClick={() => setAsistencias(f => ({ ...f, [a.user!.id]: est }))}
                          className={`text-xs px-1 py-1.5 rounded-lg border text-center transition-all ${
                            asistencias[a.user!.id] === est
                              ? `${ESTATUS_COLORS[est]} border-current font-semibold`
                              : 'border-slate-200 text-slate-400'
                          }`}
                        >
                          {est.slice(0, 3).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => mutGuardar.mutate()}
                disabled={mutGuardar.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-[#1a3a5c] rounded-lg hover:bg-[#234d7a] disabled:opacity-50"
              >
                {mutGuardar.isPending ? 'Guardando…' : 'Guardar asistencia'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
