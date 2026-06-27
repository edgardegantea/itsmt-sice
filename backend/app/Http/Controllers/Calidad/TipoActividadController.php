<?php

namespace App\Http\Controllers\Calidad;

use App\Domains\Calidad\Models\TipoActividad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

class TipoActividadController extends Controller
{
    // GET /api/tipos-actividad
    public function index(): JsonResponse
    {
        $tipos = TipoActividad::where('activo', true)->orderBy('nombre')->get();
        return ApiResponse::success($tipos);
    }
}
