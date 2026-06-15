<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Baja;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BajaController extends Controller
{
    // POST /api/bajas  (admin registra)
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Baja::class);

        $data = $request->validate([
            'alumno_id'                 => ['required', 'uuid', 'exists:alumnos,id'],
            'periodo_id'                => ['required', 'uuid', 'exists:periodos,id'],
            'tipo_baja'                 => ['required', 'in:parcial,temporal,definitiva'],
            'motivo_enum'               => ['nullable', 'string', 'max:60'],
            'motivo_texto'              => ['nullable', 'string', 'max:500'],
            'fecha_solicitud'           => ['required', 'date'],
            'fecha_efectiva'            => ['nullable', 'date'],
            'numero_semestres_cursados' => ['nullable', 'integer', 'min:0'],
            'reingreso_posible'         => ['boolean'],
        ]);

        $baja = Baja::create(array_merge($data, ['registrada_por' => $request->user()->id]));

        // Actualizar estatus del alumno
        $estatus = $data['tipo_baja'] === 'definitiva' ? 'baja_definitiva' : 'baja_temporal';
        Alumno::where('id', $data['alumno_id'])->update(['estatus' => $estatus]);

        return ApiResponse::success($baja->load(['alumno', 'periodo']), 'Baja registrada.', 201);
    }

    // GET /api/alumnos/{alumno}/bajas
    public function porAlumno(Alumno $alumno): JsonResponse
    {
        $bajas = Baja::with(['periodo', 'registradaPor'])
            ->where('alumno_id', $alumno->id)
            ->latest()
            ->get();

        return ApiResponse::success($bajas);
    }
}
