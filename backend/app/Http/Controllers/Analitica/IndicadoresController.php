<?php

namespace App\Http\Controllers\Analitica;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Titulacion\Models\Titulacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IndicadoresController extends Controller
{
    // GET /api/indicadores/desercion?carrera_id=&periodo_id=  (S8-01/S8-03)
    public function desercion(Request $request): JsonResponse
    {
        $this->autorizarDirectivos($request);

        $carreraId = $request->query('carrera_id');
        $periodoId = $request->query('periodo_id');

        $alumnos = Alumno::with(['carrera', 'periodoIngreso'])
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId))
            ->when($periodoId, fn($q) => $q->where('periodo_ingreso_id', $periodoId))
            ->get();

        $results = $alumnos
            ->groupBy(fn($a) => $a->carrera_id . '|' . $a->periodo_ingreso_id)
            ->map(function ($grupo, $key) {
                [$cId, $pId] = explode('|', $key, 2);
                $alumnoIds     = $grupo->pluck('id');
                $totalInscritos = $alumnoIds->count();

                $totalDesertores = Baja::whereIn('alumno_id', $alumnoIds)
                    ->where('periodo_id', $pId)
                    ->where('tipo_baja', 'definitiva')
                    ->count();

                $first = $grupo->first();
                return [
                    'carrera_id'           => $cId,
                    'carrera'              => $first->carrera?->nombre,
                    'periodo_id'           => $pId,
                    'periodo'              => $first->periodoIngreso?->nombre,
                    'total_inscritos'      => $totalInscritos,
                    'total_desertores'     => $totalDesertores,
                    'porcentaje_desercion' => $totalInscritos > 0
                        ? round($totalDesertores / $totalInscritos * 100, 2)
                        : 0.0,
                ];
            })
            ->values();

        return ApiResponse::success($results);
    }

    // GET /api/indicadores/retencion?carrera_id=  (S8-02/S8-03)
    public function retencion(Request $request): JsonResponse
    {
        $this->autorizarDirectivos($request);

        $carreraId = $request->query('carrera_id');

        $porPeriodo = [];

        // Initial enrollment (periodo_ingreso_id)
        Alumno::select('carrera_id', 'periodo_ingreso_id', DB::raw('COUNT(*) as total'))
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId))
            ->groupBy('carrera_id', 'periodo_ingreso_id')
            ->get()
            ->each(function ($row) use (&$porPeriodo) {
                $porPeriodo[$row->carrera_id][$row->periodo_ingreso_id] =
                    ($porPeriodo[$row->carrera_id][$row->periodo_ingreso_id] ?? 0) + $row->total;
            });

        // Reinscripciones aprobadas
        DB::table('reinscripciones as r')
            ->join('alumnos as a', 'a.id', '=', 'r.alumno_id')
            ->selectRaw('a.carrera_id, r.periodo_id, COUNT(DISTINCT a.id) as total')
            ->where('r.estatus', 'aprobada')
            ->when($carreraId, fn($q) => $q->where('a.carrera_id', $carreraId))
            ->whereNull('r.deleted_at')
            ->whereNull('a.deleted_at')
            ->groupBy('a.carrera_id', 'r.periodo_id')
            ->get()
            ->each(function ($row) use (&$porPeriodo) {
                $porPeriodo[$row->carrera_id][$row->periodo_id] =
                    ($porPeriodo[$row->carrera_id][$row->periodo_id] ?? 0) + $row->total;
            });

        $periodos = Periodo::orderBy('fecha_inicio')->get();

        $results = [];
        foreach ($porPeriodo as $cId => $periodoData) {
            $periodosConDatos = $periodos->filter(fn($p) => isset($periodoData[$p->id]))->values();

            for ($i = 1; $i < $periodosConDatos->count(); $i++) {
                $pAnt = $periodosConDatos[$i - 1];
                $pAct = $periodosConDatos[$i];
                $inscritosAnt = $periodoData[$pAnt->id] ?? 0;
                $inscritosAct = $periodoData[$pAct->id] ?? 0;

                $results[] = [
                    'carrera_id'            => $cId,
                    'periodo_anterior_id'   => $pAnt->id,
                    'periodo_anterior'      => $pAnt->nombre,
                    'periodo_actual_id'     => $pAct->id,
                    'periodo_actual'        => $pAct->nombre,
                    'inscritos_periodo_ant' => $inscritosAnt,
                    'inscritos_periodo_act' => $inscritosAct,
                    'porcentaje_retencion'  => $inscritosAnt > 0
                        ? round($inscritosAct / $inscritosAnt * 100, 2)
                        : 0.0,
                ];
            }
        }

        return ApiResponse::success($results);
    }

    // GET /api/indicadores/eficiencia-terminal?carrera_id=&generacion=  (S8-02/S8-03)
    public function eficienciaTerminal(Request $request): JsonResponse
    {
        $this->autorizarDirectivos($request);

        $carreraId  = $request->query('carrera_id');
        $generacion = $request->query('generacion'); // year int

        $alumnos = Alumno::with(['carrera', 'periodoIngreso'])
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId))
            ->get();

        $grouped = $alumnos->groupBy(function ($a) {
            $year = $a->periodoIngreso?->fecha_inicio?->year ?? 'N/A';
            return $a->carrera_id . '|' . $year;
        });

        if ($generacion) {
            $grouped = $grouped->filter(fn($g, $k) => str_ends_with($k, '|' . $generacion));
        }

        $results = $grouped->map(function ($grupo, $key) {
            [$cId, $gen] = explode('|', $key, 2);
            $alumnoIds      = $grupo->pluck('id');
            $totalIngreso   = $alumnoIds->count();
            $totalEgresados = $grupo->where('estatus', 'egresado')->count();
            $totalTitulados = Titulacion::whereIn('alumno_id', $alumnoIds)
                ->whereIn('estatus', ['aprobado', 'exento'])
                ->count();

            $first = $grupo->first();
            return [
                'carrera_id'      => $cId,
                'carrera'         => $first->carrera?->nombre,
                'generacion'      => is_numeric($gen) ? (int) $gen : $gen,
                'total_ingreso'   => $totalIngreso,
                'total_egresados' => $totalEgresados,
                'total_titulados' => $totalTitulados,
                'pct_eficiencia'  => $totalIngreso > 0
                    ? round($totalTitulados / $totalIngreso * 100, 2)
                    : 0.0,
            ];
        })->values();

        return ApiResponse::success($results);
    }

    // GET /api/indicadores/promedio?carrera_id=&periodo_id=  (S8-02/S8-03)
    public function promedio(Request $request): JsonResponse
    {
        $this->autorizarDirectivos($request);

        $carreraId = $request->query('carrera_id');
        $periodoId = $request->query('periodo_id');

        $data = DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->join('carreras as ca', 'g.carrera_id', '=', 'ca.id')
            ->join('periodos as p', 'g.periodo_id', '=', 'p.id')
            ->selectRaw(
                'g.carrera_id, ca.nombre as carrera, g.periodo_id, p.nombre as periodo, ' .
                'ROUND(AVG(c.calificacion_final), 2) as promedio_general, COUNT(c.id) as total_calificaciones'
            )
            ->whereNull('c.deleted_at')
            ->when($carreraId, fn($q) => $q->where('g.carrera_id', $carreraId))
            ->when($periodoId, fn($q) => $q->where('g.periodo_id', $periodoId))
            ->whereNotNull('c.calificacion_final')
            ->groupBy('g.carrera_id', 'ca.nombre', 'g.periodo_id', 'p.nombre')
            ->orderBy('p.nombre')
            ->get();

        return ApiResponse::success($data);
    }

    private function autorizarDirectivos(Request $request): void
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }
    }
}
