import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi } from '../services/academico'
import { comunicadosApi, type ComunicadoItem } from '../../comunicacion/services/comunicados'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import Modal from '../../../components/ui/Modal'
import {
  IconCalendar, IconClock, IconDocument, IconChart, IconCheckCircle,
  IconExclamation, IconUsers, IconAcademicCap, IconMegaphone, IconTrophy, IconQrCode,
} from '../../../components/ui/Icons'

const ACCESOS_RAPIDOS = [
  { to: '/docente/mi-horario',        label: 'Mi Horario',                desc: 'Consulta tus horas de clase asignadas', Icon: IconCalendar, color: 'bg-blue-50 text-blue-700' },
  { to: '/docente/disponibilidad',    label: 'Mi Disponibilidad',         desc: 'Registra tus horarios disponibles', Icon: IconClock, color: 'bg-indigo-50 text-indigo-700' },
  { to: '/docente/planeacion',        label: 'Mi Planeación',             desc: 'Instrumentación didáctica de tus materias', Icon: IconDocument, color: 'bg-emerald-50 text-emerald-700' },
  { to: '/docente/calificaciones',    label: 'Captura de Calificaciones', desc: 'Registra las calificaciones de tus grupos', Icon: IconChart, color: 'bg-purple-50 text-purple-700' },
  { to: '/docente/asistencias',       label: 'Captura de Asistencia',     desc: 'Pasa lista con fechas precargadas y QR', Icon: IconCheckCircle, color: 'bg-teal-50 text-teal-700' },
  { to: '/docente/incidencias-clase',  label: 'Incidencias de Clase',      desc: 'Rondas de prefectura reportadas sobre tus grupos', Icon: IconExclamation, color: 'bg-amber-50 text-amber-700' },
  { to: '/docente/pit/sesiones',      label: 'Mis Tutorías (PIT)',        desc: 'Programa Institucional de Tutoría y sesiones', Icon: IconUsers, color: 'bg-cyan-50 text-cyan-700' },
  { to: '/docente/capacitacion',      label: 'Mis Cursos de Capacitación',desc: 'Cursos AP y Formación Docente asignados', Icon: IconAcademicCap, color: 'bg-rose-50 text-rose-700' },
  { to: '/comunicados',               label: 'Comunicación Interna',      desc: 'Boletines, circulares y avisos institucionales', Icon: IconMegaphone, color: 'bg-amber-50 text-amber-800' },
  { to: '/docente/ranking',           label: 'Ranking Docente',           desc: 'Tu cumplimiento del semestre y tu lugar entre colegas', Icon: IconTrophy, color: 'bg-amber-50 text-amber-700' },
  { to: '/docente/mi-cv',             label: 'Mi CV Docente',             desc: 'Actualiza tu currículum y perfil académico', Icon: IconDocument, color: 'bg-slate-100 text-slate-700' },
]

/** QR personal de cumplimiento */
function ModalPasaporteQr({ docenteId, onClose }: { docenteId: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const url = `${window.location.origin}/qr/docente/${docenteId}`

  useEffect(() => {
    QRCode.toDataURL(url, { width: 300, margin: 1 }).then(setDataUrl)
  }, [url])

  return (
    <Modal title="Mi pasaporte de cumplimiento" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-2">
        {dataUrl ? (
          <img src={dataUrl} alt="Mi QR de pasaporte" className="rounded-lg border border-slate-200" />
        ) : (
          <div className="w-72 h-72 flex items-center justify-center text-slate-400 text-sm">Generando…</div>
        )}
        <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
          Cualquiera que escanee este código ve tu captura de calificaciones, asistencia
          e incidencias del semestre en vivo.
        </p>
        <a
          href={dataUrl ?? undefined}
          download="mi-pasaporte-qr.png"
          className="text-xs bg-[#1b396a] text-white px-4 py-2 rounded-xl hover:bg-[#152e56] transition-colors font-semibold shadow-xs flex items-center gap-1.5"
        >
          <span>Descargar PNG</span>
        </a>
      </div>
    </Modal>
  )
}

/** Comparativo de dosificación didáctica */
function ComparativoInstrumentacion() {
  const { data: periodoActivo } = usePeriodoActivo()
  const { data } = useQuery({
    queryKey: ['mi-comparativo-instrumentacion', periodoActivo?.id],
    queryFn: () => academicoApi.getMiComparativoInstrumentacion(periodoActivo ? { periodo_id: periodoActivo.id } : undefined),
    enabled: !!periodoActivo?.id,
  })

  if (!data || data.mi_porcentaje === null || data.total_docentes_academia < 2) return null

  const diferencia = data.mi_porcentaje - (data.promedio_academia ?? data.mi_porcentaje)
  const tono = diferencia >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-6 flex-wrap shadow-xs">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-3xl font-extrabold text-[#1b396a]">{data.mi_porcentaje}%</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Mi cumplimiento de dosificación</div>
        </div>
        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
        <div>
          <div className="text-2xl font-bold text-slate-400">{data.promedio_academia}%</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Promedio de tu academia ({data.total_docentes_academia} docentes)</div>
        </div>
      </div>
      <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${tono} flex items-center gap-1`}>
        <span>{diferencia >= 0 ? '▲' : '▼'}</span>
        <span>{Math.abs(Math.round(diferencia))} pts {diferencia >= 0 ? 'sobre' : 'bajo'} el promedio</span>
      </div>
    </div>
  )
}

/** Widget de Comunicados Recientes en el Dashboard Docente */
function ComunicadosRecientesWidget() {
  const { data } = useQuery({
    queryKey: ['comunicados-docente-widget'],
    queryFn: () => comunicadosApi.getComunicados(),
  })

  const items = (data?.data ?? []).slice(0, 3)
  const noLeidos = data?.no_leidos ?? 0

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconMegaphone className="w-5 h-5 text-[#1b396a]" />
          <h2 className="text-sm font-bold text-[#1b396a] uppercase tracking-wider">Comunicación Interna Reciente</h2>
          {noLeidos > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {noLeidos} sin leer
            </span>
          )}
        </div>
        <Link to="/comunicados" className="text-xs font-semibold text-[#b38e5d] hover:underline">
          Ver todos →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((c: ComunicadoItem) => (
          <Link
            key={c.id}
            to="/comunicados"
            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  c.prioridad === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {c.categoria}
                </span>
                {!c.leido && <span className="w-2 h-2 rounded-full bg-amber-500" title="Sin leer" />}
              </div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{c.titulo}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{c.resumen || c.contenido.replace(/<[^>]+>/g, '')}</p>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              {new Date(c.publicado_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function DashboardDocentePage() {
  const { user } = useAuthStore()
  const [mostrarQr, setMostrarQr] = useState(false)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header docente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hola, {user?.name ?? 'Docente'}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-[#1b396a] rounded-full">
              Docente TecNM
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Bienvenido a tu portal docente. Gestiona tus grupos, asistencias, calificaciones e instrumentaciones.
          </p>
        </div>

        {user?.id && (
          <button
            onClick={() => setMostrarQr(true)}
            className="px-4 py-2.5 bg-[#1b396a] text-white text-xs font-semibold rounded-xl hover:bg-[#152e56] transition-colors inline-flex items-center justify-center gap-2 shrink-0 shadow-xs"
          >
            <IconQrCode className="w-4 h-4" />
            <span>Mi pasaporte QR</span>
          </button>
        )}
      </div>

      {/* Widget de Comunicados Internos */}
      <ComunicadosRecientesWidget />

      {/* Comparativo de instrumentación */}
      <ComparativoInstrumentacion />

      {/* Grid de Accesos Rápidos */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Accesos Rápidos Módulo Docente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCESOS_RAPIDOS.map(a => {
            const ItemIcon = a.Icon
            return (
              <Link
                key={a.to}
                to={a.to}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#1b396a] hover:shadow-md transition-all flex items-start gap-4 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.color}`}>
                  <ItemIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 group-hover:text-[#1b396a] transition-colors text-sm truncate">{a.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{a.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {mostrarQr && user?.id && <ModalPasaporteQr docenteId={user.id} onClose={() => setMostrarQr(false)} />}
    </div>
  )
}
