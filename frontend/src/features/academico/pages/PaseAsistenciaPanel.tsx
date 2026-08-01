import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mergeCargasPorAsignatura, type CargaAcademica } from '../services/academico'
import type { PeriodoRango } from './PaseAsistenciaGrupo'

// Agrupa las cargas en carrera → semestre → grupo → asignaturas, usando el primer
// grupo de cada carga (la selección posterior también solo usa `grupos[0]`).
function agruparCargas(cargas: CargaAcademica[]) {
  type CargaConGrupo = { carga: CargaAcademica; grupo: NonNullable<CargaAcademica['grupos']>[number] }
  type GrupoEntry = { id: string; clave: string; alumnosCount?: number; cargas: CargaConGrupo[] }
  type SemEntry = { semestre: number; grupos: Map<string, GrupoEntry> }
  type CarreraEntry = { id: string; nombre: string; semestres: Map<number, SemEntry> }

  const map = new Map<string, CarreraEntry>()
  for (const carga of cargas) {
    const grupo = carga.grupos?.[0]
    if (!grupo) continue
    const cid = grupo.carrera_id ?? '_sin'
    if (!map.has(cid)) map.set(cid, { id: cid, nombre: grupo.carrera?.nombre ?? 'Sin carrera', semestres: new Map() })
    const carreraEntry = map.get(cid)!
    if (!carreraEntry.semestres.has(grupo.semestre)) carreraEntry.semestres.set(grupo.semestre, { semestre: grupo.semestre, grupos: new Map() })
    const semEntry = carreraEntry.semestres.get(grupo.semestre)!
    if (!semEntry.grupos.has(grupo.id)) semEntry.grupos.set(grupo.id, { id: grupo.id, clave: grupo.clave, alumnosCount: grupo.alumnos_count, cargas: [] })
    semEntry.grupos.get(grupo.id)!.cargas.push({ carga, grupo })
  }

  return [...map.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(c => ({
      ...c,
      semestres: [...c.semestres.values()]
        .sort((a, b) => a.semestre - b.semestre)
        .map(s => ({
          ...s,
          grupos: [...s.grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave)),
        })),
    }))
}

export default function PaseAsistenciaPanel({
  cargas, cargandoCargas, periodo,
}: {
  cargas: CargaAcademica[]
  cargandoCargas: boolean
  periodo?: PeriodoRango
}) {
  const navigate = useNavigate()

  const byCarrera = useMemo(() => agruparCargas(mergeCargasPorAsignatura(cargas)), [cargas])
  const [openCarreras, setOpenCarreras] = useState<Set<string>>(() => new Set())
  const [openSemestres, setOpenSemestres] = useState<Set<string>>(() => new Set())
  const [openGrupos, setOpenGrupos] = useState<Set<string>>(() => new Set())
  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
    set(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900 text-sm">Pase de lista</h2>
        <p className="text-xs text-slate-500 mt-0.5">Elige carrera, semestre, grupo y asignatura para capturar la asistencia de sus alumnos.</p>
      </div>

      {cargandoCargas ? (
        <p className="text-sm text-slate-400">Cargando materias…</p>
      ) : cargas.length === 0 ? (
        <p className="text-sm text-slate-400">No tienes materias asignadas en este periodo.</p>
      ) : (
        <div className="space-y-2">
          {byCarrera.map(carrera => {
            const isOpenC = openCarreras.has(carrera.id)
            const totalGrupos = carrera.semestres.reduce((s, se) => s + se.grupos.length, 0)
            return (
              <div key={carrera.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggle(setOpenCarreras, carrera.id)}
                >
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpenC ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-slate-800 text-sm truncate">{carrera.nombre}</span>
                  <span className="ml-auto text-xs text-slate-400 shrink-0">{totalGrupos} grupo{totalGrupos !== 1 ? 's' : ''}</span>
                </button>

                {isOpenC && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {carrera.semestres.map(sem => {
                      const semKey = `${carrera.id}|${sem.semestre}`
                      const isOpenS = openSemestres.has(semKey)
                      return (
                        <div key={semKey}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 pl-8 pr-3 py-2 hover:bg-slate-50/80 transition-colors text-left"
                            onClick={() => toggle(setOpenSemestres, semKey)}
                          >
                            <svg className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isOpenS ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-xs font-semibold text-slate-600">{sem.semestre}° Semestre</span>
                            <span className="ml-auto text-xs text-slate-400">{sem.grupos.length} grupo{sem.grupos.length !== 1 ? 's' : ''}</span>
                          </button>

                          {isOpenS && (
                            <div className="border-t border-slate-50 divide-y divide-slate-50">
                              {sem.grupos.map(g => {
                                const grupoKey = `${semKey}|${g.id}`
                                const isOpenG = openGrupos.has(grupoKey)
                                return (
                                  <div key={g.id}>
                                    <button
                                      type="button"
                                      className="w-full flex items-center gap-2 pl-14 pr-3 py-2 hover:bg-blue-50/40 transition-colors text-left"
                                      onClick={() => toggle(setOpenGrupos, grupoKey)}
                                    >
                                      <svg className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isOpenG ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">{g.clave}</span>
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                        g.alumnosCount ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                                      }`}>
                                        {g.alumnosCount ? `${g.alumnosCount} alumno${g.alumnosCount === 1 ? '' : 's'}` : 'Sin alumnos'}
                                      </span>
                                      <span className="ml-auto text-xs text-slate-400 shrink-0">
                                        {g.cargas.length} asignatura{g.cargas.length !== 1 ? 's' : ''}
                                      </span>
                                    </button>

                                    {isOpenG && (
                                      <div className="border-t border-slate-50 divide-y divide-slate-50 bg-slate-50/40">
                                        {g.cargas.map(({ carga }) => (
                                          <button
                                            key={carga.id}
                                            type="button"
                                            onClick={() => navigate(
                                              `/admin/gestion-academica/asistencias/pase/${carga.id}${periodo ? `?periodo=${periodo.id}` : ''}`,
                                              { state: { carga, periodo } }
                                            )}
                                            className="w-full flex items-center gap-2 pl-20 pr-3 py-2 text-left text-xs transition-colors hover:bg-blue-50 text-slate-700"
                                          >
                                            <span className="font-medium truncate">{carga.materia?.nombre ?? 'Materia'}</span>
                                            {carga.docente && (
                                              <span className="text-slate-400">— {carga.docente.name}</span>
                                            )}
                                            <span className="ml-auto shrink-0 font-medium text-blue-600">Pasar lista →</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
