<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // GET /api/admin/dashboard
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['admin', 'director_academico', 'jefe_carrera', 'personal_administrativo'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoActivo = Periodo::where('activo', true)->first();

        $aspirantesBase = $periodoActivo
            ? Aspirante::where('periodo_id', $periodoActivo->id)
            : Aspirante::query();

        $porEstatus = $aspirantesBase->clone()
            ->selectRaw("estatus, COUNT(*) as total")
            ->groupBy('estatus')
            ->pluck('total', 'estatus');

        $porCarrera = $aspirantesBase->clone()
            ->where('estatus', 'aceptado')
            ->join('carreras', 'aspirantes.carrera_id', '=', 'carreras.id')
            ->selectRaw('carreras.nombre, carreras.clave, COUNT(*) as total')
            ->groupBy('carreras.id', 'carreras.nombre', 'carreras.clave')
            ->orderByDesc('total')
            ->get();

        $alumnosPorEstatus = Alumno::selectRaw("estatus, COUNT(*) as total")
            ->groupBy('estatus')
            ->pluck('total', 'estatus');

        $alumnosPorCarrera = Alumno::join('carreras', 'alumnos.carrera_id', '=', 'carreras.id')
            ->selectRaw('carreras.nombre, carreras.clave, COUNT(*) as total')
            ->where('alumnos.estatus', 'activo')
            ->groupBy('carreras.id', 'carreras.nombre', 'carreras.clave')
            ->orderByDesc('total')
            ->get();

        return ApiResponse::success([
            'periodo_activo' => $periodoActivo ? [
                'id'     => $periodoActivo->id,
                'nombre' => $periodoActivo->nombre,
                'tipo'   => $periodoActivo->tipo,
            ] : null,
            'aspirantes' => [
                'total'                 => array_sum($porEstatus->toArray()),
                'por_estatus'           => $porEstatus,
                'aceptados_por_carrera' => $porCarrera,
            ],
            'alumnos' => [
                'total'               => Alumno::count(),
                'activos'             => $alumnosPorEstatus['activo'] ?? 0,
                'por_estatus'         => $alumnosPorEstatus,
                'activos_por_carrera' => $alumnosPorCarrera,
            ],
            'carreras_activas' => Carrera::where('activa', true)->count(),
        ]);
    }
}
