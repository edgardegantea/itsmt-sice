<?php

namespace App\Http\Controllers\Admision;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Admision\Services\AspiranteService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admision\InscribirAspiranteRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

class InscripcionController extends Controller
{
    public function __construct(private AspiranteService $service) {}

    // GET /api/inscripciones/{inscripcion}
    public function show(Inscripcion $inscripcion): JsonResponse
    {
        $this->authorize('view', $inscripcion->aspirante);

        return ApiResponse::success(
            $inscripcion->load(['aspirante', 'carrera', 'periodo'])
        );
    }

    // POST /api/inscripciones
    public function store(InscribirAspiranteRequest $request): JsonResponse
    {
        $aspirante = Aspirante::findOrFail($request->aspirante_id);

        $this->authorize('inscribir', $aspirante);

        if ($aspirante->estatus !== 'aceptado') {
            return ApiResponse::error('El aspirante debe tener estatus "aceptado" para ser inscrito.', 422);
        }

        if ($aspirante->inscripcion()->exists()) {
            return ApiResponse::error('Este aspirante ya fue inscrito.', 422);
        }

        $inscripcion = $this->service->inscribir(
            $aspirante,
            $request->user()->id,
            $request->tipo_ingreso ?? 'nuevo_ingreso'
        );

        return ApiResponse::success($inscripcion, 'Aspirante inscrito. Expediente académico generado.', 201);
    }
}
