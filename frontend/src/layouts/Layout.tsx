import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/services/auth'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { usePreferenciasStore } from '../store/preferenciasStore'
import { usePeriodoActivo } from '../hooks/usePeriodoActivo'
import { academicoApi } from '../features/academico/services/academico'
import { permanenciaApi } from '../features/permanencia/services/permanencia'
import PreferenciasPanel from '../components/PreferenciasPanel'
import CommandPalette from '../components/CommandPalette'
import NotificationBell from '../components/NotificationBell'
import BroadcastBanner from '../components/BroadcastBanner'
import { rolPrincipal, destinoDeRol } from '../utils/roles'

const ROLES_SEGUIMIENTO_INSTRUMENTACION = ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'subdireccion_academica', 'desarrollo_academico']
const ROLES_BAJAS = ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera']

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.48 3.499 2.507 5.104 5.632.818a.75.75 0 0 1 .416 1.28l-4.076 3.973.962 5.61a.75.75 0 0 1-1.088.79L12 18.354l-5.041 2.652a.75.75 0 0 1-1.088-.79l.962-5.61-4.076-3.972a.75.75 0 0 1 .416-1.281l5.632-.818 2.507-5.104a.75.75 0 0 1 1.346 0Z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconGraduate() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c3.53 1.57 7.47 1.57 11 0v-5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

const ICONS: Record<string, () => React.JSX.Element> = {
  '/admin':                  IconDashboard,
  '/admin/aspirantes':       IconUsers,
  '/admin/alumnos':          IconGraduate,
  '/admin/periodos':         IconCalendar,
  '/admin/carreras':         IconBook,
  '/admin/catalogos':           IconTag,
  '/admin/configuracion':       IconSettings,
  '/admin/reinscripciones':              IconCalendar,
  '/admin/constancias':                  IconBook,
  '/admin/encuestas-socioeconomicas':    IconBook,
  '/admin/directorio':                    IconUsers,
  '/admin/usuarios':                     IconUsers,
  '/admin/permisos':                     IconShield,
  '/admin/gestion-academica':            IconGraduate,
  '/admin/carga-academica':              IconGraduate,
  '/admin/horarios/builder':             IconGraduate,
  '/admin/horarios/disponibilidad':      IconGraduate,
  '/docente/mi-horario':                 IconBook,
  '/docente/disponibilidad':             IconBook,
  '/docente/planeacion':                 IconBook,
  '/docente/mi-cv':                      IconBook,
  '/docente/calificaciones':             IconBook,
  '/docente/asistencias':                IconBook,
  '/admin/gestion-academica/calificaciones': IconBook,
  '/admin/gestion-academica/asistencias':    IconBook,
  '/admin/bajas':                        IconUsers,
  '/admin/reportes/altas-bajas':          IconUsers,
  '/admin/alertas-baja-definitiva':      IconShield,
  '/gestion-academica/alertas-corte-captura': IconShield,
  '/admin/vinculacion/servicio-social':      IconBook,
  '/admin/vinculacion/solicitudes-rp':       IconBook,
  '/admin/vinculacion/residencias':          IconGraduate,
  '/admin/vinculacion/asesorias-rp':        IconBook,
  '/admin/libro-registro-nc':               IconBook,
  '/admin/egresados':                       IconUsers,
  '/admin/reportes/directivos':             IconBook,
  '/admin/indicadores/asistencia':          IconShield,
  '/admin/indicadores/tutoria':             IconShield,
  '/admin/pit/asignaciones':               IconUsers,
  '/admin/traslados':                      IconUsers,
  '/admin/convalidaciones':                IconBook,
  '/admin/equivalencias':                  IconBook,
  '/docente/pit/sesiones':                 IconBook,
  '/docente/pit/pat':                      IconBook,
  '/admin/titulacion/certificados-idioma':   IconBook,
  '/admin/titulacion/acto-protocolario':     IconGraduate,
  '/admin/titulacion/salida-lateral':        IconBook,
}

const GROUP_ICONS: Record<string, () => React.JSX.Element> = {
  general: IconDashboard,
  alumnos: IconGraduate,
  academica: IconBook,
  vinculacion: IconUsers,
  tramites_personal: IconCalendar,
  analitica: IconShield,
  administracion: IconSettings,
}

type NavItem = { to: string; label: string; roles?: string[]; permissions?: string[] }
type NavGroup = { id: string; label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'general',
    label: 'General',
    items: [
      { to: '/admin', label: 'Panel Principal', roles: ['superadmin', 'admin', 'director_academico', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/jefe-carrera/dashboard', label: 'Panel Jefe de Carrera', roles: ['jefe_carrera'] },
      { to: '/comunicados', label: 'Comunicación Interna', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'docente', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica', 'desarrollo_academico'] },
      { to: '/comunicados/oficio-circular', label: 'Oficio Circular 0041/2026', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'docente', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica', 'desarrollo_academico'] },
      { to: '/admin/directorio', label: 'Directorio Institucional', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
    ],
  },
  {
    id: 'alumnos',
    label: 'Control Escolar y Alumnos',
    items: [
      { to: '/admin/aspirantes', label: 'Aspirantes', roles: ['superadmin', 'admin', 'jefe_carrera', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/alumnos', label: 'Alumnos', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/reinscripciones', label: 'Reinscripciones', roles: ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/bajas', label: 'Bajas', roles: ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/reportes/altas-bajas', label: 'Reporte Altas/Bajas', roles: ['superadmin', 'admin', 'control_escolar', 'jefe_carrera', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/constancias', label: 'Constancias', roles: ['superadmin', 'admin', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/encuestas-socioeconomicas', label: 'Enc. Socioeconómica', roles: ['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/carga-academica', label: 'Carga Académica PDF', roles: ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/alertas-baja-definitiva', label: 'Alertas Baja Def.', roles: ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/gestion-academica/alertas-corte-captura', label: 'Cortes de Captura', roles: ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'docente', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/libro-registro-nc', label: 'Libro Registro NC', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/egresados', label: 'Egresados', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/calendario-escolar', label: 'Calendario Escolar', roles: ['superadmin', 'admin', 'control_escolar', 'subdireccion_academica', 'director_academico', 'direccion_general', 'direccion_academica'] },
      { to: '/admin/finanzas/estado-cuenta', label: 'Estado de Cuenta', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/becas', label: 'Becas TecNM', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'jefe_carrera', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
    ],
  },
  {
    id: 'academica',
    label: 'Gestión Académica',
    items: [
      { to: '/admin/planeacion/asignaciones', label: 'Asignaciones', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/planeacion/instrumentaciones', label: 'Instrumentaciones', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'docente', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/gestion-academica/planeaciones', label: 'Revisión de Planeaciones', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'subdireccion_academica'] },
      { to: '/admin/gestion-academica/seguimiento-instrumentacion', label: 'Seguimiento Instrumentación', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'subdireccion_academica', 'desarrollo_academico'] },
      { to: '/desarrollo-academico/instrumentaciones', label: 'Instrumentaciones DA', roles: ['desarrollo_academico'] },
      { to: '/desarrollo-academico/planeaciones', label: 'Revisión DA', roles: ['desarrollo_academico'] },
      { to: '/admin/gestion-academica', label: 'Gestión Académica General', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/docente/calificaciones', label: 'Captura Calificaciones', roles: ['docente'] },
      { to: '/docente/asistencias', label: 'Captura Asistencias', roles: ['docente'] },
      { to: '/admin/gestion-academica/calificaciones', label: 'Captura Calificaciones (Jefe)', roles: ['jefe_carrera'] },
      { to: '/admin/gestion-academica/asistencias', label: 'Captura Asistencias (Jefe)', roles: ['jefe_carrera'] },
      { to: '/docente/planeacion', label: 'Mi Planeación', roles: ['docente', 'jefe_carrera'] },
      { to: '/docente/mi-cv', label: 'Mi CV Docente', roles: ['docente', 'jefe_carrera', 'director_academico'] },
      { to: '/docente/mi-horario', label: 'Mi Horario', roles: ['docente', 'jefe_carrera'] },
      { to: '/docente/disponibilidad', label: 'Mi Disponibilidad', roles: ['docente', 'jefe_carrera'] },
      { to: '/admin/calidad/actividades-complementarias', label: 'Act. Complementarias', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/calidad/evaluacion-docente/resultados', label: 'Resultados Eval. Docente', roles: ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/evaluacion-docente-ampliada', label: 'Evaluación Docente Ampliada', roles: ['superadmin', 'admin', 'director_academico', 'direccion_academica'] },
      { to: '/admin/calidad-iso', label: 'Calidad ISO/CACEI', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'docente', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/investigacion', label: 'Cuerpos Académicos e Inv.', roles: ['superadmin', 'admin', 'director_academico', 'docente', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/pit/asignaciones', label: 'Asignaciones Tutoría (PIT)', roles: ['superadmin', 'admin', 'coord_tutoria', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/docente/pit/sesiones', label: 'Mis Sesiones Tutoría', roles: ['docente', 'jefe_carrera'] },
      { to: '/docente/pit/pat', label: 'Mi Plan PAT', roles: ['docente', 'jefe_carrera'] },
      { to: '/admin/indicadores/tutoria', label: 'Dashboard Tutoría (PIT)', roles: ['superadmin', 'admin', 'coord_tutoria', 'director_academico', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
    ],
  },
  {
    id: 'vinculacion',
    label: 'Vinculación y Titulación',
    items: [
      { to: '/admin/vinculacion/servicio-social', label: 'Servicio Social', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/vinculacion/solicitudes-rp', label: 'Solicitudes RP', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/vinculacion/residencias', label: 'Residencias Prof.', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/vinculacion/asesorias-rp', label: 'Asesorías RP', roles: ['superadmin', 'admin', 'jefe_carrera', 'docente', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/titulacion/certificados-idioma', label: 'Certificados Idioma', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/titulacion/acto-protocolario', label: 'Acto Protocolario', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/titulacion/salida-lateral', label: 'Salida Lateral', roles: ['superadmin', 'admin', 'jefe_carrera', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/bolsa-trabajo', label: 'Bolsa de Trabajo', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_academica', 'direccion_general', 'alumno'] },
    ],
  },
  {
    id: 'tramites_personal',
    label: 'Personal, Trámites y Movilidad',
    items: [
      { to: '/admin/personal/solicitudes', label: 'Permisos Laborales', roles: ['superadmin', 'admin', 'docente', 'jefe_carrera', 'personal_administrativo', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/personal/comisiones', label: 'Comisiones', roles: ['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/capacitacion/cursos', label: 'Capacitación Personal', roles: ['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/docente/capacitacion', label: 'Mis Cursos Capacitación', roles: ['docente', 'jefe_carrera'] },
      { to: '/admin/traslados', label: 'Traslados', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/convalidaciones', label: 'Convalidaciones', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/equivalencias', label: 'Equivalencias', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/convenios-movilidad', label: 'Convenios Movilidad', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/movilidad-estudiantil', label: 'Movilidad Estudiantil', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_academica', 'subdireccion_academica', 'alumno'] },
      { to: '/admin/cursos-verano', label: 'Cursos de Verano', roles: ['superadmin', 'admin', 'control_escolar', 'director_academico', 'direccion_academica', 'subdireccion_academica', 'docente', 'alumno'] },
      { to: '/admin/educacion-distancia/programas', label: 'Programas Ed. Distancia', roles: ['superadmin', 'admin', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/educacion-distancia/seguimiento', label: 'Seguimiento Ed. Distancia', roles: ['superadmin', 'admin', 'coord_distancia', 'director_academico', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/plazas-sindicales', label: 'Catálogo Plazas Sindicales', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica', 'control_escolar'] },
      { to: '/admin/permisos-sindicales', label: 'Permisos Sindicales', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica', 'control_escolar'] },
      { to: '/admin/concursos-oposicion', label: 'Concursos Escalafón', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica'] },
      { to: '/admin/convocatorias', label: 'Gestión Convocatorias', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica', 'control_escolar'] },
      { to: '/biblioteca', label: 'Biblioteca Institucional', roles: ['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno', 'personal_administrativo', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
    ],
  },
  {
    id: 'analitica',
    label: 'Analítica y Reportes',
    items: [
      { to: '/admin/analitica/indicadores', label: 'Indicadores KPI', roles: ['superadmin', 'admin', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/indicadores/asistencia', label: 'Asistencia Institucional', roles: ['superadmin', 'admin', 'director_academico', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/reportes/directivos', label: 'Reportes Directivos PDF', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/auditoria', label: 'Auditoría y Trazabilidad', roles: ['superadmin', 'admin'] },
      { to: '/admin/incidentes-seguridad', label: 'Incidentes de Seguridad', roles: ['superadmin', 'admin'] },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración y Sistema',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios y Accesos', roles: ['superadmin', 'admin'] },
      { to: '/admin/permisos', label: 'Permisos de Rol', roles: ['superadmin'] },
      { to: '/admin/api-keys', label: 'Exportación BI & API', roles: ['superadmin', 'admin'] },
      { to: '/admin/periodos', label: 'Periodos Escolares', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/carreras', label: 'Oferta de Carreras', roles: ['superadmin', 'admin', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/catalogos', label: 'Catálogos del Sistema', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/admin/infraestructura', label: 'Infraestructura y Recursos', roles: ['superadmin', 'admin', 'personal_administrativo', 'direccion_academica', 'direccion_general'] },
      { to: '/admin/configuracion', label: 'Configuración General', roles: ['superadmin', 'admin', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
      { to: '/seguridad/mi-cuenta', label: 'Seguridad de mi Cuenta', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'docente', 'alumno', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'] },
    ],
  },
]

// ── NavItem con tooltip fixed ─────────────────────────────────────────────────

function NavItem({ n, colapsado, onClose, badge, favorito, onToggleFavorito }: {
  n: { to: string; label: string }
  colapsado: boolean
  onClose: () => void
  badge?: number
  favorito?: boolean
  onToggleFavorito?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ top: number } | null>(null)
  const Icon = ICONS[n.to] ?? IconTag

  const showTip = () => {
    if (!colapsado || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setTip({ top: rect.top + rect.height / 2 })
  }

  return (
    <div ref={ref} onMouseEnter={showTip} onMouseLeave={() => setTip(null)} className="relative group/item">
      <NavLink
        to={n.to}
        end={n.to === '/admin'}
        onClick={onClose}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
            colapsado ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-[#b38e5d] text-white font-semibold shadow-md shadow-black/20 ring-1 ring-white/20'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200 transition-colors'}`}>
              <Icon />
            </span>
            {!colapsado && <span className="truncate">{n.label}</span>}
            {!!badge && (
              <span className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ${colapsado ? 'absolute -top-0.5 -right-0.5' : 'ml-auto'}`}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
            {!colapsado && !badge && isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            )}
          </>
        )}
      </NavLink>

      {/* Anclar a favoritos — visible al pasar el cursor, o siempre si ya está anclado,
          para no obligar a "descubrir" cómo desanclarlo. */}
      {!colapsado && onToggleFavorito && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorito() }}
          aria-label={favorito ? 'Quitar de favoritos' : 'Anclar a favoritos'}
          aria-pressed={favorito}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity ${
            favorito ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-amber-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill={favorito ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.48 3.499 2.507 5.104 5.632.818a.75.75 0 0 1 .416 1.28l-4.076 3.973.962 5.61a.75.75 0 0 1-1.088.79L12 18.354l-5.041 2.652a.75.75 0 0 1-1.088-.79l.962-5.61-4.076-3.972a.75.75 0 0 1 .416-1.281l5.632-.818 2.507-5.104a.75.75 0 0 1 1.346 0Z" />
          </svg>
        </button>
      )}

      {/* Tooltip fixed — escapa cualquier overflow */}
      {colapsado && tip && (
        <div
          className="fixed left-[4.5rem] z-[9999] pointer-events-none
            whitespace-nowrap rounded-md px-2.5 py-1.5
            bg-slate-900 text-white text-xs font-medium shadow-lg"
          style={{ top: tip.top, transform: 'translateY(-50%)' }}
        >
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
          {n.label}
        </div>
      )}
    </div>
  )
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  admin:                        'Panel',
  aspirantes:                   'Aspirantes',
  alumnos:                      'Alumnos',
  'gestion-academica':          'Gestión Académica',
  docentes:                     'Docentes',
  materias:                     'Materias',
  malla:                        'Malla Curricular',
  grupos:                       'Grupos',
  aulas:                        'Aulas',
  'incidencias-clase':          'Incidencias de Clase',
  'riesgo-academico':           'Riesgo Académico',
  'torre-control':              'Torre de Control',
  'ranking-docentes':           'Ranking Docente',
  ranking:                      'Ranking Docente',
  'salud-semestral':            'Salud del Semestre',
  'modos-examen':               'Modo Día de Examen',
  'desercion-temprana':         'Deserción Temprana',
  'mantenimiento-aulas':        'Mantenimiento de Aulas',
  cargas:                       'Cargas Académicas',
  horarios:                     'Horarios',
  builder:                      'Builder de Horarios',
  buscar:                       'Buscador de Disponibilidad',
  diagnostico:                  'Diagnóstico de Horarios',
  disponibilidad:               'Disponibilidad',
  'mi-horario':                 'Mi Horario',
  planeaciones:                 'Planeaciones',
  tutorias:                     'Tutorías',
  funciones:                    'Funciones del Personal',
  'fichas-docentes':            'Fichas Docentes',
  asistencias:                  'Asistencias',
  calificaciones:               'Captura de Calificaciones',
  captura:                      'Captura',
  estadisticas:                 'Estadísticas',
  'carga-academica':            'Carga Académica PDF',
  planeacion:                   'Mi Planeación',
  'mi-cv':                      'Mi CV',
  reinscripciones:              'Reinscripciones',
  constancias:                  'Constancias',
  'encuestas-socioeconomicas':  'Enc. Socioeconómica',
  periodos:                     'Periodos',
  carreras:                     'Carreras',
  catalogos:                    'Catálogos',
  directorio:                   'Directorio',
  usuarios:                     'Usuarios',
  permisos:                     'Permisos',
  'api-keys':                   'Exportación BI',
  configuracion:                'Configuración',
  docente:                      'Docente',
}

function Breadcrumbs({ homeUrl = '/admin' }: { homeUrl?: string }) {
  const location = useLocation()
  const segments = location.pathname.replace(/^\//, '').split('/')

  // Construye las migas acumulando el path
  const crumbs: { label: string; path: string }[] = []
  let accumulated = ''
  for (const seg of segments) {
    accumulated += '/' + seg
    const label = ROUTE_LABELS[seg]
    if (!label) {
      // Segmento dinámico (id) — lo omitimos si el anterior ya está
      if (crumbs.length) crumbs[crumbs.length - 1].label += ' — Detalle'
      continue
    }
    crumbs.push({ label, path: accumulated })
  }

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-2 px-6 py-2 border-b border-slate-200/70 bg-slate-50/70 text-xs text-slate-400">
      <Link to={homeUrl} className="text-slate-400 hover:text-[#1b396a] transition-colors flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
        </svg>
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-2">
          <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          {i === crumbs.length - 1
            ? <span className="text-[#1b396a] font-semibold tracking-tight">{c.label}</span>
            : <Link to={c.path} className="hover:text-slate-700 transition-colors font-medium text-slate-500">{c.label}</Link>
          }
        </span>
      ))}
    </nav>
  )
}

// ── Role labels ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  superadmin:              'Superadministrador',
  admin:                   'Administrador',
  director_academico:      'Director Académico',
  jefe_carrera:            'Jefe de Carrera',
  docente:                 'Docente',
  alumno:                  'Alumno',
  personal_administrativo: 'Personal Administrativo',
  control_escolar:         'Control Escolar',
  direccion_general:       'Dirección General',
  direccion_academica:     'Dirección Académica',
  subdireccion_academica:  'Subdirección Académica',
}

/** Roles con acceso total pero sin capacidad de eliminar registros. */
export const ROLES_DIRECTIVOS = [
  'control_escolar',
  'direccion_general',
  'direccion_academica',
  'subdireccion_academica',
] as const

export default function Layout({ children }: { children: ReactNode }) {
  const { user, clearAuth, activeRole, setActiveRole } = useAuthStore()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  const {
    sidebarColapsado, modoMenu, favoritos, gruposColapsados,
    set: setPrefs, toggleFavorito, toggleGrupoColapsado,
  } = usePreferenciasStore()
  const [colapsado, setColapsadoLocal] = useState(sidebarColapsado)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Ctrl/Cmd+K abre el buscador rápido desde cualquier pantalla.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const setColapsado = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(colapsado) : v
    setColapsadoLocal(next)
    setPrefs({ sidebarColapsado: next })
  }

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  // Con qué rol está navegando ahora mismo. Para alguien con un solo rol es
  // simplemente ese; para alguien con varios (p. ej. superadmin + admin + docente,
  // como Edgar), es el que eligió en el selector — así el menú muestra solo lo de
  // un "sombrero" a la vez en vez de mezclar los ítems de todos sus roles.
  // El fallback a rolPrincipal cubre el caso de que el rol guardado ya no esté
  // entre los suyos (p. ej. un admin se lo quitó), y también el aterrizaje inicial
  // tras el login — que por prioridad siempre parte de "superadmin" si lo tiene.
  const [filtroMenu, setFiltroMenu] = useState('')

  const misRoles = user?.roles ?? []
  const misPermisos = (user as { permissions?: string[] })?.permissions ?? []
  const rolActivo = (activeRole && misRoles.includes(activeRole)) ? activeRole : rolPrincipal(misRoles)
  const puedeElegirRol = misRoles.length > 1
  const homeUrl = destinoDeRol(rolActivo)

  const actuandoComoSuperadmin = rolActivo === 'superadmin'

  const navGroups = useMemo(() => {
    return NAV_GROUPS
      .map(g => ({
        ...g,
        items: g.items.filter(n => {
          if (!rolActivo) return false

          const matchRolDirecto = n.roles?.includes(rolActivo)
          const matchSuperadmin = actuandoComoSuperadmin && (!n.roles || n.roles.includes('superadmin') || n.roles.includes('admin'))

          const matchRol = matchRolDirecto || matchSuperadmin
          const matchPermiso = !n.permissions || n.permissions.some(p => misPermisos.includes(p))

          return matchRol && matchPermiso
        })
      }))
      .filter(g => g.items.length > 0)
  }, [rolActivo, actuandoComoSuperadmin, misPermisos])

  const itemsVisibles = useMemo(() => navGroups.flatMap(g => g.items), [navGroups])
  const itemsFavoritos = useMemo(() => {
    return favoritos
      .map(to => itemsVisibles.find(i => i.to === to))
      .filter((i): i is NavItem => !!i)
  }, [favoritos, itemsVisibles])

  const navGroupsConFavoritos = useMemo(() => {
    return itemsFavoritos.length > 0
      ? [{ id: 'favoritos', label: 'Favoritos', items: itemsFavoritos }, ...navGroups]
      : navGroups
  }, [itemsFavoritos, navGroups])

  const navGroupsFiltrados = useMemo(() => {
    const q = filtroMenu.trim().toLowerCase()
    if (!q) return navGroupsConFavoritos
    return navGroupsConFavoritos
      .map(g => ({
        ...g,
        items: g.items.filter(n => n.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q))
      }))
      .filter(g => g.items.length > 0)
  }, [navGroupsConFavoritos, filtroMenu])

  // ── Modo riel: un ícono por grupo, panel flotante con los enlaces del grupo
  // elegido — se abre solo, no reordena ni ensancha el resto del layout. El
  // mismo estado sirve para el desplegable de un grupo en modo "superior"
  // (barra horizontal), ya que los dos modos son mutuamente excluyentes. ──
  const location = useLocation()
  const [rielGrupoAbierto, setRielGrupoAbierto] = useState<string | null>(null)
  // Posición real de cada botón de grupo en modo "superior", para anclar su
  // desplegable con `fixed` (ver comentario junto a su render más abajo).
  const superiorBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  // Función acordeón: abre el grupo deseado y colapsa automáticamente todos los demás
  const seleccionarGrupoAcordeon = (grupoId: string) => {
    const todosLosIds = navGroups.map(g => g.id)
    const estaContraido = gruposColapsados.includes(grupoId)
    if (estaContraido) {
      const nuevosColapsados = todosLosIds.filter(id => id !== grupoId && id !== 'general' && id !== 'favoritos')
      setPrefs({ gruposColapsados: nuevosColapsados })
    } else {
      toggleGrupoColapsado(grupoId)
    }
  }

  // Al navegar a una nueva pantalla, contraer los demás grupos excepto el activo de la ruta
  useEffect(() => {
    if (filtroMenu) return
    const grupoActivo = navGroups.find(g =>
      g.items.some(i => i.to === location.pathname || (i.to !== '/admin' && location.pathname.startsWith(i.to)))
    )
    if (grupoActivo) {
      const todosLosIds = navGroups.map(g => g.id)
      const nuevosColapsados = todosLosIds.filter(id => id !== grupoActivo.id && id !== 'general' && id !== 'favoritos')
      setPrefs({ gruposColapsados: nuevosColapsados })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (modoMenu !== 'riel') return
    const grupo = navGroupsConFavoritos.find(g => g.items.some(i => i.to !== '/admin' && location.pathname.startsWith(i.to)))
    if (grupo) setRielGrupoAbierto(grupo.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, modoMenu])
  // Auto-cerrar menú móvil al navegar
  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  // Bloqueo de scroll y tecla Escape cuando el menú móvil está abierto
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    if (menuAbierto) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuAbierto])

  // Cierra cualquier desplegable de la barra superior abierto al cambiar de modo de menú.
  useEffect(() => {
    if (modoMenu !== 'superior') setRielGrupoAbierto(null)
  }, [modoMenu])
  // Grupo dueño de la ruta activa — solo para resaltar el botón correspondiente
  // en la barra superior, sin forzar la apertura de su desplegable.
  const grupoActivoId = useMemo(
    () => navGroupsConFavoritos.find(g => g.items.some(i => i.to !== '/admin' && location.pathname.startsWith(i.to)))?.id,
    [navGroupsConFavoritos, location.pathname]
  )

  // El riel siempre es angosto — logo/usuario/logout se comportan como si el
  // menú clásico estuviera contraído, sin depender del toggle de "colapsado".
  const colapsadoVisual = modoMenu === 'riel' || colapsado

  // Badge de alertas del dashboard de seguimiento de instrumentación — solo se consulta
  // si el usuario tiene acceso a esa pantalla, con caché larga para no saturar la API.
  const puedeVerSeguimiento = actuandoComoSuperadmin || (!!rolActivo && ROLES_SEGUIMIENTO_INSTRUMENTACION.includes(rolActivo))
  const { data: periodoActivo } = usePeriodoActivo()
  const { data: seguimiento } = useQuery({
    queryKey: ['seguimiento-instrumentacion-badge', periodoActivo?.id],
    queryFn: () => academicoApi.getSeguimientoPlaneaciones({ periodo_id: periodoActivo!.id }),
    enabled: puedeVerSeguimiento && !!periodoActivo?.id,
    staleTime: 1000 * 60 * 5,
  })
  const badgeSeguimiento = seguimiento
    ? seguimiento.total_atrasos + seguimiento.total_evaluaciones_vencidas
    : undefined

  // Badge de solicitudes de baja pendientes de revisar.
  const puedeVerBajas = actuandoComoSuperadmin || (!!rolActivo && ROLES_BAJAS.includes(rolActivo))
  const { data: contadorBajas } = useQuery({
    queryKey: ['bajas-pendientes-badge'],
    queryFn: () => permanenciaApi.getContadorBajasPendientes(),
    enabled: puedeVerBajas,
    staleTime: 1000 * 60 * 5,
  })
  const badgeBajas = contadorBajas?.total || undefined

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() ?? '?'

  const roleLabel = rolActivo ? (ROLE_LABEL[rolActivo] ?? rolActivo) : ''
  const { config } = useConfiguracion()

  function cambiarRol(rol: string) {
    setActiveRole(rol)
    navigate(destinoDeRol(rol))
  }

  const logoUrl = config.url_logo_principal ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Overlay móvil ── */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* ── Sidebar ──
          En modo "superior" se oculta en escritorio (md:hidden) — la navegación
          la da la barra horizontal de abajo — pero se conserva para el menú
          deslizante móvil, donde una barra superior no cabe. */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out shadow-2xl
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-none
          ${modoMenu === 'superior' ? 'md:hidden' : ''}
          ${modoMenu === 'riel' || colapsado ? 'md:w-16' : 'md:w-56'}
          w-[280px] max-w-[85vw] md:max-w-none
        `}
        style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))' }}
      >
        {/* Botón flotante colapsar — solo desktop, no aplica en modo riel (ya es angosto) */}
        {modoMenu !== 'riel' && (
          <button
            onClick={() => setColapsado(c => !c)}
            className="hidden md:flex absolute -right-3 top-[4.5rem] z-40 w-6 h-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all duration-150"
            aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${colapsado ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {/* Pleca institucional TecNM */}
        <div className="pleca-tecnm-delgada w-full shrink-0" />

        {/* Logo / Marca */}
        <div className={`pt-4 pb-4 flex items-center gap-3 shrink-0 px-4 justify-between ${colapsadoVisual ? 'md:px-4 md:justify-center' : 'md:px-5'}`}>
          <Link to={homeUrl} className={`flex items-center gap-2.5 min-w-0 ${colapsadoVisual ? 'md:justify-center' : ''}`}>
            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-8 w-8 object-contain shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#b38e5d]/40" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}
            <div className={`min-w-0 ${colapsadoVisual ? 'md:hidden' : ''}`}>
              <p className="text-white text-sm font-semibold tracking-wide truncate">{config.nombre_corto || 'ITSMT'}</p>
              <p className="text-[#d4c19c] text-[10px] font-medium leading-tight truncate">TecNM · Control Escolar</p>
            </div>
          </Link>
          {/* Cerrar en móvil (siempre visible cuando el drawer está abierto en pantallas pequeñas) */}
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 shrink-0" />

        {/* Buscador rápido interno del menú */}
        {modoMenu !== 'riel' && (
          <div className={`px-3 pt-2 pb-1 shrink-0 ${colapsadoVisual ? 'hidden md:hidden' : ''} md:${colapsadoVisual ? 'hidden' : 'block'}`}>
            <div className="relative">
              <input
                type="text"
                value={filtroMenu}
                onChange={e => setFiltroMenu(e.target.value)}
                placeholder="Filtrar menú..."
                className="w-full bg-white/10 text-white placeholder-slate-400 text-[11px] rounded-lg pl-7 pr-6 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
              {filtroMenu && (
                <button
                  onClick={() => setFiltroMenu('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        {modoMenu === 'riel' ? (
          <>
            {/* Riel desktop (solo en escritorio md+) */}
            <nav className="hidden md:flex flex-1 py-3 px-1.5 overflow-y-auto overflow-x-hidden space-y-1 flex-col">
              {navGroupsFiltrados.map((g) => {
                const GrupoIcon = g.id === 'favoritos' ? IconStar : (GROUP_ICONS[g.id] ?? (ICONS[g.items[0]?.to] ?? IconTag))
                const abierto = rielGrupoAbierto === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setRielGrupoAbierto(prev => (prev === g.id ? null : g.id))}
                    title={g.label || 'Panel'}
                    aria-expanded={abierto}
                    className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                      abierto ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
                    }`}
                  >
                    <GrupoIcon />
                  </button>
                )
              })}
            </nav>

            {/* En móvil, mostrar lista completa con etiquetas de texto */}
            <nav className="md:hidden flex-1 py-3 px-2 overflow-y-auto space-y-4">
              {navGroupsFiltrados.map((g) => {
                const contraido = !filtroMenu && g.id !== 'favoritos' && g.id !== 'general' && gruposColapsados.includes(g.id)
                const GrupoHeaderIcon = g.id === 'favoritos' ? IconStar : (GROUP_ICONS[g.id] ?? (ICONS[g.items[0]?.to] ?? IconTag))
                return (
                  <div key={g.id}>
                    {g.label && (
                      g.id === 'favoritos' ? (
                        <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-amber-300/80 select-none flex items-center gap-1.5">
                          <GrupoHeaderIcon />
                          {g.label}
                        </p>
                      ) : (
                        <button
                          onClick={() => seleccionarGrupoAcordeon(g.id)}
                          className="w-full flex items-center justify-between px-3 mb-1 group/grupo"
                          aria-expanded={!contraido}
                        >
                          <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 select-none group-hover/grupo:text-slate-200 transition-colors flex items-center gap-1.5">
                            <GrupoHeaderIcon />
                            {g.label}
                          </span>
                          <svg className={`w-3 h-3 text-slate-500 group-hover/grupo:text-slate-300 transition-transform ${contraido ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                          </svg>
                        </button>
                      )
                    )}
                    {!contraido && (
                      <div className="space-y-0.5">
                        {g.items.map((n) => (
                          <NavItem key={n.to} n={n} colapsado={false} onClose={() => setMenuAbierto(false)}
                            favorito={favoritos.includes(n.to)}
                            onToggleFavorito={() => toggleFavorito(n.to)}
                            badge={
                              n.to === '/admin/gestion-academica/seguimiento-instrumentacion' ? badgeSeguimiento :
                              n.to === '/admin/bajas' ? badgeBajas :
                              undefined
                            } />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </>
        ) : (
          <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-3">
            {navGroupsFiltrados.map((g) => {
              const contraido = !filtroMenu && g.id !== 'favoritos' && g.id !== 'general' && gruposColapsados.includes(g.id)
              const GrupoHeaderIcon = g.id === 'favoritos' ? IconStar : (GROUP_ICONS[g.id] ?? (ICONS[g.items[0]?.to] ?? IconTag))
              const esGrupoActivo = g.items.some(i => i.to === location.pathname || (i.to !== '/admin' && location.pathname.startsWith(i.to)))
              return (
                <div key={g.id} className="rounded-xl transition-colors">
                  {g.label && (
                    g.id === 'favoritos' ? (
                      <p className={`px-2.5 py-1 mb-1 text-[10px] font-bold tracking-wider uppercase text-amber-300 select-none flex items-center gap-1.5 ${colapsadoVisual ? 'hidden md:hidden' : ''} md:${colapsadoVisual ? 'hidden' : 'flex'}`}>
                        <GrupoHeaderIcon />
                        {g.label}
                      </p>
                    ) : (
                      <button
                        onClick={() => seleccionarGrupoAcordeon(g.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg mb-1 group/grupo transition-all ${
                          colapsadoVisual ? 'hidden md:hidden' : ''
                        } md:${colapsadoVisual ? 'hidden' : 'flex'} ${
                          esGrupoActivo
                            ? 'bg-white/15 text-white font-bold border-l-2 border-amber-400'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                        aria-expanded={!contraido}
                      >
                        <span className="text-[10px] font-bold tracking-wider uppercase select-none flex items-center gap-2">
                          <span className={esGrupoActivo ? 'text-amber-400' : 'text-slate-400 group-hover/grupo:text-slate-200'}>
                            <GrupoHeaderIcon />
                          </span>
                          {g.label}
                          {esGrupoActivo && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Sección activa" />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
                            {g.items.length}
                          </span>
                          <svg className={`w-3.5 h-3.5 text-slate-500 group-hover/grupo:text-slate-300 transition-transform ${contraido ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                    )
                  )}
                  {g.label && colapsadoVisual && (
                    <div className="hidden md:block mx-3 mb-1 h-px bg-white/10" />
                  )}
                  {!contraido && (
                    <div className={`space-y-0.5 ${colapsadoVisual ? '' : 'ml-2.5 pl-2.5 border-l-2'} ${esGrupoActivo ? 'border-amber-400/40' : 'border-white/10'}`}>
                      {g.items.map((n) => (
                        <div key={n.to}>
                          {/* Desktop view */}
                          <div className="hidden md:block">
                            <NavItem n={n} colapsado={colapsado} onClose={() => setMenuAbierto(false)}
                              favorito={favoritos.includes(n.to)}
                              onToggleFavorito={() => toggleFavorito(n.to)}
                              badge={
                                n.to === '/admin/gestion-academica/seguimiento-instrumentacion' ? badgeSeguimiento :
                                n.to === '/admin/bajas' ? badgeBajas :
                                undefined
                              } />
                          </div>
                          {/* Mobile drawer view (siempre desplegado) */}
                          <div className="md:hidden">
                            <NavItem n={n} colapsado={false} onClose={() => setMenuAbierto(false)}
                              favorito={favoritos.includes(n.to)}
                              onToggleFavorito={() => toggleFavorito(n.to)}
                              badge={
                                n.to === '/admin/gestion-academica/seguimiento-instrumentacion' ? badgeSeguimiento :
                                n.to === '/admin/bajas' ? badgeBajas :
                                undefined
                              } />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        )}

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 shrink-0" />

        {/* User + colapsar */}
        <div className={`py-4 shrink-0 px-4 ${colapsadoVisual ? 'md:px-2' : 'md:px-4'}`}>
          <div className={`flex items-center gap-3 mb-4 ${colapsadoVisual ? 'hidden md:hidden' : ''} md:${colapsadoVisual ? 'hidden' : 'flex'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ring-2 ring-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate leading-tight">{user?.name}</p>
              {puedeElegirRol ? (
                <select
                  value={rolActivo ?? ''}
                  onChange={e => cambiarRol(e.target.value)}
                  className="w-full mt-1 bg-white/10 text-[11px] text-slate-200 rounded px-1.5 py-0.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
                >
                  {misRoles.map(r => (
                    <option key={r} value={r} className="text-slate-900">{ROLE_LABEL[r] ?? r}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">{roleLabel}</p>
              )}
              {user?.roles.includes('jefe_carrera') && user.carrera && typeof user.carrera === 'object' && (
                <p className="text-[10px] text-blue-300 truncate mt-0.5 leading-tight font-medium">
                  {user.carrera.clave} — {user.carrera.nombre}
                </p>
              )}
            </div>
          </div>

          <div className="relative group/logout mb-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100 bg-white/5 hover:bg-white/10 rounded-lg py-2.5 transition-all duration-150 justify-center ${colapsadoVisual ? 'md:px-0' : 'px-3'}`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
              </svg>
              <span className={colapsadoVisual ? 'md:hidden' : ''}>Cerrar sesión</span>
            </button>
            {colapsadoVisual && (
              <div className="hidden md:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium shadow-lg
                opacity-0 scale-95 group-hover/logout:opacity-100 group-hover/logout:scale-100
                transition-all duration-150">
                Cerrar sesión
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </div>

          {/* Buscador rápido — Ctrl/Cmd+K o clic */}
          <div className="relative group/palette">
            <button
              onClick={() => setPaletteOpen(true)}
              className={`flex w-full items-center gap-2 text-xs text-slate-500 hover:text-slate-300 rounded-lg py-2 px-2 transition-colors ${colapsadoVisual ? 'md:justify-center' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
              <span className={`flex-1 flex items-center justify-between ${colapsadoVisual ? 'md:hidden' : ''}`}>
                Buscar
                <kbd className="text-[9px] text-slate-600 border border-white/10 rounded px-1 py-0.5">⌘K</kbd>
              </span>
            </button>
            {colapsadoVisual && (
              <div className="hidden md:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium shadow-lg
                opacity-0 scale-95 group-hover/palette:opacity-100 group-hover/palette:scale-100
                transition-all duration-150">
                Buscar (Ctrl/Cmd+K)
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </div>

          {/* Preferencias */}
          <div className="relative group/prefs">
            <button
              onClick={() => setPrefsOpen(p => !p)}
              className={`flex w-full items-center gap-2 text-xs text-slate-500 hover:text-slate-300 rounded-lg py-2 px-2 transition-colors ${colapsadoVisual ? 'md:justify-center' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className={colapsadoVisual ? 'md:hidden' : ''}>Preferencias</span>
            </button>
            {colapsadoVisual && (
              <div className="hidden md:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium shadow-lg
                opacity-0 scale-95 group-hover/prefs:opacity-100 group-hover/prefs:scale-100
                transition-all duration-150">
                Preferencias
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Panel flotante del grupo elegido en modo riel — fuera del <aside> por la
          misma razón que el panel de preferencias (ver comentario abajo): el
          `transform` del <aside> lo volvería relativo a él, no al viewport, y
          `right-0`/`h-full` colapsarían a 0. Ambos elementos usan `fixed` con un
          `left` fijo en vez de `absolute`, ya que en modo riel el <aside> siempre
          mide exactamente 4rem (md:w-16). */}
      {modoMenu === 'riel' && rielGrupoAbierto && (() => {
        const grupo = navGroupsConFavoritos.find(g => g.id === rielGrupoAbierto)
        if (!grupo) return null
        return (
          <>
            <div className="fixed left-16 right-0 top-0 bottom-0 z-30" onClick={() => setRielGrupoAbierto(null)} />
            <div
              className="fixed top-0 left-16 h-screen w-60 z-40 shadow-2xl border-l border-white/10 overflow-y-auto py-3 px-2"
              style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))' }}
            >
              {grupo.label && (
                <p className={`px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase select-none ${grupo.id === 'favoritos' ? 'text-amber-300/80' : 'text-slate-500'}`}>
                  {grupo.label}
                </p>
              )}
              <div className="space-y-0.5">
                {grupo.items.map((n) => (
                  <NavItem key={n.to} n={n} colapsado={false} onClose={() => { setMenuAbierto(false); setRielGrupoAbierto(null) }}
                    favorito={favoritos.includes(n.to)}
                    onToggleFavorito={() => toggleFavorito(n.to)}
                    badge={
                      n.to === '/admin/gestion-academica/seguimiento-instrumentacion' ? badgeSeguimiento :
                      n.to === '/admin/bajas' ? badgeBajas :
                      undefined
                    } />
                ))}
              </div>
            </div>
          </>
        )
      })()}

      {/* Panel de preferencias — fuera del <aside> (que tiene `transform`, lo que
          convertiría este modal `fixed` en relativo a ese contenedor en vez de al
          viewport completo) para que quede centrado en toda la pantalla. */}
      <PreferenciasPanel open={prefsOpen} onClose={() => setPrefsOpen(false)} />

      {/* Buscador rápido (Ctrl/Cmd+K) — salta directo a cualquier pantalla sin
          importar en qué grupo del menú esté. */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={navGroupsConFavoritos} />

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Banner de Aviso Global en tiempo real */}
        <BroadcastBanner
          mensaje={config.aviso_banner_mensaje ?? ''}
          tipo={config.aviso_banner_tipo ?? 'warning'}
          activa={!!config.aviso_banner_activo && !!config.aviso_banner_mensaje}
        />
        {/* Barra superior (modo "superior", solo escritorio) — reemplaza al <aside>
            para quien está acostumbrado a un menú horizontal con desplegables por
            sección, en vez de un panel lateral. */}
        {modoMenu === 'superior' && (
          <header className="hidden md:flex items-center gap-1 border-b border-slate-200 bg-white px-3 h-14 shrink-0 relative z-20">
            <Link to={homeUrl} className="flex items-center gap-2 pr-3 mr-1 border-r border-slate-200 shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={config.nombre_corto} className="h-7 w-7 object-contain shrink-0" />
              ) : (
                <div className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}>
                  {(config.nombre_corto ?? 'IT').slice(0, 2)}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-800 hidden lg:inline truncate max-w-[9rem]">{config.nombre_corto}</span>
            </Link>

            <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 h-full">
              {navGroupsConFavoritos.map((g) => {
                const abierto = rielGrupoAbierto === g.id
                const activo = grupoActivoId === g.id
                const GrupoIcon = g.id === 'favoritos' ? IconStar : (ICONS[g.items[0]?.to] ?? IconTag)
                return (
                  <div key={g.id} className="shrink-0 h-full flex items-center">
                    <button
                      ref={el => { superiorBtnRefs.current[g.id] = el }}
                      onClick={() => setRielGrupoAbierto(prev => (prev === g.id ? null : g.id))}
                      aria-expanded={abierto}
                      className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        abierto
                          ? 'bg-slate-100 text-slate-900'
                          : activo
                            ? 'text-slate-900 bg-slate-50'
                            : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`shrink-0 ${g.id === 'favoritos' ? 'text-amber-500' : ''}`}><GrupoIcon /></span>
                      {g.label || 'Panel'}
                      <svg className={`w-3 h-3 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </nav>

            {/* Desplegable del grupo elegido — deliberadamente FUERA de <nav>: ese
                <nav> tiene overflow-x-auto para poder desplazarse cuando hay muchos
                grupos, y por la especificación de CSS un overflow-x distinto de
                "visible" fuerza también overflow-y a "auto" en el mismo elemento
                (no se puede tener solo un eje con scroll). Eso recortaba el panel en
                cuanto se extendía más abajo del alto de la barra — se abría (el
                estado cambiaba, la flecha giraba) pero nunca se veía. Al vivir aquí,
                fuera de esa caja, ya no lo recorta; se posiciona con `fixed` usando
                la posición real del botón (igual que el tooltip de NavItem cuando
                el menú clásico está contraído). */}
            {rielGrupoAbierto && (() => {
              const grupo = navGroupsConFavoritos.find(g => g.id === rielGrupoAbierto)
              const rect = superiorBtnRefs.current[rielGrupoAbierto]?.getBoundingClientRect()
              if (!grupo || !rect) return null
              return (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setRielGrupoAbierto(null)} />
                  <div
                    className="fixed w-64 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl border border-white/10 py-2 px-2 z-40"
                    style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))', top: rect.bottom + 6, left: rect.left }}
                  >
                    {grupo.label && (
                      <p className={`px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase select-none ${grupo.id === 'favoritos' ? 'text-amber-300/80' : 'text-slate-500'}`}>
                        {grupo.label}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {grupo.items.map((n) => (
                        <NavItem key={n.to} n={n} colapsado={false} onClose={() => setRielGrupoAbierto(null)}
                          favorito={favoritos.includes(n.to)}
                          onToggleFavorito={() => toggleFavorito(n.to)}
                          badge={
                            n.to === '/admin/gestion-academica/seguimiento-instrumentacion' ? badgeSeguimiento :
                            n.to === '/admin/bajas' ? badgeBajas :
                            undefined
                          } />
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}

            <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-200 shrink-0">
              <button
                onClick={() => setPaletteOpen(true)}
                title="Buscar (Ctrl/Cmd+K)"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
              </button>
              <button
                onClick={() => setPrefsOpen(p => !p)}
                title="Preferencias"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <NotificationBell />
              {puedeElegirRol && (
                <select
                  value={rolActivo ?? ''}
                  onChange={e => cambiarRol(e.target.value)}
                  className="text-xs text-slate-600 border border-slate-200 rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-300 cursor-pointer max-w-[8rem]"
                >
                  {misRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                  ))}
                </select>
              )}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ml-0.5" style={{ backgroundColor: 'var(--color-primario, #1b396a)' }} title={user?.name}>
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                </svg>
              </button>
            </div>
          </header>
        )}

        {/* Topbar móvil */}
        <header className="md:hidden sticky top-0 z-10 border-b border-white/8 px-4 py-3 flex items-center justify-between shrink-0" style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))' }}>
          <div className="pleca-tecnm-delgada absolute top-0 left-0 right-0" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-white tracking-wider">SICE · TecNM</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <Breadcrumbs homeUrl={homeUrl} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
