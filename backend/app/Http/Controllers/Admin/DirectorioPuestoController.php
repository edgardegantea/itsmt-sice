<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\DirectorioPuesto;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectorioPuestoController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasAnyRole(['admin', 'superadmin', ...\App\Models\User::ROLES_DIRECTIVOS]), 403);
    }

    public function index(): JsonResponse
    {
        $puestos = DirectorioPuesto::with('area')
            ->withCount('personal')
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();
        return ApiResponse::success($puestos);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'nombre'           => 'required|string|max:200|unique:directorio_puestos',
            'descripcion'      => 'nullable|string',
            'funciones'        => 'nullable|string',
            'area_id'          => 'nullable|exists:directorio_areas,id',
            'firma_documentos' => 'boolean',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
        ]);
        $puesto = DirectorioPuesto::create($data);
        return ApiResponse::success($puesto->load('area'), 'Puesto creado.', 201);
    }

    public function update(Request $request, DirectorioPuesto $puesto): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'nombre'           => 'sometimes|required|string|max:200|unique:directorio_puestos,nombre,' . $puesto->id,
            'descripcion'      => 'nullable|string',
            'funciones'        => 'nullable|string',
            'area_id'          => 'nullable|exists:directorio_areas,id',
            'firma_documentos' => 'boolean',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
        ]);
        $puesto->update($data);
        return ApiResponse::success($puesto->fresh()->load('area'));
    }

    public function destroy(Request $request, DirectorioPuesto $puesto): JsonResponse
    {
        $this->authorizeAdmin($request);
        $puesto->delete();
        return ApiResponse::success(null, 'Puesto eliminado.');
    }
}
