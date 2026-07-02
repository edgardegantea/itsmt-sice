<?php

namespace App\Http\Controllers\Titulacion;

use App\Domains\Titulacion\Models\ModalidadTitulacion;
use App\Helpers\ApiResponse;
use Illuminate\Http\JsonResponse;

class ModalidadTitulacionController
{
    public function index(): JsonResponse
    {
        return ApiResponse::success(
            ModalidadTitulacion::orderBy('opcion_numero')->get()
        );
    }
}
