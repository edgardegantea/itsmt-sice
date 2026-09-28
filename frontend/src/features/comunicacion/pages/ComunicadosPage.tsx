import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comunicadosApi, type ComunicadoItem } from '../services/comunicados'
import { useAuthStore } from '../../../store/authStore'
import { Link } from 'react-router-dom'
import {
  IconMegaphone, IconPin, IconPlus, IconUser,
  IconAcademicCap, IconBriefcase, IconBuilding, IconExclamation, IconCalendar,
} from '../../../components/ui/Icons'
import { Check } from 'lucide-react'

const CATEGORIAS = [
  { value: '', label: 'Todas las Categorías', Icon: IconMegaphone },
  { value: 'general', label: 'General', Icon: IconPin },
  { value: 'academico', label: 'Académico', Icon: IconAcademicCap },
  { value: 'administrativo', label: 'Administrativo', Icon: IconBriefcase },
  { value: 'sindical', label: 'Sindical', Icon: IconBuilding },
  { value: 'urgente', label: 'Urgentes', Icon: IconExclamation },
  { value: 'evento', label: 'Eventos', Icon: IconCalendar },
]

export default function ComunicadosPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [categoria, setCategoria] = useState('')
  const [comunicadoSeleccionado, setComunicadoSeleccionado] = useState<ComunicadoItem | null>(null)

  const esAdminOGestion = user?.roles?.some(r =>
    ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'direccion_general'].includes(r)
  )

  const { data, isLoading } = useQuery({
    queryKey: ['comunicados-feed', categoria],
    queryFn: () => comunicadosApi.getComunicados({ categoria: categoria || undefined }),
  })

  const mutationMarcarLeido = useMutation({
    mutationFn: comunicadosApi.marcarLeido,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados-feed'] })
      if (comunicadoSeleccionado) {
        setComunicadoSeleccionado(prev => prev ? { ...prev, leido: true } : null)
      }
    },
  })

  const items = data?.data ?? []
  const noLeidos = data?.no_leidos ?? 0

  const handleAbrirComunicado = (c: ComunicadoItem) => {
    setComunicadoSeleccionado(c)
    if (!c.leido) {
      mutationMarcarLeido.mutate(c.id)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Encabezado ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Comunicación Interna</h1>
            {noLeidos > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full animate-pulse">
                {noLeidos} sin leer
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Muro institucional de comunicados, avisos y boletines oficiales para el personal del ITSMT.
          </p>
        </div>

        {esAdminOGestion && (
          <Link
            to="/comunicados/admin"
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-xs"
          >
            <IconPlus className="w-4 h-4" />
            <span>Publicar Comunicado</span>
          </Link>
        )}
      </div>

      {/* ── Filtros por Categoría ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIAS.map(cat => {
          const CatIcon = cat.Icon
          return (
            <button
              key={cat.value}
              onClick={() => setCategoria(cat.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 border ${
                categoria === cat.value
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Listado de Comunicados (Feed) ────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Cargando comunicados...</div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <IconMegaphone className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No hay comunicados disponibles</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Por el momento no existen avisos publicados en esta categoría. Te notificaremos cuando haya novedades institucionales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(c => (
            <div
              key={c.id}
              onClick={() => handleAbrirComunicado(c)}
              className={`bg-white rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between p-5 relative group hover:shadow-md ${
                c.fijado
                  ? 'border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/20 to-white'
                  : 'border-slate-200/90 hover:border-brand-600/40'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    c.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                    c.prioridad === 'alta' ? 'bg-amber-100 text-amber-800' :
                    c.prioridad === 'baja' ? 'bg-slate-100 text-slate-600' :
                    'bg-brand-100 text-brand-700'
                  }`}>
                    {c.prioridad}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {c.fijado && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-md flex items-center gap-1">
                        <IconPin className="w-3 h-3" />
                        <span>Fijado</span>
                      </span>
                    )}
                    {!c.leido && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" title="No leído" />
                    )}
                  </div>
                </div>

                {/* Título & Resumen */}
                <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2 mb-2">
                  {c.titulo}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                  {c.resumen || c.contenido.replace(/<[^>]+>/g, '')}
                </p>
              </div>

              {/* Footer card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-auto">
                <span className="font-medium text-slate-600 truncate max-w-[150px] flex items-center gap-1">
                  <IconUser className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.publicado_por?.name ?? 'Institución'}</span>
                </span>
                <span>
                  {new Date(c.publicado_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Lectura Detallada ────────────────────────────────────────── */}
      {comunicadoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in duration-150">

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    comunicadoSeleccionado.prioridad === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'
                  }`}>
                    {comunicadoSeleccionado.categoria} · {comunicadoSeleccionado.prioridad}
                  </span>
                  {comunicadoSeleccionado.fijado && (
                    <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                      <IconPin className="w-3.5 h-3.5" />
                      <span>Fijado en portada</span>
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{comunicadoSeleccionado.titulo}</h2>
              </div>
              <button
                onClick={() => setComunicadoSeleccionado(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
              <div> Publicado por: <span className="font-semibold text-slate-700">{comunicadoSeleccionado.publicado_por?.name ?? 'SICE ITSMT'}</span></div>
              <div>•</div>
              <div> Fecha: <span className="font-semibold text-slate-700">{new Date(comunicadoSeleccionado.publicado_at).toLocaleString('es-MX')}</span></div>
            </div>

            <div className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed space-y-3 whitespace-pre-wrap">
              {comunicadoSeleccionado.contenido}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} aria-hidden="true" />
                  <span>Acuse registrado (Leído)</span>
                </span>
              </div>
              <button
                onClick={() => setComunicadoSeleccionado(null)}
                className="px-5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-xs"
              >
                Cerrar Comunicado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
