import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type FuncionPersonal } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, Th, SkeletonRows, EmptyRow, icls, selectCls, ModalWrap, mutationError, extractApiErrors } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'
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

type FiltroActiva = 'todas' | 'activas' | 'inactivas'
const BLANK: Partial<FuncionPersonal> = { funcion: '', area: '', descripcion: '', activa: true }

export default function FuncionesPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroActiva, setFiltroActiva] = useState<FiltroActiva>('activas')
  const [modal, setModal] = useState<Partial<FuncionPersonal> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { data: personal = [] } = usePersonal()

  const { data: funciones = [], isLoading } = useQuery({
    queryKey: ['funciones', filtroActiva],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroActiva === 'activas') p.activa = 'true'
      if (filtroActiva === 'inactivas') p.activa = 'false'
      return academicoApi.getFunciones(p)
    },
  })

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateFuncion(modal.id!, modal) : academicoApi.createFuncion(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funciones'] }); addToast('Función guardada.', 'success'); setModal(null); setErrors({}) },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteFuncion(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funciones'] }); addToast('Función eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof FuncionPersonal, v: unknown) => setModal(m => ({ ...m, [k]: v }))
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

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
              <h1 className="text-xl font-bold text-slate-900">Funciones del Personal</h1>
              <p className="text-sm text-slate-500 mt-0.5">Cargos y responsabilidades asignadas al personal institucional</p>
            </div>
            <button
              onClick={() => setModal({ ...BLANK })}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Asignar función
            </button>
          </div>
        </div>

        {/* Filtro tabs */}
        <div className="flex gap-2">
          {(['activas', 'inactivas', 'todas'] as FiltroActiva[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltroActiva(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filtroActiva === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'activas' ? 'Activas' : f === 'inactivas' ? 'Inactivas' : 'Todas'}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Personal</Th>
                <Th>Rol</Th>
                <Th>Función / Cargo</Th>
                <Th>Área</Th>
                <Th>Vigencia</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <SkeletonRows cols={7} />}
              {!isLoading && (funciones as FuncionPersonal[]).length === 0 && <EmptyRow cols={7} />}
              {(funciones as FuncionPersonal[]).map(f => (
                <tr key={f.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{f.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{f.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {ROLE_LABEL[f.user?.roles?.[0]?.name ?? ''] ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{f.funcion}</p>
                    {f.descripcion && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{f.descripcion}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.area ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    {f.fecha_fin ? ` → ${new Date(f.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.activa ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {f.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setModal({ ...f, fecha_inicio: f.fecha_inicio?.slice(0, 10) ?? '', fecha_fin: f.fecha_fin?.slice(0, 10) ?? '' })}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => confirm({
                        title: '¿Eliminar esta función?',
                        description: `Se eliminará la función "${f.funcion}" asignada a ${f.user?.name ?? 'este usuario'}.`,
                        confirmLabel: 'Eliminar función',
                        onConfirm: () => del.mutateAsync(f.id),
                      })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDialog}

      {modal !== null && (
        <ModalWrap
          title={modal.id ? 'Editar función' : 'Asignar función'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          <Field label="Personal *" full error={errors.user_id}>
            <select className={icls(errors.user_id)} value={modal.user_id ?? ''} onChange={e => set('user_id', e.target.value)}>
              <option value="">— Seleccionar usuario —</option>
              {personal.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.roles?.[0]?.name ?? ''] ?? u.roles?.[0]?.name ?? 'sin rol'})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Función / Cargo *" full error={errors.funcion}>
            <input className={icls(errors.funcion)} value={modal.funcion ?? ''} placeholder="Ej. Jefe de Área de Sistemas" onChange={e => set('funcion', e.target.value)} />
          </Field>
          <Field label="Área" full error={errors.area}>
            <input className={icls(errors.area)} value={modal.area ?? ''} placeholder="Ej. Área de Cómputo" onChange={e => set('area', e.target.value)} />
          </Field>
          <Field label="Descripción" full error={errors.descripcion}>
            <textarea
              className={icls(errors.descripcion)}
              rows={2}
              value={modal.descripcion ?? ''}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Responsabilidades y alcance del cargo…"
            />
          </Field>
          <Field label="Fecha inicio" error={errors.fecha_inicio}>
            <input className={icls(errors.fecha_inicio)} type="date" value={modal.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)} />
          </Field>
          <Field label="Fecha fin (opcional)" error={errors.fecha_fin}>
            <input className={icls(errors.fecha_fin)} type="date" value={modal.fecha_fin ?? ''} onChange={e => set('fecha_fin', e.target.value)} />
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
