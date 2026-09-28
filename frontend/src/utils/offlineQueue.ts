/**
 * Cola offline genérica basada en localStorage — pensada para prefectura haciendo
 * rondas en zonas del campus con mala señal: si el POST falla por falta de red, la
 * acción se guarda aquí en vez de perderse, y se reintenta sola en cuanto vuelve la
 * conexión (evento 'online') o cuando el usuario pide sincronizar a mano.
 *
 * No es un Service Worker ni cachea GETs — solo encola escrituras que fallaron por
 * red, que es el caso real de uso (registrar una incidencia sin señal).
 */

export interface ColaItem<T = unknown> {
  id: string
  tipo: string
  payload: T
  creadoEn: string
  intentos: number
  ultimoError?: string
}

const STORAGE_KEY = 'sice_cola_offline'

function leerCola(): ColaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarCola(items: ColaItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/** Error de red real (sin conexión, DNS, timeout) — distinto de un 4xx/5xx del
 * servidor, que sí llegó y respondió (no debe reencolarse, es un error de datos). */
export function esErrorDeRed(error: unknown): boolean {
  if (!navigator.onLine) return true
  const err = error as { code?: string; message?: string; response?: unknown }
  return !err?.response && (err?.code === 'ERR_NETWORK' || /network/i.test(err?.message ?? ''))
}

export function encolar<T>(tipo: string, payload: T): ColaItem<T> {
  const item: ColaItem<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    payload,
    creadoEn: new Date().toISOString(),
    intentos: 0,
  }
  guardarCola([...leerCola(), item as ColaItem])
  window.dispatchEvent(new CustomEvent('sice-cola-offline-cambio'))
  return item
}

export function obtenerCola(tipo?: string): ColaItem[] {
  const items = leerCola()
  return tipo ? items.filter(i => i.tipo === tipo) : items
}

export function quitarDeCola(id: string) {
  guardarCola(leerCola().filter(i => i.id !== id))
  window.dispatchEvent(new CustomEvent('sice-cola-offline-cambio'))
}

export function marcarIntento(id: string, error?: string) {
  guardarCola(leerCola().map(i => i.id === id ? { ...i, intentos: i.intentos + 1, ultimoError: error } : i))
  window.dispatchEvent(new CustomEvent('sice-cola-offline-cambio'))
}

/** Procesa todos los items de un tipo con el handler dado; quita de la cola los que
 * se sincronizaron bien y deja los que fallaron (para reintentar después). */
export async function sincronizarCola<T>(tipo: string, handler: (payload: T) => Promise<unknown>) {
  const items = obtenerCola(tipo) as ColaItem<T>[]
  let sincronizados = 0
  for (const item of items) {
    try {
      await handler(item.payload)
      quitarDeCola(item.id)
      sincronizados++
    } catch (e) {
      marcarIntento(item.id, e instanceof Error ? e.message : 'Error desconocido')
    }
  }
  return { sincronizados, pendientes: obtenerCola(tipo).length }
}
