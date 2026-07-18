import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError, ModalWrap } from '../../academico/pages/tabs/shared'

interface CuerpoAcademico {
  id: string
  nombre: string
  clave: string
  lgac_principal?: string
  grado_consolidacion: 'en_formacion' | 'en_consolidacion' | 'consolidado'
  fecha_registro: string
  activo: boolean
  lider?: { name: string }
}

interface ProyectoInvestigacion {
  id: string
  titulo: string
  tipo: string
  estatus: string
  fecha_inicio: string
  fecha_fin?: string
  cuerpoAcademico?: { nombre: string }
  responsable?: { name: string }
}

interface ProduccionAcademica {
  id: string
  tipo: string
  titulo: string
  medio_difusion?: string
  fecha_publicacion: string
  estatus: string
  autorPrincipal?: { name: string }
}

interface Indicadores {
  total_cuerpos_academicos: number
  por_grado_consolidacion: Record<string, number>
  proyectos_en_proceso: number
  proyectos_concluidos: number
  producciones_por_tipo: Record<string, number>
  producciones_validadas: number
}

const GRADO_LABEL: Record<string, string> = {
  en_formacion: 'En formación',
  en_consolidacion: 'En consolidación',
  consolidado: 'Consolidado',
}

export default function InvestigacionPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const isDirector = user?.roles?.some((r: string) => ['superadmin', 'admin', 'director_academico', 'direccion_academica'].includes(r))

  const [tab, setTab] = useState<'cuerpos' | 'proyectos' | 'producciones' | 'indicadores'>('cuerpos')
  const [showCaModal, setShowCaModal] = useState(false)
  const [showProyectoModal, setShowProyectoModal] = useState(false)
  const [showProduccionModal, setShowProduccionModal] = useState(false)

  const [caForm, setCaForm] = useState({ nombre: '', clave: '', lgac_principal: '', fecha_registro: '' })
  const [proyectoForm, setProyectoForm] = useState({ titulo: '', tipo: 'interno', fecha_inicio: '', descripcion: '' })
  const [produccionForm, setProduccionForm] = useState({ tipo: 'articulo', titulo: '', medio_difusion: '', fecha_publicacion: '' })

  const { data: cuerpos } = useQuery<{ data: CuerpoAcademico[] }>({
    queryKey: ['cuerpos-academicos'],
    queryFn: () => apiClient.get('/cuerpos-academicos').then(r => r.data.data),
    enabled: tab === 'cuerpos',
  })

  const { data: proyectos } = useQuery<{ data: ProyectoInvestigacion[] }>({
    queryKey: ['proyectos-investigacion'],
    queryFn: () => apiClient.get('/proyectos-investigacion').then(r => r.data.data),
    enabled: tab === 'proyectos',
  })

  const { data: producciones } = useQuery<{ data: ProduccionAcademica[] }>({
    queryKey: ['producciones-academicas'],
    queryFn: () => apiClient.get('/producciones-academicas').then(r => r.data.data),
    enabled: tab === 'producciones',
  })

  const { data: indicadores } = useQuery<Indicadores>({
    queryKey: ['indicadores-investigacion'],
    queryFn: () => apiClient.get('/indicadores/investigacion').then(r => r.data.data),
    enabled: tab === 'indicadores',
  })

  const mutCrearCa = useMutation({
    mutationFn: () => apiClient.post('/cuerpos-academicos', caForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuerpos-academicos'] })
      setShowCaModal(false)
      toastSuccess('Cuerpo académico registrado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCrearProyecto = useMutation({
    mutationFn: () => apiClient.post('/proyectos-investigacion', proyectoForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proyectos-investigacion'] })
      setShowProyectoModal(false)
      toastSuccess('Proyecto de investigación registrado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCrearProduccion = useMutation({
    mutationFn: () => apiClient.post('/producciones-academicas', produccionForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producciones-academicas'] })
      setShowProduccionModal(false)
      toastSuccess('Producción académica registrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutValidarProduccion = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/producciones-academicas/${id}/validar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producciones-academicas'] })
      toastSuccess('Producción validada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cuerpos Académicos e Investigación</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de cuerpos académicos, proyectos y producción académica</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit">
        {[
          { key: 'cuerpos', label: 'Cuerpos académicos' },
          { key: 'proyectos', label: 'Proyectos' },
          { key: 'producciones', label: 'Producción académica' },
          { key: 'indicadores', label: 'Indicadores' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cuerpos académicos */}
      {tab === 'cuerpos' && (
        <>
          {isDirector && (
            <div className="flex justify-end">
              <button
                onClick={() => { setCaForm({ nombre: '', clave: '', lgac_principal: '', fecha_registro: '' }); setShowCaModal(true) }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                + Registrar cuerpo académico
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">LGAC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Grado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Líder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(cuerpos?.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin cuerpos académicos registrados</td></tr>
                ) : (cuerpos?.data ?? []).map(ca => (
                  <tr key={ca.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{ca.clave}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{ca.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{ca.lgac_principal ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ca.grado_consolidacion === 'consolidado' ? 'bg-green-100 text-green-700' : ca.grado_consolidacion === 'en_consolidacion' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                        {GRADO_LABEL[ca.grado_consolidacion]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{ca.lider?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Proyectos */}
      {tab === 'proyectos' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setProyectoForm({ titulo: '', tipo: 'interno', fecha_inicio: '', descripcion: '' }); setShowProyectoModal(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Registrar proyecto
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cuerpo académico</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Responsable</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proyectos?.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin proyectos registrados</td></tr>
                ) : (proyectos?.data ?? []).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.titulo}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{p.tipo}</td>
                    <td className="px-4 py-3 text-slate-600">{p.cuerpoAcademico?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.responsable?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estatus === 'concluido' ? 'bg-green-100 text-green-700' : p.estatus === 'en_proceso' ? 'bg-yellow-100 text-yellow-700' : p.estatus === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Producción académica */}
      {tab === 'producciones' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setProduccionForm({ tipo: 'articulo', titulo: '', medio_difusion: '', fecha_publicacion: '' }); setShowProduccionModal(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Registrar producción
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Autor principal</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Validada</th>
                  {isDirector && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(producciones?.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Sin producción académica registrada</td></tr>
                ) : (producciones?.data ?? []).map(pr => (
                  <tr key={pr.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800 line-clamp-1 max-w-xs">{pr.titulo}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{pr.tipo.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">{pr.medio_difusion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{pr.autorPrincipal?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.estatus === 'validada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {pr.estatus === 'validada' ? 'Sí' : 'Pendiente'}
                      </span>
                    </td>
                    {isDirector && (
                      <td className="px-4 py-3 text-right">
                        {pr.estatus !== 'validada' && (
                          <button onClick={() => mutValidarProduccion.mutate(pr.id)} className="text-xs text-blue-600 hover:underline">
                            Validar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Indicadores */}
      {tab === 'indicadores' && indicadores && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Cuerpos académicos',    value: indicadores.total_cuerpos_academicos, color: 'text-slate-700' },
            { label: 'Consolidados',          value: indicadores.por_grado_consolidacion?.consolidado ?? 0, color: 'text-green-700' },
            { label: 'En consolidación',      value: indicadores.por_grado_consolidacion?.en_consolidacion ?? 0, color: 'text-yellow-700' },
            { label: 'Proyectos en proceso',  value: indicadores.proyectos_en_proceso, color: 'text-blue-700' },
            { label: 'Proyectos concluidos',  value: indicadores.proyectos_concluidos, color: 'text-green-700' },
            { label: 'Producciones validadas',value: indicadores.producciones_validadas, color: 'text-blue-700' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal cuerpo académico */}
      {showCaModal && (
        <ModalWrap title="Registrar cuerpo académico" onClose={() => setShowCaModal(false)} onSave={() => mutCrearCa.mutate()} saving={mutCrearCa.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Clave *</label>
            <input value={caForm.clave} onChange={e => setCaForm(f => ({ ...f, clave: e.target.value }))} className={inputCls} placeholder="Ej. CA-ITSMT-01" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de registro *</label>
            <input type="date" value={caForm.fecha_registro} onChange={e => setCaForm(f => ({ ...f, fecha_registro: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre *</label>
            <input value={caForm.nombre} onChange={e => setCaForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">LGAC principal</label>
            <input value={caForm.lgac_principal} onChange={e => setCaForm(f => ({ ...f, lgac_principal: e.target.value }))} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal proyecto */}
      {showProyectoModal && (
        <ModalWrap title="Registrar proyecto de investigación" onClose={() => setShowProyectoModal(false)} onSave={() => mutCrearProyecto.mutate()} saving={mutCrearProyecto.isPending}>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input value={proyectoForm.titulo} onChange={e => setProyectoForm(f => ({ ...f, titulo: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
            <select value={proyectoForm.tipo} onChange={e => setProyectoForm(f => ({ ...f, tipo: e.target.value }))} className={selectCls}>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
              <option value="financiado">Financiado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de inicio *</label>
            <input type="date" value={proyectoForm.fecha_inicio} onChange={e => setProyectoForm(f => ({ ...f, fecha_inicio: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción</label>
            <textarea value={proyectoForm.descripcion} onChange={e => setProyectoForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal producción académica */}
      {showProduccionModal && (
        <ModalWrap title="Registrar producción académica" onClose={() => setShowProduccionModal(false)} onSave={() => mutCrearProduccion.mutate()} saving={mutCrearProduccion.isPending}>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input value={produccionForm.titulo} onChange={e => setProduccionForm(f => ({ ...f, titulo: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo *</label>
            <select value={produccionForm.tipo} onChange={e => setProduccionForm(f => ({ ...f, tipo: e.target.value }))} className={selectCls}>
              <option value="articulo">Artículo</option>
              <option value="libro">Libro</option>
              <option value="capitulo">Capítulo de libro</option>
              <option value="ponencia">Ponencia</option>
              <option value="patente">Patente</option>
              <option value="tesis_dirigida">Tesis dirigida</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de publicación *</label>
            <input type="date" value={produccionForm.fecha_publicacion} onChange={e => setProduccionForm(f => ({ ...f, fecha_publicacion: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Medio de difusión</label>
            <input value={produccionForm.medio_difusion} onChange={e => setProduccionForm(f => ({ ...f, medio_difusion: e.target.value }))} className={inputCls} />
          </div>
        </ModalWrap>
      )}
    </div>
  )
}
