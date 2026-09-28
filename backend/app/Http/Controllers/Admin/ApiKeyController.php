<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Seguridad\Models\ApiKey;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole(['admin', 'superadmin']), 403, 'Solo el administrador puede gestionar llaves de acceso.');
    }

    // GET /api/admin/api-keys
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return ApiResponse::success(
            ApiKey::with('creadoPor')->orderByDesc('created_at')->get()
        );
    }

    // POST /api/admin/api-keys
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate(['nombre' => ['required', 'string', 'max:100']]);

        [$modelo, $llave] = ApiKey::generar($data['nombre'], $request->user()->id);

        return ApiResponse::success([
            'api_key' => $modelo,
            'llave'   => $llave, // única vez que se devuelve en claro
        ], 'Llave generada. Cópiala ahora — no se volverá a mostrar.', 201);
    }

    // PATCH /api/admin/api-keys/{apiKey}/revocar
    public function revocar(Request $request, ApiKey $apiKey): JsonResponse
    {
        $this->authorizeAdmin($request);
        $apiKey->update(['activa' => false]);

        return ApiResponse::success($apiKey->fresh(), 'Llave revocada.');
    }
}
