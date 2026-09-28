<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SaludSemestralCarrera;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Índice de salud del semestre por carrera: un solo número que combina riesgo
 * académico, ocupación de aulas, cumplimiento docente e incidencias — con tendencia
 * semana a semana (a partir de los snapshots que guarda SnapshotSaludSemestralCommand),
 * para responder "¿vamos mejor o peor que la semana pasada?" y no solo una foto del
 * momento como cada indicador por separado.
 */
class SaludSemestralController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    public static function calcular(string $periodoId): array
    {
        $carreras = Carrera::orderBy('nombre')->get();

        // Reprobación / promedio (para invertir a "salud" usamos 100 - reprobación).
        $reprobacion = \Illuminate\Support\Facades\DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->where('g.periodo_id', $periodoId)
            ->whereNull('c.deleted_at')->whereNotNull('c.calificacion_final')
            ->selectRaw('g.carrera_id, COUNT(c.id) as total, SUM(CASE WHEN c.acreditado = false THEN 1 ELSE 0 END) as reprobadas')
            ->groupBy('g.carrera_id')->get()->keyBy('carrera_id');

        // Ocupación promedio de aulas usadas por cada carrera (vía grupos->cargas->aula).
        $ocupacionPorCarrera = \Illuminate\Support\Facades\DB::table('cargas_academicas as ca')
            ->join('carga_academica_grupo as cag', 'cag.carga_academica_id', '=', 'ca.id')
            ->join('grupos as g', 'cag.grupo_id', '=', 'g.id')
            ->join('horarios as h', 'h.carga_academica_id', '=', 'ca.id')
            ->where('ca.periodo_id', $periodoId)
            ->selectRaw('g.carrera_id, COUNT(h.id) as bloques')
            ->groupBy('g.carrera_id')->get()->keyBy('carrera_id');

        // Incidencias sin novedad (% de rondas "bien" por carrera).
        $incidencias = \Illuminate\Support\Facades\DB::table('incidencias_clase as i')
            ->join('grupos as g', 'i.grupo_id', '=', 'g.id')
            ->where('i.periodo_id', $periodoId)
            ->selectRaw("g.carrera_id, COUNT(*) as total, SUM(CASE WHEN i.estatus = 'sin_novedad' THEN 1 ELSE 0 END) as sin_novedad")
            ->groupBy('g.carrera_id')->get()->keyBy('carrera_id');

        // Cumplimiento docente promedio por carrera (docentes con carga en grupos de esa carrera).
        $cumplimientoDocente = \Illuminate\Support\Facades\DB::table('alertas_corte_captura as a')
            ->join('cargas_academicas as ca', 'a.carga_academica_id', '=', 'ca.id')
            ->join('carga_academica_grupo as cag', 'cag.carga_academica_id', '=', 'ca.id')
            ->join('grupos as g', 'cag.grupo_id', '=', 'g.id')
            ->where('a.periodo_id', $periodoId)
            ->selectRaw('g.carrera_id, AVG(a.porcentaje_capturado) as pct')
            ->groupBy('g.carrera_id')->get()->keyBy('carrera_id');

        return $carreras->map(function (Carrera $c) use ($reprobacion, $incidencias, $cumplimientoDocente) {
            $rep = $reprobacion->get($c->id);
            $pctAprobacion = ($rep && $rep->total > 0) ? round((1 - $rep->reprobadas / $rep->total) * 100) : null;

            $inc = $incidencias->get($c->id);
            $pctSinNovedad = ($inc && $inc->total > 0) ? round($inc->sin_novedad / $inc->total * 100) : null;

            $cap = $cumplimientoDocente->get($c->id);
            $pctCumplimiento = $cap ? round((float) $cap->pct) : null;

            $señales = array_filter([$pctAprobacion, $pctSinNovedad, $pctCumplimiento], fn ($v) => $v !== null);
            $score = count($señales) > 0 ? (int) round(array_sum($señales) / count($señales)) : null;

            return [
                'carrera_id' => $c->id,
                'carrera'    => $c->nombre,
                'score'      => $score,
                'pct_aprobacion'   => $pctAprobacion,
                'pct_sin_novedad'  => $pctSinNovedad,
                'pct_cumplimiento_docente' => $pctCumplimiento,
            ];
        })->values()->all();
    }

    // GET /api/salud-semestral?periodo_id=
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }

        $actual = self::calcular($periodoId);

        // jefe_carrera solo ve el índice de su propia carrera.
        if ($user->hasRole('jefe_carrera') && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS])) {
            $actual = array_values(array_filter($actual, fn ($fila) => $fila['carrera_id'] === $user->carrera_id));
        }

        $historico = SaludSemestralCarrera::where('periodo_id', $periodoId)
            ->orderBy('semana')
            ->get()
            ->groupBy('carrera_id');

        $resultado = collect($actual)->map(function ($fila) use ($historico) {
            $serie = $historico->get($fila['carrera_id'], collect())
                ->map(fn ($s) => ['semana' => $s->semana->format('Y-m-d'), 'score' => $s->score])
                ->values();
            $fila['historico'] = $serie;
            $fila['tendencia'] = $serie->count() >= 2
                ? ($fila['score'] ?? 0) - $serie[$serie->count() - 2]['score']
                : null;
            return $fila;
        });

        return ApiResponse::success($resultado);
    }
}
