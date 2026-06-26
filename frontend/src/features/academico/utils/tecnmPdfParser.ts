/**
 * Parser de programas de asignatura TecNM (PDF).
 *
 * Estrategia: extrae texto página por página con pdfjs-dist,
 * luego divide el texto en secciones numeradas (1., 2., … 11.)
 * y aplica regex específico a cada sección.
 */

import type { Materia, MateriaTemaTema } from '../services/academico'

// ── Tipos de salida ───────────────────────────────────────────────────────────

export interface ActividadAprendizaje {
  tema: string
  competencias: string
  actividades: string[]
}

export interface PracticaTema {
  tema: string       // "Tema 1", "Tema 2", …
  lista: string[]
}

export interface ProgramaExtraido extends Partial<Materia> {
  actividades_aprendizaje?: ActividadAprendizaje[]
  practicas?: PracticaTema[]
  proyecto_asignatura?: string
  evaluacion?: string
}

// ── Extractor de texto con pdfjs ──────────────────────────────────────────────

export async function extractTextFromPdf(file: File): Promise<string> {
  // Importación dinámica para evitar problemas con SSR / chunk inicial
  const pdfjsLib = await import('pdfjs-dist')

  // Worker servido localmente (copiado a /public) para evitar bloqueos CORS/CSP
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Concatenar items de texto; salto de línea cuando y cambia significativamente
    let lastY: number | null = null
    const lines: string[] = []
    let currentLine = ''

    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lines.push(currentLine.trim())
        currentLine = ''
      }
      currentLine += item.str + ' '
      lastY = y
    }
    if (currentLine.trim()) lines.push(currentLine.trim())
    pages.push(lines.join('\n'))
  }

  return pages.join('\n')
}

// ── División en secciones ─────────────────────────────────────────────────────

function splitSections(text: string): Record<string, string> {
  // Detecta encabezados como "1. Datos Generales", "2. Presentación", etc.
  const headingRe = /^(\d+)\.\s+([\w\s()áéíóúüñÁÉÍÓÚÜÑ\/]+)/m
  const sectionRe = /(?=^\d+\.\s+)/m

  const raw = text.split(sectionRe)
  const sections: Record<string, string> = { _full: text }

  for (const chunk of raw) {
    const m = chunk.match(headingRe)
    if (m) sections[m[1]] = chunk
  }

  return sections
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function between(text: string, start: RegExp, end: RegExp): string {
  const s = text.search(start)
  if (s === -1) return ''
  const sub = text.slice(s)
  const e = sub.search(end)
  return (e === -1 ? sub : sub.slice(0, e)).replace(start, '').trim()
}

function cleanLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

// ── Parsers por sección ───────────────────────────────────────────────────────

function parseDatosGenerales(sec: string) {
  const get = (label: RegExp) => {
    const m = sec.match(label)
    return m ? m[1].trim().replace(/\s+/g, ' ') : undefined
  }

  const nombre          = get(/Nombre de la asignatura[:\s]+(.+)/i)
  const claveRaw        = get(/Clave de la asignatura[:\s]+(.+)/i)
  const satcaRaw        = get(/SATCA\s*\d*[:\s]+(.+)/i)

  // Normalizar clave: "SCA – 1025" → "SCA-1025"
  const clave_oficial_tecnm = claveRaw?.replace(/\s*[–—-]\s*/g, '-').replace(/\s+/g, '')

  // SATCA "0 – 4 – 4" → "0-4-4"
  const satca = satcaRaw?.replace(/\s*[–—-]\s*/g, '-').replace(/\s+/g, '')

  let horas_teoria: number | undefined
  let horas_practica: number | undefined
  let creditos: number | undefined

  if (satca) {
    const parts = satca.split('-').map(Number)
    if (parts.length === 3) {
      ;[horas_teoria, horas_practica, creditos] = parts
    }
  }

  return { nombre, clave_oficial_tecnm, satca, horas_teoria, horas_practica, creditos }
}

function parsePresentacion(sec: string) {
  const caracterizacion = between(
    sec,
    /Caracterizaci[oó]n de la asignatura/i,
    /Intenci[oó]n did[aá]ctica/i
  ).replace(/Caracterizaci[oó]n de la asignatura/i, '').trim()

  const intencion_didactica = between(
    sec,
    /Intenci[oó]n did[aá]ctica/i,
    /©TecNM|^\d+\./m
  ).replace(/Intenci[oó]n did[aá]ctica/i, '').trim()

  return { caracterizacion: caracterizacion || undefined, intencion_didactica: intencion_didactica || undefined }
}

function parseCompetencia(sec: string): string | undefined {
  // Elimina la primera línea (el encabezado de sección)
  const lines = cleanLines(sec)
  // Buscar después de "Competencia(s) específica(s) de la asignatura"
  const idx = lines.findIndex(l => /espec[ií]fica/i.test(l))
  if (idx !== -1) {
    return lines.slice(idx + 1).join(' ').trim() || undefined
  }
  // Fallback: todo menos el encabezado de sección
  return lines.slice(1).join(' ').trim() || undefined
}

function parseCompetenciasPrevias(sec: string): string | undefined {
  const lines = cleanLines(sec)
  return lines.slice(1).join(' ').trim() || undefined
}

function parseTemario(sec: string): MateriaTemaTema[] {
  const lines = cleanLines(sec)
  const result: MateriaTemaTema[] = []

  // Buscar líneas como "1.", "2.", etc. que empiezan un tema
  // El texto del PDF muestra temas y subtemas mezclados
  // Estrategia: agrupar por número de tema principal
  let currentTema: MateriaTemaTema | null = null

  for (const line of lines) {
    // Encabezado de tabla — skip
    if (/^No\.\s+Temas?\s+Subtemas?/i.test(line)) continue
    // Encabezado de sección
    if (/^6\.\s+Temario/i.test(line)) continue

    // Nueva línea de tema principal: "1.", "2.", etc. (no "1.1", "1.2")
    const temaMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (temaMatch && !line.match(/^\d+\.\d+/)) {
      if (currentTema) result.push(currentTema)
      currentTema = { tema: temaMatch[2].trim(), subtemas: [] }
      continue
    }

    // Subtema: "1.1 Instalación…", "a.", "b.", etc.
    const subtemaMatch = line.match(/^(\d+\.\d+|[a-z]\.)\s+(.+)/i)
    if (subtemaMatch && currentTema) {
      currentTema.subtemas = currentTema.subtemas ?? []
      currentTema.subtemas.push(subtemaMatch[0].trim())
      continue
    }

    // Continuación de subtema anterior (línea sin marcador)
    if (currentTema && currentTema.subtemas && currentTema.subtemas.length > 0) {
      const lastIdx = currentTema.subtemas.length - 1
      currentTema.subtemas[lastIdx] += ' ' + line
    }
  }

  if (currentTema) result.push(currentTema)
  return result
}

function parseActividades(sec: string): ActividadAprendizaje[] {
  const lines = cleanLines(sec)
  const result: ActividadAprendizaje[] = []
  let current: ActividadAprendizaje | null = null
  let inActividades = false

  for (const line of lines) {
    if (/^7\.\s+Actividades/i.test(line)) continue

    // Detecta bloque de tema: "Lenguaje de Definición de Datos" (sin número)
    // Los bloques tienen "Competencias" y "Actividades de aprendizaje"
    if (/^Competencias$/i.test(line)) { inActividades = false; continue }
    if (/^Actividades de aprendizaje$/i.test(line)) { inActividades = true; continue }

    // Bloque de tema (encabezado centrado en mayúsculas o mixto sin números)
    if (!line.match(/^[\d•·-]/) && line.length > 5 && /[A-ZÁÉÍÓÚ]/.test(line[0])) {
      if (current) result.push(current)
      current = { tema: line, competencias: '', actividades: [] }
      inActividades = false
      continue
    }

    if (!current) continue

    if (inActividades) {
      // Bullet de actividad
      const clean = line.replace(/^[•·\-]\s*/, '').trim()
      if (clean) current.actividades.push(clean)
    } else {
      // Texto de competencia
      current.competencias += (current.competencias ? ' ' : '') + line
    }
  }

  if (current) result.push(current)
  return result.filter(a => a.tema && (a.competencias || a.actividades.length))
}

function parsePracticas(sec: string): PracticaTema[] {
  const lines = cleanLines(sec)
  const result: PracticaTema[] = []
  let current: PracticaTema | null = null

  for (const line of lines) {
    if (/^8\.\s+Pr[áa]ctica/i.test(line)) continue

    // "Tema N"
    const temaMatch = line.match(/^Tema\s+(\d+)/i)
    if (temaMatch) {
      if (current) result.push(current)
      current = { tema: line.trim(), lista: [] }
      continue
    }

    if (!current) continue

    // Ítem de práctica (bullet o texto)
    const clean = line.replace(/^[•·\-]\s*/, '').trim()
    if (clean && clean.length > 3) current.lista.push(clean)
  }

  if (current) result.push(current)
  return result.filter(p => p.lista.length > 0)
}

function parseProyecto(sec: string): string | undefined {
  const lines = cleanLines(sec)
  return lines.slice(1).join(' ').trim() || undefined
}

function parseEvaluacion(sec: string): string | undefined {
  const lines = cleanLines(sec)
  return lines.slice(1).join('\n').trim() || undefined
}

function parseFuentes(sec: string): string[] {
  const lines = cleanLines(sec)
  const result: string[] = []
  let current = ''

  for (const line of lines) {
    if (/^11\.\s+Fuentes/i.test(line)) continue

    // Línea que empieza con número de referencia "1.-", "2.-"
    const refMatch = line.match(/^(\d+)\.-?\s+(.+)/)
    if (refMatch) {
      if (current) result.push(current.trim())
      current = refMatch[2]
    } else if (current) {
      // Continuación de referencia anterior
      current += ' ' + line
    }
  }
  if (current) result.push(current.trim())
  return result
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function parseTecnmPdf(file: File): Promise<ProgramaExtraido> {
  const text = await extractTextFromPdf(file)
  const secs = splitSections(text)

  const datos      = parseDatosGenerales(secs['1'] ?? text)
  const present    = parsePresentacion(secs['2'] ?? '')
  const competencia = parseCompetencia(secs['4'] ?? '')
  const previas    = parseCompetenciasPrevias(secs['5'] ?? '')
  const temario    = parseTemario(secs['6'] ?? '')
  const actividades = parseActividades(secs['7'] ?? '')
  const practicas  = parsePracticas(secs['8'] ?? '')
  const proyecto   = parseProyecto(secs['9'] ?? '')
  const evaluacion = parseEvaluacion(secs['10'] ?? '')
  const fuentes    = parseFuentes(secs['11'] ?? '')

  return {
    ...datos,
    ...present,
    competencia_especifica: competencia,
    competencias_previas: previas,
    temario: temario.length ? temario : undefined,
    actividades_aprendizaje: actividades.length ? actividades : undefined,
    practicas: practicas.length ? practicas : undefined,
    proyecto_asignatura: proyecto,
    evaluacion,
    fuentes_informacion: fuentes.length ? fuentes : undefined,
  }
}
