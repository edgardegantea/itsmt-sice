<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AsignacionDocente;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsignacionDocenteController extends Controller
{
    private const ROLES_GESTION = ['superadmin', 'admin', 'director_academico', 'jefe_carrera',
                                    'control_escolar', 'direccion_academica', 'subdireccion_academica'];

    // GET /api/asignaciones-docentes?carrera_id=&periodo_id=  (S9-01/S9-02)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_GESTION)) {
            abort(403);
        }

        $carreraForzada = $user->carreraRestringida();
        $carreraId = $carreraForzada ?? $request->query('carrera_id');
        $periodoId = $request->query('periodo_id');
        $docenteId = $request->query('docente_id');

        $asignaciones = AsignacionDocente::with(['docente', 'materia', 'carrera', 'periodo', 'grupo', 'instrumentacion'])
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId))
            ->when($periodoId, fn($q) => $q->where('periodo_id', $periodoId))
            ->when($docenteId, fn($q) => $q->where('docente_id', $docenteId))
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success($asignaciones);
    }

    // POST /api/asignaciones-docentes  (S9-01 — director asigna)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica'])) {
            abort(403);
        }

        $data = $request->validate([
            'docente_id'   => ['required', 'uuid', 'exists:users,id'],
            'materia_id'   => ['required', 'uuid', 'exists:materias,id'],
            'carrera_id'   => ['required', 'uuid', 'exists:carreras,id'],
            'periodo_id'   => ['required', 'uuid', 'exists:periodos,id'],
            'grupo_id'     => ['nullable', 'uuid', 'exists:grupos,id'],
            'horas_semana' => ['required', 'integer', 'min:1', 'max:40'],
        ]);

        $asignacion = AsignacionDocente::create(array_merge($data, [
            'asignado_por' => $user->id,
            'notificado'   => false,
        ]));

        return ApiResponse::success(
            $asignacion->load(['docente', 'materia', 'carrera', 'periodo', 'grupo']),
            'Asignación registrada. El docente ha sido notificado.',
            201
        );
    }

    // PATCH /api/asignaciones-docentes/{id}  (S9-01/S9-02 — reasignar)
    public function update(Request $request, AsignacionDocente $asignacionDocente): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_GESTION)) {
            abort(403);
        }

        // jefe_carrera solo puede modificar su propia carrera
        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $asignacionDocente->carrera_id !== $carreraForzada) {
            abort(403, 'Solo puede modificar asignaciones de su carrera.');
        }

        $data = $request->validate([
            'docente_id'   => ['sometimes', 'uuid', 'exists:users,id'],
            'grupo_id'     => ['sometimes', 'nullable', 'uuid', 'exists:grupos,id'],
            'horas_semana' => ['sometimes', 'integer', 'min:1', 'max:40'],
        ]);

        $asignacionDocente->update(array_merge($data, ['asignado_por' => $user->id]));

        return ApiResponse::success(
            $asignacionDocente->fresh(['docente', 'materia', 'carrera', 'periodo', 'grupo'])
        );
    }

    // GET /api/docentes/{docente}/carga-horaria?periodo_id=  (S9-02)
    public function cargaHoraria(Request $request, string $docenteId): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_GESTION)) {
            abort(403);
        }

        $periodoId = $request->query('periodo_id');

        $asignaciones = AsignacionDocente::with(['materia', 'carrera', 'periodo', 'grupo'])
            ->where('docente_id', $docenteId)
            ->when($periodoId, fn($q) => $q->where('periodo_id', $periodoId))
            ->get();

        $totalHoras = $asignaciones->sum('horas_semana');

        return ApiResponse::success([
            'docente_id'    => $docenteId,
            'periodo_id'    => $periodoId,
            'total_horas'   => $totalHoras,
            'asignaciones'  => $asignaciones,
        ]);
    }
}
