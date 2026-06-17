<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Aula;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AulaController extends Controller
{
    // GET /api/aulas
    public function index(Request $request): JsonResponse
    {
        $aulas = Aula::query()
            ->when($request->query('tipo'),   fn($q, $v) => $q->where('tipo', $v))
            ->when($request->query('activa'), fn($q, $v) => $q->where('activa', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($aulas);
    }

    // POST /api/aulas
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['required', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['required', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula = Aula::create($data);

        return ApiResponse::success($aula, 'Aula registrada.', 201);
    }

    // PATCH /api/aulas/{aula}
    public function update(Request $request, Aula $aula): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['sometimes', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['sometimes', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula->update($data);

        return ApiResponse::success($aula, 'Aula actualizada.');
    }

    // DELETE /api/aulas/{aula}
    public function destroy(Aula $aula): JsonResponse
    {
        $aula->delete();
        return ApiResponse::success(null, 'Aula eliminada.');
    }
}
