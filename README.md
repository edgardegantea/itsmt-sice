# SICE — Sistema Integral de Control Escolar (ITSMT)

Sistema de gestión escolar del Instituto Tecnológico Superior de Martínez de la Torre:
admisión, control académico, permanencia y bajas, vinculación, titulación, personal
docente, y más de una decena de módulos institucionales adicionales.

## Stack

- **Backend**: Laravel 13 (PHP 8.4), PostgreSQL, Sanctum para auth.
- **Frontend**: React 19 + TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS.

## Arquitectura

El proyecto es un **monolito modular**: cada dominio de negocio es una unidad
autocontenida (modelos, rutas, y cuando aplica, servicios/policies/provider propio),
pero todo corre en una sola app Laravel y un solo frontend — no son microservicios.

- Backend: ver [backend/app/Domains/README.md](backend/app/Domains/README.md) para la
  organización por dominio y la regla de dependencias entre módulos.
- Frontend: ver [frontend/src/features/README.md](frontend/src/features/README.md)
  para la organización por feature.

## Desarrollo local

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Tests: `php artisan test`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Type-check: `npx tsc -b` · Build: `npm run build` · Tests: `npm test`

## Convenciones

- Las rutas de la API viven en `backend/routes/modules/{dominio}.php`, incluidas desde
  `backend/routes/api.php`.
- Las rutas del frontend viven en `frontend/src/features/{feature}/routes.tsx`,
  compuestas en `frontend/src/routes/index.tsx`.
- No se usan herramientas de monorepo (turborepo/nx/workspaces) ni SDKs de terceros
  para integraciones que puedan evitarse — se prioriza que el sistema sea mantenible
  a largo plazo con dependencias mínimas.
