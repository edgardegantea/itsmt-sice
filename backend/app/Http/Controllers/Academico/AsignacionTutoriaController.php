<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AsignacionTutoria;
use App\Domains\Academico\Models\Tutor;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsignacionTutoriaController extends Controller
{
    private const ROLES_COORD = ['superadmin', 'admin', 'coord_tutoria', 'director_academico'];

    // GET /api/asignaciones-tutoria
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'periodo_id' => 'nullable|uuid|exists:periodos,id',
            'tutor_id'   => 'nullable|uuid|exists:tutores,id',
        ]);

        $query = AsignacionTutoria::with(['tutor.docente', 'alumno', 'periodo'])
            ->when($request->query('periodo_id'), fn ($q) => $q->where('periodo_id', $request->query('periodo_id')))
            ->when($request->query('tutor_id'),   fn ($q) => $q->where('tutor_id',   $request->query('tutor_id')));

        // Docentes solo ven sus propias asignaciones
        if ($request->user()->hasRole('docente')) {
            $tutor = Tutor::where('docente_id', $request->user()->id)->first();
            if (! $tutor) {
                return ApiResponse::success(['data' => [], 'total' => 0]);
            }
            $query->where('tutor_id', $tutor->id);
        }

        return ApiResponse::success($query->paginate(30));
    }

    // POST /api/asignaciones-tutoria
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_COORD)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'tutor_id'   => 'required|uuid|exists:tutores,id',
            'alumno_id'  => 'required|uuid|exists:users,id',
            'periodo_id' => 'required|uuid|exists:periodos,id',
        ]);

        $asignacion = AsignacionTutoria::updateOrCreate(
            [
                'tutor_id'   => $validated['tutor_id'],
                'alumno_id'  => $validated['alumno_id'],
                'periodo_id' => $validated['periodo_id'],
            ],
            ['activa' => true]
        );

        return ApiResponse::success(
            $asignacion->load(['tutor.docente', 'alumno', 'periodo']),
            'Asignación registrada',
            201
        );
    }

    // PATCH /api/asignaciones-tutoria/{asignacion}
    public function update(Request $request, AsignacionTutoria $asignacion): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_COORD)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'activa' => 'required|boolean',
        ]);

        $asignacion->update($validated);

        return ApiResponse::success($asignacion->fresh(['tutor.docente', 'alumno', 'periodo']));
    }
}
