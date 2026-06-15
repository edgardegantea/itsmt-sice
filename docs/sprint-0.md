# Sprint 0 — Infraestructura base

**Duración:** 1 semana  
**Estado:** ✅ Completado

## Objetivo

Establecer el esqueleto del proyecto: repositorio, stack tecnológico, base de datos, autenticación y pipeline de pruebas. Al finalizar este sprint el equipo puede levantar el servidor y autenticarse con roles definidos.

---

## Stack implementado

| Capa       | Tecnología                              |
|------------|-----------------------------------------|
| Backend    | Laravel 13 (PHP 8.4), API-only          |
| Base datos | PostgreSQL 18, UUID v4 PKs              |
| Auth       | Laravel Sanctum (tokens en memoria)     |
| Roles      | Spatie Laravel Permission v8            |
| Frontend   | React 19 + Vite + TypeScript            |
| Estado     | Zustand (token nunca en localStorage)   |
| HTTP       | Axios + TanStack Query v5               |
| Estilos    | Tailwind CSS v4                         |

---

## Historias de usuario cubiertas

| ID    | Historia                                                                 | Criterio de aceptación                          |
|-------|--------------------------------------------------------------------------|-------------------------------------------------|
| S0-01 | Como sistema, necesito una base de datos con esquema inicial             | Migraciones corren sin error; tablas creadas    |
| S0-02 | Como administrador, quiero iniciar sesión con email y contraseña         | POST /api/auth/login devuelve token Bearer      |
| S0-03 | Como usuario autenticado, quiero consultar mi perfil                     | GET /api/auth/me devuelve datos y roles         |
| S0-04 | Como usuario autenticado, quiero cerrar sesión                           | POST /api/auth/logout revoca el token           |
| S0-05 | Como sistema, necesito roles para controlar acceso                       | 4 roles creados: admin, jefe_carrera, docente, alumno |

---

## Endpoints implementados

| Método | Ruta              | Acceso   | Descripción              |
|--------|-------------------|----------|--------------------------|
| POST   | /api/auth/login   | Público  | Autenticación con token  |
| GET    | /api/auth/me      | Auth     | Perfil del usuario       |
| POST   | /api/auth/logout  | Auth     | Revocación del token     |

---

## Decisiones técnicas

- **UUID v4** en todas las PKs para evitar enumeración secuencial en la API.
- **`uuidMorphs()`** en `personal_access_tokens` y **`uuid()`** en `model_morph_key` de Spatie para compatibilidad con UUIDs (fix crítico: `morphs()` usa bigint por defecto).
- **`guard_name = 'web'`** en todos los roles Spatie; Sanctum usa el guard `web` internamente cuando se valida con `auth:sanctum`.
- **Token en memoria** (Zustand) — nunca en `localStorage` ni cookies persistentes, por requerimiento de seguridad del plan.
- **`AuthorizesRequests` trait** añadido manualmente al `Controller` base de Laravel 13, ya que no lo incluye por defecto.

---

## Seeders

| Seeder                  | Datos creados                                                     |
|-------------------------|-------------------------------------------------------------------|
| `RoleSeeder`            | 4 roles: admin, jefe_carrera, docente, alumno                     |
| `UsuariosPruebaSeeder`  | 4 usuarios con `Password123!` (admin, jefe, docente, alumno)      |

**Credenciales de prueba:**

| Email                       | Rol           |
|-----------------------------|---------------|
| admin@itsmt.edu.mx          | admin         |
| jefe@itsmt.edu.mx           | jefe_carrera  |
| docente@itsmt.edu.mx        | docente       |
| alumno@itsmt.edu.mx         | alumno        |

---

## Cómo probar

```bash
# 1. Levantar backend
cd backend && php artisan serve

# 2. Ejecutar tests
php artisan test

# 3. Probar con Postman
# Importar: docs/SICE-ITSMT.postman_collection.json
# El script de login guarda el token automáticamente en la variable {{token}}
```

---

## Tests

```
Tests\Feature\Api\AuthTest  ✅ 5/5
  ✓ login_exitoso
  ✓ login_falla_con_credenciales_incorrectas
  ✓ me_retorna_usuario_autenticado
  ✓ me_falla_sin_autenticacion
  ✓ logout_revoca_token
```
