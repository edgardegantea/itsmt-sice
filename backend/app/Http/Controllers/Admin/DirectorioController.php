<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\DirectorioPersonal;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectorioController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole(['admin', 'superadmin']), 403, 'Sin acceso.');
    }

    public function index(): JsonResponse
    {
        $directorio = DirectorioPersonal::with(['user', 'directorio_area', 'puesto.area'])
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();
        return ApiResponse::success($directorio);
    }

    /** Lista de usuarios no-alumno disponibles para asignar al directorio */
    public function usuariosDisponibles(): JsonResponse
    {
        $usuarios = User::with('roles')
            ->whereHas('roles', fn($q) => $q->whereNotIn('name', ['alumno']))
            ->orderBy('name')
            ->get()
            ->map(fn($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'roles' => $u->roles->pluck('name'),
            ]);
        return ApiResponse::success($usuarios);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'user_id'          => 'nullable|exists:users,id',
            'nombre'           => 'required|string|max:200',
            'cargo'            => 'required|string|max:200',
            'area'             => 'nullable|string|max:150',
            'area_id'          => 'nullable|exists:directorio_areas,id',
            'puesto_id'        => 'nullable|exists:directorio_puestos,id',
            'email'            => 'nullable|email|max:150',
            'telefono'         => 'nullable|string|max:30',
            'extension'        => 'nullable|string|max:20',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
            'firma_documentos' => 'boolean',
        ]);

        $persona = DirectorioPersonal::create($data);
        return ApiResponse::success($persona->load(['user', 'directorio_area', 'puesto.area']), 'Persona agregada.', 201);
    }

    public function update(Request $request, DirectorioPersonal $directorio): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'user_id'          => 'nullable|exists:users,id',
            'nombre'           => 'sometimes|required|string|max:200',
            'cargo'            => 'sometimes|required|string|max:200',
            'area'             => 'nullable|string|max:150',
            'area_id'          => 'nullable|exists:directorio_areas,id',
            'puesto_id'        => 'nullable|exists:directorio_puestos,id',
            'email'            => 'nullable|email|max:150',
            'telefono'         => 'nullable|string|max:30',
            'extension'        => 'nullable|string|max:20',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
            'firma_documentos' => 'boolean',
        ]);

        $directorio->update($data);
        return ApiResponse::success($directorio->fresh()->load(['user', 'directorio_area', 'puesto.area']));
    }

    public function destroy(Request $request, DirectorioPersonal $directorio): JsonResponse
    {
        $this->authorizeAdmin($request);
        $directorio->delete();
        return ApiResponse::success(null, 'Eliminado correctamente.');
    }
}
