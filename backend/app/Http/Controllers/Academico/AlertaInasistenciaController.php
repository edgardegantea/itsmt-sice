<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaInasistencia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertaInasistenciaController extends Controller
{
    // GET /api/alertas/inasistencias
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'   => 'nullable|uuid',
            'carrera_id' => 'nullable|uuid',
            'leida'      => 'nullable|boolean',
        ]);

        $query = AlertaInasistencia::with(['alumno', 'grupo.carrera', 'grupo.periodo'])
            ->orderByDesc('created_at');

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }

        if ($request->filled('carrera_id')) {
            $query->whereHas('grupo', fn ($q) => $q->where('carrera_id', $request->carrera_id));
        }

        $user = $request->user();

        if ($request->filled('leida')) {
            $col = match (true) {
                $user->hasRole('docente')  => 'leida_docente',
                $user->hasRole('jefe_carrera') => 'leida_jefe',
                default => 'leida_director',
            };
            $query->where($col, $request->boolean('leida'));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // PATCH /api/alertas/inasistencias/{alerta}/leer
    public function marcarLeida(Request $request, AlertaInasistencia $alerta): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('docente')) {
            $alerta->update(['leida_docente' => true]);
        } elseif ($user->hasRole('jefe_carrera')) {
            $alerta->update(['leida_jefe' => true]);
        } else {
            $alerta->update(['leida_director' => true]);
        }

        return ApiResponse::success($alerta->fresh(['alumno', 'grupo']));
    }
}
