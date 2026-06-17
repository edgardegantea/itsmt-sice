<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\DirectorioArea;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectorioAreaController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole(['admin', 'superadmin']), 403);
    }

    public function index(): JsonResponse
    {
        $areas = DirectorioArea::withCount('personal')
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();
        return ApiResponse::success($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:directorio_areas',
            'descripcion' => 'nullable|string',
            'tipo'        => 'in:administracion,academico,departamento',
            'orden'       => 'integer|min:0',
            'activo'      => 'boolean',
        ]);
        return ApiResponse::success(DirectorioArea::create($data), 'Área creada.', 201);
    }

    public function update(Request $request, DirectorioArea $area): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'nombre'      => 'sometimes|required|string|max:150|unique:directorio_areas,nombre,' . $area->id,
            'descripcion' => 'nullable|string',
            'tipo'        => 'in:administracion,academico,departamento',
            'orden'       => 'integer|min:0',
            'activo'      => 'boolean',
        ]);
        $area->update($data);
        return ApiResponse::success($area->fresh());
    }

    public function destroy(Request $request, DirectorioArea $area): JsonResponse
    {
        $this->authorizeAdmin($request);
        $area->delete();
        return ApiResponse::success(null, 'Área eliminada.');
    }
}
