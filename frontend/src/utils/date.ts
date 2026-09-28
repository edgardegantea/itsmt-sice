/**
 * Formateo centralizado de fechas — todo el sistema opera con horario de
 * Ciudad de México (America/Mexico_City) sin importar en qué zona horaria
 * esté el navegador de quien lo usa (el backend guarda todo en UTC). Antes de
 * este archivo cada página reimplementaba su propio `toLocaleDateString`,
 * casi siempre sin `timeZone`, lo que dejaba la hora local del navegador
 * decidir el resultado — incorrecto para usuarios fuera de México y
 * inconsistente entre páginas.
 *
 * Usa estas funciones en vez de llamar `toLocaleDateString`/`toLocaleString`
 * directamente sobre un `Date`.
 */

const TIME_ZONE = 'America/Mexico_City'
const LOCALE = 'es-MX'

function aFecha(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return isNaN(d.getTime()) ? null : d
}

/** "5 de agosto de 2026" */
export function formatFecha(valor: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = aFecha(valor)
  if (!d) return '—'
  return d.toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric', ...opts })
}

/** "05/08/2026" */
export function formatFechaCorta(valor: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = aFecha(valor)
  if (!d) return '—'
  return d.toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', ...opts })
}

/** "09:00" */
export function formatHora(valor: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = aFecha(valor)
  if (!d) return '—'
  return d.toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', ...opts })
}

/** "5 de agosto de 2026, 09:00" */
export function formatFechaHora(valor: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = aFecha(valor)
  if (!d) return '—'
  return d.toLocaleString(LOCALE, {
    timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', ...opts,
  })
}
