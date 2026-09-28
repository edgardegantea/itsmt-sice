export function mutationError(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Ocurrió un error. Intenta de nuevo.'
}

/** Para descargas con `responseType: 'blob'`: si la petición falla, axios entrega el cuerpo
 * del error como Blob en vez de JSON — hay que leerlo como texto y reempacarlo para que
 * mutationError() pueda seguir leyendo `.response.data.message` normalmente. */
export async function errorDeBlob(e: unknown): Promise<unknown> {
  const err = e as { response?: { data?: unknown } }
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      const texto = await data.text()
      const json = JSON.parse(texto)
      return { ...(err as object), response: { ...err.response, data: json } }
    } catch {
      // no era JSON — se deja pasar tal cual, mutationError() cae al mensaje genérico
    }
  }
  return e
}
