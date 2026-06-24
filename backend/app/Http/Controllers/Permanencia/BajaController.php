<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Services\BajaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BajaController extends Controller
{
    public function __construct(private BajaService $service) {}

    // GET /api/bajas  (admin lista)
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Baja::class);

        $carreraForzada = $request->user()->carreraRestringida();

        $bajas = Baja::with(['alumno.user', 'alumno.carrera', 'periodo', 'registradaPor'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('tipo_baja'),  fn($q, $v) => $q->where('tipo_baja', $v))
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('carrera_id'), fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->latest()
            ->paginate(20);

        return ApiResponse::success($bajas);
    }

    // POST /api/bajas  (admin registra baja de cualquier tipo)
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Baja::class);

        $data = $request->validate([
            'alumno_id'                 => ['required', 'uuid', 'exists:alumnos,id'],
            'periodo_id'                => ['required', 'uuid', 'exists:periodos,id'],
            'tipo_baja'                 => ['required', 'in:parcial,temporal,definitiva'],
            'motivo_enum'               => ['nullable', 'string', 'max:60'],
            'motivo_texto'              => ['nullable', 'string', 'max:500'],
            'fecha_solicitud'           => ['required', 'date'],
            'fecha_efectiva'            => ['nullable', 'date'],
            'numero_semestres_cursados' => ['nullable', 'integer', 'min:0'],
            'reingreso_posible'         => ['boolean'],
        ]);

        // Jefe de carrera: solo puede dar baja a alumnos de su carrera
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $alumno = Alumno::findOrFail($data['alumno_id']);
            if ($alumno->carrera_id !== $carreraForzada) {
                return ApiResponse::error('Solo puedes registrar bajas de alumnos de tu carrera.', 403);
            }
        }

        try {
            $baja = $this->service->registrar($data, $request->user());
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($baja, 'Baja registrada.', 201);
    }

    // POST /api/bajas/solicitar  (alumno solicita su propia baja temporal)
    public function solicitar(Request $request): JsonResponse
    {
        $this->authorize('solicitar', Baja::class);

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        $motivosEnum = ['economico', 'salud', 'trabajo', 'familiar', 'cambio_carrera', 'cambio_institucion', 'otro'];

        $data = $request->validate([
            'periodo_id'                => ['required', 'uuid', 'exists:periodos,id'],
            'motivo_enum'               => ['required', 'in:' . implode(',', $motivosEnum)],
            'motivo_texto'              => ['nullable', 'string', 'max:500'],
            'fecha_solicitud'           => ['required', 'date'],
            'numero_semestres_cursados' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $baja = $this->service->solicitarBajaTemporal($alumno, $data);
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($baja, 'Baja temporal solicitada.', 201);
    }

    // GET /api/alumnos/{alumno}/bajas
    public function porAlumno(Alumno $alumno): JsonResponse
    {
        $this->authorize('viewAny', Baja::class);

        $bajas = Baja::with(['periodo', 'registradaPor'])
            ->where('alumno_id', $alumno->id)
            ->latest()
            ->get();

        return ApiResponse::success($bajas);
    }

    // GET /api/bajas/mias  (alumno ve sus propias bajas)
    public function mias(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('alumno'), 403, 'Solo los alumnos pueden acceder a este recurso.');

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        $bajas = Baja::with(['periodo'])
            ->where('alumno_id', $alumno->id)
            ->latest()
            ->get();

        return ApiResponse::success($bajas);
    }
}
