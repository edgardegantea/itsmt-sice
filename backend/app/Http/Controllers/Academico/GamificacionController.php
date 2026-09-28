<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaCorteCaptura;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Ranking de cumplimiento docente — la misma suma ponderada de captura/asistencia/
 * incidencias que ya calcula PasaporteDocenteController, pero para todos los docentes
 * a la vez y en formato "leaderboard" con insignias, para incentivar con
 * reconocimiento en vez de solo señalar a quien va mal (ese ángulo ya lo cubre la
 * alerta de riesgo académico, que es sobre alumnos, no docentes).
 */
class GamificacionController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/gamificacion/ranking-docentes?periodo_id=
    public function rankingDocentes(Request $request): JsonResponse
    {
        $user = $request->user();
        // Cualquier docente puede ver el ranking (ver dónde queda, motiva más que
        // solo ver su propio número) — no es información sensible, son cumplimientos.
        if (! $user?->hasAnyRole([...self::ROLES_CONSULTA, 'docente'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }
        $periodo = Periodo::findOrFail($periodoId);

        $cargas = CargaAcademica::with(['docente', 'horarios'])
            ->where('periodo_id', $periodoId)
            ->whereNotNull('docente_id')
            ->get()
            ->groupBy('docente_id');

        $alertasCaptura = AlertaCorteCaptura::where('periodo_id', $periodoId)->get()->groupBy('docente_id');
        $incidencias = IncidenciaClase::where('periodo_id', $periodoId)->get()->groupBy('docente_id');

        $finReferencia = now()->lt($periodo->fecha_fin) ? now() : $periodo->fecha_fin;
        $semanas = $periodo->fecha_inicio ? max(1, (int) ceil($periodo->fecha_inicio->diffInDays($finReferencia) / 7)) : 1;

        $ranking = $cargas->map(function ($cargasDocente, $docenteId) use ($alertasCaptura, $incidencias, $semanas) {
            $docente = $cargasDocente->first()->docente;

            $bloquesSemana = $cargasDocente->sum(fn ($c) => $c->horarios->count());
            $esperadas = $bloquesSemana * $semanas;
            $registradas = SesionClase::whereIn('carga_academica_id', $cargasDocente->pluck('id'))->count();
            $pctAsistencia = $esperadas > 0 ? round(min(100, $registradas / $esperadas * 100)) : null;

            $alertasDocente = $alertasCaptura->get($docenteId, collect());
            $pctCaptura = $alertasDocente->isNotEmpty() ? round($alertasDocente->avg('porcentaje_capturado')) : null;

            $incidenciasDocente = $incidencias->get($docenteId, collect());
            $totalIncidencias = $incidenciasDocente->count();
            $conNovedad = $incidenciasDocente->where('estatus', '!=', 'sin_novedad')->count();
            $pctSinNovedad = $totalIncidencias > 0 ? round((1 - $conNovedad / $totalIncidencias) * 100) : 100;

            // Si falta una señal (ej. nunca se evaluó un corte de captura) se pondera
            // solo con las señales disponibles, para no castigar a nadie por un dato
            // que ni siquiera aplica todavía.
            $señales = array_filter([$pctCaptura, $pctAsistencia, $pctSinNovedad], fn ($v) => $v !== null);
            $score = count($señales) > 0 ? (int) round(array_sum($señales) / count($señales)) : 0;

            $insignias = [];
            if ($score >= 95) $insignias[] = ['icono' => '🏆', 'label' => 'Cumplimiento ejemplar'];
            if ($pctCaptura !== null && $pctCaptura >= 100) $insignias[] = ['icono' => '📝', 'label' => 'Captura al día'];
            if ($pctAsistencia !== null && $pctAsistencia >= 100) $insignias[] = ['icono' => '📅', 'label' => 'Asistencia perfecta'];
            if ($totalIncidencias > 0 && $conNovedad === 0) $insignias[] = ['icono' => '✅', 'label' => 'Sin incidencias'];

            return [
                'docente_id'      => $docenteId,
                'nombre'          => $docente?->name,
                'score'           => $score,
                'pct_captura'     => $pctCaptura,
                'pct_asistencia'  => $pctAsistencia,
                'pct_sin_novedad' => $pctSinNovedad,
                'total_incidencias' => $totalIncidencias,
                'insignias'       => $insignias,
            ];
        })
            ->sortByDesc('score')
            ->values()
            ->map(function ($fila, $i) {
                $fila['posicion'] = $i + 1;
                return $fila;
            });

        return ApiResponse::success($ranking);
    }
}
