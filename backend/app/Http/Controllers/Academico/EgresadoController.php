<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Egresado;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EgresadoController extends Controller
{
    // GET /api/egresados
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'carrera_id' => 'nullable|uuid',
            'titulado'   => 'nullable|in:0,1,true,false',
            'anio'       => 'nullable|integer',
        ]);

        $query = Egresado::with(['alumno.carrera'])
            ->orderByDesc('anio_egreso');

        if ($request->filled('carrera_id')) {
            $query->whereHas('alumno', function ($q) use ($request) {
                $q->whereHas('alumno', fn ($aq) => $aq->where('carrera_id', $request->carrera_id));
            });
        }

        if ($request->filled('titulado')) {
            $query->where('titulado', $request->boolean('titulado'));
        }

        if ($request->filled('anio')) {
            $query->where('anio_egreso', $request->integer('anio'));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // POST /api/egresados
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'control_escolar'])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'alumno_id'          => 'required|uuid|exists:users,id',
            'anio_egreso'        => 'required|integer|min:2000|max:2100',
            'titulado'           => 'boolean',
            'fecha_titulacion'   => 'nullable|date',
            'empresa_actual'     => 'nullable|string|max:200',
            'puesto_actual'      => 'nullable|string|max:200',
            'sector'             => 'nullable|in:publico,privado,emprendimiento,desempleado,otro',
            'correo_actualizado' => 'nullable|email|max:200',
        ]);

        $egresado = Egresado::updateOrCreate(
            ['alumno_id' => $validated['alumno_id']],
            $validated
        );

        return ApiResponse::success($egresado->load('alumno'), 'Egresado registrado', 201);
    }

    // PATCH /api/egresados/{id}
    public function update(Request $request, Egresado $egresado): JsonResponse
    {
        $validated = $request->validate([
            'anio_egreso'        => 'sometimes|integer|min:2000|max:2100',
            'titulado'           => 'sometimes|boolean',
            'fecha_titulacion'   => 'nullable|date',
            'empresa_actual'     => 'nullable|string|max:200',
            'puesto_actual'      => 'nullable|string|max:200',
            'sector'             => 'nullable|in:publico,privado,emprendimiento,desempleado,otro',
            'correo_actualizado' => 'nullable|email|max:200',
        ]);

        $egresado->update($validated);

        return ApiResponse::success($egresado->fresh('alumno'));
    }
}
