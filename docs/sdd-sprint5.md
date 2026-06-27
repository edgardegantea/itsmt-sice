# Spec Driven Development — Sprint 5: Calidad Educativa
**Sistema SICE · TecNM Campus Misantla · Plan Scrum v1.4**

> Este documento es la fuente de verdad del Sprint 5. Cada spec tiene un contrato de API
> verificable, criterios de aceptación ejecutables y casos de prueba mapeados.
> Los tests en `Sprint5Test.php` son la implementación directa de estas specs.

---

## Contexto del Sprint

| Atributo        | Valor                                        |
|-----------------|----------------------------------------------|
| Sprint          | 5                                            |
| Duración        | 2 semanas                                    |
| Dominio         | `app/Domains/Calidad/`                       |
| Módulos nuevos  | Actividades Complementarias, Evaluación Docente |
| Restricción legal | Reglamento TecNM Art. 7 Frac. VIII — anonimato de evaluaciones |
| Test suite      | `tests/Feature/Api/Sprint5Test.php`          |

### Historias de usuario

| ID    | Título                                      | Rol principal |
|-------|---------------------------------------------|---------------|
| S5-01 | Registro de actividades complementarias     | Alumno        |
| S5-02 | Validación de actividades complementarias   | Admin / Directivos |
| S5-03 | Evaluación docente anónima                  | Alumno        |
| S5-04 | Resultados agregados de evaluación docente  | Jefe de carrera / Admin |

---

## Infraestructura de datos

### Migración: `2026_06_27_050000_create_sprint5_calidad_tables.php`

#### `tipos_actividad`

| Columna           | Tipo         | Restricciones            |
|-------------------|--------------|--------------------------|
| `id`              | UUID PK      | HasUuids trait           |
| `clave`           | VARCHAR(30)  | UNIQUE, NOT NULL         |
| `nombre`          | VARCHAR(120) | NOT NULL                 |
| `horas_requeridas`| DECIMAL(5,2) | NOT NULL, default 20     |
| `activo`          | BOOLEAN      | NOT NULL, default true   |
| `created_at`      | TIMESTAMP    |                          |
| `updated_at`      | TIMESTAMP    |                          |

#### `actividades_complementarias`

| Columna                    | Tipo         | Restricciones                                      |
|----------------------------|--------------|----------------------------------------------------|
| `id`                       | UUID PK      | HasUuids trait                                     |
| `alumno_id`                | UUID FK      | → alumnos.id, NOT NULL                             |
| `tipo_id`                  | UUID FK      | → tipos_actividad.id, NOT NULL                     |
| `horas`                    | DECIMAL(5,2) | NOT NULL                                           |
| `evidencia_url`            | TEXT         | nullable                                           |
| `estatus`                  | ENUM         | registrada/validada/rechazada, default registrada  |
| `nivel_desempeno`          | ENUM         | excelente/notable/bueno/suficiente/insuficiente, nullable |
| `semestre_alumno_al_registrar` | TINYINT  | NOT NULL                                           |
| `validado_por`             | BIGINT FK    | → users.id, nullable                               |
| `observaciones_validacion` | TEXT         | nullable                                           |
| `deleted_at`               | TIMESTAMP    | SoftDeletes                                        |

#### `evaluaciones_docentes`

| Columna      | Tipo    | Restricciones                                         |
|--------------|---------|-------------------------------------------------------|
| `id`         | UUID PK | HasUuids trait                                        |
| `grupo_id`   | UUID FK | → grupos.id, NOT NULL                                 |
| `periodo_id` | UUID FK | → periodos.id, NOT NULL                               |
| `respuestas` | JSONB   | NOT NULL — claves/valores numéricos 1-5               |
| `enviada`    | BOOLEAN | NOT NULL, default false                               |
| `created_at` | TIMESTAMP | sin updated_at (`public $timestamps = false`)       |

> **Invariante de privacidad:** esta tabla NO tiene `alumno_id`. Ninguna evaluación
> es rastreable hasta el alumno que la emitió.

#### `alumno_evaluaciones_periodo`

| Columna      | Tipo      | Restricciones                    |
|--------------|-----------|----------------------------------|
| `alumno_id`  | UUID      | PK compuesta (alumno+grupo+periodo) |
| `grupo_id`   | UUID      | PK compuesta                     |
| `periodo_id` | UUID      | PK compuesta                     |
| `evaluado_en`| TIMESTAMP | NOT NULL                         |

> Esta tabla es el tracking de participación. Permite mostrar "ya evaluaste este grupo"
> sin vincular al alumno con el contenido específico de su evaluación.

### Seeder: 12 tipos TecNM Cap. 10

```
TUTORIA, DEPORTES, CULTURA, INVESTIGACION, COMPETENCIAS,
IDIOMAS, CIVICAS, BRIGADISTAS, VOLUNTARIADO, ARTE,
EMPRENDIMIENTO, LIDERAZGO
```
Todos con `horas_requeridas = 20.00` y `activo = true`.

---

## S5-01 — Registro de actividades complementarias

### Historia de usuario

> Como **alumno activo en semestres 1-6**, quiero registrar mis participaciones en
> actividades complementarias de los 12 tipos oficiales TecNM, para acreditar las horas
> requeridas dentro del plan de estudios.

### Reglas de negocio

| # | Regla |
|---|-------|
| RN-01 | Solo alumnos con `semestre_actual ≤ 6` pueden registrar actividades. |
| RN-02 | El máximo de horas por tipo es `tipo.horas_requeridas × 2`. Las actividades con estatus `rechazada` no cuentan para el acumulado. |
| RN-03 | El campo `semestre_alumno_al_registrar` se captura automáticamente del perfil del alumno al momento del registro. |
| RN-04 | El estatus inicial es siempre `registrada`. |
| RN-05 | El campo `evidencia_url` es opcional al registrar (puede añadirse después con el endpoint de evidencia). |

### Contrato de API

#### `GET /api/tipos-actividad`

**Autenticación:** cualquier rol autenticado.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "clave": "TUTORIA",
      "nombre": "Tutoría grupal",
      "horas_requeridas": "20.00"
    }
  ]
}
```
Solo retorna tipos con `activo = true`, ordenados por `nombre`.

---

#### `POST /api/actividades-complementarias`

**Autenticación:** rol `alumno`.

**Body:**
```json
{
  "tipo_id":      "uuid",
  "horas":        15,
  "evidencia_url": "https://drive.google.com/file/..." // opcional
}
```

**Validaciones (422 si falla):**

| Campo          | Regla                                          |
|----------------|------------------------------------------------|
| `tipo_id`      | required, uuid, exists:tipos_actividad,id      |
| `horas`        | required, numeric, min:0.5, max:500            |
| `evidencia_url`| nullable, url, max:500                         |

**Errores de negocio:**

| Condición                                   | HTTP | Mensaje                                                       |
|---------------------------------------------|------|---------------------------------------------------------------|
| `alumno.semestre_actual > 6`                | 422  | "Las actividades complementarias solo se registran en los primeros 6 semestres." |
| `horas_acumuladas + horas > max_horas`      | 422  | "No puedes superar {max} horas acumuladas en el tipo '{nombre}'." |

**Respuesta 201:**
```json
{
  "data": {
    "id": "uuid",
    "tipo_id": "uuid",
    "horas": 15,
    "estatus": "registrada",
    "semestre_alumno_al_registrar": 3,
    "tipo": { "nombre": "Tutoría grupal" }
  },
  "message": "Actividad complementaria registrada."
}
```

---

#### `GET /api/actividades-complementarias`

**Autenticación:** alumno (propias), admin/directivos/jefe_carrera (todas con filtros).

**Query params para admin:**
- `estatus` — filtro por `registrada|validada|rechazada`
- `carrera_id` — filtro por carrera (jefe_carrera siempre tiene su carrera forzada)
- `tipo_id` — filtro por tipo

**Respuesta 200 (paginada, 20 por página):**
```json
{
  "data": {
    "data": [
      {
        "id": "uuid",
        "horas": 15,
        "estatus": "registrada",
        "semestre_alumno_al_registrar": 3,
        "tipo": { "nombre": "Tutoría grupal" },
        "alumno": {
          "numero_control": "26ISC0001",
          "user": { "name": "Juan Pérez" },
          "carrera": { "nombre": "Ingeniería en Sistemas Computacionales" }
        }
      }
    ],
    "current_page": 1,
    "total": 1
  }
}
```
> Cuando el usuario es alumno, la respuesta no incluye el nodo `alumno` (datos redundantes).

---

#### `POST /api/actividades-complementarias/{id}/evidencia`

**Autenticación:** alumno dueño de la actividad, estatus `registrada`.

**Body:** `multipart/form-data`
- `evidencia`: file — mimes: pdf, jpg, jpeg, png, doc, docx — max 10 MB

**Respuesta 200:**
```json
{
  "data": { "evidencia_url": "https://storage/.../evidencias/archivo.pdf" },
  "message": "Evidencia subida."
}
```

### Criterios de aceptación

- [ ] CA-S501-01: Un alumno en semestre 3 puede registrar una actividad — devuelve 201 con `estatus: registrada` y `semestre_alumno_al_registrar: 3`.
- [ ] CA-S501-02: Un alumno en semestre 7 recibe 422 con mensaje que menciona "primeros 6 semestres".
- [ ] CA-S501-03: Con 35h acumuladas (tipo con 20h requeridas, max=40h), registrar 10h más devuelve 422.
- [ ] CA-S501-04: Las actividades `rechazadas` NO cuentan para el acumulado de horas.
- [ ] CA-S501-05: Un admin ve la lista paginada de todas las actividades con relaciones de alumno y tipo cargadas.
- [ ] CA-S501-06: Un jefe_carrera solo ve actividades de su carrera (filtro forzado).
- [ ] CA-S501-07: El catálogo de tipos solo devuelve registros con `activo = true`.

### Tests mapeados

| Test                                              | CA          |
|---------------------------------------------------|-------------|
| `test_alumno_registra_actividad_complementaria`   | CA-S501-01  |
| `test_alumno_no_puede_registrar_ac_despues_de_semestre_6` | CA-S501-02 |
| `test_alumno_no_puede_superar_maximo_horas_por_tipo` | CA-S501-03 |
| `test_admin_ve_listado_de_actividades`            | CA-S501-05  |
| `test_catalogo_tipos_actividad_disponible`        | CA-S501-07  |

---

## S5-02 — Validación de actividades complementarias

### Historia de usuario

> Como **administrador o directivo**, quiero revisar las actividades complementarias
> registradas por los alumnos, asignarles un nivel de desempeño cualitativo y
> aprobarlas o rechazarlas con observaciones.

### Reglas de negocio

| # | Regla |
|---|-------|
| RN-06 | Solo se pueden validar actividades con `estatus = registrada`. |
| RN-07 | Al validar como `validada`, el campo `nivel_desempeno` es obligatorio. |
| RN-08 | Al rechazar, `nivel_desempeno` no aplica. `observaciones_validacion` es recomendado pero no obligatorio. |
| RN-09 | El campo `validado_por` se registra automáticamente con el `id` del usuario que valida. |
| RN-10 | Los alumnos no tienen permiso de validar (política: solo `validar` para admin/superadmin/directivos). |

### Contrato de API

#### `PATCH /api/actividades-complementarias/{id}/validar`

**Autenticación:** superadmin, admin, ROLES_DIRECTIVOS.

**Body:**
```json
{
  "estatus":                  "validada",
  "nivel_desempeno":          "excelente",
  "observaciones_validacion": "Participación destacada en tutoría."
}
```

**Validaciones:**

| Campo                     | Regla                                                        |
|---------------------------|--------------------------------------------------------------|
| `estatus`                 | required, in:validada,rechazada                              |
| `nivel_desempeno`         | required_if:estatus,validada — in:excelente,notable,bueno,suficiente,insuficiente |
| `observaciones_validacion`| nullable, string, max:500                                    |

**Errores:**

| Condición                   | HTTP | Mensaje                                                    |
|-----------------------------|------|------------------------------------------------------------|
| Alumno intenta validar      | 403  | Forbidden                                                  |
| Actividad no está `registrada` | 422 | "Solo se pueden validar actividades en estatus registrada." |
| Falta `nivel_desempeno` al validar | 422 | Error de validación Laravel                          |

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid",
    "estatus": "validada",
    "nivel_desempeno": "excelente",
    "validado_por": 1,
    "tipo": { "nombre": "Tutoría grupal" },
    "alumno": { "user": { "name": "Juan Pérez" } },
    "validador": { "name": "Admin User" }
  },
  "message": "Actividad validada."
}
```

### Criterios de aceptación

- [ ] CA-S502-01: Admin valida con `nivel_desempeno: excelente` → estatus `validada`, nivel guardado, `validado_por` = id del admin.
- [ ] CA-S502-02: Admin rechaza con observaciones → estatus `rechazada`, sin `nivel_desempeno`.
- [ ] CA-S502-03: Validar sin `nivel_desempeno` cuando `estatus=validada` devuelve 422.
- [ ] CA-S502-04: Alumno intentando validar recibe 403.
- [ ] CA-S502-05: Intentar validar una actividad ya validada devuelve 422.

### Tests mapeados

| Test                                              | CA         |
|---------------------------------------------------|------------|
| `test_admin_valida_actividad_con_nivel_desempeno` | CA-S502-01 |
| `test_admin_rechaza_actividad`                    | CA-S502-02 |
| `test_validar_requiere_nivel_desempeno_si_validada` | CA-S502-03 |
| `test_alumno_no_puede_validar_actividades`        | CA-S502-04 |

---

## S5-03 — Evaluación docente anónima

### Historia de usuario

> Como **alumno activo**, quiero evaluar a mis docentes al cierre del periodo de forma
> anónima, respondiendo un instrumento estandarizado por grupo, para que la institución
> pueda medir la calidad educativa sin vulnerar mi privacidad.

### Reglas de negocio

| # | Regla |
|---|-------|
| RN-11 | Las evaluaciones NO almacenan `alumno_id`. El anonimato es estructural, no solo de política. |
| RN-12 | La tabla `alumno_evaluaciones_periodo` registra quién evaluó qué grupo, pero SIN vincular al contenido de la evaluación. |
| RN-13 | Un alumno solo puede evaluar una vez por grupo por periodo. El segundo intento devuelve HTTP 409. |
| RN-14 | Un alumno solo puede evaluar grupos a los que pertenece en el periodo activo. |
| RN-15 | El instrumento acepta cualquier clave numérica en `respuestas` (flexible para distintas versiones del cuestionario). |
| RN-16 | La inserción en `evaluaciones_docentes` y en `alumno_evaluaciones_periodo` ocurre dentro de una transacción DB. |

### Contrato de API

#### `GET /api/evaluaciones-docentes`

**Autenticación:** alumno.

**Respuesta 200 — lista de grupos del periodo activo con estado de evaluación:**
```json
{
  "data": [
    {
      "grupo_id":    "uuid",
      "clave":       "3A",
      "semestre":    3,
      "materias": [
        {
          "materia": "Programación",
          "docente": "Lic. García López"
        }
      ],
      "ya_evaluado": false
    }
  ]
}
```

> Si no hay periodo activo, devuelve `data: []` (no error).

---

#### `POST /api/evaluaciones-docentes`

**Autenticación:** alumno.

**Body:**
```json
{
  "grupo_id": "uuid",
  "respuestas": {
    "puntualidad":        5,
    "dominio_tema":       4,
    "claridad":           5,
    "disponibilidad":     4,
    "material_didactico": 3,
    "evaluacion_justa":   4,
    "puntaje_global":     5
  }
}
```

**Validaciones:**

| Campo       | Regla                              |
|-------------|------------------------------------|
| `grupo_id`  | required, uuid, exists:grupos,id   |
| `respuestas`| required, array, min:1             |

**Errores de negocio:**

| Condición                                 | HTTP | Mensaje                                                             |
|-------------------------------------------|------|---------------------------------------------------------------------|
| Alumno no pertenece al grupo              | 403  | "No perteneces a este grupo en el periodo activo."                  |
| Ya evaluó este grupo en este periodo      | 409  | "Ya enviaste tu evaluación para este grupo en el periodo activo."   |
| No hay periodo activo                     | 404  | `Periodo::firstOrFail()` lanza 404                                  |

**Respuesta 201:**
```json
{
  "data": null,
  "message": "Evaluación enviada. ¡Gracias por tu participación!"
}
```

**Invariante de base de datos a verificar:**
```sql
-- DEBE existir:
SELECT * FROM alumno_evaluaciones_periodo
  WHERE alumno_id = ? AND grupo_id = ? AND periodo_id = ?;

-- NO DEBE existir:
SELECT * FROM evaluaciones_docentes WHERE alumno_id IS NOT NULL;
-- (la columna directamente no existe en el esquema)
```

### Criterios de aceptación

- [ ] CA-S503-01: Alumno ve sus grupos del periodo activo con `ya_evaluado: false` inicialmente.
- [ ] CA-S503-02: Alumno envía evaluación → 201; fila en `evaluaciones_docentes` SIN `alumno_id`; fila en `alumno_evaluaciones_periodo` CON `alumno_id`.
- [ ] CA-S503-03: Segundo intento para el mismo grupo devuelve 409.
- [ ] CA-S503-04: Intento sobre grupo ajeno devuelve 403.
- [ ] CA-S503-05: Después de enviar, `GET /evaluaciones-docentes` muestra ese grupo con `ya_evaluado: true`.

### Tests mapeados

| Test                                              | CA         |
|---------------------------------------------------|------------|
| `test_alumno_ve_grupos_pendientes_de_evaluar`     | CA-S503-01 |
| `test_alumno_envia_evaluacion_anonima`            | CA-S503-02 |
| `test_alumno_no_puede_evaluar_dos_veces_el_mismo_grupo` | CA-S503-03 |
| `test_alumno_no_puede_evaluar_grupo_ajeno`        | CA-S503-04 |

---

## S5-04 — Resultados agregados de evaluación docente

### Historia de usuario

> Como **jefe de carrera o administrador**, quiero consultar los resultados promediados
> de las evaluaciones docentes por grupo, sin poder ver las respuestas individuales de
> ningún alumno, para tomar decisiones sobre la calidad educativa.

### Reglas de negocio

| # | Regla |
|---|-------|
| RN-17 | Los resultados solo son accesibles para superadmin, admin, jefe_carrera y ROLES_DIRECTIVOS. |
| RN-18 | El jefe_carrera solo ve grupos de su propia carrera (`carreraRestringida()`). |
| RN-19 | La respuesta NO contiene `alumno_id`, datos de alumnos individuales ni es posible inferir quién respondió qué. |
| RN-20 | Los promedios se calculan por clave de respuesta (e.g. `puntualidad`, `dominio_tema`). Si una clave no tiene valores numéricos, su promedio es `null`. |
| RN-21 | Se muestran todos los grupos del filtro, incluyendo los que tienen `total_respuestas: 0`. |

### Contrato de API

#### `GET /api/evaluaciones-docentes/resultados`

**Autenticación:** superadmin, admin, jefe_carrera, ROLES_DIRECTIVOS.

**Query params:**
- `periodo_id` — UUID del periodo (opcional, filtra grupos por periodo)
- `carrera_id` — UUID de carrera (ignorado si jefe_carrera, que tiene su carrera forzada)

**Respuesta 200:**
```json
{
  "data": [
    {
      "grupo_id":         "uuid",
      "clave":            "3A",
      "carrera":          "Ingeniería en Sistemas Computacionales",
      "docentes":         ["Lic. García López"],
      "total_respuestas": 24,
      "promedios": {
        "puntualidad":        4.58,
        "dominio_tema":       4.33,
        "claridad":           4.71,
        "disponibilidad":     4.17,
        "material_didactico": 3.92,
        "evaluacion_justa":   4.46,
        "puntaje_global":     4.54
      }
    }
  ]
}
```

> Campos ausentes en la respuesta: `alumno_id`, cualquier dato individual de alumno.

### Criterios de aceptación

- [ ] CA-S504-01: Jefe de carrera consulta resultados → recibe grupos de su carrera con `total_respuestas` y `promedios`.
- [ ] CA-S504-02: La respuesta NO contiene `alumno_id` ni ningún identificador individual.
- [ ] CA-S504-03: Un grupo sin evaluaciones aparece con `total_respuestas: 0` y `promedios: {}`.
- [ ] CA-S504-04: Jefe_carrera de carrera A no ve grupos de carrera B.
- [ ] CA-S504-05: Admin sin restricción de carrera ve todos los grupos.

### Tests mapeados

| Test                                                   | CA                     |
|--------------------------------------------------------|------------------------|
| `test_jefe_carrera_consulta_resultados_agregados`      | CA-S504-01, CA-S504-02 |

---

## Política de acceso (Policy)

### `ActividadComplementariaPolicy`

| Método      | Roles autorizados                                       |
|-------------|---------------------------------------------------------|
| `viewAny`   | superadmin, admin, alumno, jefe_carrera, ROLES_DIRECTIVOS |
| `create`    | alumno únicamente                                       |
| `validar`   | superadmin, admin, ROLES_DIRECTIVOS                     |
| `delete`    | alumno dueño cuando `estatus = registrada`              |

`ROLES_DIRECTIVOS` = `['director_academico', 'personal_administrativo', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica']`

Registro en `AppServiceProvider::boot()`:
```php
Gate::policy(ActividadComplementaria::class, ActividadComplementariaPolicy::class);
```

---

## Rutas registradas

```php
// Catálogo (público para autenticados)
Route::get('/tipos-actividad', [TipoActividadController::class, 'index']);

// Actividades complementarias
Route::get('/actividades-complementarias',                [ActividadComplementariaController::class, 'index']);
Route::post('/actividades-complementarias',               [ActividadComplementariaController::class, 'store']);
Route::post('/actividades-complementarias/{actividad}/evidencia', [ActividadComplementariaController::class, 'subirEvidencia']);
Route::patch('/actividades-complementarias/{actividad}/validar',  [ActividadComplementariaController::class, 'validar']);
Route::delete('/actividades-complementarias/{actividad}',         [ActividadComplementariaController::class, 'destroy']);

// Evaluación docente (el orden importa: /resultados antes de /{id})
Route::get('/evaluaciones-docentes/resultados', [EvaluacionDocenteController::class, 'resultados']);
Route::get('/evaluaciones-docentes',            [EvaluacionDocenteController::class, 'index']);
Route::post('/evaluaciones-docentes',           [EvaluacionDocenteController::class, 'store']);
```

> **Nota de orden:** `/evaluaciones-docentes/resultados` debe declararse **antes** de
> cualquier ruta con parámetro `{id}` para evitar que Laravel interprete "resultados"
> como un UUID.

---

## Frontend — Mapa de páginas

| Página                          | Ruta frontend                                   | Roles con acceso                  |
|---------------------------------|-------------------------------------------------|-----------------------------------|
| `ActividadesComplementariasPage`| `/alumno/actividades-complementarias`           | alumno                            |
| `ActividadesComplementariasPage`| `/admin/calidad/actividades-complementarias`    | admin, directivos                 |
| `EvaluacionDocentePage`         | `/alumno/evaluacion-docente`                    | alumno                            |
| `ResultadosEvaluacionPage`      | `/admin/calidad/evaluacion-docente/resultados`  | admin, jefe_carrera, directivos   |

### Comportamiento por rol en `ActividadesComplementariasPage`

| Elemento           | Alumno                         | Admin / Directivos                        |
|--------------------|--------------------------------|-------------------------------------------|
| Botón "Nueva"      | Visible                        | Oculto                                    |
| Filtros de estatus | Ocultos                        | Visibles (Todas / Registrada / Validada / Rechazada) |
| Datos del alumno   | Ocultos (son propios)          | Visibles (nombre, número de control, carrera) |
| Botón "Validar"    | Oculto                         | Visible en actividades `registrada`       |
| Panel de validación| No aplica                      | Inline bajo la tarjeta                    |
| Botón "Eliminar"   | Visible en actividades `registrada` (con confirmación) | Oculto |
| Subir evidencia    | Botón file input por tarjeta `registrada` | No aplica         |

### Comportamiento de `EvaluacionDocentePage`

1. **Vista lista:** muestra cada grupo con chip "✓ Evaluado" o botón "Evaluar".
2. **Vista formulario (al hacer clic en Evaluar):** 7 preguntas × escala 1-5 visual.
3. **Botón "Enviar":** deshabilitado hasta que todas las preguntas tengan respuesta.
4. **Tras envío exitoso:** regresa a lista, el grupo aparece como evaluado, banner verde de confirmación.
5. **Aviso de anonimato:** siempre visible en el header del formulario.

### Comportamiento de `ResultadosEvaluacionPage`

- Tarjetas por grupo con barra de color (verde ≥4, amarillo ≥3, rojo <3) por pregunta.
- Chips de conteo de respuestas por grupo.
- Grupos sin respuestas muestran "Sin respuestas aún." (no se ocultan).

---

## Checklist de implementación

### Backend

- [x] Migración `2026_06_27_050000_create_sprint5_calidad_tables.php` (4 tablas)
- [x] Modelo `TipoActividad` — `HasUuids`, fillable, casts
- [x] Modelo `ActividadComplementaria` — `HasUuids`, `SoftDeletes`, fillable
- [x] Modelo `EvaluacionDocente` — `HasUuids`, `public $timestamps = false`, cast `respuestas` → array
- [x] Seeder `TipoActividadSeeder` — 12 tipos TecNM
- [x] `DatabaseSeeder` — incluye `TipoActividadSeeder`
- [x] Policy `ActividadComplementariaPolicy` — 4 métodos
- [x] Registro de policy en `AppServiceProvider::boot()`
- [x] `TipoActividadController::index()`
- [x] `ActividadComplementariaController` — index, store, subirEvidencia, validar, destroy
- [x] `EvaluacionDocenteController` — index, store, resultados
- [x] Rutas en `routes/api.php`
- [x] 22 tests en `Sprint5Test.php` — todos pasan (121/121 totales)

### Frontend

- [x] Tipos TypeScript en `frontend/src/features/calidad/services/calidad.ts`
- [x] `calidadApi` — 9 métodos de servicio (incluye `eliminarActividad` y `subirEvidencia`)
- [x] `ActividadesComplementariasPage.tsx` — dual rol alumno/admin
- [x] `EvaluacionDocentePage.tsx` — instrumento anónimo
- [x] `ResultadosEvaluacionPage.tsx` — barras de promedio
- [x] Rutas en `frontend/src/routes/index.tsx`
- [x] Menú admin en `Layout.tsx`
- [x] Menú alumno en `AlumnoLayout.tsx`
- [x] TypeScript sin errores (`tsc --noEmit` limpio)

---

## Trazabilidad tests ↔ specs

| Test (#)                                              | Historia | CA           | Pasa |
|-------------------------------------------------------|----------|--------------|------|
| `test_catalogo_tipos_actividad_disponible`            | S5-01    | CA-S501-07   | ✓    |
| `test_alumno_registra_actividad_complementaria`       | S5-01    | CA-S501-01   | ✓    |
| `test_alumno_no_puede_registrar_ac_despues_de_semestre_6` | S5-01 | CA-S501-02  | ✓    |
| `test_alumno_no_puede_superar_maximo_horas_por_tipo`  | S5-01    | CA-S501-03   | ✓    |
| `test_admin_ve_listado_de_actividades`                | S5-01    | CA-S501-05   | ✓    |
| `test_admin_valida_actividad_con_nivel_desempeno`     | S5-02    | CA-S502-01   | ✓    |
| `test_admin_rechaza_actividad`                        | S5-02    | CA-S502-02   | ✓    |
| `test_validar_requiere_nivel_desempeno_si_validada`   | S5-02    | CA-S502-03   | ✓    |
| `test_alumno_no_puede_validar_actividades`            | S5-02    | CA-S502-04   | ✓    |
| `test_alumno_ve_grupos_pendientes_de_evaluar`         | S5-03    | CA-S503-01   | ✓    |
| `test_alumno_envia_evaluacion_anonima`                | S5-03    | CA-S503-02   | ✓    |
| `test_alumno_no_puede_evaluar_dos_veces_el_mismo_grupo` | S5-03  | CA-S503-03   | ✓    |
| `test_alumno_no_puede_evaluar_grupo_ajeno`            | S5-03    | CA-S503-04   | ✓    |
| `test_jefe_carrera_consulta_resultados_agregados`     | S5-04    | CA-S504-01/02| ✓    |
| `test_actividades_rechazadas_no_cuentan_para_acumulado` | S5-01  | CA-S501-04   | ✓    |
| `test_jefe_carrera_solo_ve_actividades_de_su_carrera` | S5-01    | CA-S501-06   | ✓    |
| `test_validar_actividad_ya_validada_devuelve_422`     | S5-02    | CA-S502-05   | ✓    |
| `test_ya_evaluado_cambia_a_true_despues_de_enviar`    | S5-03    | CA-S503-05   | ✓    |
| `test_grupo_sin_evaluaciones_aparece_con_total_cero`  | S5-04    | CA-S504-03   | ✓    |
| `test_jefe_carrera_no_ve_grupos_de_otra_carrera`      | S5-04    | CA-S504-04   | ✓    |
| `test_admin_ve_todos_los_grupos_sin_restriccion`      | S5-04    | CA-S504-05   | ✓    |
| `test_alumno_puede_eliminar_actividad_propia_registrada` | Policy | delete      | ✓    |

**22/22 tests pasan. 121/121 totales (Sprints 1-5).**
