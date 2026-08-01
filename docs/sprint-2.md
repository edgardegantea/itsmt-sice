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
| S2-05 | Baja parcial/temporal/definitiva con validación plazos TecNM          | 8   | ✅     |
| S2-06 | Alumno solicita baja temporal antes del día 20 hábil                  | 5   | ✅     |
| S2-07 | Admin publica Orden de Reinscripción ≥5 días hábiles antes (PO-002 §3.3) | 3 | ✅  |
| S2-08 | Admin registra resello digital de credencial al completar reinscripción | 3 | ✅   |
| S2-09 | Captura de CFDI de resello (folio fiscal, RFC TNM140723GFA)           | 8   | ✅     |
| S2-10 | Admin/jefe_carrera formaliza el reingreso tras baja temporal aprobada | 3   | ✅     |

**Total:** 48 SP

> S2-05 aparecía como diferida en una versión anterior de este documento; el
> código (`BajaService::validarPlazo`, tipos parcial/temporal/definitiva) ya la
> implementaba por completo — corrección de documentación, no de comportamiento.
>
> S2-09 **no** timbra CFDI ante el SAT (fuera de alcance: requeriría integrar
> un PAC autorizado). Reutiliza el mismo patrón que `CobroInscripcionController`:
> el CFDI se genera en el sistema de facturación institucional y aquí solo se
> captura folio fiscal / sello digital / RFC del pagador para dejar
> trazabilidad, ligando el recibo a la reinscripción vía `recibo_cobro_id`.
>
> S2-10 cierra un hueco funcional: `bajas.reingreso_posible` se guardaba desde
> el sprint original pero no existía ningún flujo que lo usara. Ahora
> `PATCH /api/bajas/{id}/reingreso` valida tipo=temporal, estatus=aprobada,
> `reingreso_posible` y que el alumno siga en `baja_temporal`, y deja auditoría
> (`reingreso_registrado`, `fecha_reingreso`, `reingreso_por`).

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
| PATCH   | `/api/reinscripciones/{id}/resello-credencial`        | Registrar resello + recibo CFDI (S2-09)  | Admin           |
| POST    | `/api/orden-reinscripcion`                            | Publicar orden (≥5 días hábiles)         | Admin           |
| GET     | `/api/orden-reinscripcion/{periodo_id}`               | Consultar orden del periodo              | Alumno/Admin    |
| GET     | `/api/alumnos/{alumno}/adeudos`                       | Adeudos pendientes del alumno            | Alumno/Admin    |
| POST    | `/api/bajas`                                          | Registrar baja                           | Admin           |
| POST    | `/api/bajas/solicitar`                                | Alumno solicita su baja temporal         | Alumno          |
| GET     | `/api/bajas/mias`                                     | Bajas del alumno autenticado             | Alumno          |
| PATCH   | `/api/bajas/{id}/estatus`                             | Aprobar o rechazar baja solicitada       | Admin/Jefe      |
| PATCH   | `/api/bajas/{id}/reingreso`                           | Formalizar reingreso (S2-10)             | Admin/Jefe      |
| GET     | `/api/alumnos/{alumno}/bajas`                         | Historial de bajas                       | Admin/Director  |
| GET     | `/api/constancias`                                    | Listar constancias (panel admin)         | Admin           |
| POST    | `/api/constancias`                                    | Solicitar constancia                     | Alumno          |
| GET     | `/api/alumnos/{alumno}/constancias`                   | Constancias del alumno                   | Alumno/Admin    |
| POST    | `/api/constancias/{id}/emitir`                        | Emitir constancia (admin)                | Admin           |
| GET     | `/api/constancias/{id}/pdf`                           | PDF con folio único y membrete (Gotenberg, server-side) | Alumno/Admin |

---

## Arquitectura Frontend — módulo permanencia

```
src/features/permanencia/
├── services/permanencia.ts         # API client + tipos
├── hooks/useConstanciaPdf.ts       # Descarga el PDF generado en servidor (Gotenberg)
└── pages/
    ├── TramitesAlumnoPage.tsx      # Portal alumno (reinscripción + constancias)
    ├── ReinscripcionesAdminPage.tsx# Gestión admin: reinscripciones, orden, adeudos, bajas
    ├── BajasAdminPage.tsx          # Cola de aprobación/rechazo/reingreso de bajas
    └── ConstanciasAdminPage.tsx    # Emisión y descarga de constancias
```

### Rutas nuevas

| Ruta                       | Acceso          | Página                       |
|----------------------------|-----------------|------------------------------|
| `/alumno/tramites`         | rol: alumno     | TramitesAlumnoPage           |
| `/admin/reinscripciones`   | ADMIN_ROLES     | ReinscripcionesAdminPage     |
| `/admin/bajas`             | ADMIN_ROLES     | BajasAdminPage                |
| `/admin/constancias`       | ADMIN_ROLES     | ConstanciasAdminPage         |

---

## PDF de constancia

- Generación **server-side** vía `GotenbergService` (`GET /api/constancias/{id}/pdf`), no client-side —
  el componente client-side `@react-pdf/renderer` que existía en el sprint original quedó sin uso tras
  esta migración y fue retirado.
- Logo, membrete y firmantes se resuelven en el servidor desde `ConfiguracionInstitucional` y `DirectorioPersonal`.
- Folio único: `CE-2026-00001` (estudios), `CI-` (inscripción), `CC-` (calificaciones)
- El frontend abre el PDF en una vista previa (`openPdfPreview`), no como descarga directa.

---

## DDD — dominio nuevo

`App\Domains\Permanencia\`
- `Models\`: Reinscripcion, OrdenReinscripcion, Adeudo, Baja, Constancia
- `Services\`: ReinscripcionService, ConstanciaService, BajaService
- `Policies\`: ReinscripcionPolicy, ConstanciaPolicy, BajaPolicy, AdeudoPolicy, OrdenReinscripcionPolicy

El resello (S2-09) reutiliza `App\Domains\Cobros\Models\ReciboCobro`, ya usado por
`CobroInscripcionController` para el cobro de inscripción — `reinscripciones.recibo_cobro_id`
es la FK que los vincula.
