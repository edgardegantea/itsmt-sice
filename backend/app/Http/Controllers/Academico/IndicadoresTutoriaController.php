<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AsignacionTutoria;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionTutoria;
use App\Domains\Academico\Models\Tutor;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndicadoresTutoriaController extends Controller
{
    private const ROLES = ['superadmin', 'admin', 'coord_tutoria', 'director_academico',
                           'direccion_general', 'direccion_academica', 'subdireccion_academica'];

    // GET /api/indicadores/tutoria
    public function dashboard(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $request->validate(['periodo_id' => 'nullable|uuid|exists:periodos,id']);

        $periodoId = $request->query('periodo_id')
            ?? Periodo::where('activo', true)->value('id');

        $tutoresActivos = Tutor::where('activo', true)->count();

        $tutoradosAsignados = AsignacionTutoria::where('activa', true)
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->distinct('alumno_id')
            ->count('alumno_id');

        $sesionesRegistradas = SesionTutoria::count();

        $pctAlumnosAtendidos = $tutoradosAsignados > 0
            ? round($sesionesRegistradas / max($tutoradosAsignados, 1) * 100, 1)
            : 0;

        $porTutor = Tutor::where('activo', true)
            ->withCount([
                'asignaciones as tutorados' => fn ($q) =>
                    $q->where('activa', true)
                      ->when($periodoId, fn ($aq) => $aq->where('periodo_id', $periodoId)),
                'sesiones as sesiones_registradas',
            ])
            ->with('docente:id,name,email')
            ->get();

        return ApiResponse::success([
            'tutores_activos'       => $tutoresActivos,
            'tutorados_asignados'   => $tutoradosAsignados,
            'sesiones_registradas'  => $sesionesRegistradas,
            'pct_alumnos_atendidos' => $pctAlumnosAtendidos,
            'periodo_id'            => $periodoId,
            'por_tutor'             => $porTutor,
        ]);
    }
}
