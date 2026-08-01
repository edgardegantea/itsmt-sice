<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Actions\DetectarEmpalmesAction;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagnosticoHorarioController extends Controller
{
    // GET /api/horarios/diagnostico?periodo_id=
    public function index(Request $request, DetectarEmpalmesAction $accion): JsonResponse
    {
        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $empalmes = $accion->ejecutar($data['periodo_id']);

        return ApiResponse::success([
            'empalmes' => $empalmes,
            'total'    => count($empalmes),
        ]);
    }
}
