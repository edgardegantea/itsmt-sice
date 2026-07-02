<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SesionClaseController extends Controller
{
    // GET /api/sesiones-clase
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'   => 'nullable|uuid',
            'periodo_id' => 'nullable|uuid',
        ]);

        $user = $request->user();

        $query = SesionClase::with(['grupo.carrera', 'grupo.periodo', 'docente'])
            ->orderBy('fecha', 'desc')
            ->orderBy('hora_inicio', 'desc');

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }

        if ($user->hasRole('docente')) {
            $query->where('docente_id', $user->id);
        }

        if ($request->filled('periodo_id')) {
            $query->whereHas('grupo', fn ($q) => $q->where('periodo_id', $request->periodo_id));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // POST /api/sesiones-clase
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'grupo_id'    => 'required|uuid|exists:grupos,id',
            'fecha'       => 'required|date',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
            'tema'        => 'nullable|string|max:255',
            'asistencias' => 'sometimes|array',
            'asistencias.*.alumno_id' => 'required|uuid|exists:users,id',
            'asistencias.*.estatus'   => ['required', Rule::in(['presente', 'ausente', 'retardo', 'justificado'])],
            'asistencias.*.observacion' => 'nullable|string|max:255',
        ]);

        $sesion = SesionClase::create([
            'grupo_id'    => $data['grupo_id'],
            'docente_id'  => $request->user()->id,
            'fecha'       => $data['fecha'],
            'hora_inicio' => $data['hora_inicio'],
            'hora_fin'    => $data['hora_fin'],
            'tema'        => $data['tema'] ?? null,
        ]);

        if (!empty($data['asistencias'])) {
            foreach ($data['asistencias'] as $a) {
                Asistencia::updateOrCreate(
                    ['sesion_id' => $sesion->id, 'alumno_id' => $a['alumno_id']],
                    ['estatus' => $a['estatus'], 'observacion' => $a['observacion'] ?? null]
                );
            }
            $this->checkAndGenerateAlertas($sesion->grupo_id);
        }

        return ApiResponse::success($sesion->load(['grupo', 'docente', 'asistencias.alumno']), 'Sesión registrada', 201);
    }

    // GET /api/sesiones-clase/{id}
    public function show(SesionClase $sesionClase): JsonResponse
    {
        return ApiResponse::success($sesionClase->load(['grupo.carrera', 'docente', 'asistencias.alumno']));
    }

    // PATCH /api/sesiones-clase/{id}/asistencia
    public function actualizarAsistencia(Request $request, SesionClase $sesionClase): JsonResponse
    {
        $data = $request->validate([
            'asistencias'                 => 'required|array',
            'asistencias.*.alumno_id'     => 'required|uuid|exists:users,id',
            'asistencias.*.estatus'       => ['required', Rule::in(['presente', 'ausente', 'retardo', 'justificado'])],
            'asistencias.*.observacion'   => 'nullable|string|max:255',
        ]);

        foreach ($data['asistencias'] as $a) {
            Asistencia::updateOrCreate(
                ['sesion_id' => $sesionClase->id, 'alumno_id' => $a['alumno_id']],
                ['estatus' => $a['estatus'], 'observacion' => $a['observacion'] ?? null]
            );
        }

        $this->checkAndGenerateAlertas($sesionClase->grupo_id);

        return ApiResponse::success($sesionClase->fresh(['grupo', 'docente', 'asistencias.alumno']));
    }

    // GET /api/grupos/{grupo}/reporte-asistencia
    public function reporteAsistenciaGrupo(Request $request, Grupo $grupo): JsonResponse
    {
        $sesiones = SesionClase::with(['asistencias.alumno'])
            ->where('grupo_id', $grupo->id)
            ->orderBy('fecha')
            ->get();

        $totalSesiones = $sesiones->count();

        // Compile per-student summary
        $alumnoStats = [];
        foreach ($sesiones as $sesion) {
            foreach ($sesion->asistencias as $a) {
                $id = $a->alumno_id;
                if (!isset($alumnoStats[$id])) {
                    $alumnoStats[$id] = [
                        'alumno_id'   => $id,
                        'nombre'      => $a->alumno->name ?? $id,
                        'presentes'   => 0,
                        'ausentes'    => 0,
                        'retardos'    => 0,
                        'justificados'=> 0,
                    ];
                }
                $alumnoStats[$id][$a->estatus === 'presente' ? 'presentes'
                    : ($a->estatus === 'ausente' ? 'ausentes'
                    : ($a->estatus === 'retardo' ? 'retardos' : 'justificados'))]++;
            }
        }

        foreach ($alumnoStats as &$stats) {
            $inasistenciasEfectivas = $stats['ausentes'] + ($stats['retardos'] * 0.5);
            $stats['porcentaje_inasistencia'] = $totalSesiones > 0
                ? round(($inasistenciasEfectivas / $totalSesiones) * 100, 2)
                : 0;
        }

        return ApiResponse::success([
            'grupo'           => $grupo->load('carrera', 'periodo'),
            'total_sesiones'  => $totalSesiones,
            'sesiones'        => $sesiones,
            'resumen_alumnos' => array_values($alumnoStats),
        ]);
    }

    // GET /api/alumnos/{alumno}/asistencia
    public function asistenciaAlumno(Request $request, string $alumnoId): JsonResponse
    {
        $registros = Asistencia::with(['sesion.grupo.carrera', 'sesion.grupo.periodo'])
            ->where('alumno_id', $alumnoId)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($registros);
    }

    // GET /api/reportes/carga-academica
    public function reporteCargaAcademica(Request $request): JsonResponse
    {
        $request->validate(['periodo_id' => 'nullable|uuid|exists:periodos,id']);

        $periodoId = $request->query('periodo_id');

        $docentes = \App\Models\User::role('docente')
            ->with(['cargas' => function ($q) use ($periodoId) {
                if ($periodoId) {
                    $q->where('periodo_id', $periodoId);
                }
                $q->with(['grupo', 'materia']);
            }, 'fichaDocente'])
            ->get()
            ->map(function ($docente) {
                $cargas         = $docente->cargas;
                $totalGrupos    = $cargas->count();
                $totalHoras     = $cargas->sum(fn ($c) => $c->horas_semana ?? 0);
                $materias       = $cargas->map(fn ($c) => $c->materia?->nombre)->filter()->unique()->values();

                return [
                    'docente_id'        => $docente->id,
                    'nombre'            => $docente->name,
                    'email'             => $docente->email,
                    'tipo_contrato'     => $docente->fichaDocente?->tipo_contrato,
                    'total_grupos'      => $totalGrupos,
                    'total_horas_semana'=> $totalHoras,
                    'materias'          => $materias,
                ];
            });

        return ApiResponse::success($docentes);
    }

    private function checkAndGenerateAlertas(string $grupoId): void
    {
        $sesiones = SesionClase::where('grupo_id', $grupoId)->pluck('id');
        $totalSesiones = $sesiones->count();

        if ($totalSesiones === 0) {
            return;
        }

        // alumno_grupo.alumno_id → alumnos.id; we need users.id for asistencias and alertas
        $alumnoRows = \DB::table('alumno_grupo')
            ->join('alumnos', 'alumnos.id', '=', 'alumno_grupo.alumno_id')
            ->where('alumno_grupo.grupo_id', $grupoId)
            ->where('alumno_grupo.activo', true)
            ->select('alumnos.user_id as user_id')
            ->get();

        foreach ($alumnoRows as $row) {
            $userId = $row->user_id;

            $ausencias = Asistencia::whereIn('sesion_id', $sesiones)
                ->where('alumno_id', $userId)
                ->whereIn('estatus', ['ausente', 'retardo'])
                ->get();

            $inasistenciasEfectivas = $ausencias->sum(fn ($a) => $a->estatus === 'retardo' ? 0.5 : 1);
            $porcentaje = ($inasistenciasEfectivas / $totalSesiones) * 100;

            if ($porcentaje >= 25) {
                AlertaInasistencia::updateOrCreate(
                    ['alumno_id' => $userId, 'grupo_id' => $grupoId],
                    ['porcentaje_inasistencia' => round($porcentaje, 2)]
                );
            }
        }
    }
}
