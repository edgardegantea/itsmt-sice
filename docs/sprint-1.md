# Sprint 1 — Módulo de Admisión

**Duración:** 5 semanas  
**Estado:** ✅ Completado  
**Compliance:** TecNM-AC-PO-001 — Inscripción de Estudiantes

---

## Objetivo

Implementar el flujo completo de admisión conforme al procedimiento TecNM-AC-PO-001:
registro de aspirante, validación de documentos, inscripción formal con generación de número de control,
creación del expediente académico y emisión de los 4 documentos oficiales en PDF.

---

## Historias comprometidas

| ID    | Historia                                                            | SP  | Estado |
|-------|---------------------------------------------------------------------|-----|--------|
| S1-01 | Registro en línea de aspirante con datos TecNM y folio EXANI-II    | 8   | ✅     |
| S1-03 | Listado de aspirantes con filtros y cambio de estatus               | 5   | ✅     |
| S1-04 | Inscripción formal: NC, expediente académico (alumno), PDF compromiso | 8 | ✅     |
| S1-05 | Carta Compromiso del Estudiante PDF (Reglamento TecNM Art. 2)       | 3   | ✅     |
| S1-07 | Solicitud de Inscripción PDF (PO-001-02) con checklist documentos   | 3   | ✅     |
| S1-08 | Contrato con el Estudiante PDF bilateral (PO-001-03)                | 3   | ✅     |
| S1-09 | Autorización de Consulta de Expediente (PO-001-04)                  | 3   | ✅     |
| S1-10 | Carta Compromiso de Entrega de Documentos (PO-001-05)               | 3   | ✅     |

| S1-06 | Lista Oficial de Aspirantes Aceptados PDF (PO-001-01)           | 3   | ✅     |
| S1-11 | Recibo Oficial de Cobro CFDI (RFC TNM140723GFA)                 | 8   | ✅     |
| S1-12 | Credencial del estudiante con foto y firma del Director         | 5   | ✅     |
| S1-13 | Libro de Registro de Números de Control digital                 | 3   | ✅     |
| S1-14 | Dashboard del estudiante — datos académicos y número de control  | 3   | ✅     |

**Total comprometido:** 61 SP

## Correcciones aplicadas vs. documento (auditoría v15.0)

| Campo | Antes | Ahora | Fuente |
|-------|-------|-------|--------|
| `alumnos.estatus` enum | `baja_parcial` | `baja_definitiva` | Plan v15.0 §BD |
| `aspirantes.documentos` JSON | checklist hardcoded en PDF | leído del registro + checkboxes en formulario | S1-01 criterio + §BD |
| S1-06 | diferida | implementada | endpoint comprometido en §API |
| `tipo_ingreso_registro` | siempre `Licenciatura` (hardcoded) | derivado del `tipo_ingreso`: Traslado → `Traslado`, Equivalencia → `Equivalencia`, Revalidacion → `Revalidacion`, resto → `Licenciatura` | auditoría v15.0 + TecNM-AC-PO-001 |
| Modal inscripción | sin selector de tipo ingreso | dropdown Nuevo ingreso / Reingreso / Traslado / Equivalencia / Revalidación | auditoría v15.0 |
| `periodos.tipo` enum | `regular \| intensivo` (incorrecto) | `ordinario \| verano \| intersemestral` (TecNM) — migración 2026_06_16_100000 normaliza datos existentes | auditoría v15.0 §BD |
| `libro_registro_nc.blade.php` | agrupa por `tipo_ingreso` | agrupa por `tipo_ingreso_registro` (Licenciatura/Traslado/Equivalencia/Revalidacion — catálogo oficial) | auditoría v15.0 S1-13 |
| S1-07 checklist documentos | 8 items hardcoded en blade ignorando variable del controller | blade ahora usa los 13 items dinámicos pasados por `InscripcionPdfController::solicitudInscripcion()` — refleja estado real del expediente digital | auditoría v15.0 S1-07 |
| S1-10 activación bandera | `cartaCompromisoDocs()` solo generaba el PDF | ahora también activa `pendiente_certificado_bachillerato = true` en el expediente del alumno (criterio explícito del docx: "activa la bandera en el expediente") | auditoría v15.0 S1-10 |
| S1-13 libro permanente | `Alumno::with(...)` excluía soft-deleted (bajas definitivas) | cambiado a `Alumno::withTrashed()` — el libro es registro permanente e inmutable per docx | auditoría v15.0 S1-13 |
| TramitesAlumnoPage UX | botón reinscripción sin deshabilitar ni advertir cuando `pendiente_certificado_bachillerato = true` | `puedeReinscribirse` ahora incluye `!pendienteCertificado`; se muestra banner ámbar previo explicando el bloqueo (TecNM-AC-PO-001-05) | auditoría v15.0 S1-10/UX |

### Compliance gap corregido — TecNM-AC-PO-001-05

**Bloqueo de reinscripción por certificado de bachillerato:**  
El procedimiento TecNM-AC-PO-001-05 establece que si el alumno no ha entregado el certificado de bachillerato, el sistema debe **bloquear automáticamente** su reinscripción.

- `ReinscripcionService::solicitar()` ahora verifica `$alumno->pendiente_certificado_bachillerato` antes de crear la solicitud.  
- Si es `true`, lanza `DomainException` con mensaje: *"No puedes reinscribirte hasta entregar el certificado de bachillerato (TecNM-AC-PO-001-05). Acude a Control Escolar."*  
- El admin puede desbloquear actualizando el campo desde `PATCH /api/alumnos/{id}` (checkbox en la UI de Alumnos).
- `DashboardAlumnoPage` ya mostraba la advertencia visual; ahora el backend también bloquea el trámite.

## Historias diferidas (Ciclo 2 / Post-Sprint 14)

| ID    | Historia                                                    | SP |
|-------|-------------------------------------------------------------|----|
| S1-02 | Confirmación por correo al aspirante *(implementada anticipadamente)* | 3 |

---

## Campos del formulario de aspirante (S1-01)

| Campo                      | Tipo     | Req | Notas                                |
|----------------------------|----------|-----|--------------------------------------|
| nombres                    | string   | ✓   | max:100                              |
| apellido_paterno           | string   | ✓   | max:100                              |
| apellido_materno           | string   |     | max:100                              |
| curp                       | string   | ✓   | size:18, único, regex CURP           |
| fecha_nacimiento           | date     | ✓   | before:today                         |
| sexo                       | enum     | ✓   | masculino \| femenino                |
| municipio_procedencia      | string   | ✓   | max:120                              |
| escuela_bachillerato       | string   | ✓   | max:200                              |
| promedio_bachillerato      | decimal  | ✓   | min:6, max:10                        |
| turno_preferido            | enum     | ✓   | matutino \| vespertino               |
| email                      | email    | ✓   | único en aspirantes                  |
| telefono                   | string   |     | max:15                               |
| folio_preinscripcion_tecnm | string   |     | folio de ingreso.tecnm.mx            |
| folio_exani                | string   |     | folio del examen EXANI-II            |
| puntaje_exani              | decimal  |     | puntaje del EXANI-II                 |
| carrera_id                 | uuid     | ✓   | exists:carreras                      |
| periodo_id                 | uuid     | ✓   | exists:periodos                      |

---

## Endpoints implementados

| Método | Ruta                                                        | Acceso       | Historia |
|--------|-------------------------------------------------------------|--------------|----------|
| POST   | /api/auth/forgot-password                                   | Público      | —        |
| POST   | /api/auth/reset-password                                    | Público      | —        |
| GET    | /api/carreras                                               | Público      | —        |
| GET    | /api/periodos/activo                                        | Público      | —        |
| POST   | /api/aspirantes                                             | Público      | S1-01    |
| GET    | /api/aspirantes                                             | admin+       | S1-03    |
| GET    | /api/aspirantes/{id}                                        | admin+       | S1-03    |
| PATCH  | /api/aspirantes/{id}                                        | admin+       | —        |
| PATCH  | /api/aspirantes/{id}/estatus                                | admin+       | S1-03    |
| POST   | /api/inscripciones                                          | admin+       | S1-04    |
| GET    | /api/inscripciones/{id}/solicitud-inscripcion/pdf           | admin+       | S1-07    |
| GET    | /api/inscripciones/{id}/carta-compromiso/pdf                | admin+       | S1-05    |
| GET    | /api/inscripciones/{id}/contrato-estudiante/pdf             | admin+       | S1-08    |
| GET    | /api/inscripciones/{id}/carta-compromiso-docs/pdf           | admin+       | S1-10    |
| GET    | /api/alumnos                                                | admin+       | —        |
| GET    | /api/alumnos/{id}                                           | admin+       | —        |
| PATCH  | /api/alumnos/{id}                                           | admin+       | —        |
| GET    | /api/alumnos/{id}/autorizacion-expediente                   | admin+       | S1-09    |
| PATCH  | /api/alumnos/{id}/autorizacion-expediente                   | admin+       | S1-09    |
| POST   | /api/cobros-inscripcion                                     | admin, esc.  | S1-11    |
| GET    | /api/cobros-inscripcion/{id}/recibo/pdf                     | admin+       | S1-11    |
| GET    | /api/inscripciones/{id}/credencial/pdf                      | admin+       | S1-12    |
| GET    | /api/libro-registro-nc                                      | admin+       | S1-13    |
| GET    | /api/admin/dashboard                                        | admin+       | —        |
| GET    | /api/admin/carreras                                         | admin+       | —        |
| POST   | /api/admin/carreras                                         | admin        | —        |
| PATCH  | /api/admin/carreras/{id}                                    | admin        | —        |
| PATCH  | /api/admin/carreras/{id}/toggle-activa                      | admin        | —        |
| GET    | /api/admin/periodos                                         | admin+       | —        |
| POST   | /api/admin/periodos                                         | admin        | —        |
| PATCH  | /api/admin/periodos/{id}                                    | admin        | —        |
| PATCH  | /api/admin/periodos/{id}/activar                            | admin        | —        |

> Roles con acceso: `admin`, `director_academico`, `jefe_carrera`, `personal_administrativo`  
> `PATCH /api/alumnos/{id}` (estatus, semestre, pendiente certificado, observaciones): solo `admin` y `personal_administrativo`

---

## Esquema de base de datos

### Tablas nuevas en este sprint

| Tabla           | Descripción                                           | Soft Delete |
|-----------------|-------------------------------------------------------|-------------|
| `aspirantes`    | Solicitudes de admisión con datos TecNM y EXANI-II    | ✓           |
| `inscripciones` | Inscripción formal con NC, tipo de ingreso y flags PDF | ✓          |
| `alumnos`       | Expediente académico (creado al inscribir)            | ✓           |
| `carreras`      | Carreras con `codigo_it` para número de control       | —           |
| `periodos`      | Periodos con fechas límite de baja parcial/temporal   | —           |

### Número de control — formato TecNM `[AA][NNN][####]`

| Segmento | Valor | Ejemplo |
|----------|-------|---------|
| `AA`     | Últimos 2 dígitos del año | `26` |
| `NNN`    | `codigo_it` de la carrera (3 dígitos con ceros) | `006` (ISC) |
| `####`   | Secuencia anual de inscripciones (4 dígitos) | `0001` |
| **NC completo** | | **`26006 0001`** |

---

## Roles RBAC (6 roles totales desde Sprint 0)

| Rol                      | Descripción                                          |
|--------------------------|------------------------------------------------------|
| `admin`                  | Acceso total al sistema                              |
| `director_academico`     | Consulta expedientes, reportes, aprobaciones         |
| `jefe_carrera`           | Gestión de su carrera, consulta aspirantes           |
| `docente`                | Captura calificaciones, consulta grupos              |
| `alumno`                 | Acceso a su expediente y trámites                    |
| `personal_administrativo`| Servicios Escolares: inscripciones y documentos      |

---

## PDFs generados (DomPDF + Blade)

| Documento | Referencia TecNM | Ruta |
|-----------|-----------------|------|
| Solicitud de Inscripción | PO-001-02 | `resources/views/pdfs/solicitud_inscripcion.blade.php` |
| Carta Compromiso | Art. 2 Reglamento | `resources/views/pdfs/carta_compromiso.blade.php` |
| Contrato con el Estudiante | PO-001-03 | `resources/views/pdfs/contrato_estudiante.blade.php` |
| Carta Compromiso de Docs | PO-001-05 | `resources/views/pdfs/carta_compromiso_docs.blade.php` |
| Lista de Aspirantes Aceptados | PO-001-01 | `resources/views/pdfs/lista_aspirantes_aceptados.blade.php` |
| Recibo Oficial de Cobro CFDI | S1-11 | `resources/views/pdfs/recibo_cobro.blade.php` |
| Credencial del Estudiante | S1-12 (CR-80) | `resources/views/pdfs/credencial.blade.php` |
| Libro de Registro de NC | S1-13 | `resources/views/pdfs/libro_registro_nc.blade.php` |

---

## Flujo de estados del aspirante

```
pendiente ──► aceptado ──► POST /api/inscripciones ──► alumno.activo
          └──► rechazado (requiere motivo_rechazo)
```

---

## Pantallas implementadas (frontend)

| Ruta              | Acceso   | Descripción                                                     |
|-------------------|----------|-----------------------------------------------------------------|
| /registro         | Público  | Formulario completo: datos personales, académicos, EXANI, contacto |
| /login            | Público  | Autenticación institucional                                     |
| /admin/aspirantes | admin    | Tabla con filtros, modal estatus, modal inscripción             |

---

## Credenciales de prueba

| Email                      | Rol                      | Contraseña    |
|----------------------------|--------------------------|---------------|
| admin@itsmt.edu.mx         | admin                    | Password123!  |
| director@itsmt.edu.mx      | director_academico       | Password123!  |
| jefe.carrera@itsmt.edu.mx  | jefe_carrera             | Password123!  |
| docente@itsmt.edu.mx       | docente                  | Password123!  |
| alumno@itsmt.edu.mx        | alumno                   | Password123!  |
| escolar@itsmt.edu.mx       | personal_administrativo  | Password123!  |

---

## Arquitectura DDD (aplicada al cerrar el sprint)

### Backend — Laravel Domains

```
app/
├── Domains/
│   ├── Admision/
│   │   ├── Models/       Aspirante, Inscripcion
│   │   ├── Services/     AspiranteService
│   │   └── Policies/     AspirantePolicy
│   ├── Academico/
│   │   ├── Models/       Alumno, Carrera, Periodo
│   │   └── Policies/     AlumnoPolicy
│   ├── Cobros/
│   │   └── Models/       ReciboCobro
│   ├── Catalogos/
│   │   └── Models/       Estado, Municipio, EscuelaBachillerato, Turno
│   └── Institucional/
│       ├── Models/       ConfiguracionInstitucional
│       └── Policies/     ConfiguracionPolicy
├── Http/
│   └── Controllers/
│       ├── Auth/         AuthController, PasswordResetController
│       ├── Admision/     AspiranteController, InscripcionController, InscripcionPdfController
│       ├── Academico/    AlumnoController, CarreraController, PeriodoController
│       ├── Cobros/       CobroInscripcionController
│       ├── Catalogos/    CatalogoPublicoController
│       └── Admin/        DashboardController, CarreraAdminController, PeriodoAdminController,
│                         ConfiguracionController, CatalogoAdminController
└── Models/
    └── User.php          (permanece en raíz — requerido por Sanctum/Auth)
```

`AppServiceProvider` registra policies con las clases de dominio.  
`routes/api.php` importa desde los nuevos namespaces `App\Http\Controllers\{Domain}\`.

### Frontend — Feature-driven

```
src/
├── config/
│   └── apiClient.ts          Axios + interceptores
├── layouts/
│   ├── Layout.tsx            Sidebar admin
│   └── AlumnoLayout.tsx      Header portal alumno
├── routes/
│   └── index.tsx             React.lazy() + Suspense — code splitting automático
└── features/
    ├── auth/
    │   ├── services/auth.ts
    │   ├── hooks/useLogin.ts
    │   └── pages/
    ├── admision/
    │   ├── services/admision.ts  catalogo.ts
    │   ├── components/
    │   ├── hooks/
    │   └── pages/
    └── admin/
        ├── services/configuracion.ts
        └── pages/
```

---

## Decisiones técnicas

- **`$table = 'inscripciones'`** en modelo `Inscripcion`: Laravel pluraliza en inglés (`inscripcions`) → se forzó el nombre correcto.
- **`estatus = 'pendiente'`** se asigna explícitamente en `AspiranteService::crear()`, no se confía en el default de BD.
- **`codigo_it`** en tabla `carreras`: código numérico 2-3 dígitos para el segmento NNN del número de control TecNM (no la clave alfa como `ISC`).
- **`Alumno` creado en `inscribir()`**: la inscripción formal genera automáticamente el expediente académico (tabla `alumnos`).
- **`inscrito_por`** en inscripciones: FK al usuario administrador que ejecutó la inscripción, para auditoría.
- **Policy `AspirantePolicy`**: `viewAny`/`view` incluyen 4 roles; `inscribir` solo admin y personal_administrativo.
- **S1-02 email confirmación**: diferida en el plan pero implementada anticipadamente, ya que no agrega complejidad y mejora la experiencia.

---

## Cómo probar

```bash
# Backend
cd backend
php artisan migrate:fresh --seed
php artisan serve

# Frontend
cd frontend
npm run dev
# Formulario público: http://localhost:5173/registro
# Panel admin: http://localhost:5173/login

# Tests (15/15)
cd backend && php artisan test

# Postman
# Importar: docs/SICE-ITSMT.postman_collection.json
```

---

## Tests

```
Tests\Feature\Api\AspiranteTest  ✅ 8/8
  ✓ test_registro_envia_correo_de_confirmacion
  ✓ test_aspirante_puede_registrarse
  ✓ test_registro_aspirante_falla_sin_email
  ✓ test_admin_puede_listar_aspirantes
  ✓ test_alumno_no_puede_listar_aspirantes
  ✓ test_admin_puede_cambiar_estatus_aspirante
  ✓ test_admin_puede_inscribir_aspirante_aceptado  ← verifica creación de alumno
  ✓ test_no_se_puede_inscribir_aspirante_pendiente

Total: 15/15 (Sprint 0 + Sprint 1)
```
