<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Models\Grupo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalificacionController extends Controller
{
    public function porGrupo(Request $request, string $grupoId): JsonResponse
    {
        $grupo = Grupo::with(['cargas.docente'])->findOrFail($grupoId);

        $user = $request->user();

        // Docente: solo sus grupos
        if ($user->hasRole('docente')) {
            $esSuGrupo = $grupo->cargas()->where('docente_id', $user->id)->exists();
            if (! $esSuGrupo) {
                return ApiResponse::error('No tienes acceso a este grupo.', 403);
            }
        }

        // Jefe de carrera: solo su carrera
        if ($user->hasRole('jefe_carrera') && $user->carrera_id !== $grupo->carrera_id) {
            return ApiResponse::error('No tienes acceso a grupos de otra carrera.', 403);
        }

        $calificaciones = Calificacion::with(['alumno.user'])
            ->where('grupo_id', $grupoId)
            ->get();

        return ApiResponse::success($calificaciones);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'alumno_id'        => ['required', 'uuid', 'exists:alumnos,id'],
            'grupo_id'         => ['required', 'uuid', 'exists:grupos,id'],
            'parciales'        => ['nullable', 'array'],
            'parciales.*.parcial'      => ['required_with:parciales', 'integer', 'min:1'],
            'parciales.*.calificacion' => ['required_with:parciales', 'numeric', 'min:0', 'max:100'],
            'calificacion_final'=> ['nullable', 'numeric', 'min:0', 'max:100'],
            'oportunidad'      => ['nullable', 'in:primera_oportunidad,segunda_oportunidad'],
        ]);

        $grupo = Grupo::with('cargas', 'periodo')->findOrFail($data['grupo_id']);

        // Solo el docente asignado a ese grupo puede capturar calificaciones
        if ($user->hasRole('docente')) {
            $esSuGrupo = $grupo->cargas()->where('docente_id', $user->id)->exists();
            if (! $esSuGrupo) {
                return ApiResponse::error('No estás asignado como docente a este grupo.', 403);
            }
        } elseif (! $user->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('No tienes permiso para capturar calificaciones.', 403);
        }

        // Bloquear si el curso ya fue cerrado
        $yaFueCerrado = CierreDeCurso::where('grupo_id', $data['grupo_id'])->exists();
        if ($yaFueCerrado) {
            return ApiResponse::error('El curso ya fue cerrado. No se pueden modificar calificaciones.', 422);
        }

        // Calcular promedio y acreditado si hay parciales y calificación final
        $promedio = null;
        $acreditado = null;

        if (! empty($data['parciales'])) {
            [$promedio, $acreditado] = $this->calcularPromedio(
                $data['parciales'],
                (float) ($data['calificacion_final'] ?? 0),
                $grupo
            );
        }

        // Determinar tipo_curso e intento_numero para este alumno en esta materia
        [$tipoCurso, $intentoNumero] = $this->resolverTipoCurso($data['alumno_id'], $grupo);

        $calificacion = Calificacion::updateOrCreate(
            ['alumno_id' => $data['alumno_id'], 'grupo_id' => $data['grupo_id']],
            array_merge($data, [
                'promedio'       => $promedio,
                'acreditado'     => $acreditado,
                'tipo_curso'     => $tipoCurso,
                'intento_numero' => $intentoNumero,
            ])
        );

        return ApiResponse::success($calificacion->fresh('alumno'), 'Calificación guardada.', 201);
    }

    private function calcularPromedio(array $parciales, float $calFinal, Grupo $grupo): array
    {
        // Obtener configuración de evaluación de la carrera del grupo
        $config = ConfiguracionEvaluacion::where('carrera_id', $grupo->carrera_id)->first();

        if (! $config || empty($config->peso_parciales)) {
            // Sin configuración: promedio simple de los parciales (calificacion_final se almacena
            // como referencia pero el promedio se calcula solo con los parciales para coherencia)
            $promedio = round((float) collect($parciales)->avg('calificacion'), 2);
        } else {
            // Con configuración: suma ponderada; los pesos_parciales deben sumar 1.0
            // calificacion_final se almacena como campo adicional pero los pesos ya cubren el 100%
            $pesos = collect($config->peso_parciales)->keyBy('parcial');
            $promedio = round(collect($parciales)->sum(function ($p) use ($pesos) {
                $peso = $pesos->get($p['parcial'])['peso'] ?? 0;
                return $p['calificacion'] * $peso;
            }), 2);
        }

        $min = $config?->calificacion_minima ?? 70;
        $acreditado = $promedio >= (float) $min;

        return [$promedio, $acreditado];
    }

    public function situacionAcademica(Request $request, string $alumnoId): JsonResponse
    {
        $user = $request->user();

        // Alumno solo puede ver su propia situación
        if ($user->hasRole('alumno')) {
            $alumno = \App\Domains\Academico\Models\Alumno::where('user_id', $user->id)->firstOrFail();
            if ($alumno->id !== $alumnoId) {
                return ApiResponse::error('Solo puedes ver tu propia situación académica.', 403);
            }
        } elseif (! $user->hasAnyRole([
            'superadmin', 'admin', 'jefe_carrera', 'director_academico', 'personal_administrativo',
            ...\App\Models\User::ROLES_DIRECTIVOS,
        ])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        // Jefe de carrera: solo alumnos de su carrera
        if ($user->hasRole('jefe_carrera')) {
            $alumno = \App\Domains\Academico\Models\Alumno::find($alumnoId);
            if (! $alumno || $alumno->carrera_id !== $user->carrera_id) {
                return ApiResponse::error('No tienes acceso a alumnos de otra carrera.', 403);
            }
        }

        $calificaciones = Calificacion::with(['grupo.cargas.materia', 'grupo.periodo'])
            ->where('alumno_id', $alumnoId)
            ->orderBy('created_at', 'desc')
            ->get();

        $alertas = \App\Domains\Academico\Models\AlertaBajaDefinitiva::with('grupo.periodo')
            ->where('alumno_id', $alumnoId)
            ->get();

        return ApiResponse::success([
            'calificaciones' => $calificaciones,
            'alertas_baja_definitiva' => $alertas,
        ]);
    }

    private function resolverTipoCurso(string $alumnoId, Grupo $grupo): array
    {
        // Contar intentos previos de esta materia (por grupo con misma materia, via cargas)
        $materiaId = $grupo->cargas()->value('materia_id');
        if (! $materiaId) {
            return ['ordinario', 1];
        }

        $intentosPrevios = Calificacion::whereHas(
            'grupo.cargas',
            fn($q) => $q->where('materia_id', $materiaId)
        )
            ->where('alumno_id', $alumnoId)
            ->where('grupo_id', '!=', $grupo->id)
            ->whereNotNull('acreditado')
            ->where('acreditado', false)
            ->count();

        return match (true) {
            $intentosPrevios === 0 => ['ordinario', 1],
            $intentosPrevios === 1 => ['repeticion', 2],
            default               => ['especial', 3],
        };
    }
}
