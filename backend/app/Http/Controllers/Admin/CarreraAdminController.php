<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Academico\Models\Carrera;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CarreraRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarreraAdminController extends Controller
{
    // GET /api/admin/carreras
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['admin', 'director_academico'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        return ApiResponse::success(
            Carrera::withCount(['alumnos', 'aspirantes'])->orderBy('nombre')->get()
        );
    }

    // POST /api/admin/carreras
    public function store(CarreraRequest $request): JsonResponse
    {
        return ApiResponse::success(Carrera::create($request->validated()), 'Carrera creada correctamente.', 201);
    }

    // PATCH /api/admin/carreras/{carrera}
    public function update(CarreraRequest $request, Carrera $carrera): JsonResponse
    {
        $carrera->update($request->validated());

        return ApiResponse::success($carrera->fresh()->loadCount(['alumnos', 'aspirantes']), 'Carrera actualizada.');
    }

    // PATCH /api/admin/carreras/{carrera}/toggle-activa
    public function toggleActiva(Request $request, Carrera $carrera): JsonResponse
    {
        if (! $request->user()?->hasRole('admin')) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $carrera->update(['activa' => ! $carrera->activa]);

        return ApiResponse::success($carrera->fresh(), $carrera->activa ? 'Carrera activada.' : 'Carrera desactivada.');
    }
}
