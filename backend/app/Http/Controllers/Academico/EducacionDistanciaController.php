<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\InscripcionDistancia;
use App\Domains\Academico\Models\ProgramaDistancia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EducacionDistanciaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_general', 'direccion_academica', 'subdireccion_academica'];

    private const ROLES_COORD = ['coord_distancia'];

    // GET /api/seguimiento-distancia
    // S17-04: CoordDistancia / Admin ve alumnos con carga actual, semestres, alertas de riesgo (>50% del tiempo máximo)
    public function seguimiento(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(self::ROLES_ADMIN);
        $esCoord = $user->hasAnyRole(self::ROLES_COORD);

        if (! $esAdmin && ! $esCoord) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $inscripciones = InscripcionDistancia::with([
            'alumno:id,name,email',
            'programa:id,modalidad,semestres_maximos,carrera_id',
            'programa.carrera:id,nombre',
            'periodoIngreso:id,nombre',
        ])->get();

        $seguimiento = $inscripciones->map(function ($insc) {
            $semestres_cursados = DB::table('alumno_grupo')
                ->join('grupos', 'grupos.id', '=', 'alumno_grupo.grupo_id')
                ->join('alumnos', 'alumnos.user_id', '=', DB::raw("'" . $insc->alumno_id . "'"))
                ->where('alumno_grupo.alumno_id', DB::raw('alumnos.id'))
                ->distinct()
                ->count('grupos.periodo_id');

            $semestres_maximos = $insc->programa?->semestres_maximos ?? 16;
            $alerta_riesgo = $semestres_cursados > ($semestres_maximos * 0.5);

            return [
                'inscripcion'        => $insc,
                'semestres_cursados' => $semestres_cursados,
                'semestres_maximos'  => $semestres_maximos,
                'alerta_riesgo'      => $alerta_riesgo,
                'modulo_pendiente'   => ! $insc->modulo_competencias_acreditado,
            ];
        });

        return ApiResponse::success($seguimiento);
    }

    // GET /api/indicadores/distancia
    // S17-05: Dashboard agregado por carrera/programa — Director / CoordDistancia
    public function indicadores(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(self::ROLES_ADMIN);
        $esCoord = $user->hasAnyRole(self::ROLES_COORD);

        if (! $esAdmin && ! $esCoord) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $programas = ProgramaDistancia::with('carrera:id,nombre,clave')
            ->withCount('inscripciones')
            ->get();

        $total_inscritos = InscripcionDistancia::count();
        $modulo_pendiente = InscripcionDistancia::where('modulo_competencias_acreditado', false)->count();
        $modulo_acreditado = InscripcionDistancia::where('modulo_competencias_acreditado', true)->count();

        return ApiResponse::success([
            'programas'        => $programas,
            'total_inscritos'  => $total_inscritos,
            'modulo_pendiente' => $modulo_pendiente,
            'modulo_acreditado' => $modulo_acreditado,
        ]);
    }
}
