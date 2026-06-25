<?php

namespace App\Http\Controllers\Admision;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Services\AspiranteService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admision\ActualizarAspiranteRequest;
use App\Http\Requests\Admision\ActualizarEstatusRequest;
use App\Http\Requests\Admision\RegistrarAspiranteRequest;
use App\Http\Responses\ApiResponse;
use App\Mail\ConfirmacionAspirante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class AspiranteController extends Controller
{
    public function __construct(private AspiranteService $service) {}

    // GET /api/aspirantes
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Aspirante::class);

        return ApiResponse::success(
            $this->service->listar(
                $request->only(['carrera_id', 'periodo_id', 'estatus', 'puntaje_min']),
                $request->user()->carreraRestringida()
            )
        );
    }

    // GET /api/aspirantes/{aspirante}
    public function show(Aspirante $aspirante): JsonResponse
    {
        $this->authorize('view', $aspirante);

        return ApiResponse::success($aspirante->load(['carrera', 'periodo']));
    }

    // POST /api/aspirantes
    public function store(RegistrarAspiranteRequest $request): JsonResponse
    {
        $datos = $request->validated();

        if ($request->hasFile('constancia_bachillerato')) {
            $path = $request->file('constancia_bachillerato')->store('constancias', 'public');
            $datos['constancia_bachillerato'] = $path;
            // Registrar también en documentos JSON para que el checklist (TecNM-AC-PO-001-02) lo detecte
            $datos['documentos'] = array_merge($datos['documentos'] ?? [], ['certificado_bachillerato' => $path]);
        }

        $aspirante = $this->service->crear($datos);
        $aspirante->load(['carrera', 'periodo']);

        try {
            Mail::to($aspirante->email)->queue(new ConfirmacionAspirante($aspirante));
        } catch (\Throwable) {
            // El correo falla silenciosamente para no bloquear el registro
        }

        return ApiResponse::success($aspirante, 'Solicitud registrada correctamente.', 201);
    }

    // PATCH /api/aspirantes/{aspirante}
    public function update(ActualizarAspiranteRequest $request, Aspirante $aspirante): JsonResponse
    {
        $this->authorize('update', $aspirante);

        $aspirante->update($request->validated());

        return ApiResponse::success($aspirante->fresh(['carrera', 'periodo']), 'Aspirante actualizado.');
    }

    // GET /api/aspirantes/consultar-estatus?curp=XXX  (público)
    public function consultarEstatus(Request $request): JsonResponse
    {
        $curp = strtoupper(trim($request->query('curp', '')));

        if (strlen($curp) !== 18) {
            return ApiResponse::error('CURP inválida.', 422);
        }

        $aspirante = Aspirante::with(['carrera', 'periodo'])
            ->where('curp', $curp)
            ->first();

        if (! $aspirante) {
            return ApiResponse::error('No se encontró ningún aspirante con esa CURP en el sistema.', 404);
        }

        return ApiResponse::success([
            'folio'           => $aspirante->folio_preinscripcion_tecnm ?? $aspirante->id,
            'nombre'          => trim("{$aspirante->nombres} {$aspirante->apellido_paterno} {$aspirante->apellido_materno}"),
            'estatus'         => $aspirante->estatus,
            'carrera'         => $aspirante->carrera?->nombre,
            'periodo'         => $aspirante->periodo?->nombre,
            'observaciones'   => $aspirante->observaciones,
            'motivo_rechazo'  => $aspirante->motivo_rechazo,
        ]);
    }

    // PATCH /api/aspirantes/{aspirante}/estatus
    public function actualizarEstatus(ActualizarEstatusRequest $request, Aspirante $aspirante): JsonResponse
    {
        $this->authorize('update', $aspirante);

        $aspirante = $this->service->actualizarEstatus(
            $aspirante,
            $request->validated('estatus'),
            $request->validated('observaciones'),
            $request->validated('motivo_rechazo')
        );

        return ApiResponse::success($aspirante, 'Estatus actualizado.');
    }
}
