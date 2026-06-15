<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Adeudo;
use App\Domains\Permanencia\Models\OrdenReinscripcion;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Domains\Permanencia\Services\ReinscripcionService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReinscripcionController extends Controller
{
    public function __construct(private ReinscripcionService $service) {}

    // GET /api/reinscripciones
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Reinscripcion::class);

        return ApiResponse::success(
            $this->service->listar($request->only(['estatus', 'periodo_id', 'carrera_id']))
        );
    }

    // POST /api/reinscripciones
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        try {
            $r = $this->service->solicitar($alumno, $data['periodo_id']);
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($r->load(['alumno', 'periodo']), 'Solicitud de reinscripción enviada.', 201);
    }

    // PATCH /api/reinscripciones/{reinscripcion}/estatus
    public function actualizarEstatus(Request $request, Reinscripcion $reinscripcion): JsonResponse
    {
        $this->authorize('update', $reinscripcion);

        $data = $request->validate([
            'estatus'       => ['required', 'in:aprobada,rechazada'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $r = $this->service->actualizarEstatus($reinscripcion, $data['estatus'], $data['observaciones'] ?? null, $request->user());
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($r, 'Reinscripción actualizada.');
    }

    // PATCH /api/reinscripciones/{reinscripcion}/resello-credencial
    public function registrarResello(Request $request, Reinscripcion $reinscripcion): JsonResponse
    {
        $this->authorize('update', $reinscripcion);

        try {
            $r = $this->service->registrarResello($reinscripcion, $request->user());
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($r, 'Resello de credencial registrado.');
    }

    // GET /api/alumnos/{alumno}/adeudos
    public function adeudos(Alumno $alumno): JsonResponse
    {
        return ApiResponse::success(
            Adeudo::where('alumno_id', $alumno->id)->where('pagado', false)->get()
        );
    }

    // POST /api/orden-reinscripcion
    public function publicarOrden(Request $request): JsonResponse
    {
        $this->authorize('create', OrdenReinscripcion::class);

        $data = $request->validate([
            'periodo_id'                  => ['required', 'uuid', 'exists:periodos,id'],
            'carrera_id'                  => ['required', 'uuid', 'exists:carreras,id'],
            'semestre'                    => ['required', 'integer', 'min:1', 'max:9'],
            'fecha_inicio_reinscripcion'  => ['required', 'date'],
            'fecha_fin_reinscripcion'     => ['required', 'date', 'after:fecha_inicio_reinscripcion'],
        ]);

        // Política 3.3 PO-002: publicación con al menos 5 días hábiles de anticipación
        $inicio = \Carbon\Carbon::parse($data['fecha_inicio_reinscripcion']);
        $diasHabiles = 0;
        $fecha = now();
        while ($diasHabiles < 5) {
            $fecha->addDay();
            if ($fecha->isWeekday()) $diasHabiles++;
        }
        if ($inicio->lt($fecha)) {
            return ApiResponse::error('La fecha de inicio debe ser al menos 5 días hábiles después de hoy (política 3.3 PO-002).', 422);
        }

        $orden = OrdenReinscripcion::updateOrCreate(
            ['periodo_id' => $data['periodo_id'], 'carrera_id' => $data['carrera_id'], 'semestre' => $data['semestre']],
            array_merge($data, [
                'publicado'    => true,
                'publicado_por'=> $request->user()->id,
                'publicado_en' => now(),
            ])
        );

        return ApiResponse::success($orden->load(['periodo', 'carrera']), 'Orden de reinscripción publicada.', 201);
    }

    // GET /api/orden-reinscripcion/{periodo}
    public function consultarOrden(string $periodoId): JsonResponse
    {
        $ordenes = OrdenReinscripcion::with(['carrera'])
            ->where('periodo_id', $periodoId)
            ->where('publicado', true)
            ->orderBy('semestre')
            ->get();

        return ApiResponse::success($ordenes);
    }
}
