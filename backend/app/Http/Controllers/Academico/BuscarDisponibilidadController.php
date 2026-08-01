<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Actions\BuscarDisponibilidadAction;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuscarDisponibilidadController extends Controller
{
    // POST /api/horarios/disponibilidad/buscar
    public function buscar(Request $request, BuscarDisponibilidadAction $accion): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'  => ['required', 'uuid', 'exists:periodos,id'],
            'materia_id'  => ['required', 'uuid', 'exists:materias,id'],
            'grupo_ids'   => ['required', 'array', 'min:1'],
            'grupo_ids.*' => ['uuid', 'exists:grupos,id'],
            'carrera_id'  => ['nullable', 'uuid', 'exists:carreras,id'],
            'docente_id'  => ['nullable', 'uuid', 'exists:users,id'],
            'dia_semana'  => ['nullable', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
        ]);

        $propuestas = $accion->buscar(
            periodoId:       $data['periodo_id'],
            materiaId:       $data['materia_id'],
            grupoIds:        $data['grupo_ids'],
            carreraId:       $data['carrera_id'] ?? null,
            docenteIdFiltro: $data['docente_id'] ?? null,
            diaFiltro:       $data['dia_semana'] ?? null,
        );

        return ApiResponse::success(['propuestas' => $propuestas]);
    }
}
