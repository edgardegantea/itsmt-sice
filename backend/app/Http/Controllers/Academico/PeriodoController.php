<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

class PeriodoController extends Controller
{
    // GET /api/periodos/activo
    public function activo(): JsonResponse
    {
        $periodo = Periodo::activo();

        if (! $periodo) {
            return ApiResponse::error('No hay un periodo de inscripción activo.', 404);
        }

        return ApiResponse::success($periodo);
    }
}
