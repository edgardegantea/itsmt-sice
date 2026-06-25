import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Aula } from '../../services/academico'
import { Field, Th, EmptyRow, inputCls, selectCls, ModalWrap } from '../tabs/shared'

type AulaForm = { nombre: string; capacidad: number; tipo: Aula['tipo']; activa: boolean }
type TipoFiltro = 'todas' | 'salon' | 'laboratorio' | 'taller'

const TIPO_LABEL: Record<Aula['tipo'], string> = {
  salon: 'Salón',
  laboratorio: 'Laboratorio',
  taller: 'Taller',
}

export default function AulasPage() {
  const qc = useQueryClient()
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todas')
  const [modal, setModal] = useState<null | 'nuevo' | Aula>(null)
  const [form, setForm] = useState<Partial<AulaForm>>({ tipo: 'salon', capacidad: 35, activa: true })
  const set = (k: keyof AulaForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ['aulas'],
    queryFn: () => academicoApi.getAulas(),
  })

  const mutSave = useMutation({
    mutationFn: (d: Partial<Aula>) =>
      modal === 'nuevo' ? academicoApi.createAula(d) : academicoApi.updateAula((modal as Aula).id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aulas'] }); setModal(null) },
  })

  const mutDelete = useMutation({
    mutationFn: academicoApi.deleteAula,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })

  const openNuevo = () => { setForm({ tipo: 'salon', capacidad: 35, activa: true }); setModal('nuevo') }
  const openEdit = (a: Aula) => { setForm({ nombre: a.nombre, capacidad: a.capacidad, tipo: a.tipo, activa: a.activa }); setModal(a) }

  const aulasFiltradas = filtroTipo === 'todas'
    ? (aulas as Aula[])
    : (aulas as Aula[]).filter(a => a.tipo === filtroTipo)

  const conteoTipo = (t: Aula['tipo']) => (aulas as Aula[]).filter(a => a.tipo === t).length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aulas y Espacios</h1>
              <p className="text-sm text-slate-500 mt-0.5">Salones, laboratorios y talleres disponibles</p>
            </div>
            <button onClick={openNuevo} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Nuevo espacio
            </button>
          </div>
        </div>

        {/* Filtro tabs */}
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroTipo === f.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Capacidad</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <EmptyRow cols={5} msg="Cargando…" />
              ) : aulasFiltradas.length === 0 ? (
                <EmptyRow cols={5} />
              ) : (
                aulasFiltradas.map(a => (
                  <tr key={a.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.tipo === 'salon' ? 'bg-blue-100 text-blue-700'
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
                      <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => { if (confirm(`¿Eliminar ${a.nombre}?`)) mutDelete.mutate(a.id) }} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <input type="checkbox" checked={!!form.activa} onChange={e => set('activa', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-slate-700">Disponible para asignar</span>
            </label>
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
