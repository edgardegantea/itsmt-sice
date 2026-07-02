<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\PlanAccionTutorial;
use App\Domains\Academico\Models\Tutor;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanAccionTutorialController extends Controller
{
    private const ROLES_COORD = ['superadmin', 'admin', 'coord_tutoria', 'director_academico'];

    // GET /api/planes-accion-tutorial
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'tutor_id'   => 'nullable|uuid|exists:tutores,id',
            'periodo_id' => 'nullable|uuid|exists:periodos,id',
        ]);

        $query = PlanAccionTutorial::with(['tutor.docente', 'periodo']);

        if ($request->user()->hasRole('docente')) {
            $tutor = Tutor::where('docente_id', $request->user()->id)->first();
            if (! $tutor) {
                return ApiResponse::success(['data' => [], 'total' => 0]);
            }
            $query->where('tutor_id', $tutor->id);
        } else {
            $query->when($request->query('tutor_id'),   fn ($q) => $q->where('tutor_id',   $request->query('tutor_id')))
                  ->when($request->query('periodo_id'), fn ($q) => $q->where('periodo_id', $request->query('periodo_id')));
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/planes-accion-tutorial
    public function store(Request $request): JsonResponse
    {
        $user  = $request->user();
        $tutor = null;

        if ($user->hasRole('docente')) {
            $tutor = Tutor::where('docente_id', $user->id)->where('activo', true)->first();
            if (! $tutor) {
                return ApiResponse::error('No estás registrado como tutor activo.', 403);
            }
        } elseif (! $user->hasAnyRole(self::ROLES_COORD)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'tutor_id'         => 'nullable|uuid|exists:tutores,id',
            'periodo_id'       => 'required|uuid|exists:periodos,id',
            'objetivo_general' => 'required|string|max:2000',
            'actividades'      => 'nullable|array',
            'metas'            => 'nullable|array',
        ]);

        if ($tutor) {
            $validated['tutor_id'] = $tutor->id;
        }

        if (empty($validated['tutor_id'])) {
            return ApiResponse::error('Se requiere tutor_id.', 422);
        }

        $plan = PlanAccionTutorial::updateOrCreate(
            ['tutor_id' => $validated['tutor_id'], 'periodo_id' => $validated['periodo_id']],
            array_merge($validated, ['estatus' => 'borrador'])
        );

        return ApiResponse::success($plan->load(['tutor.docente', 'periodo']), 'PAT guardado', 201);
    }

    // PATCH /api/planes-accion-tutorial/{plan}/estatus
    public function updateEstatus(Request $request, PlanAccionTutorial $plan): JsonResponse
    {
        $user  = $request->user();
        $tutor = Tutor::where('docente_id', $user->id)->first();

        $esPropioTutor = $tutor && $tutor->id === $plan->tutor_id;
        $esCoord       = $user->hasAnyRole(self::ROLES_COORD);

        if (! $esPropioTutor && ! $esCoord) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'estatus' => 'required|in:borrador,enviado,aprobado',
        ]);

        // Solo coord/admin puede aprobar
        if ($validated['estatus'] === 'aprobado' && ! $esCoord) {
            return ApiResponse::error('Solo el coordinador puede aprobar un PAT.', 403);
        }

        $plan->update(['estatus' => $validated['estatus']]);

        return ApiResponse::success($plan->fresh(['tutor.docente', 'periodo']));
    }
}
