import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Aula } from '../../services/academico'
import { Field, ModalWrap, Th, EmptyRow, inputCls, selectCls } from './shared'

type AulaForm = { nombre: string; capacidad: number; tipo: Aula['tipo']; activa: boolean }

const TIPO_LABEL: Record<Aula['tipo'], string> = {
  salon: 'Salón',
  laboratorio: 'Laboratorio',
  taller: 'Taller',
}

export default function AulasTab() {
  const qc = useQueryClient()
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-700">Aulas, laboratorios y talleres</h2>
        <button onClick={openNuevo} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          + Nueva aula
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Nombre</Th><Th>Tipo</Th><Th>Capacidad</Th><Th>Estatus</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <EmptyRow cols={5} msg="Cargando…" />
            ) : (aulas as Aula[]).length === 0 ? (
              <EmptyRow cols={5} />
            ) : (
              (aulas as Aula[]).map(a => (
                <tr key={a.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{TIPO_LABEL[a.tipo]}</td>
                  <td className="px-4 py-3 text-slate-600">{a.capacidad}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.activa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => { if (confirm(`¿Eliminar ${a.nombre}?`)) mutDelete.mutate(a.id) }} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalWrap
          title={modal === 'nuevo' ? 'Nueva aula' : `Editar: ${(modal as Aula).nombre}`}
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
          <Field label="Activa">
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
