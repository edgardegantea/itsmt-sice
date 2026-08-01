# Features (monolito modular — frontend)

Cada subcarpeta de `src/features/` es un módulo autocontenido: sus páginas, hooks,
servicios y rutas. Todo comparte el mismo build de Vite — esto no es un micro-frontend,
es organización de código y límites de import dentro de una sola app.

## Estructura de un feature

- `pages/` — componentes de página, cargados con `React.lazy` desde `routes.tsx`.
- `services/*.ts` — funciones que llaman a la API vía el cliente compartido
  (`@/config/apiClient`), devolviendo datos ya tipados.
- `hooks/` — hooks específicos del feature (para hooks verdaderamente compartidos,
  usa `src/hooks/`, no los dupliques aquí).
- `routes.tsx` — exporta `{feature}Routes`, un fragmento JSX con los `<Route>` de este
  feature (path, layout/guard de rol, lazy import de la página). Se importa y compone en
  `src/routes/index.tsx` — ese archivo no debe conocer las páginas de cada feature
  directamente, solo componer los route-configs.

## Regla de dependencias

Un feature **no debe importar archivos internos de otro feature**
(`../../otro-feature/pages/...`, `../../otro-feature/services/...`). Si necesitas algo
que hoy vive dentro de otro feature:

- Si es genuinamente compartido (un helper de manejo de errores, un tipo de dominio
  usado por varios features, un componente de UI genérico), muévelo a un lugar neutral:
  `src/utils/`, `src/types/`, `src/components/`, `src/hooks/`, o `src/config/`.
- Si es específico de ese otro feature, no lo reutilices — es una señal de que la
  lógica está mal ubicada o de que hace falta un tipo/contrato compartido más explícito.

Lo verdaderamente compartido entre todos los features ya vive a nivel raíz de `src/`:
`components/`, `hooks/`, `store/` (Zustand), `config/apiClient.ts`, `utils/`, `layouts/`,
`types/`. Los alias `@/features/*`, `@/components/*`, `@/store/*`, `@/hooks/*`,
`@/config/*`, `@/utils/*`, `@/layouts/*`, `@/types/*` (definidos en `vite.config.ts` y
`tsconfig.app.json`) apuntan a estas carpetas — prefiérelos sobre imports relativos
profundos (`../../../`) al cruzar de un feature a lo compartido.

## Features actuales

`academico`, `admin`, `admision`, `alumno`, `analitica`, `auth`, `becas`, `biblioteca`,
`calidad`, `calidadiso`, `capacitacion`, `convocatoria`, `finanzas`, `infraestructura`,
`investigacion`, `permanencia`, `personal`, `planeacion`, `reinscripcion`, `seguridad`,
`titulacion`, `vinculacion`.
