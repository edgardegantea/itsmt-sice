<?php

namespace App\Http\Controllers\Capacitacion;

use App\Domains\Capacitacion\Models\CedulaInscripcion;
use App\Domains\Capacitacion\Models\EvaluacionSeguimientoCap;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvaluacionSeguimientoCapController extends Controller
{
    private const ROLES_TODOS = ['superadmin', 'admin', 'docente', 'personal_administrativo',
                                   'jefe_carrera', 'director_academico', 'subdireccion_academica',
                                   'direccion_academica'];

    // GET /api/evaluaciones-seguimiento-capacitacion?cedula_id=xxx  (S10-10)
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_TODOS)) {
            abort(403);
        }

        $query = EvaluacionSeguimientoCap::with(['cedula.usuario', 'cedula.curso'])
            ->when($request->query('cedula_id'), fn($q, $v) => $q->where('cedula_id', $v))
            ->latest();

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/evaluaciones-seguimiento-capacitacion  (S10-10)
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_TODOS)) {
            abort(403);
        }

        $data = $request->validate([
            'cedula_id'             => ['required', 'uuid', 'exists:cedulas_inscripcion_capacitacion,id'],
            'tipo_evaluador'        => ['required', 'in:participante,jefe_inmediato'],
            'jefe_inmediato_nombre' => ['nullable', 'string', 'max:150',
                                        'required_if:tipo_evaluador,jefe_inmediato'],
            'respuestas_json'       => ['required', 'array'],
            'obstaculos_json'       => ['nullable', 'array'],
        ]);

        // Calcular promedio a partir de respuestas (escala 1-4)
        $respuestas = collect($data['respuestas_json'])->filter(fn($v) => is_numeric($v));
        $promedio   = $respuestas->isNotEmpty()
            ? round($respuestas->avg(), 2)
            : null;

        $resultado = null;
        if ($promedio !== null) {
            $resultado = match(true) {
                $promedio < 2    => 'correctivas',
                $promedio < 3    => 'mejorar',
                default          => 'favorable',
            };
        }

        $evaluacion = EvaluacionSeguimientoCap::create(array_merge($data, [
            'promedio'  => $promedio,
            'resultado' => $resultado,
        ]));

        // Actualizar estatus de la cédula si ya acreditó
        if ($resultado === 'favorable') {
            $cedula = CedulaInscripcion::find($data['cedula_id']);
            $cedula?->update(['estatus' => 'acreditado']);
        }

        return ApiResponse::success(
            $evaluacion->load(['cedula.curso', 'cedula.usuario']),
            'Evaluación de seguimiento registrada.',
            201
        );
    }
}
