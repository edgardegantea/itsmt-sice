<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\DirectorioPersonal;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
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
        $directorio = DirectorioPersonal::orderBy('orden')->orderBy('nombre')->get();
        return ApiResponse::success($directorio);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'nombre'           => 'required|string|max:200',
            'cargo'            => 'required|string|max:200',
            'area'             => 'nullable|string|max:150',
            'email'            => 'nullable|email|max:150',
            'telefono'         => 'nullable|string|max:30',
            'extension'        => 'nullable|string|max:20',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
            'firma_documentos' => 'boolean',
        ]);

        $persona = DirectorioPersonal::create($data);
        return ApiResponse::success($persona, 'Persona agregada.', 201);
    }

    public function update(Request $request, DirectorioPersonal $directorio): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'nombre'           => 'sometimes|required|string|max:200',
            'cargo'            => 'sometimes|required|string|max:200',
            'area'             => 'nullable|string|max:150',
            'email'            => 'nullable|email|max:150',
            'telefono'         => 'nullable|string|max:30',
            'extension'        => 'nullable|string|max:20',
            'orden'            => 'integer|min:0',
            'activo'           => 'boolean',
            'firma_documentos' => 'boolean',
        ]);

        $directorio->update($data);
        return ApiResponse::success($directorio->fresh());
    }

    public function destroy(Request $request, DirectorioPersonal $directorio): JsonResponse
    {
        $this->authorizeAdmin($request);
        $directorio->delete();
        return ApiResponse::success(null, 'Eliminado correctamente.');
    }
}
