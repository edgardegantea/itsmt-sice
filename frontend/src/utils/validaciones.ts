// Regex oficial CURP (SEGOB)
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

export const validarCurp = (curp: string): string => {
  if (!curp) return 'La CURP es obligatoria.'
  if (curp.length !== 18) return 'La CURP debe tener exactamente 18 caracteres.'
  if (!CURP_REGEX.test(curp)) return 'Formato incorrecto. Ej: ABCD991231HVZRXX00'
  return ''
}

export const validarEmail = (email: string): string => {
  if (!email) return 'El correo electrónico es obligatorio.'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return 'Ingresa un correo electrónico válido.'
  return ''
}

export const validarTelefono = (tel: string): string => {
  if (!tel) return ''
  if (!/^\d{10}$/.test(tel)) return 'El teléfono debe tener exactamente 10 dígitos.'
  return ''
}

export const validarPromedio = (val: string): string => {
  const n = parseFloat(val)
  if (!val) return 'El promedio es obligatorio.'
  if (isNaN(n)) return 'Ingresa un número válido.'
  if (n < 6) return 'El promedio mínimo aceptado es 6.0.'
  if (n > 10) return 'El promedio no puede ser mayor a 10.0.'
  return ''
}

export const validarPassword = (pass: string): string => {
  if (!pass) return 'La contraseña es obligatoria.'
  if (pass.length < 8) return 'Mínimo 8 caracteres.'
  if (!/[a-zA-Z]/.test(pass)) return 'Debe incluir al menos una letra.'
  if (!/\d/.test(pass)) return 'Debe incluir al menos un número.'
  return ''
}

// Extrae mensajes de error de una respuesta de la API de Laravel (422)
export const extraerErroresApi = (
  err: unknown
): Record<string, string> => {
  const e = err as { response?: { data?: { errors?: Record<string, string[]> } } }
  const errors = e?.response?.data?.errors ?? {}
  return Object.fromEntries(
    Object.entries(errors).map(([k, msgs]) => [k, msgs[0] ?? ''])
  )
}

export const mensajeErrorApi = (err: unknown): string => {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? 'Error inesperado. Intenta de nuevo.'
}
