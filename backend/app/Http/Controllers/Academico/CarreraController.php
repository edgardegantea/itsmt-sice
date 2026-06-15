<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Carrera;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

class CarreraController extends Controller
{
    // GET /api/carreras
    public function index(): JsonResponse
    {
        return ApiResponse::success(
            Carrera::where('activa', true)->orderBy('nombre')->get()
        );
    }
}
