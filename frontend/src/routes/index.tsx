import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authRoutes } from '../features/auth/routes'
import { admisionRoutes } from '../features/admision/routes'
import { adminRoutes } from '../features/admin/routes'
import { academicoRoutes } from '../features/academico/routes'
import { permanenciaRoutes } from '../features/permanencia/routes'
import { convocatoriaRoutes } from '../features/convocatoria/routes'
import { planeacionRoutes } from '../features/planeacion/routes'
import { alumnoRoutes } from '../features/alumno/routes'
import { calidadRoutes } from '../features/calidad/routes'
import { vinculacionRoutes } from '../features/vinculacion/routes'
import { titulacionRoutes } from '../features/titulacion/routes'
import { analiticaRoutes } from '../features/analitica/routes'
import { personalRoutes } from '../features/personal/routes'
import { capacitacionRoutes } from '../features/capacitacion/routes'
import { reinscripcionRoutes } from '../features/reinscripcion/routes'
import { finanzasRoutes } from '../features/finanzas/routes'
import { becasRoutes } from '../features/becas/routes'
import { bibliotecaRoutes } from '../features/biblioteca/routes'
import { calidadisoRoutes } from '../features/calidadiso/routes'
import { investigacionRoutes } from '../features/investigacion/routes'
import { infraestructuraRoutes } from '../features/infraestructura/routes'
import { seguridadRoutes } from '../features/seguridad/routes'

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
    Cargando…
  </div>
)

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {authRoutes}
        {admisionRoutes}
        {adminRoutes}
        {academicoRoutes}
        {permanenciaRoutes}
        {convocatoriaRoutes}
        {planeacionRoutes}
        {alumnoRoutes}
        {calidadRoutes}
        {vinculacionRoutes}
        {titulacionRoutes}
        {analiticaRoutes}
        {personalRoutes}
        {capacitacionRoutes}
        {reinscripcionRoutes}
        {finanzasRoutes}
        {becasRoutes}
        {bibliotecaRoutes}
        {calidadisoRoutes}
        {investigacionRoutes}
        {infraestructuraRoutes}
        {seguridadRoutes}

        <Route path="/sin-acceso" element={<div style={{padding:32,color:'#dc3545'}}>Sin permisos para acceder a esta sección.</div>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
