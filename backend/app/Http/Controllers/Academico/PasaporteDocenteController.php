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
 * "Pasaporte" de cumplimiento del docente: un solo QR personal (no por aula, no por
 * sesión) que, al escanearlo cualquier revisor durante el semestre, resume en vivo
 * captura de calificaciones, asistencia tomada e incidencias de prefectura — un
 * expediente vivo en vez de tener que cruzar tres pantallas distintas.
 */
class PasaporteDocenteController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/docentes/{docente}/pasaporte?periodo_id=
    public function resumen(Request $request, User $docente): JsonResponse
    {
        $user = $request->user();
        $esPropio = $user?->id === $docente->id;
        if (! $esPropio && ! $user?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }
        $periodo = Periodo::findOrFail($periodoId);

        $cargas = CargaAcademica::with(['materia', 'horarios', 'grupos'])
            ->where('docente_id', $docente->id)
            ->where('periodo_id', $periodoId)
            ->get();

        // jefe_carrera solo puede consultar el pasaporte de docentes que imparten
        // en su propia carrera durante ese periodo.
        if (! $esPropio && $user->hasRole('jefe_carrera') && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS])) {
            $imparteEnCarrera = $cargas->pluck('grupos')->flatten()->pluck('carrera_id')->contains($user->carrera_id);
            if (! $imparteEnCarrera) {
                return ApiResponse::error('No autorizado.', 403);
            }
        }

        // Asistencia acumulada del semestre a la fecha: bloques semanales de horario ×
        // semanas transcurridas del periodo, contra sesiones de clase realmente
        // registradas — mismo criterio que el resumen semanal por correo, pero
        // acumulado desde el inicio del periodo en vez de solo la última semana.
        $bloquesSemana = $cargas->sum(fn ($c) => $c->horarios->count());
        $finReferencia = now()->lt($periodo->fecha_fin) ? now() : $periodo->fecha_fin;
        $semanas = $periodo->fecha_inicio
            ? max(1, (int) ceil($periodo->fecha_inicio->diffInDays($finReferencia) / 7))
            : 1;
        $esperadas = $bloquesSemana * $semanas;

        $registradas = SesionClase::whereIn('carga_academica_id', $cargas->pluck('id'))->count();
        $pctAsistencia = $esperadas > 0 ? round(min(100, $registradas / $esperadas * 100)) : null;

        $alertasCaptura = AlertaCorteCaptura::where('docente_id', $docente->id)
            ->where('periodo_id', $periodoId)
            ->get();
        $pctCaptura = $alertasCaptura->isNotEmpty() ? round($alertasCaptura->avg('porcentaje_capturado')) : null;

        $incidencias = IncidenciaClase::where('docente_id', $docente->id)
            ->where('periodo_id', $periodoId)
            ->get();

        return ApiResponse::success([
            'docente'  => ['id' => $docente->id, 'name' => $docente->name, 'email' => $docente->email],
            'periodo'  => ['id' => $periodo->id, 'nombre' => $periodo->nombre],
            'materias' => $cargas->map(fn ($c) => ['materia' => $c->materia?->nombre, 'grupo' => $c->grupos->pluck('clave')->join(', ')])->values(),
            'asistencia' => ['esperadas' => $esperadas, 'registradas' => $registradas, 'pct' => $pctAsistencia],
            'captura'    => ['pct' => $pctCaptura, 'total_cargas_evaluadas' => $alertasCaptura->count()],
            'incidencias' => [
                'total'       => $incidencias->count(),
                'con_novedad' => $incidencias->where('estatus', '!=', 'sin_novedad')->count(),
            ],
        ]);
    }
}
