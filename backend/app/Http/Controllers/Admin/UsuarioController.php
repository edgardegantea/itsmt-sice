<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class UsuarioController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole(['admin', 'superadmin']), 403, 'Solo el administrador puede gestionar usuarios.');
    }

    // GET /api/admin/usuarios
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $esSuperadmin = $request->user()->hasRole('superadmin');

        $usuarios = User::with(['roles', 'carrera'])
            ->when(! $esSuperadmin, fn($q) =>
                $q->whereDoesntHave('roles', fn($rq) => $rq->where('name', 'superadmin'))
            )
            ->when($request->query('q'), fn($q, $search) =>
                $q->where(fn($q) =>
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%")
                )
            )
            ->when($request->query('role'), fn($q, $r) =>
                $q->whereHas('roles', fn($rq) => $rq->where('name', $r))
            )
            ->orderBy('name')
            ->paginate(50);

        return ApiResponse::success($usuarios);
    }

    private function denegarSiSuperadminOculto(Request $request, User $usuario): void
    {
        if (! $request->user()->hasRole('superadmin') && $usuario->hasRole('superadmin')) {
            abort(404);
        }
    }

    // GET /api/admin/usuarios/{usuario}
    public function show(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->denegarSiSuperadminOculto($request, $usuario);

        return ApiResponse::success($usuario->load(['roles', 'carrera']));
    }

    // POST /api/admin/usuarios
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'password'   => ['required', Password::min(8)->letters()->numbers()],
            'role'       => ['required', 'string', Rule::exists('roles', 'name')],
            'carrera_id' => ['nullable', 'uuid', 'exists:carreras,id'],
        ]);

        $user = User::create([
            'name'       => $data['name'],
            'email'      => $data['email'],
            'password'   => Hash::make($data['password']),
            'carrera_id' => $data['carrera_id'] ?? null,
        ]);

        $user->assignRole($data['role']);

        return ApiResponse::success($user->load(['roles', 'carrera']), 'Usuario creado.', 201);
    }

    // PATCH /api/admin/usuarios/{usuario}
    public function update(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->denegarSiSuperadminOculto($request, $usuario);

        $data = $request->validate([
            'name'            => ['sometimes', 'string', 'max:255'],
            'email'           => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($usuario->id)],
            'password'        => ['sometimes', 'nullable', Password::min(8)->letters()->numbers()],
            'role'            => ['sometimes', 'string', Rule::exists('roles', 'name')],
            'carrera_id'      => ['sometimes', 'nullable', 'uuid', 'exists:carreras,id'],
            // Datos de docente
            'clave_empleado'  => ['sometimes', 'nullable', 'string', 'max:30'],
            'no_huella'       => ['sometimes', 'nullable', 'string', 'max:30'],
            'nombramiento'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'tipo_horas'      => ['sometimes', 'nullable', 'string', 'max:30'],
        ]);

        if (isset($data['name']))       $usuario->name       = $data['name'];
        if (isset($data['email']))      $usuario->email      = $data['email'];
        if (array_key_exists('carrera_id',     $data)) $usuario->carrera_id     = $data['carrera_id'];
        if (array_key_exists('clave_empleado', $data)) $usuario->clave_empleado = $data['clave_empleado'];
        if (array_key_exists('no_huella',      $data)) $usuario->no_huella      = $data['no_huella'];
        if (array_key_exists('nombramiento',   $data)) $usuario->nombramiento   = $data['nombramiento'];
        if (array_key_exists('tipo_horas',     $data)) $usuario->tipo_horas     = $data['tipo_horas'];
        if (!empty($data['password'])) $usuario->password   = Hash::make($data['password']);
        $usuario->save();

        if (isset($data['role'])) {
            $usuario->syncRoles([$data['role']]);
        }

        return ApiResponse::success($usuario->fresh(['roles', 'carrera']), 'Usuario actualizado.');
    }

    // DELETE /api/admin/usuarios/{usuario}
    public function destroy(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->denegarSiSuperadminOculto($request, $usuario);

        if ($usuario->id === $request->user()->id) {
            return ApiResponse::error('No puedes eliminar tu propia cuenta.', 422);
        }

        $usuario->tokens()->delete();
        $usuario->delete();

        return ApiResponse::success(null, 'Usuario eliminado.');
    }

    // PATCH /api/admin/usuarios/{usuario}/credenciales  (solo superadmin)
    public function actualizarCredenciales(Request $request, User $usuario): JsonResponse
    {
        abort_unless($request->user()?->hasRole('superadmin'), 403, 'Solo el superadministrador puede cambiar credenciales de acceso.');

        $data = $request->validate([
            'email'    => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($usuario->id)],
            'password' => ['sometimes', 'string', 'min:6'],
        ]);

        if (empty($data)) {
            return ApiResponse::error('Proporciona al menos un campo (email o contraseña).', 422);
        }

        if (isset($data['email']))    $usuario->email    = $data['email'];
        if (isset($data['password'])) $usuario->password = Hash::make($data['password']);
        $usuario->save();

        $usuario->tokens()->delete();

        return ApiResponse::success($usuario->fresh(['roles']), 'Credenciales actualizadas. Las sesiones activas fueron cerradas.');
    }

    // GET /api/admin/roles
    public function roles(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return ApiResponse::success(Role::orderBy('name')->pluck('name'));
    }
}
