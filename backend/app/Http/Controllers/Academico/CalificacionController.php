<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Models\CorteCaptura;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

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

        $grupo = Grupo::with('cargas.materia', 'periodo', 'alumnos')->findOrFail($request->input('grupo_id'));
        $config = ConfiguracionEvaluacion::where('carrera_id', $grupo->carrera_id)->first();

        // El número de parciales a capturar debe coincidir con las unidades de la
        // instrumentación didáctica (planeación) que el docente entregó para esta
        // asignatura y periodo — su nombre y cantidad son los que el docente definió,
        // no un valor fijo. Si aún no existe planeación, se cae al temario oficial
        // de la materia y, en último caso, a 3.
        $cargaParaValidar = $grupo->cargas->firstWhere('id', $request->input('carga_academica_id'));
        $unidadesPlaneacion = $cargaParaValidar
            ? $this->unidadesPlaneacion($cargaParaValidar->id, $grupo->periodo_id)
            : null;
        $numParciales = $unidadesPlaneacion?->count()
            ?: count($cargaParaValidar?->materia?->temario ?? [])
            ?: 3;

        $data = $request->validate([
            'alumno_id'        => ['required', 'uuid', 'exists:alumnos,id'],
            'grupo_id'         => ['required', 'uuid', 'exists:grupos,id'],
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'parciales'        => ['nullable', 'array'],
            'parciales.*.parcial'      => ['required_with:parciales', 'integer', 'min:1', "max:{$numParciales}"],
            'parciales.*.calificacion' => ['required_with:parciales', 'numeric', 'min:0', 'max:100'],
            'calificacion_final'=> ['nullable', 'numeric', 'min:0', 'max:100'],
            'oportunidad'      => ['nullable', 'in:primera_oportunidad,segunda_oportunidad'],
        ]);

        // El alumno debe estar inscrito en este grupo
        if (! $grupo->alumnos->contains('id', $data['alumno_id'])) {
            return ApiResponse::error('El alumno indicado no está inscrito en este grupo.', 422);
        }

        /** @var CargaAcademica|null $carga */
        $carga = $grupo->cargas->firstWhere('id', $data['carga_academica_id']);
        if (! $carga) {
            return ApiResponse::error('La carga académica indicada no pertenece a este grupo.', 422);
        }

        // Solo el docente asignado a esa materia (carga) puede capturar sus calificaciones
        if ($user->hasRole('docente')) {
            if ($carga->docente_id !== $user->id) {
                return ApiResponse::error('No estás asignado como docente a esta materia en este grupo.', 403);
            }
        } elseif (! $user->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('No tienes permiso para capturar calificaciones.', 403);
        }

        // Bloquear si el curso ya fue cerrado
        $yaFueCerrado = CierreDeCurso::where('grupo_id', $data['grupo_id'])->exists();
        if ($yaFueCerrado) {
            return ApiResponse::error('El curso ya fue cerrado. No se pueden modificar calificaciones.', 422);
        }

        // El periodo de captura debe estar activo
        if (! $grupo->periodo || ! $grupo->periodo->activo) {
            return ApiResponse::error('El periodo de captura no está activo para esta materia.', 422);
        }

        // Bloqueo por corte de captura: si un parcial ya fue capturado y su
        // corte correspondiente ya venció, solo un admin/director puede modificarlo.
        if (! empty($data['parciales'])) {
            $existente = Calificacion::where([
                'alumno_id'          => $data['alumno_id'],
                'grupo_id'           => $data['grupo_id'],
                'carga_academica_id' => $carga->id,
            ])->first();

            $puedeAnularCorte = $user->hasAnyRole(['superadmin', 'admin', 'director_academico']);

            if ($existente && ! $puedeAnularCorte) {
                $cortes = CorteCaptura::where('periodo_id', $grupo->periodo_id)->get()->keyBy('numero');

                foreach ($data['parciales'] as $p) {
                    $numero = (int) $p['parcial'];
                    $corte = $cortes->get($numero);

                    if (! $corte) {
                        continue;
                    }

                    $yaCapturado = collect($existente->parciales ?? [])
                        ->contains(fn ($pp) => (int) ($pp['parcial'] ?? 0) === $numero);

                    if ($yaCapturado && now()->toDateString() > $corte->fecha_limite_captura->toDateString()) {
                        $fecha = $corte->fecha_limite_captura->format('d/m/Y');
                        return ApiResponse::error(
                            "El corte {$numero} ya cerró el {$fecha}; contacta a un administrador para modificarlo.",
                            422
                        );
                    }
                }
            }
        }

        // Calcular promedio y acreditado si hay parciales y calificación final
        $promedio = null;
        $acreditado = null;

        if (! empty($data['parciales'])) {
            [$promedio, $acreditado] = $this->calcularPromedio(
                $data['parciales'],
                (float) ($data['calificacion_final'] ?? 0),
                $grupo,
                $carga
            );
        } elseif (isset($data['calificacion_final'])) {
            // Materias evaluadas solo con calificación final (sin parciales)
            $promedio = (float) $data['calificacion_final'];
            $acreditado = $promedio >= (float) ($config?->calificacion_minima ?? 70);
        }

        // Determinar tipo_curso e intento_numero para este alumno en esta materia
        [$tipoCurso, $intentoNumero] = Calificacion::resolverTipoCurso($data['alumno_id'], $carga);

        $calificacion = Calificacion::updateOrCreate(
            ['alumno_id' => $data['alumno_id'], 'grupo_id' => $data['grupo_id'], 'carga_academica_id' => $carga->id],
            array_merge($data, [
                'promedio'       => $promedio,
                'acreditado'     => $acreditado,
                'tipo_curso'     => $tipoCurso,
                'intento_numero' => $intentoNumero,
            ])
        );

        return ApiResponse::success($calificacion->fresh('alumno'), 'Calificación guardada.', 201);
    }

    private function calcularPromedio(array $parciales, float $calFinal, Grupo $grupo, ?CargaAcademica $carga = null): array
    {
        // Obtener configuración de evaluación de la carrera del grupo
        $config = ConfiguracionEvaluacion::where('carrera_id', $grupo->carrera_id)->first();

        // Prioridad 1: porcentajes por unidad definidos por el docente en su
        // instrumentación didáctica (planeación) para esta materia/periodo —
        // son los pesos reales que el docente entregó y Jefatura/Dirección
        // liberaron, no un promedio genérico por carrera.
        $unidades = $carga ? $this->unidadesPlaneacion($carga->id, $grupo->periodo_id) : null;
        $sumaPorcentajesUnidades = $unidades?->sum('porcentaje') ?? 0;

        if ($unidades && $unidades->isNotEmpty() && abs($sumaPorcentajesUnidades - 100) < 0.5) {
            $pesosUnidad = $unidades->keyBy('numero');
            $promedio = round(collect($parciales)->sum(function ($p) use ($pesosUnidad) {
                $peso = (float) ($pesosUnidad->get((int) $p['parcial'])['porcentaje'] ?? 0) / 100;
                return $p['calificacion'] * $peso;
            }), 2);
        } elseif ($config && ! empty($config->peso_parciales)) {
            // Prioridad 2: pesos genéricos configurados por carrera (fallback si el
            // docente aún no entrega o libera su instrumentación didáctica).
            $pesos = collect($config->peso_parciales)->keyBy('parcial');
            $promedio = round(collect($parciales)->sum(function ($p) use ($pesos) {
                $peso = $pesos->get($p['parcial'])['peso'] ?? 0;
                return $p['calificacion'] * $peso;
            }), 2);
        } else {
            // Sin planeación ni configuración: promedio simple de los parciales
            $promedio = round((float) collect($parciales)->avg('calificacion'), 2);
        }

        $min = $config?->calificacion_minima ?? 70;
        $acreditado = $promedio >= (float) $min;

        return [$promedio, $acreditado];
    }

    /**
     * Unidades (nombre + porcentaje) de la instrumentación didáctica liberada
     * o vigente que el docente entregó para esta carga académica y periodo.
     * Cada unidad corresponde al "parcial" con el mismo número.
     */
    private function unidadesPlaneacion(string $cargaAcademicaId, string $periodoId): ?Collection
    {
        $planeacion = PlaneacionDocente::where('carga_academica_id', $cargaAcademicaId)
            ->where('periodo_id', $periodoId)
            ->first();

        if (! $planeacion || empty($planeacion->competencias)) {
            return null;
        }

        return collect($planeacion->competencias)
            ->filter(fn ($c) => isset($c['numero']))
            ->values();
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

    public function kardex(Request $request, string $alumnoId): JsonResponse
    {
        $user = $request->user();

        // Alumno solo puede ver su propio kardex
        if ($user->hasRole('alumno')) {
            $alumno = \App\Domains\Academico\Models\Alumno::where('user_id', $user->id)->firstOrFail();
            if ($alumno->id !== $alumnoId) {
                return ApiResponse::error('Solo puedes ver tu propio kardex.', 403);
            }
        } elseif (! $user->hasAnyRole([
            'superadmin', 'admin', 'jefe_carrera', 'director_academico', 'personal_administrativo',
            ...\App\Models\User::ROLES_DIRECTIVOS,
        ])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        if ($user->hasRole('jefe_carrera')) {
            $alumno = \App\Domains\Academico\Models\Alumno::find($alumnoId);
            if (! $alumno || $alumno->carrera_id !== $user->carrera_id) {
                return ApiResponse::error('No tienes acceso a alumnos de otra carrera.', 403);
            }
        }

        $kardex = \App\Domains\Academico\Models\Kardex::with(['grupo', 'periodo', 'cargaAcademica.materia'])
            ->where('alumno_id', $alumnoId)
            ->orderBy('fecha_registro', 'desc')
            ->get();

        return ApiResponse::success($kardex);
    }
}
