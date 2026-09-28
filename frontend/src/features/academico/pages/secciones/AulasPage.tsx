import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { academicoApi, type Aula, type OcupacionAula } from '../../services/academico'
import { Field, SortableTh, SkeletonRows, EmptyRow, inputCls, selectCls, ModalWrap, useSorted } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'
import { useToastStore } from '../../../../store/toastStore'
import { usePuedeEliminar } from '../../../../hooks/usePermisos'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import ViewToggle, { useViewMode } from '../../../../components/ui/ViewToggle'
import DetailModal from '../../../../components/ui/DetailModal'
import Modal from '../../../../components/ui/Modal'
import BulkActionBar, { SelectCheckbox, ToggleSelectionButton } from '../../../../components/ui/BulkActionBar'
import { ChevronLeft } from 'lucide-react'

/** QR fijo para pegar en la puerta del aula — al escanearlo, quien lo abra (docente
 * o prefectura) cae en /qr/aula/:id, que resuelve solo qué clase toca ahí ahora. */
function ModalQrAula({ aula, onClose }: { aula: Aula; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const url = `${window.location.origin}/qr/aula/${aula.id}`

  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setDataUrl)
  }, [url])

  return (
    <Modal title={`Código QR — ${aula.nombre}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-2">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR del aula ${aula.nombre}`} className="rounded-lg border border-slate-200" />
        ) : (
          <div className="w-80 h-80 flex items-center justify-center text-slate-400 text-sm">Generando…</div>
        )}
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Pega este código en la puerta del aula. Al escanearlo, el docente en turno o
          prefectura ven de inmediato qué clase toca ahí y pueden pasar lista o
          registrar una ronda sin buscar el grupo a mano.
        </p>
        <div className="flex gap-2">
          <a
            href={dataUrl ?? undefined}
            download={`qr-aula-${aula.nombre}.png`}
            className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            ⬇ Descargar
          </a>
          <button
            onClick={() => window.print()}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-[#15304c]"
          >
            🖨 Imprimir
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Al desactivar un aula con clases asignadas, ofrece de inmediato a qué otra aula
 * libre del mismo tipo mover cada una — reasignar solo requiere un clic. */
function ModalReubicacion({ aula, periodoId, onClose }: { aula: Aula; periodoId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()

  const { data: sugerencias = [], isLoading } = useQuery({
    queryKey: ['sugerencias-reubicacion', aula.id, periodoId],
    queryFn: () => academicoApi.getSugerenciasReubicacion(aula.id, { periodo_id: periodoId }),
  })

  const mutReasignar = useMutation({
    mutationFn: (vars: { cargaId: string; aulaId: string }) => academicoApi.updateCarga(vars.cargaId, { aula_id: vars.aulaId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias-reubicacion', aula.id, periodoId] })
      qc.invalidateQueries({ queryKey: ['aulas-ocupacion'] })
      addToast('Clase reubicada.', 'success')
    },
    onError: () => addToast('No se pudo reubicar la clase.', 'error'),
  })

  return (
    <Modal title={`Reubicar clases de ${aula.nombre}`} onClose={onClose} size="lg">
      <p className="text-sm text-slate-500 mb-4">
        Este espacio se acaba de desactivar. Estas son sus clases asignadas este periodo — elige a dónde moverlas.
      </p>
      {isLoading ? (
        <p className="text-sm text-slate-400 py-6 text-center">Buscando aulas disponibles…</p>
      ) : sugerencias.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Este espacio no tenía clases asignadas este periodo.</p>
      ) : (
        <div className="space-y-3">
          {sugerencias.map(s => (
            <div key={s.carga_academica_id} className="border border-slate-200 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-800">{s.materia} <span className="text-slate-400 font-normal">· Grupo {s.grupo}</span></p>
              <p className="text-xs text-slate-500">{s.docente} {s.horarios.length > 0 && `· ${s.horarios.join(', ')}`}</p>
              {s.aulas_candidatas.length === 0 ? (
                <p className="text-xs text-red-500 mt-2">No hay aulas libres del mismo tipo en esos horarios.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {s.aulas_candidatas.map(c => (
                    <button
                      key={c.id}
                      onClick={() => mutReasignar.mutate({ cargaId: s.carga_academica_id, aulaId: c.id })}
                      disabled={mutReasignar.isPending}
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 hover:border-brand-300 disabled:opacity-50"
                    >
                      Mover a <strong>{c.nombre}</strong> ({c.capacidad} lugares)
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

type AulaForm = { nombre: string; capacidad: number; tipo: Aula['tipo']; activa: boolean }
type TipoFiltro = 'todas' | 'salon' | 'laboratorio' | 'taller'
type ActiveTab = 'catalogo' | 'disponibilidad' | 'ocupacion' | 'fantasma'

const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

function colorOcupacion(pct: number) {
  if (pct >= 80) return { text: 'text-red-600', bg: 'bg-red-500', chip: 'bg-red-100 text-red-700' }
  if (pct >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' }
  return { text: 'text-emerald-600', bg: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700' }
}

type DisponibilidadForm = {
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  tipo?: string
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

const TIPO_LABEL: Record<Aula['tipo'], string> = {
  salon: 'Salón',
  laboratorio: 'Laboratorio',
  taller: 'Taller',
}

export default function AulasPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<ActiveTab>('catalogo')
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todas')
  const [modal, setModal] = useState<null | 'nuevo' | Aula>(null)
  const [form, setForm] = useState<Partial<AulaForm>>({ tipo: 'salon', capacidad: 35, activa: true })
  const set = (k: keyof AulaForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const { confirm, dialog: confirmDialog } = useConfirm()
  const puedeEliminar = usePuedeEliminar()
  const [vista, setVista] = useViewMode('aulas')
  const [detalle, setDetalle] = useState<Aula | null>(null)
  const [aulaQr, setAulaQr] = useState<Aula | null>(null)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const toggleSel = (id: string) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Disponibilidad state
  const [dispForm, setDispForm] = useState<DisponibilidadForm>({ dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '09:00' })
  const setDisp = (k: keyof DisponibilidadForm, v: string) => setDispForm(f => ({ ...f, [k]: v }))
  const [buscarDisp, setBuscarDisp] = useState(false)

  // Ocupación state
  const { data: periodoActivo } = usePeriodoActivo()
  const [aulaOcupacionDetalle, setAulaOcupacionDetalle] = useState<OcupacionAula | null>(null)

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ['aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const { data: aulasDisp = [], isFetching: loadingDisp } = useQuery({
    queryKey: ['aulas-disponibles', dispForm],
    queryFn: () => academicoApi.getAulasDisponibles(dispForm),
    enabled: buscarDisp,
  })

  const { data: ocupacion = [], isLoading: cargandoOcupacion } = useQuery({
    queryKey: ['aulas-ocupacion', periodoActivo?.id],
    queryFn: () => academicoApi.getOcupacionAulas({ periodo_id: periodoActivo?.id }),
    enabled: tab === 'ocupacion' && !!periodoActivo?.id,
  })

  const { data: aulasFantasma = [], isLoading: cargandoFantasma } = useQuery({
    queryKey: ['aulas-fantasma', periodoActivo?.id],
    queryFn: () => academicoApi.getAulasFantasma({ periodo_id: periodoActivo!.id }),
    enabled: tab === 'fantasma' && !!periodoActivo?.id,
  })

  const [aulaReubicar, setAulaReubicar] = useState<Aula | null>(null)

  const mutSave = useMutation({
    mutationFn: (d: Partial<Aula>) =>
      modal === 'nuevo' ? academicoApi.createAula(d) : academicoApi.updateAula((modal as Aula).id, d),
    onSuccess: (aulaGuardada) => {
      qc.invalidateQueries({ queryKey: ['aulas'] })
      // Se desactivó un aula que ya tenía clases asignadas — ofrece de inmediato a
      // dónde moverlas, en vez de dejar que alguien lo descubra después a mano.
      const eraActiva = modal !== 'nuevo' && (modal as Aula).activa
      if (eraActiva && !aulaGuardada.activa && periodoActivo?.id) {
        setAulaReubicar(aulaGuardada)
      }
      setModal(null)
    },
  })

  const mutDelete = useMutation({
    mutationFn: academicoApi.deleteAula,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })

  const mutBulkActivar = useMutation({
    mutationFn: (activa: boolean) => Promise.allSettled([...seleccionados].map(id => academicoApi.updateAula(id, { activa }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aulas'] })
      setSeleccionados(new Set())
      setModoSeleccion(false)
    },
  })

  function bulkEliminar() {
    confirm({
      title: `¿Eliminar ${seleccionados.size} espacio(s)?`,
      description: 'Los espacios seleccionados serán eliminados permanentemente.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        await Promise.allSettled([...seleccionados].map(id => mutDelete.mutateAsync(id)))
        setSeleccionados(new Set())
        setModoSeleccion(false)
      },
    })
  }

  const openNuevo = () => { setForm({ tipo: 'salon', capacidad: 35, activa: true }); setModal('nuevo') }
  const openEdit = (a: Aula) => { setForm({ nombre: a.nombre, capacidad: a.capacidad, tipo: a.tipo, activa: a.activa }); setModal(a) }

  const aulasFiltradas = filtroTipo === 'todas'
    ? (aulas as Aula[])
    : (aulas as Aula[]).filter(a => a.tipo === filtroTipo)

  const { sorted: aulasSorted, sort, onSort } = useSorted(aulasFiltradas, 'nombre', 'asc')

  const conteoTipo = (t: Aula['tipo']) => (aulas as Aula[]).filter(a => a.tipo === t).length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aulas y Espacios</h1>
              <p className="text-sm text-slate-500 mt-0.5">Salones, laboratorios y talleres disponibles</p>
            </div>
            {tab === 'catalogo' && (
              <button onClick={openNuevo} className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
                + Nuevo espacio
              </button>
            )}
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {([
            { key: 'catalogo', label: 'Catálogo' },
            { key: 'disponibilidad', label: 'Consultar disponibilidad' },
            { key: 'ocupacion', label: 'Ocupación' },
            { key: 'fantasma', label: 'Aulas Fantasma' },
          ] as { key: ActiveTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Catálogo tab ── */}
        {tab === 'catalogo' && (
          <>
            {/* Filtro tabs */}
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'todas', label: `Todos (${(aulas as Aula[]).length})` },
                  { key: 'salon', label: `Salones (${conteoTipo('salon')})` },
                  { key: 'laboratorio', label: `Laboratorios (${conteoTipo('laboratorio')})` },
                  { key: 'taller', label: `Talleres (${conteoTipo('taller')})` },
                ] as { key: TipoFiltro; label: string }[]).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFiltroTipo(f.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroTipo === f.key ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <ToggleSelectionButton active={modoSeleccion} onClick={() => { setModoSeleccion(v => !v); setSeleccionados(new Set()) }} />
                <ViewToggle value={vista} onChange={setVista} />
              </div>
            </div>

            {modoSeleccion && seleccionados.size > 0 && (
              <BulkActionBar count={seleccionados.size} onCancel={() => { setSeleccionados(new Set()); setModoSeleccion(false) }}>
                <button onClick={() => mutBulkActivar.mutate(true)} disabled={mutBulkActivar.isPending} className="px-3 py-1.5 text-xs font-medium bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Activar</button>
                <button onClick={() => mutBulkActivar.mutate(false)} disabled={mutBulkActivar.isPending} className="px-3 py-1.5 text-xs font-medium bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50">Desactivar</button>
                {puedeEliminar && <button onClick={bulkEliminar} className="px-3 py-1.5 text-xs font-medium bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>}
              </BulkActionBar>
            )}

            {isLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm"><tbody><SkeletonRows cols={5} /></tbody></table>
              </div>
            ) : aulasSorted.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm"><tbody><EmptyRow cols={5} /></tbody></table>
              </div>
            ) : vista === 'lista' ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {modoSeleccion && <th className="w-8" />}
                      <SortableTh field="nombre" sort={sort} onSort={onSort}>Nombre</SortableTh>
                      <SortableTh field="tipo" sort={sort} onSort={onSort}>Tipo</SortableTh>
                      <SortableTh field="capacidad" sort={sort} onSort={onSort}>Capacidad</SortableTh>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aulasSorted.map(a => (
                      <tr key={a.id} className="hover:bg-brand-50/60 transition-colors">
                        {modoSeleccion && <td className="pl-4"><SelectCheckbox checked={seleccionados.has(a.id)} onChange={() => toggleSel(a.id)} /></td>}
                        <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.tipo === 'salon' ? 'bg-brand-100 text-brand-700'
                            : a.tipo === 'laboratorio' ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                            {TIPO_LABEL[a.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{a.capacidad} lugares</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.activa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.activa ? 'Disponible' : 'No disponible'}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-3 justify-end">
                          <button onClick={() => setAulaQr(a)} className="text-xs text-slate-500 hover:underline">QR</button>
                          <button onClick={() => setDetalle(a)} className="text-xs text-slate-500 hover:underline">Ver detalle</button>
                          <button onClick={() => openEdit(a)} className="text-xs text-brand-600 hover:underline">Editar</button>
                          {puedeEliminar && <button
                          onClick={() => confirm({
                            title: `¿Eliminar ${a.nombre}?`,
                            description: 'El espacio será eliminado permanentemente.',
                            confirmLabel: 'Eliminar',
                            onConfirm: () => mutDelete.mutateAsync(a.id),
                          })}
                          className="text-xs text-red-500 hover:underline"
                        >Eliminar</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aulasSorted.map(a => (
                  <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {modoSeleccion && <SelectCheckbox checked={seleccionados.has(a.id)} onChange={() => toggleSel(a.id)} />}
                        <p className="font-semibold text-slate-800 truncate">{a.nombre}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.activa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {a.activa ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium self-start ${
                      a.tipo === 'salon' ? 'bg-brand-100 text-brand-700'
                      : a.tipo === 'laboratorio' ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                      {TIPO_LABEL[a.tipo]}
                    </span>
                    <p className="text-sm text-slate-500">{a.capacidad} lugares</p>
                    <div className="flex gap-3 mt-1">
                      <button onClick={() => setAulaQr(a)} className="text-xs text-slate-500 hover:underline">QR</button>
                      <button onClick={() => setDetalle(a)} className="text-xs text-slate-500 hover:underline">Ver detalle</button>
                      <button onClick={() => openEdit(a)} className="text-xs text-brand-600 hover:underline">Editar</button>
                      {puedeEliminar && <button
                        onClick={() => confirm({
                          title: `¿Eliminar ${a.nombre}?`,
                          description: 'El espacio será eliminado permanentemente.',
                          confirmLabel: 'Eliminar',
                          onConfirm: () => mutDelete.mutateAsync(a.id),
                        })}
                        className="text-xs text-red-500 hover:underline"
                      >Eliminar</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Disponibilidad tab ── */}
        {tab === 'disponibilidad' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Consultar aulas libres en un bloque horario</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Día</label>
                  <select value={dispForm.dia_semana} onChange={e => setDisp('dia_semana', e.target.value)} className={selectCls}>
                    {DIAS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hora inicio</label>
                  <input type="time" value={dispForm.hora_inicio} onChange={e => setDisp('hora_inicio', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hora fin</label>
                  <input type="time" value={dispForm.hora_fin} onChange={e => setDisp('hora_fin', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo (opcional)</label>
                  <select value={dispForm.tipo ?? ''} onChange={e => setDisp('tipo', e.target.value || '')} className={selectCls}>
                    <option value="">Todos</option>
                    <option value="salon">Salón</option>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="taller">Taller</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => { setBuscarDisp(false); setTimeout(() => setBuscarDisp(true), 50) }}
                className="mt-4 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
              >
                Buscar aulas libres
              </button>
            </div>

            {buscarDisp && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Aulas disponibles — {dispForm.dia_semana} {dispForm.hora_inicio}–{dispForm.hora_fin}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingDisp ? (
                      <SkeletonRows cols={3} />
                    ) : (aulasDisp as Aula[]).length === 0 ? (
                      <EmptyRow cols={3} msg="No hay aulas disponibles en ese bloque" />
                    ) : (
                      (aulasDisp as Aula[]).map(a => (
                        <tr key={a.id} className="hover:bg-green-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              a.tipo === 'salon' ? 'bg-brand-100 text-brand-700'
                              : a.tipo === 'laboratorio' ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                            }`}>
                              {TIPO_LABEL[a.tipo]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{a.capacidad} lugares</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Ocupación tab ── */}
        {tab === 'ocupacion' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-600">
                Horas ocupadas por semana contra una ventana operativa institucional de{' '}
                <span className="font-medium">78 h/semana</span> (lunes a sábado, 07:00–20:00) — periodo{' '}
                <span className="font-medium">{periodoActivo?.nombre ?? '—'}</span>.
              </p>
            </div>

            {!periodoActivo ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                No hay un periodo activo para calcular la ocupación.
              </div>
            ) : cargandoOcupacion ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm"><tbody><SkeletonRows cols={4} /></tbody></table>
              </div>
            ) : ocupacion.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                No hay aulas registradas.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {ocupacion.map(o => {
                    const c = colorOcupacion(o.pct_ocupacion)
                    return (
                      <button
                        key={o.aula_id}
                        onClick={() => setAulaOcupacionDetalle(o)}
                        className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-40 shrink-0">
                          <p className="text-sm font-medium text-slate-800">{o.nombre}</p>
                          <p className="text-xs text-slate-400">{TIPO_LABEL[o.tipo]} · {o.capacidad} lugares</p>
                        </div>
                        <div className="flex-1">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${c.bg} rounded-full`} style={{ width: `${Math.min(100, o.pct_ocupacion)}%` }} />
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-16 text-center ${c.chip}`}>
                          {o.pct_ocupacion}%
                        </span>
                        <span className="text-xs text-slate-400 w-32 text-right">
                          {o.horas_ocupadas}h · {o.total_bloques} bloque{o.total_bloques === 1 ? '' : 's'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'fantasma' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                Grupos que el horario dice que deberían estar en un aula, pero prefectura ha reportado <strong>2 o más veces</strong> que el aula está vacía o el grupo no coincide — señal de un horario que no refleja la realidad, no un hallazgo aislado.
              </p>
            </div>

            {!periodoActivo ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                No hay un periodo activo.
              </div>
            ) : cargandoFantasma ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Buscando…</div>
            ) : aulasFantasma.length === 0 ? (
              <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-700 text-sm">
                ✅ Sin discrepancias detectadas — el horario coincide con lo que prefectura reporta en campo.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="divide-y divide-red-100">
                  {aulasFantasma.map((f, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          👻 {f.aula ?? 'Aula sin asignar'} · Grupo {f.grupo} <span className="text-slate-400 font-normal">({f.carrera})</span>
                        </p>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {f.total_discrepancias} discrepancias
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {f.materia} · Docente esperado: {f.docente_esperado ?? '—'} · Última vez: {f.ultima_fecha}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Reportado como: {f.estatus_reportados.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDialog}

      {modal && (
        <ModalWrap
          title={modal === 'nuevo' ? 'Nuevo espacio' : `Editar: ${(modal as Aula).nombre}`}
          onClose={() => setModal(null)}
          onSave={() => mutSave.mutate(form as Aula)}
          saving={mutSave.isPending}
        >
          <Field label="Nombre *" full>
            <input value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Aula 101" className={inputCls} />
          </Field>
          <Field label="Tipo *">
            <select value={form.tipo ?? 'salon'} onChange={e => set('tipo', e.target.value)} className={selectCls}>
              <option value="salon">Salón</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="taller">Taller</option>
            </select>
          </Field>
          <Field label="Capacidad">
            <input type="number" min={1} max={500} value={form.capacidad ?? 35} onChange={e => set('capacidad', +e.target.value)} className={inputCls} />
          </Field>
          <Field label="Disponible">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.activa} onChange={e => set('activa', e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-slate-700">Disponible para asignar</span>
            </label>
          </Field>
        </ModalWrap>
      )}

      {detalle && (
        <DetailModal
          title={detalle.nombre}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Tipo', value: TIPO_LABEL[detalle.tipo] },
            { label: 'Capacidad', value: `${detalle.capacidad} lugares` },
            { label: 'Estado', value: detalle.activa ? 'Disponible' : 'No disponible' },
          ]}
          footer={<button onClick={() => { setDetalle(null); openEdit(detalle) }} className="text-xs font-medium text-white bg-brand-600 px-3 py-1.5 rounded-lg">Editar</button>}
        />
      )}

      {aulaOcupacionDetalle && (
        <Modal title={`Ocupación — ${aulaOcupacionDetalle.nombre}`} onClose={() => setAulaOcupacionDetalle(null)} size="lg">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className={`text-sm font-semibold px-2.5 py-1 rounded-full ${colorOcupacion(aulaOcupacionDetalle.pct_ocupacion).chip}`}>
              {aulaOcupacionDetalle.pct_ocupacion}% ocupado
            </div>
            <p className="text-xs text-slate-500">
              {aulaOcupacionDetalle.horas_ocupadas}h de {aulaOcupacionDetalle.horas_disponibles}h/semana disponibles ·{' '}
              {aulaOcupacionDetalle.total_bloques} bloque{aulaOcupacionDetalle.total_bloques === 1 ? '' : 's'} asignado{aulaOcupacionDetalle.total_bloques === 1 ? '' : 's'}
            </p>
          </div>

          {aulaOcupacionDetalle.bloques.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin horarios asignados este periodo — aula completamente libre.</p>
          ) : (
            <div className="space-y-4">
              {(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const).map(dia => {
                const bloquesDia = aulaOcupacionDetalle.bloques
                  .filter(b => b.dia_semana === dia)
                  .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                if (bloquesDia.length === 0) return null
                return (
                  <div key={dia}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{DIA_LABEL[dia]}</p>
                    <div className="space-y-1">
                      {bloquesDia.map((b, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{b.hora_inicio}–{b.hora_fin}</span>
                          <span className="font-medium text-slate-800">{b.materia ?? 'Materia'}</span>
                          {b.grupo && <span className="text-xs text-slate-400">Grupo {b.grupo}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {aulaQr && <ModalQrAula aula={aulaQr} onClose={() => setAulaQr(null)} />}
      {aulaReubicar && periodoActivo?.id && (
        <ModalReubicacion aula={aulaReubicar} periodoId={periodoActivo.id} onClose={() => setAulaReubicar(null)} />
      )}
    </div>
  )
}
