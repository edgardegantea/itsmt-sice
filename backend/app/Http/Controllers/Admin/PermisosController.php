<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Database\Seeders\PermisosSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermisosController extends Controller
{
    private function soloSuperadmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole('superadmin'), 403, 'Solo el superadministrador puede gestionar permisos.');
    }

    // GET /api/admin/permisos/catalogo
    public function catalogo(): JsonResponse
    {
        return ApiResponse::success(PermisosSeeder::$MODULOS);
    }

    // GET /api/admin/permisos/roles
    public function roles(Request $request): JsonResponse
    {
        $this->soloSuperadmin($request);

        $roles = Role::where('guard_name', 'web')
            ->where('name', '!=', 'alumno')
            ->with('permissions')
            ->get()
            ->map(fn($r) => [
                'name'       => $r->name,
                'permisos'   => $r->permissions->pluck('name')->values(),
            ]);

        return ApiResponse::success($roles);
    }

    // PUT /api/admin/permisos/roles/{role}
    public function updateRol(Request $request, string $rolNombre): JsonResponse
    {
        $this->soloSuperadmin($request);

        abort_if($rolNombre === 'superadmin', 403, 'No se pueden modificar los permisos del superadmin.');

        $rol = Role::where('name', $rolNombre)->where('guard_name', 'web')->firstOrFail();

        $permisos = $request->validate(['permisos' => ['required', 'array'], 'permisos.*' => ['string', 'exists:permissions,name']])['permisos'];

        $rol->syncPermissions($permisos);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return ApiResponse::success($rol->load('permissions'), 'Permisos del rol actualizados.');
    }

    // GET /api/admin/permisos/usuarios/{usuario}
    public function showUsuario(Request $request, User $usuario): JsonResponse
    {
        $this->soloSuperadmin($request);

        return ApiResponse::success([
            'permisos_directos' => $usuario->getDirectPermissions()->pluck('name')->values(),
            'permisos_por_rol'  => $usuario->getPermissionsViaRoles()->pluck('name')->values(),
            'todos'             => $usuario->getAllPermissions()->pluck('name')->values(),
        ]);
    }

    // PUT /api/admin/permisos/usuarios/{usuario}
    public function updateUsuario(Request $request, User $usuario): JsonResponse
    {
        $this->soloSuperadmin($request);

        abort_if($usuario->hasRole('superadmin'), 403, 'No se pueden modificar los permisos del superadmin.');

        $permisos = $request->validate(['permisos' => ['required', 'array'], 'permisos.*' => ['string', 'exists:permissions,name']])['permisos'];

        $usuario->syncPermissions($permisos);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return ApiResponse::success([
            'permisos_directos' => $usuario->getDirectPermissions()->pluck('name')->values(),
        ], 'Permisos del usuario actualizados.');
    }
}
