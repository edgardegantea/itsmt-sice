# Sprint 3 — Organización Académica (Semanas 8–11, 4 semanas)

**Duración:** 4 semanas  
**Estado:** ✅ Completado  
**Compliance:** TecNM-AC-PO-001 — Carga Académica | TecNM-AC-PO-003 — Planeación Didáctica

---

## Objetivo

Implementar la organización académica del periodo: malla curricular por carrera/semestre, gestión de aulas, horarios con detección automática de conflictos docente/aula, planeación didáctica con flujo de revisión, y el Formato de Carga Académica PDF oficial (TecNM-AC-PO-001).

---

## Historias comprometidas

| ID    | Historia                                                                 | SP  | Estado |
|-------|--------------------------------------------------------------------------|-----|--------|
| S3-01 | Admin configura la malla curricular por carrera y semestre               | 8   | ✅     |
| S3-02 | Admin crea horarios con detección automática de conflictos               | 13  | ✅     |
| S3-04 | Docente sube su planeación didáctica por materia asignada                | 8   | ✅     |
| S3-06 | Admin genera Formato de Carga Académica PDF oficial (TecNM-AC-PO-001)   | 5   | ✅     |

**Total:** 34 SP

## Historias diferidas al Backlog Post-Sprint 14

| ID    | Historia                                                                          | SP |
|-------|-----------------------------------------------------------------------------------|----|
| S3-03 | Alerta visual independiente de conflicto de horario                               | 13 |
| S3-05 | Exportar horarios de carrera en PDF                                               | 5  |
| S3-07 | Selección de especialidad por alumno (≥60% créditos, política 3.1.5 PO-007)      | 5  |

---

## Esquema de Base de Datos — tablas nuevas

| Tabla                  | Descripción                                                            | Soft Delete |
|------------------------|------------------------------------------------------------------------|-------------|
| `mallas_curriculares`  | Asignación de materias a carrera + semestre (permite multi-carrera)    | No          |
| `aulas`                | Aulas, laboratorios y talleres con tipo y capacidad                    | No          |
| `horarios`             | Bloques de horario por carga académica (dia, hora_inicio, hora_fin)    | No          |
| `planeaciones_docentes`| Planeación didáctica con 16 semanas, competencias, calendarización     | Sí          |
| `horarios_trabajo`     | Formato TecNM-AC-PO-003-01 por docente/periodo                         | Sí          |

**Columna agregada:** `clave_oficial_tecnm` en `materias` (clave del catálogo TecNM).  
**Columna agregada:** `aula_id` en `cargas_academicas` (aula donde se imparte la materia).

---

## API REST — endpoints nuevos

| Método  | Ruta                                                          | Descripción                                    | Rol               |
|---------|---------------------------------------------------------------|------------------------------------------------|-------------------|
| GET     | `/api/mallas-curriculares`                                    | Malla curricular filtrada por carrera/semestre | Admin/JefeCarrera |
| POST    | `/api/mallas-curriculares`                                    | Añadir materia a la malla                      | Admin/JefeCarrera |
| PATCH   | `/api/mallas-curriculares/{id}`                               | Actualizar semestre o especialidad             | Admin/JefeCarrera |
| DELETE  | `/api/mallas-curriculares/{id}`                               | Retirar materia de la malla                    | Admin/JefeCarrera |
| GET     | `/api/aulas`                                                  | Listar aulas                                   | Auth              |
| POST    | `/api/aulas`                                                  | Crear aula                                     | Admin             |
| PATCH   | `/api/aulas/{aula}`                                           | Actualizar aula                                | Admin             |
| DELETE  | `/api/aulas/{aula}`                                           | Eliminar aula                                  | Admin             |
| GET     | `/api/horarios`                                               | Horarios con filtros periodo/grupo/docente     | Auth              |
| GET     | `/api/horarios/conflictos`                                    | Verificar conflicto antes de guardar           | Admin             |
| POST    | `/api/horarios`                                               | Guardar bloques (reemplaza existentes)         | Admin/JefeCarrera |
| DELETE  | `/api/horarios/{horario}`                                     | Eliminar bloque                                | Admin             |
| GET     | `/api/planeaciones-docentes`                                  | Listar planeaciones (admin/jefe)               | Admin/JefeCarrera |
| GET     | `/api/planeaciones-docentes/mias`                             | Mis planeaciones (docente)                     | Docente           |
| POST    | `/api/planeaciones-docentes`                                  | Crear/actualizar borrador                      | Docente           |
| POST    | `/api/planeaciones-docentes/{id}/entregar`                    | Entregar planeación                            | Docente           |
| PATCH   | `/api/planeaciones-docentes/{id}/estatus`                     | Revisar/liberar/devolver                       | Admin/JefeCarrera |

---

## Arquitectura Frontend — módulo academico (ampliado)

```
src/features/academico/
├── services/academico.ts         # Tipos + API: MallaCurricular, Aula, Horario, PlaneacionDocente
├── hooks/useCargaAcademicaPdf.ts # Generación PDF client-side (TecNM-AC-PO-001)
├── pdf/CargaAcademicaPdf.tsx     # Componente @react-pdf/renderer (landscape A4)
└── pages/
    ├── GestionAcademicaPage.tsx  # 9 tabs: Materias, Malla, Grupos, Aulas, Cargas, Horarios, Planeaciones, Tutorías, Funciones
    ├── tabs/
    │   ├── MallaTab.tsx          # Vista por semestre, añadir/retirar materias
    │   ├── AulasTab.tsx          # CRUD de aulas/labs/talleres
    │   ├── HorariosTab.tsx       # Editor de bloques con verificación de conflictos en tiempo real
    │   └── PlaneacionesTab.tsx   # Lista admin con modal de revisión (revisada/liberada/devuelta)
    ├── PlaneacionDocentePage.tsx # Portal docente: borrador → entregar; ver observaciones de revisión
    └── CargaAcademicaAdminPage.tsx # Genera PDF TecNM-AC-PO-001 por alumno/periodo
```

### Rutas nuevas

| Ruta                       | Acceso                                 | Página                        |
|----------------------------|----------------------------------------|-------------------------------|
| `/admin/gestion-academica` | ADMIN_ROLES (ampliado: +Malla/Aulas/Horarios/Planeaciones) | GestionAcademicaPage |
| `/admin/carga-academica`   | Admin, personal_adm, jefe_carrera      | CargaAcademicaAdminPage       |
| `/docente/planeacion`      | docente, jefe_carrera                  | PlaneacionDocentePage         |

---

## Detección de conflictos (S3-02)

`HorarioService::detectarConflictos()`:
1. Carga la `CargaAcademica` con docente y aula.
2. Busca horarios del mismo periodo que se solapen (`hora_inicio < fin_propuesto AND hora_fin > inicio_propuesto`).
3. Conflicto **docente**: mismo `docente_id` con solapamiento.
4. Conflicto **aula**: mismo `aula_id` con solapamiento.
5. El frontend verifica en tiempo real al cambiar cualquier campo del bloque y bloquea el botón "Guardar" si hay conflictos.

---

## PDF de Carga Académica (S3-06 — TecNM-AC-PO-001)

- Formato **landscape A4** generado client-side con `@react-pdf/renderer`
- Datos: carrera, especialidad, plan de estudios, semestre, número de control
- Tabla por asignatura: nombre, clave oficial TecNM, grupo (`*` si repetición), créditos, hrs/semana, horario (L/Ma/Mi/J/V), docente/aula
- Totales de créditos y horas
- Firmas: División de Estudios Profesionales + Alumno
- Descarga directa al navegador (`a.download`)
