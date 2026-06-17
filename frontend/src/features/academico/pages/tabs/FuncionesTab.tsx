import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type FuncionPersonal } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, Th, EmptyRow, inputCls, selectCls } from './shared'
import apiClient from '../../../../config/apiClient'

function usePersonal() {
  return useQuery({
    queryKey: ['personal'],
    queryFn: () => apiClient.get('/admin/usuarios').then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : d.data ?? []) as { id: string; name: string; email: string; roles: { name: string }[] }[]
    }),
    staleTime: 60_000,
  })
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Administrador', director_academico: 'Director Académico',
  jefe_carrera: 'Jefe de Carrera', docente: 'Docente', personal_administrativo: 'Pers. Administrativo',
}

const BLANK: Partial<FuncionPersonal> = {
  funcion: '', area: '', descripcion: '', activa: true,
}

export default function FuncionesTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroActiva, setFiltroActiva] = useState<'todas' | 'activas' | 'inactivas'>('activas')
  const [modal, setModal] = useState<Partial<FuncionPersonal> | null>(null)

  const { data: personal = [] } = usePersonal()

  const { data: funciones = [], isLoading } = useQuery({
    queryKey: ['funciones', filtroActiva],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroActiva === 'activas')   p.activa = 'true'
      if (filtroActiva === 'inactivas') p.activa = 'false'
      return academicoApi.getFunciones(p)
    },
  })

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateFuncion(modal.id!, modal) : academicoApi.createFuncion(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funciones'] }); addToast('Función guardada.', 'success'); setModal(null) },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteFuncion(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funciones'] }); addToast('Función eliminada.', 'success') },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const set = (k: keyof FuncionPersonal, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-1">
          {(['todas', 'activas', 'inactivas'] as const).map(f => (
            <button key={f} onClick={() => setFiltroActiva(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filtroActiva === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setModal({ ...BLANK })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span className="text-base leading-none">+</span> Asignar función
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Personal</Th><Th>Rol</Th><Th>Función</Th><Th>Área</Th><Th>Vigencia</Th><Th>Estado</Th><Th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <EmptyRow cols={7} msg="Cargando…" />}
            {!isLoading && funciones.length === 0 && <EmptyRow cols={7} />}
            {funciones.map(f => (
              <tr key={f.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{f.user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{f.user?.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{ROLE_LABEL[f.user?.roles?.[0]?.name ?? ''] ?? '—'}</td>
                <td className="px-4 py-3 text-slate-800">{f.funcion}</td>
                <td className="px-4 py-3 text-slate-600">{f.area ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  {f.fecha_fin ? ` → ${new Date(f.fecha_fin).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.activa ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                    {f.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setModal(f)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => window.confirm('¿Eliminar función?') && del.mutate(f.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalWrap title={modal.id ? 'Editar función' : 'Asignar función'} onClose={() => setModal(null)} onSave={() => save.mutate()} saving={save.isPending}>
          <Field label="Personal" full>
            <select className={selectCls} value={modal.user_id ?? ''} onChange={e => set('user_id', e.target.value)}>
              <option value="">— Seleccionar usuario —</option>
              {personal.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.roles?.[0]?.name ?? ''] ?? u.roles?.[0]?.name ?? 'sin rol'})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Función / Cargo" full>
            <input className={inputCls} value={modal.funcion ?? ''} placeholder="Ej. Jefe de Área de Sistemas" onChange={e => set('funcion', e.target.value)} />
          </Field>
          <Field label="Área" full>
            <input className={inputCls} value={modal.area ?? ''} placeholder="Ej. Área de Cómputo" onChange={e => set('area', e.target.value)} />
          </Field>
          <Field label="Descripción" full>
            <textarea className={inputCls} rows={3} value={modal.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} placeholder="Responsabilidades y alcance del cargo…" />
          </Field>
          <Field label="Fecha inicio">
            <input className={inputCls} type="date" value={modal.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)} />
          </Field>
          <Field label="Fecha fin (opcional)">
            <input className={inputCls} type="date" value={modal.fecha_fin ?? ''} onChange={e => set('fecha_fin', e.target.value)} />
          </Field>
          {modal.id && (
            <Field label="Estado">
              <select className={selectCls} value={modal.activa ? 'true' : 'false'} onChange={e => set('activa', e.target.value === 'true')}>
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </Field>
          )}
        </ModalWrap>
      )}
    </div>
  )
}
