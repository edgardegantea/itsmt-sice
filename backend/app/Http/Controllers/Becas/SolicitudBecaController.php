<?php

namespace App\Http\Controllers\Becas;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Becas\Models\BecaAsignada;
use App\Domains\Becas\Models\SolicitudBeca;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SolicitudBecaController extends Controller
{
    // GET /api/solicitudes-beca
    public function index(Request $request): JsonResponse
    {
        $query = SolicitudBeca::with(['alumno.user', 'alumno.carrera', 'periodo', 'becaAsignada'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('estatus'),    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('tipo_beca'),  fn($q, $v) => $q->where('tipo_beca', $v));

        if ($request->user()->hasRole('alumno')) {
            $alumno = Alumno::where('user_id', $request->user()->id)->first();
            $query->where('alumno_id', $alumno?->id ?? 'none');
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/solicitudes-beca
    public function store(Request $request): JsonResponse
    {
        $alumno = Alumno::where('user_id', $request->user()->id)->first();

        if (! $alumno) {
            return ApiResponse::error('No se encontró expediente de alumno.', 422);
        }

        $data = $request->validate([
            'periodo_id'      => ['required', 'uuid', 'exists:periodos,id'],
            'tipo_beca'       => ['required', 'string', 'max:100'],
            'promedio'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'ingreso_familiar'=> ['nullable', 'numeric', 'min:0'],
        ]);

        $solicitud = SolicitudBeca::create([
            'alumno_id'       => $alumno->id,
            'periodo_id'      => $data['periodo_id'],
            'tipo_beca'       => $data['tipo_beca'],
            'promedio'        => $data['promedio'] ?? null,
            'ingreso_familiar'=> $data['ingreso_familiar'] ?? null,
            'estatus'         => 'pendiente',
        ]);

        return ApiResponse::success($solicitud->load(['alumno.user', 'periodo']), 'Solicitud registrada.', 201);
    }

    // PATCH /api/solicitudes-beca/{solicitud}/validar
    public function validar(Request $request, SolicitudBeca $solicitud): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'control_escolar', 'director_academico'])) {
            abort(403, 'Sin permiso para validar becas.');
        }

        $data = $request->validate([
            'estatus'       => ['required', 'in:validada,rechazada'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        $solicitud->update([
            'estatus'       => $data['estatus'],
            'observaciones' => $data['observaciones'] ?? null,
            'validado_por'  => $request->user()->id,
            'validado_en'   => now(),
        ]);

        return ApiResponse::success($solicitud->fresh(['alumno.user', 'validador']), 'Solicitud actualizada.');
    }

    // POST /api/solicitudes-beca/{solicitud}/asignar
    public function asignar(Request $request, SolicitudBeca $solicitud): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'control_escolar', 'director_academico'])) {
            abort(403, 'Sin permiso para asignar becas.');
        }

        if ($solicitud->estatus !== 'validada') {
            return ApiResponse::error('Solo se pueden asignar solicitudes validadas.', 422);
        }

        $data = $request->validate([
            'monto_mensual'  => ['nullable', 'numeric', 'min:0'],
            'duracion_meses' => ['nullable', 'integer', 'min:1'],
            'fecha_inicio'   => ['nullable', 'date'],
            'fecha_fin'      => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ]);

        $beca = BecaAsignada::create(array_merge([
            'solicitud_beca_id' => $solicitud->id,
            'alumno_id'         => $solicitud->alumno_id,
            'periodo_id'        => $solicitud->periodo_id,
            'tipo_beca'         => $solicitud->tipo_beca,
            'estatus'           => 'activa',
            'asignado_por'      => $request->user()->id,
        ], $data));

        $solicitud->update(['estatus' => 'asignada']);

        return ApiResponse::success($beca->load(['alumno.user', 'periodo']), 'Beca asignada.', 201);
    }

    // GET /api/becas/padron/{periodo_id}
    public function padron(string $periodoId): JsonResponse
    {
        $becas = BecaAsignada::with(['alumno.user', 'alumno.carrera', 'periodo'])
            ->where('periodo_id', $periodoId)
            ->where('estatus', 'activa')
            ->get();

        return ApiResponse::success($becas);
    }

    // PATCH /api/becas/{beca}/cancelar
    public function cancelar(Request $request, BecaAsignada $beca): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'control_escolar', 'director_academico'])) {
            abort(403, 'Sin permiso para cancelar becas.');
        }

        $data = $request->validate([
            'motivo_cancelacion' => ['required', 'string', 'max:500'],
        ]);

        $beca->update([
            'estatus'             => 'cancelada',
            'motivo_cancelacion'  => $data['motivo_cancelacion'],
            'cancelado_por'       => $request->user()->id,
            'cancelado_en'        => now(),
            'fecha_fin'           => now()->toDateString(),
        ]);

        return ApiResponse::success($beca->fresh(), 'Beca cancelada.');
    }

    // GET /api/alumnos/{alumno}/historial-becas
    public function historialAlumno(Request $request, Alumno $alumno): JsonResponse
    {
        if ($request->user()->hasRole('alumno')) {
            $propio = Alumno::where('user_id', $request->user()->id)->value('id');
            abort_if($propio !== $alumno->id, 403);
        }

        $historial = BecaAsignada::with(['periodo', 'solicitud'])
            ->where('alumno_id', $alumno->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($historial);
    }
}
