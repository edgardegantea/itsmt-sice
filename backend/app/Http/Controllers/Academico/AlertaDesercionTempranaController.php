<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Detecta riesgo de abandono en las primeras semanas del semestre, antes de que
 * haya calificaciones — a diferencia de la alerta de riesgo académico (que pesa
 * sobre todo reprobación), esta se basa en el patrón de asistencia de arranque:
 * quién dejó de presentarse desde el principio es la señal más temprana de
 * deserción que tenemos disponible.
 *
 * Tampoco es un modelo de ML: es la misma lógica de suma ponderada por reglas que
 * ya usa la alerta de riesgo académico, aplicada a una ventana de tiempo distinta.
 */
class AlertaDesercionTempranaController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    private const PESO_INASISTENCIA_TEMPRANA = 0.7; // × % de sesiones ausente en la ventana
    private const PUNTOS_NUNCA_ASISTIO       = 25;  // bonus si no tiene ni una presencia registrada
    private const PUNTOS_POR_INCIDENCIA      = 3;    // por incidencia de prefectura no "sin novedad" en su(s) grupo(s) durante la ventana, tope 5

    // GET /api/alertas-desercion-temprana?periodo_id=&carrera_id=&grupo_id=&semanas=3&nivel=
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
        $periodo = Periodo::find($periodoId);
        if (! $periodo?->fecha_inicio) {
            return ApiResponse::error('El periodo no tiene fecha de inicio configurada.', 422);
        }

        $semanas   = max(1, min(12, (int) ($request->query('semanas') ?? 3)));
        $carreraId = $request->query('carrera_id');
        $grupoId   = $request->query('grupo_id');
        $nivel     = $request->query('nivel'); // alto|medio|bajo

        $ventanaInicio = $periodo->fecha_inicio->copy();
        $ventanaFin    = $ventanaInicio->copy()->addWeeks($semanas);
        $hoy           = now()->toDateString();

        // Si el semestre apenas empieza, no hay suficiente ventana observada todavía.
        if ($ventanaInicio->toDateString() > $hoy) {
            return ApiResponse::success([]);
        }

        $alumnosQuery = Alumno::with(['user', 'carrera', 'grupos' => fn($q) => $q->where('grupos.periodo_id', $periodoId)])
            ->where('estatus', 'activo')
            ->whereHas('grupos', fn($q) => $q->where('grupos.periodo_id', $periodoId)->when($grupoId, fn($q2) => $q2->where('grupos.id', $grupoId)))
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId));

        if ($user->hasRole('jefe_carrera') && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS])) {
            $alumnosQuery->where('carrera_id', $user->carrera_id);
        }

        $alumnos = $alumnosQuery->get();
        if ($alumnos->isEmpty()) {
            return ApiResponse::success([]);
        }

        $userIds = $alumnos->pluck('user_id')->filter();

        // Total de sesiones celebradas (hasta hoy) en la ventana, por grupo — para
        // saber sobre cuántas oportunidades de asistencia se calcula el porcentaje.
        $sesionesPorGrupo = DB::table('sesiones_clase')
            ->whereIn('grupo_id', $alumnos->pluck('grupos')->flatten()->pluck('id')->unique())
            ->whereBetween('fecha', [$ventanaInicio->toDateString(), min($ventanaFin->toDateString(), $hoy)])
            ->whereNull('deleted_at')
            ->selectRaw('grupo_id, COUNT(*) as total')
            ->groupBy('grupo_id')
            ->get()
            ->keyBy('grupo_id');

        // Asistencias registradas del alumno dentro de esa ventana.
        $asistencias = DB::table('asistencias as a')
            ->join('sesiones_clase as s', 'a.sesion_id', '=', 's.id')
            ->whereIn('a.alumno_id', $userIds)
            ->whereBetween('s.fecha', [$ventanaInicio->toDateString(), min($ventanaFin->toDateString(), $hoy)])
            ->whereNull('s.deleted_at')
            ->selectRaw("a.alumno_id, s.grupo_id, COUNT(*) as total, SUM(CASE WHEN a.estatus IN ('presente','retardo') THEN 1 ELSE 0 END) as presentes")
            ->groupBy('a.alumno_id', 's.grupo_id')
            ->get()
            ->groupBy('alumno_id');

        $incidenciasPorGrupo = DB::table('incidencias_clase')
            ->where('periodo_id', $periodoId)
            ->where('estatus', '!=', 'sin_novedad')
            ->whereBetween('fecha', [$ventanaInicio->toDateString(), min($ventanaFin->toDateString(), $hoy)])
            ->selectRaw('grupo_id, COUNT(*) as total')
            ->groupBy('grupo_id')
            ->get()
            ->keyBy('grupo_id');

        $resultado = $alumnos->map(function (Alumno $a) use ($sesionesPorGrupo, $asistencias, $incidenciasPorGrupo) {
            $gruposIds = $a->grupos->pluck('id');

            $totalSesionesEsperadas = $gruposIds->sum(fn($gid) => $sesionesPorGrupo->get($gid)->total ?? 0);
            if ($totalSesionesEsperadas === 0) {
                return null; // sin sesiones celebradas todavía en sus grupos — nada que evaluar
            }

            $registrosAlumno = $asistencias->get($a->user_id, collect());
            $totalRegistrado = $registrosAlumno->sum('total');
            $totalPresente   = $registrosAlumno->sum('presentes');

            // Ausente = no tiene registro de presencia sobre el total de sesiones esperadas
            // (una sesión sin fila de asistencia para el alumno cuenta como ausencia).
            $pctInasistencia = round((1 - ($totalPresente / max($totalSesionesEsperadas, 1))) * 100, 1);
            $pctInasistencia = max(0.0, min(100.0, $pctInasistencia));

            $nuncaAsistio = $totalPresente === 0;

            $totalIncidencias = $gruposIds->sum(fn($gid) => $incidenciasPorGrupo->get($gid)->total ?? 0);

            $score = round(
                $pctInasistencia * self::PESO_INASISTENCIA_TEMPRANA
                + ($nuncaAsistio ? self::PUNTOS_NUNCA_ASISTIO : 0)
                + min($totalIncidencias, 5) * self::PUNTOS_POR_INCIDENCIA
            );
            $score = (int) min(100, max(0, $score));

            if ($score === 0) {
                return null;
            }

            $nivelRiesgo = $score >= 60 ? 'alto' : ($score >= 30 ? 'medio' : 'bajo');

            return [
                'alumno_id'                => $a->id,
                'numero_control'           => $a->numero_control,
                'nombre'                   => $a->user?->name,
                'carrera'                  => $a->carrera?->nombre,
                'carrera_id'               => $a->carrera_id,
                'semestre_actual'          => $a->semestre_actual,
                'grupos'                   => $a->grupos->pluck('clave'),
                'pct_inasistencia_temprana' => $pctInasistencia,
                'nunca_asistio'            => $nuncaAsistio,
                'total_sesiones_evaluadas' => $totalSesionesEsperadas,
                'total_incidencias_grupo'  => $totalIncidencias,
                'score'                    => $score,
                'nivel_riesgo'             => $nivelRiesgo,
            ];
        })
            ->filter()
            ->when($nivel, fn($c) => $c->where('nivel_riesgo', $nivel))
            ->sortByDesc('score')
            ->values();

        return ApiResponse::success($resultado);
    }
}
