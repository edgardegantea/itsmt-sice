<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracionEvaluacionController extends Controller
{
    public function show(string $carreraId): JsonResponse
    {
        $config = ConfiguracionEvaluacion::where('carrera_id', $carreraId)->firstOrFail();
        return ApiResponse::success($config->load('carrera'));
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'carrera_id'                => ['required', 'uuid', 'exists:carreras,id'],
            'num_parciales'             => ['required', 'integer', 'min:1', 'max:10'],
            'calificacion_minima'       => ['required', 'numeric', 'min:0', 'max:100'],
            'peso_parciales'            => ['required', 'array', 'min:1'],
            'peso_parciales.*.parcial'  => ['required', 'integer', 'min:1'],
            'peso_parciales.*.peso'     => ['required', 'numeric', 'min:0', 'max:1'],
            'creditos_carga_minima'     => ['nullable', 'integer', 'min:1'],
            'creditos_carga_maxima'     => ['nullable', 'integer', 'min:1'],
            'max_especiales_por_periodo'=> ['nullable', 'integer', 'min:0'],
        ]);

        // Validate weight array length matches num_parciales
        if (count($data['peso_parciales']) !== (int) $data['num_parciales']) {
            return ApiResponse::error('La cantidad de pesos debe coincidir con num_parciales.', 422);
        }

        // Validate weights sum to ~1.0
        $totalPeso = collect($data['peso_parciales'])->sum('peso');
        if (abs($totalPeso - 1.0) > 0.001) {
            return ApiResponse::error('Los pesos de los parciales deben sumar 1.0.', 422);
        }

        $config = ConfiguracionEvaluacion::updateOrCreate(
            ['carrera_id' => $data['carrera_id']],
            $data
        );

        return ApiResponse::success($config->fresh('carrera'), 'Configuración guardada.', 201);
    }
}
