<?php

namespace App\Http\Controllers\Calidad;

use App\Domains\Calidad\Models\AutoevaluacionDocente;
use App\Domains\Calidad\Models\EvaluacionAreaDocente;
use App\Domains\Calidad\Models\PlanMejoraDocente;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 29 — Evaluación Docente ampliada.
 * Esqueleto habilitado con listados básicos; pendiente de diseñar el flujo
 * completo de autoevaluación, evaluación por área/academia y planes de mejora.
 */
class EvaluacionDocenteAmpliadaController extends Controller
{
    // GET /api/autoevaluaciones-docente
    public function autoevaluaciones(Request $request): JsonResponse
    {
        $items = AutoevaluacionDocente::with(['docente', 'periodo'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($items);
    }

    // GET /api/evaluaciones-area-docente
    public function evaluacionesArea(Request $request): JsonResponse
    {
        $items = EvaluacionAreaDocente::with(['docente', 'evaluador', 'periodo'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($items);
    }

    // GET /api/planes-mejora-docente
    public function planesMejora(Request $request): JsonResponse
    {
        $items = PlanMejoraDocente::with(['docente', 'periodo'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($items);
    }
}
