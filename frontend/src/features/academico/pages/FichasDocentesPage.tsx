import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type FichaDocente } from '../services/academico'
import { Field, SkeletonRows, EmptyRow, inputCls, selectCls, ModalWrap, mutationError } from './tabs/shared'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'

interface Docente {
  id: string
  name: string
  email: string
}

const CONTRATO_LABEL: Record<FichaDocente['tipo_contrato'], string> = {
  base:        'Base',
  interino:    'Interino',
  hora_clase:  'Hora-clase',
  medio_tiempo:'Medio tiempo',
}

type FichaForm = Partial<Omit<FichaDocente, 'id' | 'docente'> & {
  especialidades_text: string
  titulos_text: string
}>

export default function FichasDocentesPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const [modal, setModal] = useState<null | 'nuevo' | FichaDocente>(null)
  const [form, setForm] = useState<FichaForm>({})
  const set = (k: keyof FichaForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const { data: fichasData, isLoading } = useQuery({
    queryKey: ['fichas-docentes'],
    queryFn: () => academicoApi.getFichasDocentes(),
  })

  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes-lista'],
    queryFn: () => apiClient.get('/admin/docentes').then(r => r.data.data as Docente[]),
  })

  const fichas = fichasData?.data ?? []

  const mutSave = useMutation({
    mutationFn: (d: Partial<FichaDocente>) => {
      if (modal === 'nuevo') return academicoApi.crearFichaDocente(d)
      return academicoApi.actualizarFichaDocente((modal as FichaDocente).docente_id, d)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fichas-docentes'] })
      setModal(null)
      toastSuccess('Ficha guardada correctamente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const openNuevo = () => {
    setForm({ tipo_contrato: 'hora_clase', activo: true, especialidades_text: '', titulos_text: '' })
    setModal('nuevo')
  }

  const openEdit = (f: FichaDocente) => {
    setForm({
      docente_id:       f.docente_id,
      tipo_contrato:    f.tipo_contrato,
      categoria:        f.categoria ?? '',
      fecha_ingreso:    f.fecha_ingreso ?? '',
      activo:           f.activo,
      especialidades_text: (f.especialidades ?? []).join(', '),
      titulos_text: (f.titulos_academicos ?? []).map(t => `${t.nivel}:${t.nombre}`).join('\n'),
    })
    setModal(f)
  }

  const handleSave = () => {
    const especialidades = (form.especialidades_text ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
    const titulos_academicos = (form.titulos_text ?? '')
      .split('\n').map(line => {
        const [nivel, ...rest] = line.split(':')
        return { nivel: nivel?.trim() ?? '', nombre: rest.join(':').trim() }
      }).filter(t => t.nivel && t.nombre)

    mutSave.mutate({
      docente_id:       form.docente_id,
      tipo_contrato:    form.tipo_contrato,
      categoria:        form.categoria || undefined,
      fecha_ingreso:    form.fecha_ingreso || undefined,
      activo:           form.activo,
      especialidades:   especialidades.length > 0 ? especialidades : undefined,
      titulos_academicos: titulos_academicos.length > 0 ? titulos_academicos : undefined,
    })
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica/docentes" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Docentes
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Fichas Docentes</h1>
              <p className="text-sm text-slate-500 mt-0.5">Contrato, categoría, especialidades y carga histórica</p>
            </div>
            <button onClick={openNuevo} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Nueva ficha
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Especialidades</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : fichas.length === 0 ? (
                <EmptyRow cols={6} />
              ) : (
                fichas.map(f => (
                  <tr key={f.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{f.docente?.name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{f.docente?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        f.tipo_contrato === 'base' ? 'bg-blue-100 text-blue-700'
                        : f.tipo_contrato === 'interino' ? 'bg-purple-100 text-purple-700'
                        : f.tipo_contrato === 'medio_tiempo' ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {CONTRATO_LABEL[f.tipo_contrato]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.categoria ?? '—'}</td>
                    <td className="px-4 py-3">
                      {f.especialidades && f.especialidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {f.especialidades.slice(0, 3).map((e, i) => (
                            <span key={i} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{e}</span>
                          ))}
                          {f.especialidades.length > 3 && (
                            <span className="text-xs text-slate-400">+{f.especialidades.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${f.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {f.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(f)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Carga histórica por período */}
        {fichas.length > 0 && fichas.some(f => f.horas_frente_grupo_por_periodo && f.horas_frente_grupo_por_periodo.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Carga histórica (horas/semana por período)</h2>
            <div className="space-y-3">
              {fichas.filter(f => f.horas_frente_grupo_por_periodo?.length).map(f => (
                <div key={f.id}>
                  <p className="text-xs font-medium text-slate-600 mb-1">{f.docente?.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {(f.horas_frente_grupo_por_periodo ?? []).map((h, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg">
                        {h.periodo_nombre ?? h.periodo_id}: <strong>{h.horas_semana}h</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ModalWrap
          title={modal === 'nuevo' ? 'Nueva ficha docente' : `Editar ficha: ${(modal as FichaDocente).docente?.name ?? ''}`}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={mutSave.isPending}
        >
          {modal === 'nuevo' && (
            <Field label="Docente *" full>
              <select value={form.docente_id ?? ''} onChange={e => set('docente_id', e.target.value)} className={selectCls}>
                <option value="">Seleccionar docente…</option>
                {docentes.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.email}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Tipo de contrato *">
            <select value={form.tipo_contrato ?? 'hora_clase'} onChange={e => set('tipo_contrato', e.target.value)} className={selectCls}>
              <option value="base">Base</option>
              <option value="interino">Interino</option>
              <option value="hora_clase">Hora-clase</option>
              <option value="medio_tiempo">Medio tiempo</option>
            </select>
          </Field>
          <Field label="Categoría">
            <input value={form.categoria ?? ''} onChange={e => set('categoria', e.target.value)} placeholder="Ej. Asociado C" className={inputCls} />
          </Field>
          <Field label="Fecha de ingreso">
            <input type="date" value={form.fecha_ingreso ?? ''} onChange={e => set('fecha_ingreso', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Especialidades (separadas por coma)" full>
            <input
              value={form.especialidades_text ?? ''}
              onChange={e => set('especialidades_text', e.target.value)}
              placeholder="Ej. Redes, Seguridad Informática, Bases de Datos"
              className={inputCls}
            />
          </Field>
          <Field label="Títulos académicos (nivel:nombre, uno por línea)" full>
            <textarea
              value={form.titulos_text ?? ''}
              onChange={e => set('titulos_text', e.target.value)}
              placeholder={'Licenciatura:Ingeniería en Sistemas\nMaestría:Maestría en Redes'}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Activo">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.activo} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-slate-700">Ficha activa</span>
            </label>
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
