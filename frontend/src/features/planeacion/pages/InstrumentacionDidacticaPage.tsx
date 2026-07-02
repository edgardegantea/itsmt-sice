import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planeacionApi, type InstrumentacionDidactica } from '../services/planeacion'

const ESTATUS_COLOR: Record<string, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada:      'bg-blue-100 text-blue-700',
  observaciones:'bg-yellow-100 text-yellow-700',
  liberada:     'bg-green-100 text-green-700',
  vigente:      'bg-emerald-100 text-emerald-700',
}

const ESTATUS_LABEL: Record<string, string> = {
  borrador:     'Borrador',
  enviada:      'Enviada a revisión',
  observaciones:'Con observaciones',
  liberada:     'Liberada',
  vigente:      'Vigente',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {ESTATUS_LABEL[estatus] ?? estatus}
    </span>
  )
}

type Panel = 'listado' | 'form' | 'detalle'

export default function InstrumentacionDidacticaPage() {
  const qc = useQueryClient()
  const [panel, setPanel] = useState<Panel>('listado')
  const [selected, setSelected] = useState<InstrumentacionDidactica | null>(null)
  const [periodoId, setPeriodoId] = useState('')
  const [accionDevolver, setAccionDevolver] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [asignacionId, setAsignacionId] = useState('')

  // Form state para edición/creación
  const [form, setForm] = useState({
    objetivo_general: '',
    metodologia: '',
    bibliografia: '',
  })

  const { data: instrumentaciones = [], isLoading } = useQuery({
    queryKey: ['instrumentaciones', periodoId],
    queryFn: () => planeacionApi.getInstrumentaciones(periodoId ? { periodo_id: periodoId } : undefined),
  })

  const crear = useMutation({
    mutationFn: () => planeacionApi.crearInstrumentacion({
      asignacion_id: asignacionId,
      ...form,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      setPanel('detalle')
    },
  })

  const actualizar = useMutation({
    mutationFn: (id: string) => planeacionApi.actualizarInstrumentacion(id, form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      setPanel('detalle')
    },
  })

  const enviar = useMutation({
    mutationFn: (id: string) => planeacionApi.enviarInstrumentacion(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
    },
  })

  const liberar = useMutation({
    mutationFn: ({ id, accion, obs }: { id: string; accion: 'liberar' | 'devolver'; obs?: string }) =>
      planeacionApi.liberarInstrumentacion(id, accion, obs),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
      setAccionDevolver(false)
      setObservaciones('')
    },
  })

  const vistoBueno = useMutation({
    mutationFn: (id: string) => planeacionApi.vistoBueno(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instrumentaciones'] })
      setSelected(data)
    },
  })

  const abrirEdicion = (inst: InstrumentacionDidactica) => {
    setSelected(inst)
    setForm({
      objetivo_general: inst.objetivo_general ?? '',
      metodologia: inst.metodologia ?? '',
      bibliografia: inst.bibliografia ?? '',
    })
    setPanel('form')
  }

  const abrirNueva = () => {
    setSelected(null)
    setForm({ objetivo_general: '', metodologia: '', bibliografia: '' })
    setAsignacionId('')
    setPanel('form')
  }

  if (panel === 'form') {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setPanel('listado')} className="text-slate-400 hover:text-slate-600">←</button>
          <h1 className="text-xl font-bold text-slate-900">
            {selected ? 'Editar Instrumentación' : 'Nueva Instrumentación Didáctica'}
          </h1>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          {!selected && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UUID de Asignación *</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={asignacionId}
                onChange={e => setAsignacionId(e.target.value)}
                placeholder="ID de la asignación docente"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo General</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.objetivo_general}
              onChange={e => setForm(f => ({ ...f, objetivo_general: e.target.value }))}
              placeholder="Describe el objetivo general del curso..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Metodología</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.metodologia}
              onChange={e => setForm(f => ({ ...f, metodologia: e.target.value }))}
              placeholder="Aprendizaje basado en proyectos, aula invertida..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bibliografía</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.bibliografia}
              onChange={e => setForm(f => ({ ...f, bibliografia: e.target.value }))}
              placeholder="Referencias bibliográficas..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setPanel('listado')} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => selected ? actualizar.mutate(selected.id) : crear.mutate()}
            disabled={crear.isPending || actualizar.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    )
  }

  if (panel === 'detalle' && selected) {
    const canEnviar = ['borrador', 'observaciones'].includes(selected.estatus)
    const canLiberar = selected.estatus === 'enviada'
    const canVistoBueno = selected.estatus === 'liberada'
    const canEdit = ['borrador', 'observaciones'].includes(selected.estatus)

    return (
      <div className="space-y-6 p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setPanel('listado')} className="text-slate-400 hover:text-slate-600">←</button>
            <h1 className="text-xl font-bold text-slate-900">Instrumentación Didáctica</h1>
          </div>
          <Badge estatus={selected.estatus} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase">Materia</p>
              <p className="font-medium">{selected.asignacion?.materia?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase">Carrera</p>
              <p className="font-medium">{selected.asignacion?.carrera?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase">Docente</p>
              <p className="font-medium">{selected.asignacion?.docente?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase">Periodo</p>
              <p className="font-medium">{selected.asignacion?.periodo?.nombre ?? '—'}</p>
            </div>
          </div>

          {selected.objetivo_general && (
            <div>
              <p className="text-xs uppercase text-slate-400 mb-1">Objetivo General</p>
              <p className="text-sm text-slate-700">{selected.objetivo_general}</p>
            </div>
          )}

          {selected.metodologia && (
            <div>
              <p className="text-xs uppercase text-slate-400 mb-1">Metodología</p>
              <p className="text-sm text-slate-700">{selected.metodologia}</p>
            </div>
          )}

          {selected.observaciones_jefe && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs uppercase text-yellow-600 font-semibold mb-1">Observaciones del Jefe</p>
              <p className="text-sm text-yellow-800">{selected.observaciones_jefe}</p>
            </div>
          )}

          {selected.liberadaPor && (
            <p className="text-xs text-slate-400">Liberada por: {selected.liberadaPor.name}</p>
          )}
          {selected.vistoBuenoPor && (
            <p className="text-xs text-slate-400">Visto bueno: {selected.vistoBuenoPor.name}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <button
              onClick={() => abrirEdicion(selected)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
          )}
          {canEnviar && (
            <button
              onClick={() => enviar.mutate(selected.id)}
              disabled={enviar.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {enviar.isPending ? 'Enviando...' : 'Enviar a revisión'}
            </button>
          )}
          {canLiberar && !accionDevolver && (
            <>
              <button
                onClick={() => liberar.mutate({ id: selected.id, accion: 'liberar' })}
                disabled={liberar.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Liberar
              </button>
              <button
                onClick={() => setAccionDevolver(true)}
                className="rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-50"
              >
                Devolver con observaciones
              </button>
            </>
          )}
          {canLiberar && accionDevolver && (
            <div className="w-full space-y-2">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Observaciones para el docente..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => liberar.mutate({ id: selected.id, accion: 'devolver', obs: observaciones })}
                  disabled={liberar.isPending || !observaciones.trim()}
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-60"
                >
                  Confirmar devolución
                </button>
                <button onClick={() => setAccionDevolver(false)} className="text-slate-500 text-sm">Cancelar</button>
              </div>
            </div>
          )}
          {canVistoBueno && (
            <button
              onClick={() => vistoBueno.mutate(selected.id)}
              disabled={vistoBueno.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {vistoBueno.isPending ? 'Procesando...' : '✓ Dar Visto Bueno (Vigente)'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Listado
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instrumentaciones Didácticas</h1>
          <p className="text-sm text-slate-500 mt-1">TecNM-AC-PO-003 — Pasos 2-5</p>
        </div>
        <button
          onClick={abrirNueva}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Periodo"
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
        />
        <button
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          onClick={() => setPeriodoId('')}
        >
          Limpiar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {['Materia', 'Docente', 'Carrera', 'Estatus', 'Liberada por', 'Acciones'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Cargando...</td></tr>
            )}
            {!isLoading && instrumentaciones.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Sin instrumentaciones</td></tr>
            )}
            {instrumentaciones.map((inst: InstrumentacionDidactica) => (
              <tr key={inst.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-sm font-medium text-slate-800">
                  {inst.asignacion?.materia?.nombre ?? '—'}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600">
                  {inst.asignacion?.docente?.name ?? '—'}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600">
                  {inst.asignacion?.carrera?.clave ?? '—'}
                </td>
                <td className="px-3 py-2 text-sm">
                  <Badge estatus={inst.estatus} />
                </td>
                <td className="px-3 py-2 text-sm text-slate-600">
                  {inst.liberadaPor?.name ?? '—'}
                </td>
                <td className="px-3 py-2 text-sm">
                  <button
                    onClick={() => { setSelected(inst); setPanel('detalle') }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Ver / Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
