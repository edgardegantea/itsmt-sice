<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cruza señales que ya existen por separado (reprobación, inasistencia, incidencias
 * de prefectura del grupo, alertas de baja definitiva sin revisar) en un solo score
 * de riesgo por alumno — para detectar quién va camino a la baja sin tener que
 * revisar cuatro pantallas distintas por separado.
 *
 * No es un modelo de machine learning: es una suma ponderada de reglas simples,
 * pensada para poder ajustar los pesos fácilmente conforme se calibre con datos
 * reales, sin depender de infraestructura de ML.
 */
class AlertaRiesgoAcademicoController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // Pesos del score (ajustables sin tocar la fórmula completa).
    private const PESO_REPROBACION   = 0.40; // × % de calificaciones reprobadas
    private const PESO_INASISTENCIA  = 0.30; // × % de inasistencia más alto entre sus grupos
    private const PUNTOS_POR_INCIDENCIA = 4; // por cada incidencia de prefectura no "sin novedad" en su(s) grupo(s), tope 5 incidencias
    private const PUNTOS_ALERTA_BAJA = 20;   // si tiene una alerta de baja definitiva sin revisar

    // GET /api/alertas-riesgo-academico?periodo_id=&carrera_id=&grupo_id=&nivel=
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
        $carreraId = $request->query('carrera_id');
        $grupoId   = $request->query('grupo_id');
        $nivel     = $request->query('nivel'); // alto|medio|bajo

        $alumnosQuery = Alumno::with(['user', 'carrera', 'grupos' => fn($q) => $q->where('grupos.periodo_id', $periodoId)])
            ->where('estatus', 'activo')
            ->whereHas('grupos', fn($q) => $q->where('grupos.periodo_id', $periodoId)->when($grupoId, fn($q2) => $q2->where('grupos.id', $grupoId)))
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId));

        // jefe_carrera solo ve su propia carrera.
        if ($user->hasRole('jefe_carrera') && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS])) {
            $alumnosQuery->where('carrera_id', $user->carrera_id);
        }

        $alumnos = $alumnosQuery->get();
        if ($alumnos->isEmpty()) {
            return ApiResponse::success([]);
        }

        $alumnoIds = $alumnos->pluck('id');
        $userIds   = $alumnos->pluck('user_id')->filter();

        $reprobacion = DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->whereIn('c.alumno_id', $alumnoIds)
            ->where('g.periodo_id', $periodoId)
            ->whereNull('c.deleted_at')
            ->whereNotNull('c.calificacion_final')
            ->selectRaw('c.alumno_id, COUNT(*) as total, SUM(CASE WHEN c.acreditado = false THEN 1 ELSE 0 END) as reprobadas')
            ->groupBy('c.alumno_id')
            ->get()
            ->keyBy('alumno_id');

        $inasistencia = DB::table('alertas_inasistencia as ai')
            ->join('grupos as g', 'ai.grupo_id', '=', 'g.id')
            ->whereIn('ai.alumno_id', $userIds)
            ->where('g.periodo_id', $periodoId)
            ->selectRaw('ai.alumno_id, MAX(ai.porcentaje_inasistencia) as pct')
            ->groupBy('ai.alumno_id')
            ->get()
            ->keyBy('alumno_id');

        $incidenciasPorGrupo = DB::table('incidencias_clase')
            ->where('periodo_id', $periodoId)
            ->where('estatus', '!=', 'sin_novedad')
            ->selectRaw('grupo_id, COUNT(*) as total')
            ->groupBy('grupo_id')
            ->get()
            ->keyBy('grupo_id');

        $alertasBaja = DB::table('alertas_baja_definitiva')
            ->whereIn('alumno_id', $alumnoIds)
            ->where('periodo_id', $periodoId)
            ->where('revisada', false)
            ->pluck('alumno_id')
            ->unique();

        $resultado = $alumnos->map(function (Alumno $a) use ($reprobacion, $inasistencia, $incidenciasPorGrupo, $alertasBaja) {
            $rep = $reprobacion->get($a->id);
            $pctReprobacion = ($rep && $rep->total > 0) ? round($rep->reprobadas / $rep->total * 100, 1) : 0.0;

            $pctInasistencia = $a->user_id ? (float) ($inasistencia->get($a->user_id)->pct ?? 0) : 0.0;

            $gruposIds = $a->grupos->pluck('id');
            $totalIncidencias = $gruposIds->sum(fn($gid) => $incidenciasPorGrupo->get($gid)->total ?? 0);

            $tieneAlertaBaja = $alertasBaja->contains($a->id);

            $score = round(
                $pctReprobacion * self::PESO_REPROBACION
                + $pctInasistencia * self::PESO_INASISTENCIA
                + min($totalIncidencias, 5) * self::PUNTOS_POR_INCIDENCIA
                + ($tieneAlertaBaja ? self::PUNTOS_ALERTA_BAJA : 0)
            );
            $score = (int) min(100, max(0, $score));

            $nivelRiesgo = $score >= 60 ? 'alto' : ($score >= 30 ? 'medio' : 'bajo');

            return [
                'alumno_id'          => $a->id,
                'numero_control'     => $a->numero_control,
                'nombre'             => $a->user?->name,
                'carrera'            => $a->carrera?->nombre,
                'carrera_id'         => $a->carrera_id,
                'semestre_actual'    => $a->semestre_actual,
                'grupos'             => $a->grupos->pluck('clave'),
                'pct_reprobacion'    => $pctReprobacion,
                'pct_inasistencia'   => $pctInasistencia,
                'total_incidencias_grupo' => $totalIncidencias,
                'alerta_baja_definitiva'  => $tieneAlertaBaja,
                'score'              => $score,
                'nivel_riesgo'       => $nivelRiesgo,
            ];
        })
            ->when($nivel, fn($c) => $c->where('nivel_riesgo', $nivel))
            ->filter(fn($r) => $r['score'] > 0)
            ->sortByDesc('score')
            ->values();

        return ApiResponse::success($resultado);
    }
}
