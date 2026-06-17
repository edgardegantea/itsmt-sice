<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PeriodoRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PeriodoAdminController extends Controller
{
    // GET /api/admin/periodos
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['superadmin', 'admin', 'director_academico', 'personal_administrativo'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        return ApiResponse::success(
            Periodo::withCount(['aspirantes', 'inscripciones'])->orderByDesc('fecha_inicio')->get()
        );
    }

    // POST /api/admin/periodos
    public function store(PeriodoRequest $request): JsonResponse
    {
        $datos = $request->validated();

        if (! empty($datos['activo'])) {
            Periodo::where('activo', true)->update(['activo' => false]);
        }

        return ApiResponse::success(Periodo::create($datos), 'Periodo creado correctamente.', 201);
    }

    // PATCH /api/admin/periodos/{periodo}
    public function update(PeriodoRequest $request, Periodo $periodo): JsonResponse
    {
        $datos = $request->validated();

        DB::transaction(function () use ($datos, $periodo) {
            if (! empty($datos['activo'])) {
                Periodo::where('activo', true)->where('id', '!=', $periodo->id)->update(['activo' => false]);
            }
            $periodo->update($datos);
        });

        return ApiResponse::success(
            $periodo->fresh()->loadCount(['aspirantes', 'inscripciones']),
            'Periodo actualizado.'
        );
    }

    // PATCH /api/admin/periodos/{periodo}/activar
    public function activar(Request $request, Periodo $periodo): JsonResponse
    {
        if (! $request->user()?->hasRole(['admin', 'superadmin'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        DB::transaction(function () use ($periodo) {
            Periodo::where('activo', true)->update(['activo' => false]);
            $periodo->update(['activo' => true]);
        });

        return ApiResponse::success($periodo->fresh(), "Periodo '{$periodo->nombre}' activado.");
    }
}
