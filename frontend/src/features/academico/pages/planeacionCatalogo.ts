import type { CompetenciaEspecifica, SubtemaActividad, SemanaCalendarizacion, NivelDesempeno, FuenteInformacion, PracticaUnidad, IndicadorAlcance } from '../services/academico'

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

// Catálogo institucional TecNM de productos y evidencias de aprendizaje comunes.
export const PRODUCTOS_APRENDIZAJE_CATALOGO = [
  'Mapa conceptual',
  'Mapa mental',
  'Cuadro sinóptico',
  'Cuadro comparativo',
  'Ensayo argumentativo',
  'Resumen ejecutivo',
  'Reporte de práctica de laboratorio',
  'Ejercicios prácticos / Banco de problemas resueltos',
  'Proyecto integrador / Prototipo',
  'Código fuente y software ejecutable documentado',
  'Diagrama UML (clases, casos de uso y secuencia)',
  'Examen escrito / Cuestionario diagnóstico',
  'Infografía / Material visual',
  'Presentación ejecutiva / Exposición oral',
  'Investigación documental con referencias APA',
  'Portafolio de evidencias',
  'Estudio de caso documentado',
  'Bitácora de avance y aprendizaje',
]

/** Infiere sugerencias heurísticas de evidencias de aprendizaje según el contenido de la actividad
 * (usado como respaldo instantáneo y cuando el servicio local de IA no esté disponible). */
export function inferirEvidenciasHeuristicas(texto: string): string[] {
  const t = texto.toLowerCase()
  const sugeridas: string[] = []
  if (t.includes('investig') || t.includes('fuente') || t.includes('concept') || t.includes('paradigma')) {
    sugeridas.push('Mapa conceptual', 'Investigación documental con referencias APA')
  }
  if (t.includes('ejercicio') || t.includes('problem') || t.includes('banco') || t.includes('resolver') || t.includes('practicar')) {
    sugeridas.push('Ejercicios prácticos / Banco de problemas resueltos')
  }
  if (t.includes('practic') || t.includes('laboratorio') || t.includes('experimento') || t.includes('manual')) {
    sugeridas.push('Reporte de práctica de laboratorio')
  }
  if (t.includes('program') || t.includes('codig') || t.includes('software') || t.includes('desarroll') || t.includes('orientad')) {
    sugeridas.push('Código fuente y software ejecutable documentado')
  }
  if (t.includes('diagram') || t.includes('uml') || t.includes('caso de uso') || t.includes('clase') || t.includes('model')) {
    sugeridas.push('Diagrama UML (clases, casos de uso y secuencia)')
  }
  if (t.includes('ensayo') || t.includes('postura') || t.includes('opinion') || t.includes('redact')) {
    sugeridas.push('Ensayo argumentativo')
  }
  if (t.includes('cuadro') || t.includes('compar') || t.includes('diferenc')) {
    sugeridas.push('Cuadro comparativo')
  }
  if (t.includes('exposi') || t.includes('present') || t.includes('dialog') || t.includes('comentar') || t.includes('discusion')) {
    sugeridas.push('Presentación ejecutiva / Exposición oral')
  }
  if (t.includes('resum') || t.includes('sintesis')) {
    sugeridas.push('Resumen ejecutivo')
  }
  if (sugeridas.length === 0) {
    sugeridas.push('Mapa conceptual', 'Reporte de práctica de laboratorio', 'Ejercicios prácticos / Banco de problemas resueltos')
  }
  return Array.from(new Set(sugeridas))
}

/** Extrae el nombre del producto/evidencia de aprendizaje indicado en el texto enriquecido de la actividad. */
export function extraerProductoDeActividad(textoHtml: string): string | null {
  if (!textoHtml) return null
  const mOficial = textoHtml.match(/Como evidencia de esta actividad,\s*entregar\s*(?:<strong>)?([^<.]+?)(?:<\/strong>)?(?:\.|\s*<\/div>|$)/i)
  if (mOficial && mOficial[1]?.trim()) {
    return mOficial[1].trim()
  }
  const mGenerico = textoHtml.match(/Como evidencia[^:]*?:\s*(?:<strong>)?([^<.]+?)(?:<\/strong>)?(?:\.|\s*<\/div>|$)/i)
  if (mGenerico && mGenerico[1]?.trim()) {
    return mGenerico[1].trim()
  }
  return null
}

/** Integra o actualiza la frase de evidencia de entrega en el texto HTML de la actividad de aprendizaje. */
export function integrarProductoEnTexto(actual: string, nuevoProducto: string): string {
  const escapado = nuevoProducto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()
  const nuevaFrase = `<div>Como evidencia de esta actividad, entregar <strong>${escapado}</strong>.</div>`
  
  const regexDivOficial = /<div>Como evidencia de esta actividad,\s*entregar\s*.*?<\/div>/gi
  if (regexDivOficial.test(actual)) {
    return actual.replace(regexDivOficial, nuevaFrase)
  }
  
  const regexSimple = /Como evidencia de esta actividad,\s*entregar\s*(?:<strong>)?[^<.]+(?:<\/strong>)?\.?/gi
  if (regexSimple.test(actual)) {
    return actual.replace(regexSimple, `Como evidencia de esta actividad, entregar <strong>${escapado}</strong>.`)
  }

  return actual.trim() ? `${actual.trim()}${nuevaFrase}` : nuevaFrase
}

/** Remueve la frase de entrega de evidencia del texto HTML de la actividad de aprendizaje. */
export function removerProductoDeTexto(actual: string): string {
  return actual
    .replace(/<div>Como evidencia de esta actividad,\s*entregar\s*.*?<\/div>/gi, '')
    .replace(/Como evidencia de esta actividad,\s*entregar\s*(?:<strong>)?[^<.]+(?:<\/strong>)?\.?/gi, '')
    .trim()
}

// Catálogo institucional de requisitos comunes para prácticas — el docente selecciona los
// que aplican y puede agregar otros personalizados (igual que con apoyos didácticos).
export const REQUISITOS_PRACTICA_CATALOGO = [
  'Bata de laboratorio',
  'Lentes de seguridad',
  'Guantes',
  'Cubrebocas',
  'Zapato cerrado',
  'Calculadora científica',
  'Equipo de cómputo propio',
  'Software especializado instalado',
  'Manual de prácticas',
  'Material de laboratorio proporcionado por el instituto',
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

/** Redacta el texto de "Indicadores de alcance" de los 5 niveles de desempeño a partir de
 * las evidencias de aprendizaje ya capturadas — plantilla fija (no IA: es una redacción
 * formulaica sobre datos que el docente ya definió, no algo que valga la pena mandar a
 * generar y esperar). El docente puede seguir editando cada nivel a mano después; esto solo
 * da un punto de partida en vez de una caja vacía. */
export function generarNivelesDesdeEvidencias(evidencias: string[]): Record<NivelDesempeno, string> {
  const nombres = evidencias.filter(e => e.trim())
  const lista = nombres.length ? nombres.join(', ') : 'las evidencias solicitadas'
  return {
    Excelente: `Entrega la totalidad de las evidencias (${lista}) cumpliendo todos los criterios de calidad establecidos, con dominio autónomo de la competencia.`,
    Notable: `Entrega la totalidad de las evidencias (${lista}) cumpliendo la mayoría de los criterios de calidad, con áreas de mejora menores.`,
    Bueno: `Entrega la mayoría de las evidencias (${lista}) cumpliendo los criterios básicos de calidad establecidos.`,
    Suficiente: `Entrega de manera parcial las evidencias (${lista}), cubriendo únicamente los criterios mínimos indispensables.`,
    Insuficiente: `No entrega las evidencias (${lista}) o no cumple los criterios mínimos de calidad establecidos.`,
  }
}

export const TOTAL_SEMANAS = 16

/** Reparte el % de la unidad entre las evidencias en proporción al "Valor % indicador" de
 * los indicadores de alcance que cada una tiene marcados — no en partes iguales: una
 * evidencia que cubre un indicador de 30% debe pesar más que una que solo cubre uno de 5%.
 * El peso de una fila es la suma del valor de sus indicadores marcados (un indicador
 * compartido por varias evidencias aporta su valor a cada una). Se reparte por parte entera
 * y el resto se asigna a las filas con mayor residuo, para que la suma cuadre exacto con el
 * % de la unidad. Las evidencias sin ningún indicador marcado quedan en 0%. */
export function distribuirPorcentajeEvidencias<T extends { porcentaje: number | null; indicadores: string[] }>(
  filas: T[],
  indicadoresAlcance: { letra: string; valor: number | null }[],
  total: number | null
): T[] {
  if (total == null) return filas
  const valorPorLetra = new Map(indicadoresAlcance.map(ind => [ind.letra, ind.valor ?? 0]))
  const pesos = filas.map(f => f.indicadores.reduce((acc, letra) => acc + (valorPorLetra.get(letra) ?? 0), 0))
  const totalPeso = pesos.reduce((a, b) => a + b, 0)
  if (totalPeso <= 0) return filas.map(f => ({ ...f, porcentaje: 0 }))
  const exactos = pesos.map(p => (p / totalPeso) * total)
  const valores = exactos.map(Math.floor)
  const resto = Math.round(total - valores.reduce((a, b) => a + b, 0))
  const ordenPorResiduo = exactos
    .map((v, i) => ({ i, residuo: v - Math.floor(v) }))
    .filter(o => pesos[o.i] > 0)
    .sort((a, b) => b.residuo - a.residuo)
  for (let k = 0; k < resto && ordenPorResiduo.length > 0; k++) {
    valores[ordenPorResiduo[k % ordenPorResiduo.length].i] += 1
  }
  return filas.map((f, i) => ({ ...f, porcentaje: valores[i] }))
}

export interface SemanaHoras { semana: number; teoria: number; practica: number }

const MES_ABREV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function formatoCorto(fecha: Date): string {
  return `${String(fecha.getDate()).padStart(2, '0')}${MES_ABREV[fecha.getMonth()]}`
}

/** Rango de fechas (lunes a domingo, formato "24AGO-28AGO") de una semana del periodo,
 * a partir de la fecha de inicio del periodo — usado para etiquetar las columnas del
 * calendario de horas en formato Gantt. Devuelve `null` si no hay fecha de inicio. */
/** En qué semana del periodo (1-16) cae hoy, a partir de la fecha de inicio del periodo —
 * usado para avisar al docente cuándo ya llegó la semana de evaluación de una unidad.
 * Devuelve `null` antes de que inicie el periodo o si no hay fecha de inicio. */
export function semanaActualDePeriodo(fechaInicioPeriodo: string | null | undefined): number | null {
  if (!fechaInicioPeriodo) return null
  const soloFecha = fechaInicioPeriodo.slice(0, 10)
  const inicio = new Date(soloFecha + 'T00:00:00')
  if (Number.isNaN(inicio.getTime())) return null
  const dias = Math.floor((Date.now() - inicio.getTime()) / 86_400_000)
  if (dias < 0) return null
  return Math.min(TOTAL_SEMANAS, Math.floor(dias / 7) + 1)
}

export function rangoFechasSemana(fechaInicioPeriodo: string | null | undefined, semana: number): string | null {
  if (!fechaInicioPeriodo) return null
  const soloFecha = fechaInicioPeriodo.slice(0, 10)
  const inicio = new Date(soloFecha + 'T00:00:00')
  if (Number.isNaN(inicio.getTime())) return null
  const inicioSemana = new Date(inicio)
  inicioSemana.setDate(inicio.getDate() + (semana - 1) * 7)
  const finSemana = new Date(inicioSemana)
  finSemana.setDate(inicioSemana.getDate() + 4)
  return `${formatoCorto(inicioSemana)}-${formatoCorto(finSemana)}`
}

/** Total de horas que el docente debe dosificar en el semestre, según las horas
 * semanales de teoría/práctica de la materia (TecNM-AC-PO-003): p.ej. una materia
 * "3-2-5" (T-P-C) da 16 semanas × 3h = 48h teóricas y 16 semanas × 2h = 32h prácticas. */
export function horasObjetivo(materia?: { horas_teoria?: number | null; horas_practica?: number | null }): { teoria: number; practica: number } {
  return {
    teoria: (materia?.horas_teoria ?? 0) * TOTAL_SEMANAS,
    practica: (materia?.horas_practica ?? 0) * TOTAL_SEMANAS,
  }
}

/** Suma las horas teóricas/prácticas capturadas en todas las filas de "Actividades de
 * enseñanza y aprendizaje" de todas las unidades — el total que se compara contra
 * [[horasObjetivo]] para saber cuántas horas faltan o sobran por dosificar. */
export function totalHorasCapturadas(competencias: CompetenciaEspecifica[]): { teoria: number; practica: number } {
  return competencias.reduce((acc, c) => {
    const u = horasCapturadasUnidad(c)
    acc.teoria += u.teoria
    acc.practica += u.practica
    return acc
  }, { teoria: 0, practica: 0 })
}

/** Igual que [[totalHorasCapturadas]] pero para una sola unidad — lo que el docente ya
 * capturó en las filas de actividades de esa unidad. */
export function horasCapturadasUnidad(comp: CompetenciaEspecifica): { teoria: number; practica: number } {
  return comp.actividades.reduce((acc, a) => {
    acc.teoria += a.horas_teoricas ?? 0
    acc.practica += a.horas_practicas ?? 0
    return acc
  }, { teoria: 0, practica: 0 })
}

/** Cuota de horas que le corresponde a una unidad sobre el total de la materia, según el
 * `porcentaje` de aportación que el docente le asignó (p.ej. una unidad al 25% de una
 * materia de 48h teóricas/32h prácticas dispone de 12h teóricas/8h prácticas). */
export function horasDisponiblesUnidad(materia: { horas_teoria?: number | null; horas_practica?: number | null } | undefined, porcentaje: number | null): { teoria: number; practica: number } {
  const objetivo = horasObjetivo(materia)
  const frac = (porcentaje ?? 0) / 100
  return {
    teoria: Math.round(objetivo.teoria * frac * 100) / 100,
    practica: Math.round(objetivo.practica * frac * 100) / 100,
  }
}

/** Devuelve las filas de actividades asociadas a un subtema (apoya tanto `filas` como el campo legacy `fila`). */
export function obtenerFilasDeSubtema(s: SubtemaActividad): number[] {
  if (s.filas && s.filas.length > 0) return s.filas
  if (s.fila != null) return [s.fila]
  return []
}

/** Indica si un subtema pertenece o está asociado a una fila de actividades por número. */
export function subtemaPerteneceAFila(s: SubtemaActividad, filaNumero: number): boolean {
  return obtenerFilasDeSubtema(s).includes(filaNumero)
}

/** Rangos de semanas (de la dosificación) en los que se está impartiendo una fila de
 * actividades — una fila puede tener varios subtemas ligados (por `fila` o `filas`), y cada subtema
 * dosificado trae su propio semana_inicio/semana_fin; se listan todos los rangos únicos
 * para que el docente vea, sin salir de "Competencias específicas", cuándo se imparten
 * las horas T/P que acaba de capturar. */
export function semanasDeFila(comp: CompetenciaEspecifica, fila: number): string[] {
  const rangos = comp.subtemas
    .filter(s => subtemaPerteneceAFila(s, fila))
    .map(s => comp.dosificacion.find(d => d.subtema === s.texto))
    .filter((d): d is CompetenciaEspecifica['dosificacion'][number] => !!d && d.semana_inicio != null && d.semana_fin != null)
    .map(d => d.semana_inicio === d.semana_fin ? `Sem ${d.semana_inicio}` : `Sem ${d.semana_inicio}-${d.semana_fin}`)
  return [...new Set(rangos)]
}

/** Genera automáticamente la dosificación (semana_inicio/semana_fin de cada subtema) a
 * partir de las horas T/P asignadas a la fila o filas de actividades a la que pertenece cada
 * subtema — el docente ya no captura las semanas a mano. Recorre las unidades y, dentro de
 * cada una, sus filas en orden, avanzando un cursor de semana global (continúa donde quedó
 * la unidad anterior): cada fila ocupa tantas semanas como le tomen sus horas T/P dada la
 * capacidad semanal de la materia (horas teóricas + prácticas por semana). Los subtemas que
 * comparten fila comparten el mismo rango de semanas. Conserva `semana_realizado` de la
 * dosificación anterior (lo captura Desarrollo Académico en el corte, no se recalcula). */
export function generarDosificacionAutomatica(
  competencias: CompetenciaEspecifica[],
  materia?: { horas_teoria?: number | null; horas_practica?: number | null }
): CompetenciaEspecifica['dosificacion'][] {
  const horasSemanalesMateria = (materia?.horas_teoria ?? 0) + (materia?.horas_practica ?? 0)
  const capacidad = horasSemanalesMateria > 0 ? horasSemanalesMateria : 6
  let cursor = 1
  return competencias.map(comp => {
    const realizadosPrevios = new Map(comp.dosificacion.map(d => [d.subtema, d.semana_realizado]))
    const rangosPorFila = new Map<string, { semana_inicio: number; semana_fin: number }>()
    const nueva: CompetenciaEspecifica['dosificacion'] = []
    for (const sub of comp.subtemas) {
      if (!sub.texto) continue
      const filasSub = obtenerFilasDeSubtema(sub)
      const key = filasSub.length > 0 ? filasSub.join(',') : ''
      let rango = key ? rangosPorFila.get(key) : undefined
      if (!rango && filasSub.length > 0) {
        let horas = 0
        for (const numFila of filasSub) {
          const actividad = comp.actividades.find(a => a.numero === numFila)
          if (actividad) {
            horas += (actividad.horas_teoricas ?? 0) + (actividad.horas_practicas ?? 0)
          }
        }
        if (horas > 0) {
          const duracionSemanas = horas / capacidad
          const inicio = Math.min(TOTAL_SEMANAS, Math.max(1, Math.floor(cursor)))
          const fin = Math.min(TOTAL_SEMANAS, Math.max(inicio, Math.floor(cursor + duracionSemanas - 0.0001)))
          rango = { semana_inicio: inicio, semana_fin: fin }
          if (key) rangosPorFila.set(key, rango)
          cursor += duracionSemanas
        }
      }
      nueva.push({
        subtema: sub.texto,
        semana_inicio: rango?.semana_inicio ?? null,
        semana_fin: rango?.semana_fin ?? null,
        semana_realizado: realizadosPrevios.get(sub.texto) ?? null,
      })
    }
    return nueva
  })
}

/** Igual que [[distribucionHorasSemanales]] pero para una sola fila de dosificación (un
 * subtema) — usado por la vista Gantt del calendario de horas, donde cada fila de la
 * tabla es un tema/subtema y hay que saber cuántas horas T/P le tocan en cada semana. */
export function horasPorSemanaDeSubtema(comp: CompetenciaEspecifica, dosIndex: number): SemanaHoras[] {
  const semanas: SemanaHoras[] = Array.from({ length: TOTAL_SEMANAS }, (_, i) => ({ semana: i + 1, teoria: 0, practica: 0 }))
  const dos = comp.dosificacion[dosIndex]
  if (!dos || dos.semana_inicio == null || dos.semana_fin == null) return semanas

  const sub = comp.subtemas.find(s => s.texto === dos.subtema)
  if (!sub) return semanas

  const filas = obtenerFilasDeSubtema(sub)
  const actividades = comp.actividades.filter(a => filas.includes(a.numero))
  if (actividades.length === 0) return semanas

  const inicio = Math.max(1, Math.min(dos.semana_inicio, dos.semana_fin))
  const fin = Math.min(TOTAL_SEMANAS, Math.max(dos.semana_inicio, dos.semana_fin))
  const nSemanas = fin - inicio + 1
  if (nSemanas <= 0) return semanas

  let totalTeoria = 0
  let totalPractica = 0
  for (const a of actividades) {
    const numSubtemasQueCompartenFila = comp.subtemas.filter(s => subtemaPerteneceAFila(s, a.numero)).length || 1
    totalTeoria += (a.horas_teoricas ?? 0) / numSubtemasQueCompartenFila
    totalPractica += (a.horas_practicas ?? 0) / numSubtemasQueCompartenFila
  }

  const teoriaPorSemana = totalTeoria / nSemanas
  const practicaPorSemana = totalPractica / nSemanas
  for (let s = inicio; s <= fin; s++) {
    semanas[s - 1].teoria = teoriaPorSemana
    semanas[s - 1].practica = practicaPorSemana
  }
  return semanas
}

/** Qué tema/subtema se está impartiendo en cada semana, según la dosificación — para que
 * la vista "Resumen semanal" del calendario de horas no muestre solo horas sueltas, sino
 * también en qué contenido está el grupo esa semana (una semana puede tener más de un
 * subtema si varios se traslapan en su rango). */
export function temasPorSemana(competencias: CompetenciaEspecifica[]): string[][] {
  const resultado: string[][] = Array.from({ length: TOTAL_SEMANAS }, () => [])
  for (const comp of competencias) {
    for (const dos of comp.dosificacion) {
      if (dos.semana_inicio == null || dos.semana_fin == null) continue
      const inicio = Math.max(1, Math.min(dos.semana_inicio, dos.semana_fin))
      const fin = Math.min(TOTAL_SEMANAS, Math.max(dos.semana_inicio, dos.semana_fin))
      const etiqueta = `${dos.subtema || 'Subtema sin nombre'} (Tema ${comp.numero})`
      for (let s = inicio; s <= fin; s++) resultado[s - 1].push(etiqueta)
    }
  }
  return resultado
}

export interface EvaluacionUnidad {
  unidad: number
  nombreUnidad: string
  ultimaSemanaContenido: number | null
  semanaEvaluacion: number | null
  tipo: 'EF' | 'ES'
}

/** Calendarización de evaluación (TecNM-AC-PO-003 §6) generada automáticamente a partir de
 * la dosificación — en vez de que el docente marque a mano en qué semana evalúa cada tema,
 * se calcula: última semana dosificada de la unidad + 1 semana de holgura, para que el
 * docente tenga tiempo de aplicar la evaluación y cargar calificaciones antes de que
 * arranque el contenido de la siguiente unidad. La última unidad se marca como evaluación
 * sumativa (ES); el resto, formativa (EF). */
export function calendarizacionEvaluaciones(competencias: CompetenciaEspecifica[]): EvaluacionUnidad[] {
  return competencias.map((c, i) => {
    const semanasFin = c.dosificacion.map(d => d.semana_fin).filter((s): s is number => s != null)
    const ultimaSemanaContenido = semanasFin.length ? Math.max(...semanasFin) : null
    const semanaEvaluacion = ultimaSemanaContenido != null ? Math.min(TOTAL_SEMANAS, ultimaSemanaContenido + 1) : null
    return {
      unidad: c.numero,
      nombreUnidad: c.nombre_unidad,
      ultimaSemanaContenido,
      semanaEvaluacion,
      tipo: i === competencias.length - 1 ? 'ES' : 'EF',
    }
  })
}

export function distribucionHorasSemanales(competencias: CompetenciaEspecifica[]): SemanaHoras[] {
  const semanas: SemanaHoras[] = Array.from({ length: TOTAL_SEMANAS }, (_, i) => ({ semana: i + 1, teoria: 0, practica: 0 }))

  for (const comp of competencias) {
    const dosMap = new Map(comp.dosificacion.map(d => [d.subtema, d]))

    for (const act of comp.actividades) {
      const horasT = act.horas_teoricas ?? 0
      const horasP = act.horas_practicas ?? 0
      if (horasT === 0 && horasP === 0) continue

      const subtemasAsociados = comp.subtemas.filter(s => subtemaPerteneceAFila(s, act.numero))
      let inicio: number | null = null
      let fin: number | null = null

      for (const s of subtemasAsociados) {
        const d = dosMap.get(s.texto)
        if (d && d.semana_inicio != null && d.semana_fin != null) {
          const sIni = Math.max(1, Math.min(d.semana_inicio, d.semana_fin))
          const sFin = Math.min(TOTAL_SEMANAS, Math.max(d.semana_inicio, d.semana_fin))
          if (inicio === null || sIni < inicio) inicio = sIni
          if (fin === null || sFin > fin) fin = sFin
        }
      }

      if (inicio == null || fin == null) continue
      const nSemanas = fin - inicio + 1
      if (nSemanas <= 0) continue

      const teoriaPorSemana = horasT / nSemanas
      const practicaPorSemana = horasP / nSemanas

      for (let s = inicio; s <= fin; s++) {
        semanas[s - 1].teoria += teoriaPorSemana
        semanas[s - 1].practica += practicaPorSemana
      }
    }
  }

  return semanas
}

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

/** Normaliza una práctica leída de la BD — antes de este cambio `requisitos` era texto
 * libre (separado por comas) y `semana` un string libre; se migran a `requisitos: string[]`
 * (tags) y `semana: number | null` (elegida de la lista de semanas del periodo). */
function normalizarPractica(p: Omit<Partial<PracticaUnidad>, 'requisitos' | 'semana'> & { requisitos?: string[] | string; semana?: number | string | null }, descripcionUnidad: string): PracticaUnidad {
  const reqRaw = p?.requisitos
  const requisitos = Array.isArray(reqRaw)
    ? reqRaw
    : (typeof reqRaw === 'string'
        ? reqRaw.split(',').map((r: string) => r.trim()).filter(Boolean)
        : [])
  const semana = typeof p?.semana === 'number'
    ? p.semana
    : (p?.semana ? Number(p.semana) || null : null)
  return {
    nombre: p?.nombre ?? '',
    requisitos,
    semana,
    lugar: p?.lugar ?? '',
    // Prácticas guardadas antes de este campo no traen competencia_especifica propia —
    // se precargan con la de la unidad, igual que al crear una práctica nueva.
    competencia_especifica: p?.competencia_especifica ?? descripcionUnidad,
  }
}

export function normalizarTextoComp(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function esMismaCompetencia(a: string, b: string): boolean {
  if (!a || !b) return false
  const na = normalizarTextoComp(a)
  const nb = normalizarTextoComp(b)
  if (na === nb) return true
  if (na.startsWith(nb) || nb.startsWith(na)) return true
  if (na.length >= 12 && nb.length >= 12 && na.slice(0, 15) === nb.slice(0, 15)) return true
  return false
}

/** Sincroniza los indicadores de alcance con las competencias genéricas seleccionadas:
 * cada competencia genérica seleccionada se convierte en un indicador de alcance (A, B, C, ...).
 * Si ya existía un indicador previo (con valor o texto), se conserva su valor asignado.
 * Los indicadores personalizados que no correspondan a competencias genéricas se mantienen al final.
 */
export function sincronizarIndicadoresConGenericas(
  indicadoresActuales: IndicadorAlcance[] = [],
  competenciasGenericas: string[] = []
): IndicadorAlcance[] {
  const todasGenericas = [
    ...COMPETENCIAS_INSTRUMENTALES,
    ...COMPETENCIAS_INTERPERSONALES,
    ...COMPETENCIAS_SISTEMICAS,
  ]

  const resultado: IndicadorAlcance[] = []

  // 1. Para cada competencia genérica seleccionada, conservamos su indicador existente o creamos uno nuevo
  for (const compGen of competenciasGenericas) {
    const existente = indicadoresActuales.find(ind => esMismaCompetencia(ind.indicador, compGen))
    if (existente) {
      resultado.push({
        ...existente,
        indicador: existente.indicador.trim() ? existente.indicador : compGen,
      })
    } else {
      resultado.push({
        letra: '',
        indicador: compGen,
        valor: null,
      })
    }
  }

  // 2. Conservar indicadores personalizados que no forman parte del catálogo institucional de competencias genéricas
  for (const ind of indicadoresActuales) {
    const esDelCatalogo = todasGenericas.some(g => esMismaCompetencia(g, ind.indicador))
    const yaIncluido = resultado.some(r => esMismaCompetencia(r.indicador, ind.indicador) || r === ind)
    if (!esDelCatalogo && !yaIncluido && ind.indicador.trim() !== '') {
      resultado.push(ind)
    }
  }

  // 3. Reasignar letras A, B, C, D... secuenciales
  return resultado.map((ind, i) => ({
    ...ind,
    letra: String.fromCharCode(65 + i),
  }))
}

/** Normaliza una competencia específica leída de la BD (puede venir de un esquema
 * anterior, sin nombre_unidad/fuentes_informacion/apoyos_didacticos/practicas, con
 * matriz_evaluacion/niveles_desempeno en la forma vieja, o con temas_subtemas/actividades
 * como texto libre en vez de filas estructuradas) rellenando los campos que falten con
 * valores por defecto, para que el editor no truene con datos ya guardados. */
export function normalizarCompetencia(c: CompetenciaLegacy): CompetenciaEspecifica {
  const base = nuevaCompetencia(c.numero)

  const subtemas = Array.isArray(c.subtemas) && c.subtemas.length > 0
    ? c.subtemas.map(s => {
        const filas = Array.isArray(s?.filas) && s.filas.length > 0 ? s.filas : (s?.fila != null ? [s.fila] : [])
        return {
          texto: s?.texto ?? '',
          fila: filas[0] ?? null,
          filas: filas.length > 0 ? filas : undefined,
        }
      })
    : (c.temas_subtemas ? c.temas_subtemas.split('\n').map(t => t.trim()).filter(Boolean).map(texto => ({ texto, fila: 1, filas: [1] })) : [])

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

  const competencias_genericas = Array.isArray(c.competencias_genericas) ? c.competencias_genericas : []
  const indicadores_alcance = competencias_genericas.length > 0
    ? sincronizarIndicadoresConGenericas(c.indicadores_alcance ?? [], competencias_genericas)
    : (c.indicadores_alcance ?? [])

  return {
    ...base,
    ...c,
    nombre_unidad: c.nombre_unidad ?? '',
    porcentaje: c.porcentaje ?? null,
    subtemas,
    actividades,
    competencias_genericas,
    indicadores_alcance,
    niveles_desempeno: c.niveles_desempeno?.length === base.niveles_desempeno.length
      ? c.niveles_desempeno.map((n, i) => ({ nivel: base.niveles_desempeno[i].nivel, indicadores: n?.indicadores ?? '' }))
      : base.niveles_desempeno,
    // Se recalcula el % de cada fila contra los indicadores marcados y el % de la unidad al
    // cargar, en vez de confiar en el valor guardado — así una planeación capturada antes de
    // que el reparto fuera automático (o editada fuera de orden) siempre se ve cuadrada.
    matriz_evaluacion: distribuirPorcentajeEvidencias(
      (c.matriz_evaluacion ?? []).map(f => ({
        evidencia: f?.evidencia ?? '',
        porcentaje: f?.porcentaje ?? null,
        indicadores: Array.isArray(f?.indicadores) ? f.indicadores : [],
        evaluacion_formativa: f?.evaluacion_formativa ?? '',
      })),
      indicadores_alcance,
      c.porcentaje ?? null
    ),
    fuentes_informacion: Array.isArray(c.fuentes_informacion) ? c.fuentes_informacion.map(normalizarFuente) : [],
    apoyos_didacticos: Array.isArray(c.apoyos_didacticos) ? c.apoyos_didacticos : [],
    practicas: Array.isArray(c.practicas) ? c.practicas.map(p => normalizarPractica(p, c.descripcion ?? '')) : [],
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

// ---------------------------------------------------------------------------
// Catálogo y Generador de Instrumentos de Evaluación Formativa (TecNM)
// ---------------------------------------------------------------------------

export type TipoInstrumentoEvaluacion =
  | 'rubrica'
  | 'lista_cotejo'
  | 'guia_observacion'
  | 'cuestionario'
  | 'escala_estimativa'
  | 'matriz_valoracion'

export interface CriterioInstrumento {
  id: string
  nombre: string
  descripcion: string
  ponderacion: number // e.g. 25 (%)
  descriptores?: {
    excelente: string
    notable: string
    bueno: string
    suficiente: string
    insuficiente: string
  }
  cumple?: boolean
  observaciones?: string
}

export interface InstrumentoEvaluacionDetallado {
  tipo: TipoInstrumentoEvaluacion
  nombre: string
  evidencia: string
  ponderacion: number | null
  competencia?: string
  instrucciones: string
  criterios: CriterioInstrumento[]
  escala?: Array<{ nivel: string; valor: string; descripcion: string }>
}

export interface DefinicionInstrumentoCatalogo {
  id: TipoInstrumentoEvaluacion
  nombre: string
  icono: string
  resumen: string
  generarDescripcion: (evidencia: string) => string
}

export const CATALOGO_INSTRUMENTOS_EVALUACION: DefinicionInstrumentoCatalogo[] = [
  {
    id: 'rubrica',
    nombre: 'Rúbrica de evaluación',
    icono: '📐',
    resumen: 'Matriz con criterios y descriptores por nivel de desempeño (Excelente a Insuficiente).',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      const norm = e.toLowerCase()
      if (norm.includes('mapa') || norm.includes('cuadro') || norm.includes('diagrama') || norm.includes('infograf')) {
        return `Rúbrica de evaluación analítica con indicadores para evaluar calidad de la información, estructura conceptual, conectores y legibilidad en ${e}.`
      }
      if (norm.includes('práctica') || norm.includes('software') || norm.includes('programa') || norm.includes('código')) {
        return `Rúbrica de evaluación de práctica con criterios para valorar funcionalidad, arquitectura del código, documentación y pruebas en ${e}.`
      }
      if (norm.includes('reporte') || norm.includes('ensayo') || norm.includes('investigac') || norm.includes('proyecto')) {
        return `Rúbrica de evaluación analítica con criterios para evaluar fundamentación teórica, rigor metodológico, discusión y conclusiones en ${e}.`
      }
      if (norm.includes('exposic') || norm.includes('presentac') || norm.includes('debate')) {
        return `Rúbrica de evaluación con indicadores para valorar dominio temático, recursos visuales, argumentación y fluidez oral en ${e}.`
      }
      return `Rúbrica de evaluación analítica con indicadores para valorar dominio conceptual, coherencia, estructura y presentación formal en ${e}.`
    },
  },
  {
    id: 'lista_cotejo',
    nombre: 'Lista de cotejo',
    icono: '✅',
    resumen: 'Verificación dicotómica (Cumple / No cumple) de requisitos técnicos, formales y de entrega.',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      return `Lista de cotejo con verificación de requisitos técnicos, entrega oportuna, estructura metodológica y formato formal en ${e}.`
    },
  },
  {
    id: 'guia_observacion',
    nombre: 'Guía de observación',
    icono: '👁️',
    resumen: 'Registro de actitudes, habilidades procedimentales y trabajo colaborativo en tiempo real.',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      return `Guía de observación con indicadores de desempeño procedimental, actitud, ejecución técnica y trabajo en equipo durante ${e}.`
    },
  },
  {
    id: 'cuestionario',
    nombre: 'Cuestionario / Examen',
    icono: '📝',
    resumen: 'Reactivos conceptuales y resolución de casos o problemas aplicados.',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      return `Cuestionario teórico-práctico con reactivos de análisis, resolución de problemas y aplicación conceptual para valorar ${e}.`
    },
  },
  {
    id: 'escala_estimativa',
    nombre: 'Escala estimativa',
    icono: '📊',
    resumen: 'Gradación cualitativa/cuantitativa con niveles intermedios de profundidad y rigor.',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      return `Escala estimativa descriptiva con gradación de niveles para valorar la profundidad, creatividad y fundamentación en ${e}.`
    },
  },
  {
    id: 'matriz_valoracion',
    nombre: 'Matriz de valoración socioformativa',
    icono: '🎯',
    resumen: 'Evaluación basada en niveles de dominio y resolución de problemas del entorno real.',
    generarDescripcion: (evidencia: string) => {
      const e = evidencia.trim() || 'la evidencia'
      return `Matriz de valoración socioformativa basada en niveles de dominio y resolución de problemas del contexto para ${e}.`
    },
  },
]

/**
 * Infiere heurísticamente el instrumento de evaluación más adecuado según el tipo de entregable.
 */
export function inferirInstrumentoParaEvidencia(evidencia: string): {
  tipo: TipoInstrumentoEvaluacion
  nombre: string
  descripcion: string
} {
  const norm = (evidencia || '').toLowerCase().trim()

  if (norm.includes('exposic') || norm.includes('debate') || norm.includes('presentac') || norm.includes('pitch')) {
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === 'guia_observacion')!
    return { tipo: 'guia_observacion', nombre: def.nombre, descripcion: def.generarDescripcion(evidencia) }
  }

  if (norm.includes('examen') || norm.includes('cuestionario') || norm.includes('test') || norm.includes('prueba escrita')) {
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === 'cuestionario')!
    return { tipo: 'cuestionario', nombre: def.nombre, descripcion: def.generarDescripcion(evidencia) }
  }

  if (norm.includes('ejercicio') || norm.includes('banco') || norm.includes('problemario') || norm.includes('tarea') || norm.includes('check')) {
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === 'lista_cotejo')!
    return { tipo: 'lista_cotejo', nombre: def.nombre, descripcion: def.generarDescripcion(evidencia) }
  }

  if (norm.includes('práctica') || norm.includes('software') || norm.includes('programa') || norm.includes('código') || norm.includes('laboratorio')) {
    const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === 'rubrica')!
    return { tipo: 'rubrica', nombre: def.nombre, descripcion: def.generarDescripcion(evidencia) }
  }

  // Por defecto, Rúbrica de evaluación analítica (el estándar formativo preferido en TecNM)
  const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === 'rubrica')!
  return { tipo: 'rubrica', nombre: def.nombre, descripcion: def.generarDescripcion(evidencia) }
}

/**
 * Genera la estructura completa de un instrumento de evaluación con criterios detallados,
 * descriptores por nivel o reactivos listos para visualización y descarga/impresión.
 */
export function generarEstructuraInstrumentoCompleto(
  evidencia: string,
  tipo: TipoInstrumentoEvaluacion = 'rubrica',
  ponderacion?: number | null,
  competencia?: string,
  actividadAprendizaje?: string
): InstrumentoEvaluacionDetallado {
  const e = evidencia.trim() || 'Evidencia de aprendizaje'
  const norm = e.toLowerCase()
  const def = CATALOGO_INSTRUMENTOS_EVALUACION.find(i => i.id === tipo) ?? CATALOGO_INSTRUMENTOS_EVALUACION[0]

  const temaResumido = competencia ? competencia.split('—').pop()?.trim() ?? competencia : 'la competencia de la unidad'
  const actResumida = actividadAprendizaje ? actividadAprendizaje.replace(/<[^>]+>/g, '').slice(0, 150) : ''

  // Criterios según tipo de evidencia y tipo de instrumento
  let criterios: CriterioInstrumento[] = []

  if (tipo === 'lista_cotejo') {
    criterios = [
      {
        id: 'c1',
        nombre: 'Entrega en tiempo y forma',
        descripcion: 'Entrega en la fecha establecida, formato solicitado y plataforma indicada.',
        ponderacion: 15,
        cumple: true,
      },
      {
        id: 'c2',
        nombre: 'Estructura y completitud de la evidencia',
        descripcion: `Contiene todos los apartados y requisitos solicitados para "${e}".`,
        ponderacion: 30,
        cumple: true,
      },
      {
        id: 'c3',
        nombre: 'Dominio conceptual y aplicación del tema',
        descripcion: actResumida 
          ? `Aplica con precisión los conceptos en el desarrollo de la actividad: ${actResumida}...`
          : `Demuestra comprensión y aplicación precisa de los conceptos de ${temaResumido}.`,
        ponderacion: 35,
        cumple: true,
      },
      {
        id: 'c4',
        nombre: 'Ortografía, redacción y fuentes de información',
        descripcion: 'Redacción clara, sin faltas ortográficas y con fuentes formales de consulta en formato APA.',
        ponderacion: 20,
        cumple: true,
      },
    ]
  } else if (tipo === 'guia_observacion') {
    criterios = [
      {
        id: 'c1',
        nombre: 'Dominio y preparación técnica',
        descripcion: 'Demuestra preparación previa, conocimiento del procedimiento y manejo del tema.',
        ponderacion: 30,
      },
      {
        id: 'c2',
        nombre: 'Ejecución y destreza metodológica',
        descripcion: 'Aplica correctamente los pasos, herramientas o protocolos establecidos.',
        ponderacion: 30,
      },
      {
        id: 'c3',
        nombre: 'Participación y colaboración activa',
        descripcion: 'Trabaja con responsabilidad, respeto y comunicación asertiva con el equipo.',
        ponderacion: 20,
      },
      {
        id: 'c4',
        nombre: 'Capacidad de respuesta y resolución',
        descripcion: 'Responde a dudas, defiende sus argumentos y propone soluciones oportunas.',
        ponderacion: 20,
      },
    ]
  } else if (tipo === 'cuestionario') {
    criterios = [
      {
        id: 'c1',
        nombre: 'Comprensión conceptual y teórica',
        descripcion: 'Identifica, define y relaciona los conceptos y principios fundamentales.',
        ponderacion: 30,
      },
      {
        id: 'c2',
        nombre: 'Aplicación y resolución de problemas',
        descripcion: 'Aplica fórmulas, algoritmos o métodos correctos para llegar al resultado esperado.',
        ponderacion: 40,
      },
      {
        id: 'c3',
        nombre: 'Análisis crítico e interpretación',
        descripcion: 'Justifica sus respuestas e interpreta los resultados obtenidos en el contexto planteado.',
        ponderacion: 30,
      },
    ]
  } else {
    // Rúbrica / Escala estimativa / Matriz de valoración
    if (norm.includes('mapa') || norm.includes('cuadro') || norm.includes('infograf') || norm.includes('diagrama')) {
      criterios = [
        {
          id: 'c1',
          nombre: 'Conceptos clave y jerarquización',
          descripcion: 'Identificación clara de conceptos principales, secundarios y su jerarquía.',
          ponderacion: 30,
          descriptores: {
            excelente: 'Identifica y jerarquiza todos los conceptos clave de forma impecable y lógica.',
            notable: 'Identifica la mayoría de los conceptos clave con adecuada jerarquía.',
            bueno: 'Identifica conceptos principales pero omite algunos secundarios o niveles de jerarquía.',
            suficiente: 'Identifica conceptos de manera básica con deficiencias en la jerarquización.',
            insuficiente: 'No identifica los conceptos clave o carecen de orden jerárquico.',
          },
        },
        {
          id: 'c2',
          nombre: 'Relaciones y proposiciones lógicas',
          descripcion: 'Uso de conectores, líneas de enlace y proposiciones con sentido claro.',
          ponderacion: 30,
          descriptores: {
            excelente: 'Utiliza enlaces y conectores precisos que forman proposiciones exactas.',
            notable: 'Utiliza enlaces claros en casi todas las conexiones del organizador.',
            bueno: 'Usa conectores pero algunas proposiciones resultan ambiguas o repetitivas.',
            suficiente: 'Pocos conectores; las relaciones entre conceptos son confusas.',
            insuficiente: 'No incluye palabras de enlace ni proposiciones válidas.',
          },
        },
        {
          id: 'c3',
          nombre: 'Estructura visual y legibilidad',
          descripcion: 'Diseño limpio, armónico, sin saturación y de fácil lectura.',
          ponderacion: 20,
          descriptores: {
            excelente: 'Diseño visualmente atractivo, claro, armónico y altamente legible.',
            notable: 'Diseño limpio y ordenado con buena legibilidad general.',
            bueno: 'Diseño comprensible aunque con ligera saturación visual.',
            suficiente: 'Diseño desorganizado o con elementos difíciles de leer.',
            insuficiente: 'Presentación descuidada, ilegible o saturada.',
          },
        },
        {
          id: 'c4',
          nombre: 'Ortografía, formato y entrega',
          descripcion: 'Redacción impecable, cumplimiento de lineamientos y entrega puntual.',
          ponderacion: 20,
          descriptores: {
            excelente: 'Sin errores ortográficos, cumple todos los lineamientos y entrega a tiempo.',
            notable: 'Máximo 1 o 2 errores menores, entrega oportuna con formato correcto.',
            bueno: '3 a 4 errores ortográficos, formato básico aceptable.',
            suficiente: 'Varios errores ortográficos o formato incompleto.',
            insuficiente: 'Deficiente ortografía o entrega fuera de plazo sin formato.',
          },
        },
      ]
    } else if (norm.includes('práctica') || norm.includes('software') || norm.includes('código') || norm.includes('programa')) {
      criterios = [
        {
          id: 'c1',
          nombre: 'Funcionalidad y requerimientos técnicos',
          descripcion: 'El sistema o práctica cumple al 100% con los casos de uso y requerimientos especificados.',
          ponderacion: 40,
          descriptores: {
            excelente: 'Ejecuta todas las funciones correctamente, sin fallas ni errores en tiempo de ejecución.',
            notable: 'Cumple la gran mayoría de requerimientos con detalles mínimos no críticos.',
            bueno: 'Cumple los requerimientos principales pero presenta fallos en casos límite.',
            suficiente: 'Funcionalidad básica parcial; varios requerimientos no se cumplen.',
            insuficiente: 'No ejecuta o no cumple con los requerimientos mínimos establecidos.',
          },
        },
        {
          id: 'c2',
          nombre: 'Arquitectura, código limpio y buenas prácticas',
          descripcion: 'Estructura modular, convenciones de nombres, comentarios y orden del código.',
          ponderacion: 25,
          descriptores: {
            excelente: 'Código modular, limpio, documentado y siguiendo estándares de la industria.',
            notable: 'Código ordenado con buenas prácticas y documentación adecuada.',
            bueno: 'Código funcional pero con oportunidades de optimización y modularización.',
            suficiente: 'Código poco estructurado o con escasa documentación técnica.',
            insuficiente: 'Código desordenado, sin documentación ni estándares básicos.',
          },
        },
        {
          id: 'c3',
          nombre: 'Validaciones, pruebas y casos límite',
          descripcion: 'Manejo de excepciones, validación de datos de entrada y robustez.',
          ponderacion: 20,
          descriptores: {
            excelente: 'Valida exhaustivamente entradas y gestiona excepciones de forma robusta.',
            notable: 'Incluye validaciones para los escenarios más comunes y esperados.',
            bueno: 'Validaciones básicas pero susceptible a fallos con datos atípicos.',
            suficiente: 'Pocas validaciones; el programa se interrumpe ante entradas inválidas.',
            insuficiente: 'No implementa validaciones ni control de excepciones.',
          },
        },
        {
          id: 'c4',
          nombre: 'Reporte técnico y conclusiones',
          descripcion: 'Documento técnico con capturas de evidencia, análisis y conclusiones fundamentadas.',
          ponderacion: 15,
          descriptores: {
            excelente: 'Reporte completo, estructurado, con evidencia clara y análisis profundo.',
            notable: 'Reporte ordenado con evidencias y conclusiones pertinentes.',
            bueno: 'Reporte con datos básicos pero conclusiones superficiales.',
            suficiente: 'Reporte incompleto o con evidencias parciales.',
            insuficiente: 'No entrega reporte técnico o carece de sustento.',
          },
        },
      ]
    } else {
      // General formativo
      criterios = [
        {
          id: 'c1',
          nombre: 'Dominio y profundidad del contenido',
          descripcion: 'Rigor conceptual, sustento teórico y comprensión del tema.',
          ponderacion: 35,
          descriptores: {
            excelente: 'Demuestra dominio sobresaliente, precisión conceptual y profundidad en el tema.',
            notable: 'Demuestra buen dominio y comprensión clara de los conceptos centrales.',
            bueno: 'Comprensión aceptable de los temas aunque con explicaciones superficiales.',
            suficiente: 'Comprensión elemental con imprecisiones en conceptos clave.',
            insuficiente: 'Carente de sustento teórico o con graves errores conceptuales.',
          },
        },
        {
          id: 'c2',
          nombre: 'Estructura, coherencia y metodología',
          descripcion: 'Organización lógica de las ideas, secuencia clara y metodología adecuada.',
          ponderacion: 25,
          descriptores: {
            excelente: 'Estructura impecable con transición fluida y coherente entre ideas.',
            notable: 'Estructura organizada y secuencia lógica bien desarrollada.',
            bueno: 'Estructura comprensible aunque con ligeras desconexiones en las ideas.',
            suficiente: 'Estructura deficiente o con saltos bruscos entre secciones.',
            insuficiente: 'Sin estructura lógica ni orden aparente.',
          },
        },
        {
          id: 'c3',
          nombre: 'Aplicación práctica y argumentación',
          descripcion: 'Capacidad de vincular la teoría con casos prácticos y defender posturas.',
          ponderacion: 25,
          descriptores: {
            excelente: 'Argumentación sólida, crítica y con aplicación práctica contextualizada.',
            notable: 'Buena argumentación con ejemplos pertinentes.',
            bueno: 'Argumentación básica con ejemplos poco desarrollados.',
            suficiente: 'Escasa argumentación o ejemplos desconectados de la teoría.',
            insuficiente: 'Sin argumentación ni sustento práctico.',
          },
        },
        {
          id: 'c4',
          nombre: 'Formato, ortografía y referencias',
          descripcion: 'Normas de presentación institucional, ortografía y fuentes formales (APA).',
          ponderacion: 15,
          descriptores: {
            excelente: 'Impecable ortografía, formato profesional y referencias formales completas.',
            notable: 'Buena presentación con fuentes citadas y errores mínimos.',
            bueno: 'Presentación regular con referencias parciales.',
            suficiente: 'Varios errores de formato, ortografía o citas incompletas.',
            insuficiente: 'Descuidado, sin citas ni formato requerido.',
          },
        },
      ]
    }
  }

  return {
    tipo,
    nombre: def.nombre,
    evidencia: e,
    ponderacion: ponderacion ?? null,
    competencia: competencia ?? '',
    instrucciones: `Estimado(a) estudiante: El presente instrumento tiene como finalidad evaluar de manera formativa tu desempeño en la elaboración y entrega de "${e}". Lee con atención cada uno de los criterios y descriptores para orientar tu trabajo hacia el nivel de excelencia.`,
    criterios,
    escala: [
      { nivel: 'Excelente', valor: '95 - 100%', descripcion: 'Cumple con excelencia todos los criterios establecidos con dominio sobresaliente.' },
      { nivel: 'Notable', valor: '85 - 94%', descripcion: 'Cumple la mayoría de los criterios de calidad con dominio adecuado.' },
      { nivel: 'Bueno', valor: '75 - 84%', descripcion: 'Cumple los requerimientos básicos con áreas de oportunidad identificadas.' },
      { nivel: 'Suficiente', valor: '70 - 74%', descripcion: 'Cumple de manera elemental o parcial con los criterios mínimos.' },
      { nivel: 'Insuficiente', valor: '< 70%', descripcion: 'No cumple con los criterios mínimos o no entrega la evidencia.' },
    ],
  }
}

