<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlumnoCargaSeleccion;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\GotenbergService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class PrecargaController extends Controller
{
    public function __construct(private GotenbergService $gotenberg) {}

    private function resolveAlumno(Request $request)
    {
        return \App\Domains\Academico\Models\Alumno::where('user_id', $request->user()->id)
            ->with(['carrera', 'inscripcion.aspirante'])
            ->first();
    }

    /**
     * Retorna los materia_ids que el alumno tiene pendientes (reprobados y nunca aprobados).
     */
    private function materiasPendientes(string $alumnoId): array
    {
        $cals = Calificacion::where('alumno_id', $alumnoId)
            ->whereNotNull('acreditado')
            ->with('grupo.cargas')
            ->get();

        // Agrupar por materia_id: [materia_id => [true|false, ...]]
        $porMateria = [];
        foreach ($cals as $cal) {
            $materiaId = $cal->grupo?->cargas?->first()?->materia_id;
            if (! $materiaId) continue;
            $porMateria[$materiaId][] = (bool) $cal->acreditado;
        }

        // Pendiente = alguna vez reprobó Y nunca aprobó
        $pendientes = [];
        foreach ($porMateria as $materiaId => $resultados) {
            $algezReprobó = in_array(false, $resultados, true);
            $alguezAprobó = in_array(true, $resultados, true);
            if ($algezReprobó && ! $alguezAprobó) {
                $pendientes[] = $materiaId;
            }
        }

        return $pendientes;
    }

    /**
     * Detecta conflictos de horario entre una carga y un conjunto de cargas ya seleccionadas.
     * Retorna array de mensajes de conflicto (vacío si no hay).
     */
    private function detectarConflictos(CargaAcademica $nueva, Collection $seleccionadas): array
    {
        $conflictos = [];
        foreach ($nueva->horarios as $h) {
            $hIni = strtotime($h->hora_inicio);
            $hFin = strtotime($h->hora_fin);
            foreach ($seleccionadas as $s) {
                if (! $s->cargaAcademica) continue;
                foreach ($s->cargaAcademica->horarios as $hs) {
                    if ($hs->dia_semana !== $h->dia_semana) continue;
                    $sIni = strtotime($hs->hora_inicio);
                    $sFin = strtotime($hs->hora_fin);
                    if ($hIni < $sFin && $hFin > $sIni) {
                        $nombre = $s->cargaAcademica->materia?->nombre ?? 'otra asignatura';
                        $conflictos[] = "Empalme con «{$nombre}» el {$h->dia_semana} "
                            . substr($h->hora_inicio, 0, 5) . '–' . substr($h->hora_fin, 0, 5);
                    }
                }
            }
        }
        return $conflictos;
    }

    /**
     * GET /api/alumno/precarga-academica
     *
     * Semestre 1  → lectura, cargas asignadas por admin.
     * Semestre 2+ → selección:
     *   • cargas_semestre_actual: del grupo del alumno en el período activo
     *   • cargas_pendientes:      de materias reprobadas aún no aprobadas, en cualquier
     *                             grupo de su carrera en el período activo
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->hasRole('alumno')) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $alumno = $this->resolveAlumno($request);

        if (! $alumno) {
            return ApiResponse::error('No se encontró el registro de alumno.', 404);
        }

        $periodo = Periodo::where('activo', true)->first();

        if (! $periodo) {
            return ApiResponse::success(null, 'No hay periodo activo.');
        }

        if (! $periodo->horarios_liberados) {
            return ApiResponse::success([
                'liberado' => false,
                'semestre' => $alumno->semestre_actual,
                'periodo'  => $periodo->only(['id', 'nombre']),
            ], 'Los horarios aún no han sido liberados por la administración.');
        }

        $semestre = $alumno->semestre_actual ?? 1;

        $base = [
            'liberado' => true,
            'semestre' => $semestre,
            'periodo'  => $periodo->only(['id', 'nombre']),
            'alumno'   => [
                'nombre'         => $user->name,
                'numero_control' => $alumno->numero_control,
                'carrera'        => $alumno->carrera?->nombre,
                'semestre'       => $semestre,
            ],
        ];

        // ── Semestre 1: lectura ────────────────────────────────────────────────
        if ($semestre === 1) {
            $grupos = Grupo::where('carrera_id', $alumno->carrera_id)
                ->where('semestre', 1)
                ->where('periodo_id', $periodo->id)
                ->pluck('id');

            $cargas = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
                ->whereIn('grupo_id', $grupos)
                ->where('periodo_id', $periodo->id)
                ->get();

            return ApiResponse::success(array_merge($base, [
                'modo'   => 'asignado',
                'cargas' => $cargas,
            ]));
        }

        // ── Semestre 2+: selección con soporte para repetidores ───────────────

        // 1. Cargas del semestre actual del alumno
        $gruposSemActual = Grupo::where('carrera_id', $alumno->carrera_id)
            ->where('semestre', $semestre)
            ->where('periodo_id', $periodo->id)
            ->pluck('id');

        $cargasSemActual = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
            ->whereIn('grupo_id', $gruposSemActual)
            ->where('periodo_id', $periodo->id)
            ->get();

        // 2. Materias pendientes del alumno (reprobadas, nunca aprobadas)
        $materiasPendientesIds = $this->materiasPendientes($alumno->id);

        // Cargas de esas materias pendientes en el período activo (cualquier semestre < actual)
        $cargasPendientes = collect();
        if (! empty($materiasPendientesIds)) {
            // Grupos de semestres anteriores de su carrera en este período
            $gruposAnteriores = Grupo::where('carrera_id', $alumno->carrera_id)
                ->where('semestre', '<', $semestre)
                ->where('periodo_id', $periodo->id)
                ->pluck('id');

            $cargasPendientes = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
                ->whereIn('grupo_id', $gruposAnteriores)
                ->whereIn('materia_id', $materiasPendientesIds)
                ->where('periodo_id', $periodo->id)
                ->get();
        }

        // 3. Selección actual del alumno
        $seleccionIds = AlumnoCargaSeleccion::where('alumno_id', $alumno->id)
            ->where('periodo_id', $periodo->id)
            ->pluck('carga_academica_id')
            ->toArray();

        return ApiResponse::success(array_merge($base, [
            'modo'                 => 'seleccion',
            'cargas_semestre'      => $cargasSemActual,
            'cargas_pendientes'    => $cargasPendientes,
            'tiene_pendientes'     => $cargasPendientes->isNotEmpty(),
            'seleccion_ids'        => $seleccionIds,
            // cargas = unión de ambos grupos (para compatibilidad)
            'cargas'               => $cargasSemActual->merge($cargasPendientes)->values(),
        ]));
    }

    /**
     * POST /api/alumno/precarga-academica/selecciones
     * Agrega una carga. Para repetidores se permiten cargas de semestres anteriores
     * si la materia está en su lista de pendientes.
     */
    public function seleccionar(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->hasRole('alumno')) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
        ]);

        $alumno = $this->resolveAlumno($request);

        if (! $alumno || ($alumno->semestre_actual ?? 1) < 2) {
            return ApiResponse::error('Esta acción solo está disponible para alumnos de semestre 2 en adelante.', 422);
        }

        $periodo = Periodo::where('activo', true)->first();

        if (! $periodo || ! $periodo->horarios_liberados) {
            return ApiResponse::error('Los horarios no están liberados.', 422);
        }

        $carga = CargaAcademica::with(['horarios', 'materia'])->findOrFail($data['carga_academica_id']);

        $grupo = Grupo::find($carga->grupo_id);

        if (! $grupo || $grupo->carrera_id !== $alumno->carrera_id) {
            return ApiResponse::error('La carga no pertenece a tu carrera.', 422);
        }

        // Carga del semestre actual → siempre permitida
        $esSemestreActual = $grupo->semestre === $alumno->semestre_actual;

        if (! $esSemestreActual) {
            // Carga de semestre anterior → solo si la materia está pendiente
            if ($grupo->semestre >= $alumno->semestre_actual) {
                return ApiResponse::error('Solo puedes seleccionar materias de tu semestre actual o de semestres anteriores.', 422);
            }

            $pendientes = $this->materiasPendientes($alumno->id);
            if (! in_array($carga->materia_id, $pendientes, true)) {
                return ApiResponse::error('Solo puedes seleccionar materias de semestres anteriores que tengas pendientes (reprobadas).', 422);
            }
        }

        // Verificar conflictos de horario
        $seleccionadas = AlumnoCargaSeleccion::where('alumno_id', $alumno->id)
            ->where('periodo_id', $periodo->id)
            ->with(['cargaAcademica.horarios', 'cargaAcademica.materia'])
            ->get();

        $conflictos = $this->detectarConflictos($carga, $seleccionadas);

        if ($conflictos) {
            return ApiResponse::error(
                'No se puede agregar: ' . implode('; ', $conflictos),
                422,
                $conflictos
            );
        }

        $seleccion = AlumnoCargaSeleccion::firstOrCreate([
            'alumno_id'          => $alumno->id,
            'carga_academica_id' => $data['carga_academica_id'],
            'periodo_id'         => $periodo->id,
        ]);

        return ApiResponse::success($seleccion, 'Asignatura agregada a tu precarga.', 201);
    }

    /**
     * DELETE /api/alumno/precarga-academica/selecciones/{carga_id}
     */
    public function deseleccionar(Request $request, string $cargaId): JsonResponse
    {
        $user = $request->user();

        if (! $user?->hasRole('alumno')) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $alumno = $this->resolveAlumno($request);

        if (! $alumno) {
            return ApiResponse::error('Alumno no encontrado.', 404);
        }

        AlumnoCargaSeleccion::where('alumno_id', $alumno->id)
            ->where('carga_academica_id', $cargaId)
            ->delete();

        return ApiResponse::success(null, 'Asignatura eliminada de tu precarga.');
    }

    /**
     * GET /api/alumno/precarga-academica/pdf
     */
    public function pdf(Request $request): Response
    {
        $user = $request->user();

        if (! $user?->hasRole('alumno')) {
            abort(403);
        }

        $alumno = $this->resolveAlumno($request);

        if (! $alumno) {
            abort(403, 'Registro de alumno no encontrado.');
        }

        $periodo = Periodo::where('activo', true)->first();

        if (! $periodo || ! $periodo->horarios_liberados) {
            abort(403, 'Horarios no liberados.');
        }

        $semestre = $alumno->semestre_actual ?? 1;

        if ($semestre === 1) {
            $grupos = Grupo::where('carrera_id', $alumno->carrera_id)
                ->where('semestre', 1)
                ->where('periodo_id', $periodo->id)
                ->pluck('id');

            $cargas = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
                ->whereIn('grupo_id', $grupos)
                ->where('periodo_id', $periodo->id)
                ->get();
        } else {
            $seleccionIds = AlumnoCargaSeleccion::where('alumno_id', $alumno->id)
                ->where('periodo_id', $periodo->id)
                ->pluck('carga_academica_id');

            $cargas = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
                ->whereIn('id', $seleccionIds)
                ->get();
        }

        $cfg  = ConfiguracionInstitucional::instancia();
        $html = view('pdfs.precarga_primer_semestre', compact('alumno', 'periodo', 'cargas', 'cfg', 'user'))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $nc = $alumno->numero_control ?? 'alumno';
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"precarga-{$nc}.pdf\"",
        ]);
    }
}
