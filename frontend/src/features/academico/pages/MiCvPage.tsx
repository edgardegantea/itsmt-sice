import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { mutationError } from './tabs/shared'
import {
  useMiFicha,
  type TituloAcademico, type ExperienciaLaboral, type CursoCapacitacion, type Publicacion,
} from './secciones/docenteShared'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'

function Seccion({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export default function MiCvPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { data: ficha, isLoading } = useMiFicha()

  const [semblanza, setSemblanza] = useState<string | null>(null)
  const [titulos, setTitulos] = useState<TituloAcademico[] | null>(null)
  const [experiencia, setExperiencia] = useState<ExperienciaLaboral[] | null>(null)
  const [cursos, setCursos] = useState<CursoCapacitacion[] | null>(null)
  const [publicaciones, setPublicaciones] = useState<Publicacion[] | null>(null)
  const [cargado, setCargado] = useState(false)

  // Semilla el formulario una sola vez cuando llega el CV del servidor
  // (patrón "ajustar estado según props" documentado por React, sin useEffect).
  if (ficha && !cargado) {
    setSemblanza(ficha.semblanza ?? '')
    setTitulos(ficha.titulos_academicos ?? [])
    setExperiencia(ficha.experiencia_laboral ?? [])
    setCursos(ficha.cursos_capacitacion ?? [])
    setPublicaciones(ficha.publicaciones ?? [])
    setCargado(true)
  }

  const save = useMutation({
    mutationFn: () => apiClient.put('/mi-ficha-docente', {
      semblanza: semblanza || null,
      titulos_academicos: titulos ?? [],
      experiencia_laboral: experiencia ?? [],
      cursos_capacitacion: cursos ?? [],
      publicaciones: publicaciones ?? [],
    }),
    onSuccess: () => {
      addToast('CV actualizado.', 'success')
      qc.invalidateQueries({ queryKey: ['mi-ficha-docente'] })
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  if (isLoading || !cargado) {
    return <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-sm text-slate-400">Cargando tu CV…</div>
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Mi CV</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Mantén tu CV actualizado — esta información la consultan el jefe de carrera y la administración.
          {ficha?.cv_actualizado_en && (
            <> Última actualización: {new Date(ficha.cv_actualizado_en).toLocaleString('es-MX')}.</>
          )}
        </p>
      </div>

      <Seccion title="Semblanza">
        <textarea rows={4} value={semblanza ?? ''} onChange={e => setSemblanza(e.target.value)}
          placeholder="Breve reseña profesional…" className={inputCls + ' resize-none'} />
      </Seccion>

      <Seccion title="Formación académica" hint="Grados, licenciaturas, maestrías, doctorados…">
        {(titulos ?? []).map((t, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
            <input className={inputCls} placeholder="Grado (Ej. Maestría en Ciencias)" value={t.grado}
              onChange={e => setTitulos(list => (list ?? []).map((x, j) => j === i ? { ...x, grado: e.target.value } : x))} />
            <input className={inputCls} placeholder="Institución" value={t.institucion ?? ''}
              onChange={e => setTitulos(list => (list ?? []).map((x, j) => j === i ? { ...x, institucion: e.target.value } : x))} />
            <input className={inputCls} type="number" placeholder="Año" value={t.anio ?? ''}
              onChange={e => setTitulos(list => (list ?? []).map((x, j) => j === i ? { ...x, anio: e.target.value ? parseInt(e.target.value) : undefined } : x))} />
            <button onClick={() => setTitulos(list => (list ?? []).filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        ))}
        <button onClick={() => setTitulos(list => [...(list ?? []), { grado: '' }])} className="text-xs font-medium text-blue-600 hover:underline">+ Agregar título</button>
      </Seccion>

      <Seccion title="Experiencia laboral">
        {(experiencia ?? []).map((e, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Puesto" value={e.puesto}
                onChange={ev => setExperiencia(list => (list ?? []).map((x, j) => j === i ? { ...x, puesto: ev.target.value } : x))} />
              <input className={inputCls} placeholder="Institución / Empresa" value={e.institucion ?? ''}
                onChange={ev => setExperiencia(list => (list ?? []).map((x, j) => j === i ? { ...x, institucion: ev.target.value } : x))} />
              <input className={inputCls} placeholder="Desde (Ej. 2018)" value={e.fecha_inicio ?? ''}
                onChange={ev => setExperiencia(list => (list ?? []).map((x, j) => j === i ? { ...x, fecha_inicio: ev.target.value } : x))} />
              <input className={inputCls} placeholder="Hasta (Ej. 2022 o Actual)" value={e.fecha_fin ?? ''}
                onChange={ev => setExperiencia(list => (list ?? []).map((x, j) => j === i ? { ...x, fecha_fin: ev.target.value } : x))} />
            </div>
            <textarea rows={2} className={inputCls + ' resize-none'} placeholder="Descripción breve…" value={e.descripcion ?? ''}
              onChange={ev => setExperiencia(list => (list ?? []).map((x, j) => j === i ? { ...x, descripcion: ev.target.value } : x))} />
            <button onClick={() => setExperiencia(list => (list ?? []).filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        ))}
        <button onClick={() => setExperiencia(list => [...(list ?? []), { puesto: '' }])} className="text-xs font-medium text-blue-600 hover:underline">+ Agregar experiencia</button>
      </Seccion>

      <Seccion title="Cursos y capacitación">
        {(cursos ?? []).map((c, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-center">
            <input className={inputCls} placeholder="Nombre del curso" value={c.nombre}
              onChange={e => setCursos(list => (list ?? []).map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
            <input className={inputCls} placeholder="Institución" value={c.institucion ?? ''}
              onChange={e => setCursos(list => (list ?? []).map((x, j) => j === i ? { ...x, institucion: e.target.value } : x))} />
            <input className={inputCls} placeholder="Fecha" value={c.fecha ?? ''}
              onChange={e => setCursos(list => (list ?? []).map((x, j) => j === i ? { ...x, fecha: e.target.value } : x))} />
            <input className={inputCls} type="number" placeholder="Horas" value={c.horas ?? ''}
              onChange={e => setCursos(list => (list ?? []).map((x, j) => j === i ? { ...x, horas: e.target.value ? parseInt(e.target.value) : undefined } : x))} />
            <button onClick={() => setCursos(list => (list ?? []).filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        ))}
        <button onClick={() => setCursos(list => [...(list ?? []), { nombre: '' }])} className="text-xs font-medium text-blue-600 hover:underline">+ Agregar curso</button>
      </Seccion>

      <Seccion title="Publicaciones">
        {(publicaciones ?? []).map((p, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_0.7fr_1.5fr_auto] gap-2 items-center">
            <input className={inputCls} placeholder="Título" value={p.titulo}
              onChange={e => setPublicaciones(list => (list ?? []).map((x, j) => j === i ? { ...x, titulo: e.target.value } : x))} />
            <input className={inputCls} placeholder="Medio / Revista" value={p.medio ?? ''}
              onChange={e => setPublicaciones(list => (list ?? []).map((x, j) => j === i ? { ...x, medio: e.target.value } : x))} />
            <input className={inputCls} type="number" placeholder="Año" value={p.anio ?? ''}
              onChange={e => setPublicaciones(list => (list ?? []).map((x, j) => j === i ? { ...x, anio: e.target.value ? parseInt(e.target.value) : undefined } : x))} />
            <input className={inputCls} placeholder="URL (opcional)" value={p.url ?? ''}
              onChange={e => setPublicaciones(list => (list ?? []).map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
            <button onClick={() => setPublicaciones(list => (list ?? []).filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        ))}
        <button onClick={() => setPublicaciones(list => [...(list ?? []), { titulo: '' }])} className="text-xs font-medium text-blue-600 hover:underline">+ Agregar publicación</button>
      </Seccion>

      {save.isError && <p className="text-xs text-red-600">{mutationError(save.error)}</p>}

      <div className="flex justify-end pb-4">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primario)' }}>
          {save.isPending ? 'Guardando…' : 'Guardar CV'}
        </button>
      </div>
    </div>
  )
}
