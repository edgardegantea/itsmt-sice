import type { CompetenciaEspecifica, SemanaCalendarizacion, NivelDesempeno, FuenteInformacion } from '../services/academico'

// Catálogo oficial TecNM-AC-PO-003 §4.6 — Desarrollo de competencias genéricas.
export const COMPETENCIAS_INSTRUMENTALES = [
  'Capacidad de análisis y síntesis',
  'Capacidad de organizar y planificar',
  'Conocimientos generales básicos',
  'Conocimientos básicos de la carrera',
  'Comunicación oral y escrita en su propia lengua',
  'Conocimiento de una segunda lengua',
  'Habilidades básicas de manejo de la computadora',
  'Habilidades de gestión de información',
  'Solución de problemas',
  'Toma de decisiones',
]

export const COMPETENCIAS_INTERPERSONALES = [
  'Capacidad crítica y autocrítica',
  'Trabajo en equipo',
  'Habilidades interpersonales',
  'Capacidad de trabajar en equipo interdisciplinario',
  'Capacidad de comunicarse con profesionales de otras áreas',
  'Apreciación de la diversidad y multiculturalidad',
  'Habilidad para trabajar en un ambiente laboral',
  'Compromiso ético',
]

export const COMPETENCIAS_SISTEMICAS = [
  'Capacidad de aplicar los conocimientos en la práctica',
  'Habilidades de investigación',
  'Capacidad de aprender',
  'Capacidad de adaptarse a nuevas situaciones',
  'Capacidad de generar nuevas ideas (creatividad)',
  'Liderazgo',
  'Conocimiento de culturas y costumbres de otros países',
  'Habilidad para trabajar en forma autónoma',
  'Capacidad para diseñar y gestionar proyectos',
  'Iniciativa y espíritu emprendedor',
  'Preocupación por la calidad',
  'Búsqueda del logro',
]

// Catálogo institucional de apoyos didácticos disponibles — el docente puede seleccionar
// varios y, si el que necesita no está en la lista, agregarlo como personalizado (queda
// disponible para las demás unidades de la misma planeación).
export const APOYOS_DIDACTICOS_CATALOGO = [
  'Presentaciones digitales',
  'Videos',
  'Material bibliográfico',
  'Curso en plataforma Moodle',
  'Pizarrón',
  'Proyector / cañón',
  'Guías de laboratorio',
  'Software especializado',
  'Simuladores',
  'Banco de ejercicios',
  'Rúbricas y listas de cotejo',
]

export const NIVELES_DESEMPENO_FIJOS: NivelDesempeno[] = ['Excelente', 'Notable', 'Bueno', 'Suficiente', 'Insuficiente']

// Rangos numéricos estándar institucionales por nivel de desempeño (fijos, no varían por docente).
export const NIVEL_RANGO: Record<NivelDesempeno, string> = {
  Excelente: '95-100',
  Notable: '85-94',
  Bueno: '75-84',
  Suficiente: '70-74',
  Insuficiente: '<70',
}

export const TOTAL_SEMANAS = 16

export function semanasVacias(): SemanaCalendarizacion[] {
  return Array.from({ length: TOTAL_SEMANAS }, (_, i) => ({
    semana: i + 1,
    tipo_evaluacion: '' as const,
    tp: false,
    tr: false,
    sd: false,
  }))
}

/** Forma en la que puede venir una competencia específica guardada antes de este cambio,
 * cuando "temas y subtemas"/"actividades" eran texto libre en vez de filas estructuradas. */
type CompetenciaLegacy = Partial<CompetenciaEspecifica> & {
  numero: number
  temas_subtemas?: string
  actividades_aprendizaje?: string
  actividades_ensenanza?: string
  horas_teoricas?: number | null
  horas_practicas?: number | null
}

/** Forma en la que pudo guardarse una fuente de información antes de capturarse por
 * formulario tipado (solo texto libre + tipo genérico Impresa/Electrónica). */
export type FuenteLegacy = Omit<Partial<FuenteInformacion>, 'tipo'> & { fuente?: string; tipo?: string }

/** Normaliza una fuente de información leída de la BD al esquema tipado actual —
 * si ya viene con `titulo` se conserva tal cual; si viene en la forma vieja
 * (`fuente` + tipo genérico) se migra a `titulo` y se mapea el tipo a uno de los
 * 4 tipos actuales (impreso/artículo/sitio_web/digital). */
export function normalizarFuente(f: FuenteLegacy): FuenteInformacion {
  if (f.titulo != null) {
    return { ...f, tipo: (f.tipo as FuenteInformacion['tipo']) ?? '', titulo: f.titulo }
  }
  return {
    tipo: (f.tipo === 'Impresa' ? 'impreso' : f.tipo === 'Electrónica' ? 'sitio_web' : '') as FuenteInformacion['tipo'],
    titulo: f.fuente ?? '',
  }
}

export const TIPO_FUENTE_LABEL: Record<FuenteInformacion['tipo'], string> = {
  '': 'Sin tipo',
  impreso: 'Libro impreso',
  articulo: 'Artículo',
  sitio_web: 'Sitio web',
  digital: 'Recurso digital',
}

/** Arma una cita corta y legible para una fuente de información, combinando solo los
 * campos capturados (autor, título, editorial/revista, año, url, etc.) según su tipo —
 * usado tanto en la lista del editor como en la vista de solo lectura de revisión. */
export function citarFuente(f: FuenteInformacion): string {
  const partes: string[] = []
  if (f.autor) partes.push(f.autor)
  if (f.titulo) partes.push(f.titulo)
  if (f.tipo === 'impreso') {
    if (f.editorial) partes.push(f.editorial)
    if (f.edicion) partes.push(f.edicion)
    if (f.ciudad) partes.push(f.ciudad)
    if (f.isbn) partes.push(`ISBN ${f.isbn}`)
  } else if (f.tipo === 'articulo') {
    if (f.revista) partes.push(f.revista)
    if (f.volumen) partes.push(`vol. ${f.volumen}`)
    if (f.paginas) partes.push(`pp. ${f.paginas}`)
    if (f.doi) partes.push(`DOI ${f.doi}`)
  } else if (f.tipo === 'sitio_web' || f.tipo === 'digital') {
    if (f.plataforma) partes.push(f.plataforma)
    if (f.url) partes.push(f.url)
    if (f.fecha_consulta) partes.push(`consultado ${f.fecha_consulta}`)
  }
  if (f.anio) partes.push(f.anio)
  return partes.filter(Boolean).join(', ') || 'Fuente sin datos'
}

/** Normaliza una competencia específica leída de la BD (puede venir de un esquema
 * anterior, sin nombre_unidad/fuentes_informacion/apoyos_didacticos/practicas, con
 * matriz_evaluacion/niveles_desempeno en la forma vieja, o con temas_subtemas/actividades
 * como texto libre en vez de filas estructuradas) rellenando los campos que falten con
 * valores por defecto, para que el editor no truene con datos ya guardados. */
export function normalizarCompetencia(c: CompetenciaLegacy): CompetenciaEspecifica {
  const base = nuevaCompetencia(c.numero)

  const subtemas = Array.isArray(c.subtemas) && c.subtemas.length > 0
    ? c.subtemas.map(s => ({ texto: s?.texto ?? '', fila: s?.fila ?? null }))
    : (c.temas_subtemas ? c.temas_subtemas.split('\n').map(t => t.trim()).filter(Boolean).map(texto => ({ texto, fila: 1 })) : [])

  const actividades = Array.isArray(c.actividades) && c.actividades.length > 0
    ? c.actividades.map((a, i) => ({
        numero: a?.numero ?? i + 1,
        actividad_ensenanza: a?.actividad_ensenanza ?? '',
        actividad_aprendizaje: a?.actividad_aprendizaje ?? '',
        horas_teoricas: a?.horas_teoricas ?? null,
        horas_practicas: a?.horas_practicas ?? null,
      }))
    : (c.actividades_aprendizaje || c.actividades_ensenanza || c.horas_teoricas != null || c.horas_practicas != null
        ? [{
            numero: 1,
            actividad_ensenanza: c.actividades_ensenanza ?? '',
            actividad_aprendizaje: c.actividades_aprendizaje ?? '',
            horas_teoricas: c.horas_teoricas ?? null,
            horas_practicas: c.horas_practicas ?? null,
          }]
        : [])

  return {
    ...base,
    ...c,
    nombre_unidad: c.nombre_unidad ?? '',
    porcentaje: c.porcentaje ?? null,
    subtemas,
    actividades,
    indicadores_alcance: c.indicadores_alcance ?? [],
    niveles_desempeno: c.niveles_desempeno?.length === base.niveles_desempeno.length
      ? c.niveles_desempeno.map((n, i) => ({ nivel: base.niveles_desempeno[i].nivel, indicadores: n?.indicadores ?? '' }))
      : base.niveles_desempeno,
    matriz_evaluacion: (c.matriz_evaluacion ?? []).map(f => ({
      evidencia: f?.evidencia ?? '',
      porcentaje: f?.porcentaje ?? null,
      indicadores: Array.isArray(f?.indicadores) ? f.indicadores : [],
      evaluacion_formativa: f?.evaluacion_formativa ?? '',
    })),
    fuentes_informacion: Array.isArray(c.fuentes_informacion) ? c.fuentes_informacion.map(normalizarFuente) : [],
    apoyos_didacticos: Array.isArray(c.apoyos_didacticos) ? c.apoyos_didacticos : [],
    practicas: Array.isArray(c.practicas) ? c.practicas : [],
    dosificacion: Array.isArray(c.dosificacion) ? c.dosificacion : [],
  }
}

export function nuevaCompetencia(numero: number): CompetenciaEspecifica {
  return {
    numero,
    nombre_unidad: '',
    porcentaje: null,
    descripcion: '',
    subtemas: [],
    actividades: [],
    competencias_genericas: [],
    indicadores_alcance: [],
    niveles_desempeno: NIVELES_DESEMPENO_FIJOS.map(nivel => ({ nivel, indicadores: '' })),
    matriz_evaluacion: [],
    fuentes_informacion: [],
    apoyos_didacticos: [],
    practicas: [],
    dosificacion: [],
  }
}
