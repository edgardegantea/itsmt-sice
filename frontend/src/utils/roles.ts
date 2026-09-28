// Orden de prioridad para elegir un "rol principal" cuando el usuario tiene
// varios — se usa tanto para decidir a dónde aterriza después de iniciar
// sesión como para inicializar el selector de rol activo (ver Layout.tsx).
export const ROLE_PRIORITY = [
  'superadmin',
  'admin',
  'director_academico',
  'direccion_general',
  'direccion_academica',
  'subdireccion_academica',
  'control_escolar',
  'jefe_carrera',
  'personal_administrativo',
  'desarrollo_academico',
  'docente',
  'alumno',
]

export function rolPrincipal(roles: string[]): string | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r
  return roles[0] ?? null
}

// A dónde mandar al usuario cuando ese rol queda activo (al iniciar sesión o
// al cambiar de rol en el selector).
export function destinoDeRol(rol: string | null): string {
  switch (rol) {
    case 'superadmin':
    case 'admin':
    case 'director_academico':
    case 'direccion_general':
    case 'direccion_academica':
    case 'subdireccion_academica':
      return '/admin'
    case 'control_escolar':
    case 'personal_administrativo':
      return '/admin/aspirantes'
    case 'jefe_carrera':
      return '/jefe-carrera/dashboard'
    case 'desarrollo_academico':
      return '/desarrollo-academico/instrumentaciones'
    case 'docente':
      return '/docente'
    case 'alumno':
      return '/alumno/dashboard'
    // Cualquier otro rol de personal (jefaturas, control escolar, etc.) sin una
    // ruta dedicada cae aquí — nunca a '/login', que dejaría al usuario ya
    // autenticado varado en la pantalla de login sin ningún mensaje de error visible.
    default:
      return '/admin'
  }
}

export function destinoSegunRol(roles: string[]): string {
  return destinoDeRol(rolPrincipal(roles))
}
