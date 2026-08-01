<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\InstrumentacionDidactica;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // GET /api/admin/dashboard
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $carreraForzada = $request->user()->carreraRestringida();
        $periodoActivo  = Periodo::activo();

        $aspirantesBase = Aspirante::query()
            ->when($periodoActivo,  fn($q) => $q->where('periodo_id', $periodoActivo->id))
            ->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v));

        $porEstatus = (clone $aspirantesBase)
            ->selectRaw("estatus, COUNT(*) as total")
            ->groupBy('estatus')
            ->pluck('total', 'estatus');

        $porCarrera = (clone $aspirantesBase)
            ->where('estatus', 'aceptado')
            ->join('carreras', 'aspirantes.carrera_id', '=', 'carreras.id')
            ->selectRaw('carreras.nombre, carreras.clave, COUNT(*) as total')
            ->groupBy('carreras.id', 'carreras.nombre', 'carreras.clave')
            ->orderByDesc('total')
            ->get();

        $alumnosQ = Alumno::query()->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v));

        $alumnosPorEstatus = (clone $alumnosQ)
            ->selectRaw("estatus, COUNT(*) as total")
            ->groupBy('estatus')
            ->pluck('total', 'estatus');

        $alumnosPorCarrera = (clone $alumnosQ)
            ->join('carreras', 'alumnos.carrera_id', '=', 'carreras.id')
            ->selectRaw('carreras.nombre, carreras.clave, COUNT(*) as total')
            ->where('alumnos.estatus', 'activo')
            ->groupBy('carreras.id', 'carreras.nombre', 'carreras.clave')
            ->orderByDesc('total')
            ->get();

        // Docentes/materias/grupos/instrumentaciones de la carrera — se agregan para
        // alimentar el dashboard propio de jefe_carrera (KPIs de "su" carrera), pero se
        // calculan igual (sin filtro) para el panel global cuando no hay carreraForzada.
        $docentesTotal = User::role('docente')
            ->when($carreraForzada, fn($q, $v) => $q->deCarrera($v))
            ->count();

        $materiasTotal = Materia::where('activa', true)
            ->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v))
            ->count();

        $gruposTotal = Grupo::where('activo', true)
            ->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v))
            ->when($periodoActivo, fn($q) => $q->where('periodo_id', $periodoActivo->id))
            ->count();

        $instrumentacionesPorEstatus = InstrumentacionDidactica::query()
            ->when($carreraForzada, fn($q, $v) => $q->whereHas('asignacion', fn($aq) => $aq->where('carrera_id', $v)))
            ->selectRaw('estatus, COUNT(*) as total')
            ->groupBy('estatus')
            ->pluck('total', 'estatus');

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
                'total'               => (clone $alumnosQ)->count(),
                'activos'             => $alumnosPorEstatus['activo'] ?? 0,
                'por_estatus'         => $alumnosPorEstatus,
                'activos_por_carrera' => $alumnosPorCarrera,
            ],
            'docentes_total'                => $docentesTotal,
            'materias_total'                => $materiasTotal,
            'grupos_total'                  => $gruposTotal,
            'instrumentaciones_por_estatus' => $instrumentacionesPorEstatus,
            'carreras_activas' => $carreraForzada ? 1 : Carrera::where('activa', true)->count(),
        ]);
    }
}
