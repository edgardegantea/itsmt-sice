<?php

namespace App\Http\Controllers\Calidad;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Calidad\Models\EvaluacionDocente;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluacionDocenteController extends Controller
{
    // GET /api/evaluaciones-docentes  — alumno: sus grupos pendientes de evaluar
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('alumno')) {
            $alumno  = Alumno::where('user_id', $user->id)->firstOrFail();
            $periodo = Periodo::where('activo', true)->first();

            if (! $periodo) {
                return ApiResponse::success([]);
            }

            // Grupos del alumno en el periodo activo
            $grupos = $alumno->grupos()
                ->where('periodo_id', $periodo->id)
                ->with(['cargas.materia', 'cargas.docente'])
                ->get();

            // Marcar cuáles ya evaluó
            $yaEvaluo = DB::table('alumno_evaluaciones_periodo')
                ->where('alumno_id', $alumno->id)
                ->where('periodo_id', $periodo->id)
                ->pluck('grupo_id')
                ->toArray();

            $resultado = $grupos->map(fn($g) => [
                'grupo_id'    => $g->id,
                'clave'       => $g->clave,
                'semestre'    => $g->semestre,
                'materias'    => $g->cargas->map(fn($c) => [
                    'materia' => $c->materia?->nombre,
                    'docente' => $c->docente?->name,
                ]),
                'ya_evaluado' => in_array($g->id, $yaEvaluo),
            ]);

            return ApiResponse::success($resultado);
        }

        // Admin/directivos: listado de evaluaciones por periodo
        $periodoId = $request->query('periodo_id');
        $query = EvaluacionDocente::with(['grupo.materia', 'grupo.docente', 'periodo'])
            ->when($periodoId, fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('grupo_id'), fn($q, $v) => $q->where('grupo_id', $v));

        return ApiResponse::success($query->latest('created_at')->paginate(20));
    }

    // POST /api/evaluaciones-docentes  — alumno envía evaluación anónima
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('alumno')) {
            abort(403, 'Solo los alumnos pueden enviar evaluaciones docentes.');
        }

        $alumno  = Alumno::where('user_id', $request->user()->id)->firstOrFail();
        $periodo = Periodo::where('activo', true)->firstOrFail();

        $data = $request->validate([
            'grupo_id'   => ['required', 'uuid', 'exists:grupos,id'],
            'respuestas' => ['required', 'array', 'min:1'],
        ]);

        // Verificar que el alumno pertenezca al grupo
        $perteneceAlGrupo = $alumno->grupos()
            ->where('grupos.id', $data['grupo_id'])
            ->where('periodo_id', $periodo->id)
            ->exists();

        if (! $perteneceAlGrupo) {
            return ApiResponse::error('No perteneces a este grupo en el periodo activo.', 403);
        }

        // Verificar que no haya evaluado ya este grupo en este periodo
        $yaEvaluo = DB::table('alumno_evaluaciones_periodo')
            ->where('alumno_id', $alumno->id)
            ->where('grupo_id', $data['grupo_id'])
            ->where('periodo_id', $periodo->id)
            ->exists();

        if ($yaEvaluo) {
            return ApiResponse::error('Ya enviaste tu evaluación para este grupo en el periodo activo.', 409);
        }

        DB::transaction(function () use ($alumno, $data, $periodo) {
            // Guardar evaluación SIN alumno_id (anonimato)
            EvaluacionDocente::create([
                'grupo_id'   => $data['grupo_id'],
                'periodo_id' => $periodo->id,
                'respuestas' => $data['respuestas'],
                'enviada'    => true,
            ]);

            // Registrar que este alumno evaluó (sin ligar a la respuesta específica)
            DB::table('alumno_evaluaciones_periodo')->insert([
                'alumno_id'   => $alumno->id,
                'grupo_id'    => $data['grupo_id'],
                'periodo_id'  => $periodo->id,
                'evaluado_en' => now(),
            ]);
        });

        return ApiResponse::success(null, 'Evaluación enviada. ¡Gracias por tu participación!', 201);
    }

    // GET /api/evaluaciones-docentes/resultados
    public function resultados(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...array_keys([])])) {
            if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
                abort(403);
            }
        }

        $periodoId = $request->query('periodo_id');
        $carreraForzada = $user->carreraRestringida();

        // Resultados agregados por grupo — sin exponer datos individuales (S5-04)
        $grupos = Grupo::with(['cargas.materia', 'cargas.docente', 'carrera'])
            ->when($periodoId, fn($q, $v) => $q->where('periodo_id', $v))
            ->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v))
            ->when($request->query('carrera_id') && ! $carreraForzada,
                fn($q) => $q->where('carrera_id', $request->query('carrera_id')))
            ->get();

        $resultado = $grupos->map(function ($grupo) use ($periodoId) {
            $evaluaciones = EvaluacionDocente::where('grupo_id', $grupo->id)
                ->when($periodoId, fn($q, $v) => $q->where('periodo_id', $v))
                ->get();

            $total = $evaluaciones->count();

            // Calcular promedios por pregunta (asumiendo respuestas numéricas 1-5 por clave)
            $promedios = [];
            if ($total > 0) {
                $todasRespuestas = $evaluaciones->pluck('respuestas');
                $claves = array_keys($todasRespuestas->first() ?? []);
                foreach ($claves as $clave) {
                    $valores = $todasRespuestas
                        ->map(fn($r) => is_numeric($r[$clave] ?? null) ? (float) $r[$clave] : null)
                        ->filter()
                        ->values();
                    $promedios[$clave] = $valores->isNotEmpty()
                        ? round($valores->avg(), 2)
                        : null;
                }
            }

            return [
                'grupo_id'         => $grupo->id,
                'clave'            => $grupo->clave,
                'carrera'          => $grupo->carrera?->nombre,
                'docentes'         => $grupo->cargas->pluck('docente.name')->filter()->unique()->values(),
                'total_respuestas' => $total,
                'promedios'        => $promedios,
            ];
        });

        return ApiResponse::success($resultado);
    }
}
