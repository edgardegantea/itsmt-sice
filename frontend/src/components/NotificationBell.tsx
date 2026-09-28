import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificacionesApi, type NotificacionItem } from '../features/notificaciones/services/notificaciones'
import { IconDocument, IconExclamation, IconClipboard, IconBell } from './ui/Icons'
import { Bell } from 'lucide-react'

function formatTiempo(fechaStr: string) {
  try {
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diffMs = ahora.getTime() - fecha.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)

    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHoras < 24) return `Hace ${diffHoras} h`
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return fechaStr
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, refetch } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: notificacionesApi.getNotificaciones,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  })

  const notificaciones = data?.data ?? []
  const noLeidas = data?.no_leidas ?? 0

  const mutationMarcarLeida = useMutation({
    mutationFn: notificacionesApi.marcarLeida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
    },
  })

  const mutationMarcarTodas = useMutation({
    mutationFn: notificacionesApi.marcarTodasLeidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
    },
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleClickItem = (item: NotificacionItem) => {
    if (!item.leida) {
      mutationMarcarLeida.mutate(item.id)
    }
    if (item.link) {
      setOpen(false)
      navigate(item.link)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) refetch()
        }}
        className="relative p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors focus:outline-none"
        title="Notificaciones del sistema"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />

        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-xl bg-white border border-slate-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Notificaciones
              </h3>
              {noLeidas > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-600 text-white rounded-full">
                  {noLeidas} nuevas
                </span>
              )}
            </div>
            {noLeidas > 0 && (
              <button
                onClick={() => mutationMarcarTodas.mutate()}
                className="text-[11px] font-medium text-[#b38e5d] hover:text-[#8c6b3e] transition-colors"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notificaciones.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                <p className="text-xs text-slate-500 font-medium">No tienes notificaciones por el momento.</p>
              </div>
            ) : (
              notificaciones.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                    !item.leida ? 'bg-amber-50/40 border-l-3 border-[#b38e5d]' : 'bg-white'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      item.tipo === 'constancia' ? 'bg-brand-100 text-brand-700' :
                      item.tipo === 'baja' ? 'bg-amber-100 text-amber-800' :
                      item.tipo === 'tramite' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {item.tipo === 'constancia' ? <IconDocument className="w-4 h-4" /> : item.tipo === 'baja' ? <IconExclamation className="w-4 h-4" /> : item.tipo === 'tramite' ? <IconClipboard className="w-4 h-4" /> : <IconBell className="w-4 h-4" />}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!item.leida ? 'text-brand-600' : 'text-slate-700'}`}>
                        {item.titulo}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTiempo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                      {item.mensaje}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 font-medium">
              SICE · TecNM Sistema de Notificaciones
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
