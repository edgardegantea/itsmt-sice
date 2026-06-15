# Sprint 2 — Permanencia, Bajas y Trámites

**Duración:** 5 semanas  
**Estado:** ✅ Completado  
**Compliance:** TecNM-AC-PO-002 — Reinscripción de Alumnos

---

## Objetivo

Implementar el flujo completo de permanencia conforme al procedimiento TecNM-AC-PO-002: solicitud y aprobación de reinscripción con validación de adeudos, orden de reinscripción con ventanas por carrera/semestre (≥5 días hábiles), resello digital de credencial, solicitud y emisión de constancias oficiales en PDF con folio único, y registro de bajas.

---

## Historias comprometidas

| ID    | Historia                                                              | SP  | Estado |
|-------|-----------------------------------------------------------------------|-----|--------|
| S2-01 | Alumno solicita reinscripción al siguiente periodo sin adeudos        | 8   | ✅     |
| S2-02 | Admin aprueba o rechaza solicitudes de reinscripción con observaciones| 5   | ✅     |
| S2-03 | Alumno solicita constancia (estudios/inscripción/calificaciones)      | 5   | ✅     |
| S2-04 | Admin genera constancia oficial PDF con folio único y firma digital   | 8   | ✅     |
| S2-06 | Alumno solicita baja temporal antes del día 20 hábil                  | 5   | ✅     |
| S2-07 | Admin publica Orden de Reinscripción ≥5 días hábiles antes (PO-002 §3.3) | 3 | ✅  |
| S2-08 | Admin registra resello digital de credencial al completar reinscripción | 3 | ✅   |

**Total:** 37 SP

## Historias diferidas

| ID    | Historia                                                      | SP |
|-------|---------------------------------------------------------------|----|
| S2-05 | Baja parcial/temporal/definitiva con validación plazos TecNM  | 8  |
| S2-09 | CFDI reinscripción (RFC TNM140723GFA)                         | 8  |

---

## Esquema de Base de Datos — tablas nuevas

| Tabla               | Descripción                                           | Soft Delete |
|---------------------|-------------------------------------------------------|-------------|
| `adeudos`           | Adeudos pendientes del alumno                         | Sí          |
| `orden_reinscripcion` | Ventanas de reinscripción por carrera/semestre       | No          |
| `reinscripciones`   | Solicitudes de reinscripción por periodo              | Sí          |
| `bajas`             | Registro de bajas (parcial/temporal/definitiva)       | Sí          |
| `constancias`       | Solicitudes y emisión de constancias con folio único  | Sí          |

---

## API REST — endpoints nuevos

| Método  | Ruta                                                  | Descripción                              | Rol             |
|---------|-------------------------------------------------------|------------------------------------------|-----------------|
| GET     | `/api/reinscripciones`                                | Listar solicitudes                       | Admin           |
| POST    | `/api/reinscripciones`                                | Solicitar reinscripción                  | Alumno          |
| PATCH   | `/api/reinscripciones/{id}/estatus`                   | Aprobar o rechazar                       | Admin           |
| PATCH   | `/api/reinscripciones/{id}/resello-credencial`        | Registrar resello de credencial          | Admin           |
| POST    | `/api/orden-reinscripcion`                            | Publicar orden (≥5 días hábiles)         | Admin           |
| GET     | `/api/orden-reinscripcion/{periodo_id}`               | Consultar orden del periodo              | Alumno/Admin    |
| GET     | `/api/alumnos/{alumno}/adeudos`                       | Adeudos pendientes del alumno            | Alumno/Admin    |
| POST    | `/api/bajas`                                          | Registrar baja                           | Admin           |
| GET     | `/api/alumnos/{alumno}/bajas`                         | Historial de bajas                       | Admin/Director  |
| GET     | `/api/constancias`                                    | Listar constancias (panel admin)         | Admin           |
| POST    | `/api/constancias`                                    | Solicitar constancia                     | Alumno          |
| GET     | `/api/alumnos/{alumno}/constancias`                   | Constancias del alumno                   | Alumno/Admin    |
| POST    | `/api/constancias/{id}/emitir`                        | Emitir constancia (admin)                | Admin           |

---

## Arquitectura Frontend — módulo permanencia

```
src/features/permanencia/
├── services/permanencia.ts         # API client + tipos
├── hooks/useConstanciaPdf.ts       # Generación PDF client-side
├── pdf/ConstanciaPdf.tsx           # Componente @react-pdf/renderer
└── pages/
    ├── TramitesAlumnoPage.tsx      # Portal alumno (reinscripción + constancias)
    ├── ReinscripcionesAdminPage.tsx# Gestión admin de reinscripciones
    └── ConstanciasAdminPage.tsx    # Emisión y descarga de constancias
```

### Rutas nuevas

| Ruta                       | Acceso          | Página                       |
|----------------------------|-----------------|------------------------------|
| `/alumno/tramites`         | rol: alumno     | TramitesAlumnoPage           |
| `/admin/reinscripciones`   | ADMIN_ROLES     | ReinscripcionesAdminPage     |
| `/admin/constancias`       | ADMIN_ROLES     | ConstanciasAdminPage         |

---

## PDF de constancia

- Generación **client-side** con `@react-pdf/renderer` (igual que Sprint 1)
- Logo institucional via `cfg.logo_base64` (sin cross-origin)
- Folio único: `CE-2026-00001` (estudios), `CI-` (inscripción), `CC-` (calificaciones)
- Firmantes: Control Escolar + Director General
- Descarga directa al aprobar (`a.download`, no `target="_blank"`)

---

## DDD — dominio nuevo

`App\Domains\Permanencia\`
- `Models\`: Reinscripcion, OrdenReinscripcion, Adeudo, Baja, Constancia
- `Services\`: ReinscripcionService, ConstanciaService
- `Policies\`: ReinscripcionPolicy, ConstanciaPolicy, BajaPolicy
