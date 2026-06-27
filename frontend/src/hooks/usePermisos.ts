import { useAuthStore } from '../store/authStore'

const ROLES_DIRECTIVOS = [
  'control_escolar',
  'direccion_general',
  'direccion_academica',
  'subdireccion_academica',
]

/** True si el usuario autenticado puede eliminar registros. */
export function usePuedeEliminar(): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  // Los roles directivos tienen acceso total pero sin capacidad de eliminar
  return !user.roles.some(r => ROLES_DIRECTIVOS.includes(r))
}
