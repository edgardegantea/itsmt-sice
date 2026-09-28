import type { FuenteInformacion, TipoFuente } from '../services/academico'

export type TipoIdentificadorBibliografico = 'doi' | 'isbn' | 'issn' | 'url' | 'texto'

export interface ResultadoBusquedaBibliografica {
  tipoDetectado: TipoIdentificadorBibliografico
  fuente: FuenteInformacion
  alternativas?: Array<{
    fuente: FuenteInformacion
    descripcionCorta: string
  }>
}

/**
 * Detecta automáticamente si el texto ingresado corresponde a un DOI, ISBN, ISSN, URL o texto libre.
 */
export function detectarTipoIdentificador(raw: string): TipoIdentificadorBibliografico {
  const str = raw.trim()
  if (!str) return 'texto'

  // URL
  if (/^https?:\/\//i.test(str) || /^www\./i.test(str)) {
    if (str.includes('doi.org/10.')) return 'doi'
    return 'url'
  }

  // DOI (ej: 10.1016/j.procs.2020.03.200 o doi:10.1145/...)
  if (/^(doi:)?10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i.test(str) || /10\.\d{4,9}\//.test(str)) {
    return 'doi'
  }

  // Limpieza para posibles códigos numéricos
  const soloDigitos = str.replace(/[-\s]/g, '')

  // ISSN (8 dígitos, ej: 1234-567X o 1234567X)
  if (/^\d{4}-?\d{3}[\dX]$/i.test(str) && (soloDigitos.length === 8 || str.includes('-'))) {
    return 'issn'
  }

  // ISBN (10 o 13 dígitos numéricos)
  if (/^(97[89])?\d{9}[\dX]$/i.test(soloDigitos) && (soloDigitos.length === 10 || soloDigitos.length === 13)) {
    return 'isbn'
  }

  return 'texto'
}

/**
 * Parsea una cita / referencia bibliográfica directa (formato TecNM / APA / libro tradicional)
 * y la desglosa en campos estructurados (autor, título, editorial, ciudad, año, tipo).
 *
 * Ejemplos soportados:
 * - "1. Taylor David. Object Orient informations systems, planning and implementations. Canada: Wiley. 1992."
 * - "2. Larman Craig. UML y patrones introducción al análisis y diseño orientado a objetos. México: Pretince Hall. 1999."
 * - "3. Winblad, Ann L. Edwards, Samuel R. Software orientado a objetos. USA: Addison. Wesley/ Díaz Santos. 1993."
 * - "4. Fco. Javier Ceballos. Java 2 Curso de Programación. Alfaomega."
 * - "11. Francisco Charte Ojeda. Visual C# .NET. ANAYA MULTIMEDIA"
 * - "12. Kingsley-Hughes, Kathie; Kingsley-Hughes, Adrian. C# 2005. ANAYAMULTIMEDIA"
 */
export function parseCitaDirecta(rawInput: string): FuenteInformacion {
  let str = rawInput.trim()
  if (!str) {
    return { tipo: 'impreso', titulo: 'Fuente sin datos' }
  }

  // 1. Quitar número de ítem inicial si existe (ej: "1. ", "12. ", "1.- ", "[1] ")
  str = str.replace(/^(?:\d+[\.\-\)\:]|\[\d+\])\s*/, '').trim()

  // 2. Extraer Año (4 dígitos) si está al final o entre paréntesis
  let anio: string | undefined = undefined
  const matchAnioFinal = str.match(/\b((?:19|20)\d{2})\.?$/)
  const matchAnioParens = str.match(/\(((?:19|20)\d{2})\)/)

  if (matchAnioFinal) {
    anio = matchAnioFinal[1]
    str = str.replace(/\b(?:19|20)\d{2}\.?$/, '').trim()
  } else if (matchAnioParens) {
    anio = matchAnioParens[1]
    str = str.replace(/\(((?:19|20)\d{2})\)/, '').trim()
  }

  // Limpiar puntos sobrantes al final
  str = str.replace(/\.+$/, '').trim()

  // Proteger marcas especiales como .NET para no romper títulos
  str = str.replace(/\.NET\b/gi, '___DOTNET___')

  // 3. Extraer URL / DOI si existen
  let url: string | undefined = undefined
  let doi: string | undefined = undefined
  const matchUrl = str.match(/(https?:\/\/[^\s]+)/i)
  if (matchUrl) {
    url = matchUrl[1]
    str = str.replace(matchUrl[1], '').trim()
  }
  const matchDoi = str.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i)
  if (matchDoi) {
    doi = matchDoi[1]
    str = str.replace(matchDoi[1], '').trim()
  }

  // 4. Dividir por puntos seguidos de espacio
  // Preservar abreviaturas de nombres/honores (ej: Fco., Dr., Ph.D., Ph D., L., R., J., etc.)
  const regexAbreviaturas = /\b(?:Fco|Dr|Dra|Ph|Ing|Lic|Prof|Mr|Mrs|Ms|Vol|Ed|No|op|cit|[A-Za-z])\.$/i

  const tokens = str.split(/\.\s+/)
  const segmentos: string[] = []

  let acm = ''
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].trim()
    if (!tok) continue
    if (acm) acm += '. '
    acm += tok
    if (regexAbreviaturas.test(tok) && i < tokens.length - 1) {
      continue
    }
    segmentos.push(acm)
    acm = ''
  }
  if (acm) segmentos.push(acm)

  // Restaurar .NET en los segmentos
  const segmentosRestaurados = segmentos.map(s => s.replace(/___DOTNET___/g, '.NET'))

  let autor: string | undefined = undefined
  let titulo: string = ''
  let editorial: string | undefined = undefined
  let ciudad: string | undefined = undefined

  if (segmentosRestaurados.length >= 3) {
    autor = segmentosRestaurados[0].trim()
    titulo = segmentosRestaurados[1].trim()
    const resto = segmentosRestaurados.slice(2).join('. ').trim()

    if (resto.includes(':')) {
      const parts = resto.split(':')
      ciudad = parts[0].trim()
      editorial = parts.slice(1).join(':').trim().replace(/\.+$/, '')
    } else {
      editorial = resto.replace(/\.+$/, '')
    }
  } else if (segmentosRestaurados.length === 2) {
    autor = segmentosRestaurados[0].trim()
    const seg2 = segmentosRestaurados[1].trim()

    if (seg2.includes(':')) {
      const parts = seg2.split(':')
      titulo = parts[0].trim()
      editorial = parts.slice(1).join(':').trim().replace(/\.+$/, '')
    } else {
      editorial = seg2.replace(/\.+$/, '')
    }
  } else if (segmentosRestaurados.length === 1) {
    titulo = segmentosRestaurados[0].trim().replace(/\.+$/, '')
  }

  // Si no se extrajo año antes pero la editorial lo incluye
  if (!anio && editorial) {
    const matchEdAnio = editorial.match(/\b((?:19|20)\d{2})\b/)
    if (matchEdAnio) {
      anio = matchEdAnio[1]
      editorial = editorial.replace(/\b(?:19|20)\d{2}\b/, '').trim().replace(/^[,\.\s]+|[,\.\s]+$/g, '')
    }
  }

  let tipo: TipoFuente = 'impreso'
  if (url && !doi) tipo = 'sitio_web'
  if (doi) tipo = 'articulo'

  return {
    tipo,
    titulo: titulo || rawInput.replace(/___DOTNET___/g, '.NET').trim(),
    autor: autor || undefined,
    anio: anio || undefined,
    editorial: editorial || undefined,
    ciudad: ciudad || undefined,
    url: url || undefined,
    doi: doi || undefined,
  }
}

/**
 * Parsea un bloque de texto multilínea con varias referencias bibliográficas directas.
 */
export function parseCitasDirectas(text: string): FuenteInformacion[] {
  const lineas = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  return lineas.map(linea => parseCitaDirecta(linea))
}

/**
 * Extrae y normaliza el DOI limpio a partir de una cadena o enlace.
 */
export function limpiarDoi(raw: string): string {
  let doi = raw.trim()
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  doi = doi.replace(/^doi:\s*/i, '')
  return doi.trim()
}

/**
 * Consulta la API de CrossRef para obtener metadatos de un DOI.
 */
export async function buscarPorDoi(rawDoi: string): Promise<FuenteInformacion> {
  const doi = limpiarDoi(rawDoi)
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`

  const resp = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!resp.ok) {
    throw new Error(`No se encontró el DOI especificado (código ${resp.status}).`)
  }

  const data = await resp.json()
  const item = data.message

  // Autores
  let autor = ''
  if (Array.isArray(item.author) && item.author.length > 0) {
    autor = item.author
      .map((a: any) => {
        if (a.family && a.given) return `${a.family}, ${a.given}`
        return a.name || a.family || a.given || ''
      })
      .filter(Boolean)
      .join('; ')
  }

  // Año
  let anio = ''
  const dateParts = item.published?.['date-parts']?.[0] || item.created?.['date-parts']?.[0] || item['published-print']?.['date-parts']?.[0]
  if (Array.isArray(dateParts) && dateParts.length > 0) {
    anio = String(dateParts[0])
  }

  const titulo = Array.isArray(item.title) ? item.title[0] : (item.title || 'Artículo sin título')
  const revista = Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || '')
  const editorial = item.publisher || ''
  const volumen = item.volume || ''
  const paginas = item.page || ''
  const esLibro = item.type === 'book' || item.type === 'monograph' || item.type === 'edited-book'
  const tipo: TipoFuente = esLibro ? 'impreso' : 'articulo'

  return {
    tipo,
    titulo,
    autor: autor || undefined,
    anio: anio || undefined,
    revista: revista || undefined,
    editorial: editorial || undefined,
    volumen: volumen || undefined,
    paginas: paginas || undefined,
    doi,
    url: item.URL || `https://doi.org/${doi}`,
  }
}

/**
 * Consulta Google Books API y Open Library para obtener metadatos de un ISBN.
 */
export async function buscarPorIsbn(rawIsbn: string): Promise<{ fuente: FuenteInformacion; alternativas: Array<{ fuente: FuenteInformacion; descripcionCorta: string }> }> {
  const isbnLimpio = rawIsbn.replace(/[-\s]/g, '').trim()

  // 1. Intentar Google Books API
  try {
    const gUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbnLimpio)}`
    const gResp = await fetch(gUrl)
    if (gResp.ok) {
      const gData = await gResp.json()
      if (Array.isArray(gData.items) && gData.items.length > 0) {
        const principal = mapearGoogleBookAFuente(gData.items[0], isbnLimpio)
        const alternativas = gData.items.slice(1).map((it: any) => ({
          fuente: mapearGoogleBookAFuente(it, isbnLimpio),
          descripcionCorta: `${it.volumeInfo?.title || ''} (${it.volumeInfo?.publishedDate?.substring(0, 4) || ''})`,
        }))
        return { fuente: principal, alternativas }
      }
    }
  } catch {
    // Si falla Google Books, probar con Open Library
  }

  // 2. Intentar Open Library API
  try {
    const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnLimpio}&jscmd=data&format=json`
    const olResp = await fetch(olUrl)
    if (olResp.ok) {
      const olData = await olResp.json()
      const libroKey = `ISBN:${isbnLimpio}`
      if (olData[libroKey]) {
        const item = olData[libroKey]
        const autor = Array.isArray(item.authors) ? item.authors.map((a: any) => a.name).join('; ') : ''
        const anio = item.publish_date ? item.publish_date.match(/\d{4}/)?.[0] : ''
        const editorial = Array.isArray(item.publishers) ? item.publishers.map((p: any) => p.name).join(', ') : ''
        const ciudad = Array.isArray(item.publish_places) ? item.publish_places.map((p: any) => p.name).join(', ') : ''

        return {
          fuente: {
            tipo: 'impreso',
            titulo: item.title || 'Libro sin título',
            autor: autor || undefined,
            anio: anio || undefined,
            editorial: editorial || undefined,
            ciudad: ciudad || undefined,
            isbn: isbnLimpio,
            paginas: item.number_of_pages ? String(item.number_of_pages) : undefined,
            url: item.url || undefined,
          },
          alternativas: [],
        }
      }
    }
  } catch {
    //
  }

  throw new Error(`No se encontró ningún libro con el ISBN ${isbnLimpio}.`)
}

/**
 * Consulta CrossRef para metadatos de un ISSN.
 */
export async function buscarPorIssn(rawIssn: string): Promise<FuenteInformacion> {
  const issn = rawIssn.trim()
  const url = `https://api.crossref.org/journals/${encodeURIComponent(issn)}`

  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  if (resp.ok) {
    const data = await resp.json()
    const item = data.message
    return {
      tipo: 'articulo',
      titulo: `Publicación en ${item.title || 'Revista científica'}`,
      revista: item.title || '',
      editorial: item.publisher || undefined,
      url: `https://portal.issn.org/resource/ISSN/${issn}`,
    }
  }

  // Búsqueda de un artículo representativo con ese ISSN
  const wUrl = `https://api.crossref.org/works?filter=issn:${encodeURIComponent(issn)}&rows=1`
  const wResp = await fetch(wUrl, { headers: { Accept: 'application/json' } })
  if (wResp.ok) {
    const wData = await wResp.json()
    if (wData.message?.items?.[0]) {
      const it = wData.message.items[0]
      return {
        tipo: 'articulo',
        titulo: it.title?.[0] || 'Artículo de revista',
        revista: it['container-title']?.[0] || '',
        editorial: it.publisher || undefined,
        anio: it.published?.['date-parts']?.[0]?.[0] ? String(it.published['date-parts'][0][0]) : undefined,
        url: it.URL || undefined,
      }
    }
  }

  throw new Error(`No se encontraron registros para el ISSN ${issn}.`)
}

/**
 * Deduce metadatos a partir de una URL web.
 */
export function buscarPorUrl(rawUrl: string): FuenteInformacion {
  let url = rawUrl.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  let plataforma = ''
  let tituloSugerido = ''
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      plataforma = 'YouTube'
      tituloSugerido = 'Video educativo / Conferencia'
    } else if (host.includes('scielo.org')) {
      plataforma = 'SciELO'
      tituloSugerido = 'Artículo científico en SciELO'
    } else if (host.includes('redalyc.org')) {
      plataforma = 'Redalyc'
      tituloSugerido = 'Publicación académica en Redalyc'
    } else if (host.includes('dialnet.unirioja.es')) {
      plataforma = 'Dialnet'
      tituloSugerido = 'Recurso bibliográfico en Dialnet'
    } else if (host.includes('sciencedirect.com')) {
      plataforma = 'ScienceDirect'
      tituloSugerido = 'Artículo científico en ScienceDirect'
    } else if (host.includes('ieeexplore.ieee.org')) {
      plataforma = 'IEEE Xplore'
      tituloSugerido = 'Publicación técnica IEEE'
    } else if (host.includes('github.com')) {
      plataforma = 'GitHub'
      tituloSugerido = 'Repositorio de código / Documentación técnica'
    } else if (host.includes('tecnm.mx')) {
      plataforma = 'TecNM'
      tituloSugerido = 'Portal Oficial TecNM / Recursos académicos'
    } else if (host.includes('wikipedia.org')) {
      plataforma = 'Wikipedia'
      tituloSugerido = 'Artículo enciclopédico'
    } else {
      plataforma = parsed.hostname.replace(/^www\./, '')
      tituloSugerido = `Recurso en línea (${plataforma})`
    }
  } catch {
    plataforma = 'Sitio web'
    tituloSugerido = 'Recurso en línea'
  }

  const hoy = new Date().toISOString().split('T')[0]

  return {
    tipo: 'sitio_web',
    titulo: tituloSugerido,
    url,
    plataforma,
    fecha_consulta: hoy,
  }
}

/**
 * Búsqueda general por título o palabras clave mediante Google Books.
 */
export async function buscarPorTituloOGeneral(query: string): Promise<ResultadoBusquedaBibliografica> {
  const q = query.trim()
  const gUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6`
  const resp = await fetch(gUrl)

  if (!resp.ok) {
    throw new Error('Error al consultar el catálogo bibliográfico.')
  }

  const data = await resp.json()
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(`No se encontraron resultados para "${q}".`)
  }

  const principal = mapearGoogleBookAFuente(data.items[0])
  const alternativas = data.items.slice(1).map((it: any) => ({
    fuente: mapearGoogleBookAFuente(it),
    descripcionCorta: `${it.volumeInfo?.title || ''} — ${it.volumeInfo?.authors?.join(', ') || ''} (${it.volumeInfo?.publishedDate?.substring(0, 4) || ''})`,
  }))

  return {
    tipoDetectado: 'texto',
    fuente: principal,
    alternativas,
  }
}

/**
 * Mapea la estructura de un item de Google Books a la interfaz FuenteInformacion de la planeación.
 */
function mapearGoogleBookAFuente(item: any, isbnFallback?: string): FuenteInformacion {
  const vi = item.volumeInfo || {}
  const titulo = vi.title ? `${vi.title}${vi.subtitle ? `: ${vi.subtitle}` : ''}` : 'Libro sin título'
  const autor = Array.isArray(vi.authors) ? vi.authors.join('; ') : ''
  const anio = vi.publishedDate ? vi.publishedDate.substring(0, 4) : ''
  const editorial = vi.publisher || ''
  const paginas = vi.pageCount ? String(vi.pageCount) : ''

  // Buscar ISBN 13 o 10
  let isbn = isbnFallback || ''
  if (!isbn && Array.isArray(vi.industryIdentifiers)) {
    const isbn13 = vi.industryIdentifiers.find((id: any) => id.type === 'ISBN_13')?.identifier
    const isbn10 = vi.industryIdentifiers.find((id: any) => id.type === 'ISBN_10')?.identifier
    isbn = isbn13 || isbn10 || ''
  }

  return {
    tipo: 'impreso',
    titulo,
    autor: autor || undefined,
    anio: anio || undefined,
    editorial: editorial || undefined,
    isbn: isbn || undefined,
    paginas: paginas || undefined,
    url: vi.infoLink || undefined,
  }
}

/**
 * Resuelve y autocompleta automáticamente una fuente a partir de cualquier identificador o texto.
 */
export async function resolverFuentePorIdentificador(input: string): Promise<ResultadoBusquedaBibliografica> {
  const limpio = input.trim()
  if (!limpio) throw new Error('Ingresa un identificador (ISBN, DOI, ISSN, URL) o título.')

  const tipo = detectarTipoIdentificador(limpio)

  switch (tipo) {
    case 'doi': {
      const fuente = await buscarPorDoi(limpio)
      return { tipoDetectado: 'doi', fuente }
    }
    case 'isbn': {
      const res = await buscarPorIsbn(limpio)
      return { tipoDetectado: 'isbn', fuente: res.fuente, alternativas: res.alternativas }
    }
    case 'issn': {
      const fuente = await buscarPorIssn(limpio)
      return { tipoDetectado: 'issn', fuente }
    }
    case 'url': {
      const fuente = buscarPorUrl(limpio)
      return { tipoDetectado: 'url', fuente }
    }
    case 'texto':
    default: {
      const fuenteParsed = parseCitaDirecta(limpio)
      let alternativas: Array<{ fuente: FuenteInformacion; descripcionCorta: string }> = []
      
      try {
        const resCat = await buscarPorTituloOGeneral(fuenteParsed.titulo || limpio)
        if (resCat.fuente && resCat.fuente.titulo !== fuenteParsed.titulo) {
          alternativas.push({
            fuente: resCat.fuente,
            descripcionCorta: `Google Books: ${resCat.fuente.titulo} ${resCat.fuente.autor ? `(${resCat.fuente.autor})` : ''}`,
          })
        }
        if (resCat.alternativas) {
          alternativas = [...alternativas, ...resCat.alternativas]
        }
      } catch {
        // Si no hay internet o no hay resultados en Google Books, se mantiene la fuente parseada directa
      }

      return {
        tipoDetectado: 'texto',
        fuente: fuenteParsed,
        alternativas,
      }
    }
  }
}
