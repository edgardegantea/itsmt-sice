<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaCorteCaptura;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertaCorteCapturaController extends Controller
{
    // GET /api/alertas-corte-captura
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'periodo_id' => 'nullable|uuid',
            'pendiente'  => 'nullable|boolean',
        ]);

        $user = $request->user();

        $query = AlertaCorteCaptura::with(['corteCaptura', 'cargaAcademica.materia', 'docente'])
            ->orderByDesc('created_at');

        if ($user->hasRole('docente') && ! $user->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            $query->where('docente_id', $user->id);
        } elseif ($user->hasRole('jefe_carrera')) {
            $query->whereHas('cargaAcademica.grupos', fn ($q) => $q->where('carrera_id', $user->carrera_id));
        }

        if ($request->filled('periodo_id')) {
            $query->where('periodo_id', $request->periodo_id);
        }

        if ($request->filled('pendiente')) {
            $query->where('pendiente', $request->boolean('pendiente'));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // PATCH /api/alertas-corte-captura/{alerta}/marcar-leida
    public function marcarLeida(Request $request, AlertaCorteCaptura $alerta): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('docente')) {
            $alerta->update(['leida_docente' => true]);
        } elseif ($user->hasRole('jefe_carrera')) {
            $alerta->update(['leida_jefe' => true]);
        } else {
            $alerta->update(['leida_director' => true]);
        }

        return ApiResponse::success($alerta->fresh(['corteCaptura', 'cargaAcademica']));
    }
}
