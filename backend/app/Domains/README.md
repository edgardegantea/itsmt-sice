# Dominios (monolito modular)

Cada subcarpeta de `app/Domains/` es un módulo autocontenido: sus modelos, servicios,
policies y (cuando aplica) `Providers/{Dominio}ServiceProvider.php` y rutas en
`routes/modules/{dominio}.php`. Todos comparten la misma app Laravel y base de datos —
esto no es una separación en microservicios, es organización de código y límites de
import dentro del monolito.

## Regla de dependencias

`Academico` (Alumno, Periodo, Carrera, Grupo, Materia, Calificacion) es el núcleo
académico compartido. Es correcto y esperado que otros dominios lo importen
directamente (`use App\Domains\Academico\Models\...`).

Los demás dominios ("hoja": Becas, Biblioteca, Calidad, Capacitacion, Catalogos,
Cobros, Convocatoria, Finanzas, Infraestructura, Institucional, Investigacion,
Personal, Reinscripcion, Seguridad, Titulacion, Vinculacion) **no deben ser
importados entre sí**. Si un dominio hoja necesita reaccionar a algo que pasa en
otro dominio hoja (no en Academico), usa un evento/observer en vez de un import
directo de modelo — así el acoplamiento queda explícito y desacoplado en el tiempo,
en vez de una dependencia de compilación entre dos módulos que deberían ser
independientes.

Antes de añadir un `use App\Domains\{OtroDominio}\...` nuevo, pregúntate: ¿es
Academico (el núcleo compartido, siempre válido) o es otro dominio hoja (evalúa si
un evento es más apropiado)?

## Estructura de un módulo

- `Models/` — entidades Eloquent del dominio.
- `Services/`, `Actions/` — lógica de negocio (solo en los dominios más maduros:
  Academico, Admision, Permanencia).
- `Policies/` — autorización, registrada en `Providers/{Dominio}ServiceProvider.php`
  cuando el dominio tiene policies.
- `Providers/{Dominio}ServiceProvider.php` — registra las `Gate::policy()` del
  dominio. Solo existe en los dominios que tienen policies (Academico, Admision,
  Permanencia, Calidad, Institucional); se añade a `bootstrap/providers.php`.
- Las rutas HTTP del dominio viven en `routes/modules/{dominio}.php` y se incluyen
  vía `require` dentro del grupo `auth:sanctum` en `routes/api.php`.
