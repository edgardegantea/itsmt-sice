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
import {
  Activity,
  AlarmClock,
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BadgeCheck,
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Contact,
  Database,
  Equal,
  FileBadge,
  FileBarChart,
  FileCheck2,
  FileClock,
  FileSignature,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  GraduationCap,
  HandCoins,
  HandHelping,
  Handshake,
  HeartHandshake,
  History,
  Home,
  IdCard,
  Inbox,
  KeyRound,
  Landmark,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  LineChart,
  ListChecks,
  LogOut,
  Medal,
  Megaphone,
  Menu,
  MessagesSquare,
  MonitorCheck,
  MonitorPlay,
  Newspaper,
  NotebookPen,
  PenLine,
  PieChart,
  Plane,
  Plug,
  Presentation,
  RefreshCcw,
  Repeat,
  Scale,
  School,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Sun,
  Target,
  Trophy,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react'

const ROLES_SEGUIMIENTO_INSTRUMENTACION = ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'subdireccion_academica', 'desarrollo_academico']
const ROLES_BAJAS = ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera']

// ── Íconos (lucide-react) ─────────────────────────────────────────────────────
// Un solo set de trazo uniforme para todo el menú. Cada pantalla tiene un ícono
// propio que describe su función; los grupos usan un ícono representativo.

// Envuelve un ícono de lucide con el tamaño y trazo institucional del menú,
// conservando la firma `() => JSX` que usan NavItem y los encabezados de grupo.
function navIcon(Icono: LucideIcon) {
  return function NavIcon() {
    return <Icono className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
  }
}

const IconDashboard = navIcon(LayoutDashboard)
const IconStar      = navIcon(Star)
const IconTag       = navIcon(Circle)

const ICONS: Record<string, () => React.JSX.Element> = {
  // General
  '/admin':                                   IconDashboard,
  '/jefe-carrera/dashboard':                  navIcon(Gauge),
  '/comunicados':                             navIcon(Megaphone),
  '/comunicados/oficio-circular':             navIcon(FileSignature),
  '/admin/directorio':                        navIcon(Contact),
  // Control escolar y alumnos
  '/admin/aspirantes':                        navIcon(UserPlus),
  '/admin/alumnos':                           navIcon(GraduationCap),
  '/admin/reinscripciones':                   navIcon(RefreshCcw),
  '/admin/bajas':                             navIcon(UserMinus),
  '/admin/reportes/altas-bajas':              navIcon(ArrowLeftRight),
  '/admin/constancias':                       navIcon(FileBadge),
  '/admin/encuestas-socioeconomicas':         navIcon(ClipboardList),
  '/admin/carga-academica':                   navIcon(FileText),
  '/admin/alertas-baja-definitiva':           navIcon(AlertTriangle),
  '/gestion-academica/alertas-corte-captura': navIcon(AlarmClock),
  '/admin/libro-registro-nc':                 navIcon(BookMarked),
  '/admin/egresados':                         navIcon(Award),
  '/admin/calendario-escolar':                navIcon(CalendarDays),
  '/admin/finanzas/estado-cuenta':            navIcon(Wallet),
  '/admin/becas':                             navIcon(HandCoins),
  // Gestión académica
  '/admin/planeacion/asignaciones':           navIcon(ListChecks),
  '/admin/planeacion/instrumentaciones':      navIcon(NotebookPen),
  '/admin/gestion-academica/planeaciones':    navIcon(FileCheck2),
  '/admin/gestion-academica/seguimiento-instrumentacion': navIcon(Activity),
  '/desarrollo-academico/instrumentaciones':  navIcon(NotebookPen),
  '/desarrollo-academico/planeaciones':       navIcon(FileCheck2),
  '/admin/gestion-academica':                 navIcon(School),
  '/docente/calificaciones':                  navIcon(PenLine),
  '/docente/asistencias':                     navIcon(CalendarCheck),
  '/admin/gestion-academica/calificaciones':  navIcon(PenLine),
  '/admin/gestion-academica/asistencias':     navIcon(CalendarCheck),
  '/docente/planeacion':                      navIcon(NotebookPen),
  '/docente/mi-cv':                           navIcon(IdCard),
  '/docente/mi-horario':                      navIcon(Clock),
  '/docente/disponibilidad':                  navIcon(CalendarClock),
  '/admin/calidad/actividades-complementarias': navIcon(Trophy),
  '/admin/calidad/evaluacion-docente/resultados': navIcon(BarChart3),
  '/admin/evaluacion-docente-ampliada':       navIcon(ClipboardCheck),
  '/admin/calidad-iso':                       navIcon(BadgeCheck),
  '/admin/investigacion':                     navIcon(FlaskConical),
  '/admin/pit/asignaciones':                  navIcon(Users),
  '/docente/pit/sesiones':                    navIcon(MessagesSquare),
  '/docente/pit/pat':                         navIcon(Target),
  '/admin/indicadores/tutoria':               navIcon(HeartHandshake),
  // Vinculación y titulación
  '/admin/vinculacion/servicio-social':       navIcon(HandHelping),
  '/admin/vinculacion/solicitudes-rp':        navIcon(Inbox),
  '/admin/vinculacion/residencias':           navIcon(Building2),
  '/admin/vinculacion/asesorias-rp':          navIcon(Presentation),
  '/admin/titulacion/certificados-idioma':    navIcon(Languages),
  '/admin/titulacion/acto-protocolario':      navIcon(GraduationCap),
  '/admin/titulacion/salida-lateral':         navIcon(LogOut),
  '/bolsa-trabajo':                           navIcon(Briefcase),
  // Personal, trámites y movilidad
  '/admin/personal/solicitudes':              navIcon(CalendarX2),
  '/admin/personal/comisiones':               navIcon(Plane),
  '/admin/capacitacion/cursos':               navIcon(BookOpen),
  '/docente/capacitacion':                    navIcon(BookOpen),
  '/admin/traslados':                         navIcon(Repeat),
  '/admin/convalidaciones':                   navIcon(Scale),
  '/admin/equivalencias':                     navIcon(Equal),
  '/admin/convenios-movilidad':               navIcon(Handshake),
  '/admin/movilidad-estudiantil':             navIcon(Globe2),
  '/admin/cursos-verano':                     navIcon(Sun),
  '/admin/educacion-distancia/programas':     navIcon(MonitorPlay),
  '/admin/educacion-distancia/seguimiento':   navIcon(MonitorCheck),
  '/admin/plazas-sindicales':                 navIcon(Landmark),
  '/admin/permisos-sindicales':               navIcon(FileClock),
  '/admin/concursos-oposicion':               navIcon(Medal),
  '/admin/convocatorias':                     navIcon(Newspaper),
  '/biblioteca':                              navIcon(Library),
  // Analítica y reportes
  '/admin/analitica/indicadores':             navIcon(LineChart),
  '/admin/indicadores/asistencia':            navIcon(PieChart),
  '/admin/reportes/directivos':               navIcon(FileBarChart),
  '/admin/auditoria':                         navIcon(History),
  '/admin/incidentes-seguridad':              navIcon(ShieldAlert),
  // Administración y sistema
  '/admin/usuarios':                          navIcon(UserCog),
  '/admin/permisos':                          navIcon(KeyRound),
  '/admin/api-keys':                          navIcon(Plug),
  '/admin/periodos':                          navIcon(CalendarRange),
  '/admin/carreras':                          navIcon(Layers),
  '/admin/catalogos':                         navIcon(Database),
  '/admin/infraestructura':                   navIcon(Warehouse),
  '/admin/configuracion':                     navIcon(Settings),
  '/seguridad/mi-cuenta':                     navIcon(ShieldCheck),
}

const GROUP_ICONS: Record<string, () => React.JSX.Element> = {
  general:           IconDashboard,
  alumnos:           navIcon(GraduationCap),
  academica:         navIcon(BookOpenCheck),
  vinculacion:       navIcon(Handshake),
  tramites_personal: navIcon(BriefcaseBusiness),
  analitica:         navIcon(BarChart3),
  administracion:    navIcon(Settings2),
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
          <Star className="w-3.5 h-3.5" strokeWidth={1.75} fill={favorito ? 'currentColor' : 'none'} aria-hidden="true" />
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
      <Link to={homeUrl} className="text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" strokeWidth={2} aria-label="Inicio" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" strokeWidth={2} aria-hidden="true" />
          {i === crumbs.length - 1
            ? <span className="text-brand-600 font-semibold tracking-tight">{c.label}</span>
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
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${colapsado ? 'rotate-180' : ''}`} strokeWidth={2.5} aria-hidden="true" />
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
            <X className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
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
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} aria-hidden="true" />
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
                          <ChevronDown className={`w-3 h-3 text-slate-500 group-hover/grupo:text-slate-300 transition-transform ${contraido ? '-rotate-90' : ''}`} strokeWidth={2.5} aria-hidden="true" />
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
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 group-hover/grupo:text-slate-300 transition-transform ${contraido ? '-rotate-90' : ''}`} strokeWidth={2.5} aria-hidden="true" />
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
                <p className="text-[10px] text-brand-300 truncate mt-0.5 leading-tight font-medium">
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
              <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
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
              <Search className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
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
              <SlidersHorizontal className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
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
          <header className="hidden md:flex items-center gap-1 border-b border-slate-200 bg-white px-3 h-14 shrink-0 relative z-40">
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
                const GrupoIcon = g.id === 'favoritos' ? IconStar : (GROUP_ICONS[g.id] ?? (ICONS[g.items[0]?.to] ?? IconTag))
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
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} strokeWidth={2.5} aria-hidden="true" />
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
                <Search className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                onClick={() => setPrefsOpen(p => !p)}
                title="Preferencias"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
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
                <LogOut className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
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
              <Menu className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-white tracking-wider">SICE · TecNM</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Encabezado institucional (escritorio, menú lateral o riel): identifica la
            dependencia y el plantel como en los portales del TecNM, y da lugar fijo a
            las notificaciones, que en este modo no tenían sitio en pantalla. */}
        {modoMenu !== 'superior' && (
          <header className="hidden md:flex items-center justify-between gap-4 h-14 px-6 bg-white border-b border-slate-200 shrink-0 relative">
            <div className="flex items-center gap-3 min-w-0">
              {config.url_logo_secundario && (
                <>
                  <img src={config.url_logo_secundario} alt={config.dependencia ?? 'TecNM'} className="h-8 w-auto object-contain shrink-0" />
                  <span className="h-8 w-px bg-slate-200 shrink-0" aria-hidden="true" />
                </>
              )}
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gris-tecnm)] truncate">
                  {config.dependencia || 'Tecnológico Nacional de México'}
                </p>
                <p className="text-sm font-semibold text-[var(--color-primario)] truncate">{config.nombre_institucion}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {periodoActivo?.nombre && (
                <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full badge-tecnm-dorado">
                  <CalendarRange className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                  {periodoActivo.nombre}
                </span>
              )}
              <NotificationBell />
            </div>
            <div className="pleca-tecnm-delgada absolute left-0 right-0 bottom-0" aria-hidden="true" />
          </header>
        )}

        <Breadcrumbs homeUrl={homeUrl} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
