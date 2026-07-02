<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\SesionTutoria;
use App\Domains\Academico\Models\Tutor;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SesionTutoriaController extends Controller
{
    private const ROLES_GESTORES = ['superadmin', 'admin', 'coord_tutoria', 'director_academico'];

    // GET /api/sesiones-tutoria
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'tutor_id'   => 'nullable|uuid|exists:tutores,id',
            'periodo_id' => 'nullable|uuid',
        ]);

        $query = SesionTutoria::with(['tutor.docente'])->orderByDesc('fecha');

        if ($request->user()->hasRole('docente')) {
            $tutor = Tutor::where('docente_id', $request->user()->id)->first();
            if (! $tutor) {
                return ApiResponse::success(['data' => [], 'total' => 0]);
            }
            $query->where('tutor_id', $tutor->id);
        } elseif ($request->query('tutor_id')) {
            $query->where('tutor_id', $request->query('tutor_id'));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // GET /api/sesiones-tutoria/{tutorId}
    public function porTutor(Request $request, string $tutorId): JsonResponse
    {
        $tutor = Tutor::findOrFail($tutorId);

        $user            = $request->user();
        $esPropioTutor   = $user->hasRole('docente') && $tutor->docente_id === $user->id;

        if (! $esPropioTutor && ! $user->hasAnyRole(self::ROLES_GESTORES)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $sesiones = SesionTutoria::where('tutor_id', $tutorId)
            ->orderByDesc('fecha')
            ->get();

        return ApiResponse::success([
            'tutor'    => $tutor->load('docente'),
            'sesiones' => $sesiones,
            'total'    => $sesiones->count(),
        ]);
    }

    // POST /api/sesiones-tutoria
    public function store(Request $request): JsonResponse
    {
        $user  = $request->user();
        $tutor = null;

        if ($user->hasRole('docente')) {
            $tutor = Tutor::where('docente_id', $user->id)->where('activo', true)->first();
            if (! $tutor) {
                return ApiResponse::error('No estás registrado como tutor activo.', 403);
            }
        } elseif (! $user->hasAnyRole(self::ROLES_GESTORES)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'tutor_id'                => 'nullable|uuid|exists:tutores,id',
            'tipo'                    => 'required|in:individual,grupal',
            'fecha'                   => 'required|date',
            'duracion_minutos'        => 'nullable|integer|min:15|max:480',
            'temas_tratados'          => 'required|string|max:2000',
            'observaciones'           => 'nullable|string|max:2000',
            'alumnos_atendidos_ids'   => 'required|array|min:1',
            'alumnos_atendidos_ids.*' => 'uuid',
        ]);

        if ($tutor) {
            $validated['tutor_id'] = $tutor->id;
        }

        if (empty($validated['tutor_id'])) {
            return ApiResponse::error('Se requiere tutor_id.', 422);
        }

        $sesion = SesionTutoria::create($validated);

        return ApiResponse::success($sesion->load('tutor.docente'), 'Sesión registrada', 201);
    }
}
