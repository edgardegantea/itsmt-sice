import { useState } from 'react'
import MateriasTab     from './tabs/MateriasTab'
import GruposTab       from './tabs/GruposTab'
import CargasTab       from './tabs/CargasTab'
import TutoriasTab     from './tabs/TutoriasTab'
import FuncionesTab    from './tabs/FuncionesTab'
import MallaTab        from './tabs/MallaTab'
import AulasTab        from './tabs/AulasTab'
import HorariosTab     from './tabs/HorariosTab'
import PlaneacionesTab from './tabs/PlaneacionesTab'

const TABS = [
  { id: 'materias',    label: 'Materias' },
  { id: 'malla',       label: 'Malla Curricular' },
  { id: 'grupos',      label: 'Grupos' },
  { id: 'aulas',       label: 'Aulas' },
  { id: 'cargas',      label: 'Cargas Académicas' },
  { id: 'horarios',    label: 'Horarios' },
  { id: 'planeaciones',label: 'Planeaciones' },
  { id: 'tutorias',    label: 'Tutorías' },
  { id: 'funciones',   label: 'Funciones del Personal' },
] as const

type TabId = typeof TABS[number]['id']

export default function GestionAcademicaPage() {
  const [tab, setTab] = useState<TabId>('materias')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Gestión Académica</h1>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {tab === 'materias'     && <MateriasTab />}
        {tab === 'malla'        && <MallaTab />}
        {tab === 'grupos'       && <GruposTab />}
        {tab === 'aulas'        && <AulasTab />}
        {tab === 'cargas'       && <CargasTab />}
        {tab === 'horarios'     && <HorariosTab />}
        {tab === 'planeaciones' && <PlaneacionesTab />}
        {tab === 'tutorias'     && <TutoriasTab />}
        {tab === 'funciones'    && <FuncionesTab />}
      </div>
    </div>
  )
}
