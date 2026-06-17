<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admision\ActualizarAlumnoRequest;
use App\Http\Requests\Admision\AutorizacionExpedienteRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlumnoController extends Controller
{
    // GET /api/alumnos
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumno::class);

        $carreraForzada = $request->user()->carreraRestringida();

        $alumnos = Alumno::with(['carrera', 'periodoIngreso', 'inscripcion.aspirante'])
            ->when($carreraForzada,                                     fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && $request->carrera_id,           fn($q) => $q->where('carrera_id', $request->carrera_id))
            ->when($request->estatus,    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->semestre,   fn($q, $v) => $q->where('semestre_actual', $v))
            ->when($request->search, fn($q, $v) => $q
                ->where('numero_control', 'ilike', "%{$v}%")
                ->orWhereHas('inscripcion.aspirante', fn($q2) =>
                    $q2->whereRaw("CONCAT(nombres, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) ILIKE ?", ["%{$v}%"])
                ))
            ->orderBy('numero_control')
            ->paginate(20);

        return ApiResponse::success($alumnos, 'Alumnos listados.');
    }

    // GET /api/alumnos/{alumno}
    public function show(Alumno $alumno): JsonResponse
    {
        $this->authorize('view', $alumno);

        return ApiResponse::success(
            $alumno->load(['carrera', 'periodoIngreso', 'inscripcion.aspirante', 'user']),
            'Detalle de alumno.'
        );
    }

    // PATCH /api/alumnos/{alumno}
    public function update(ActualizarAlumnoRequest $request, Alumno $alumno): JsonResponse
    {
        $this->authorize('update', $alumno);

        $datos = $request->validated();

        if (isset($datos['estatus']) && $datos['estatus'] !== $alumno->estatus) {
            $datos['fecha_cambio_estatus'] = now()->toDateString();
        }

        $alumno->update($datos);

        return ApiResponse::success($alumno->fresh(['carrera', 'periodoIngreso']), 'Alumno actualizado.');
    }

    // GET /api/alumnos/{alumno}/autorizacion-expediente
    public function autorizacionExpediente(Alumno $alumno): JsonResponse
    {
        $this->authorize('view', $alumno);

        return ApiResponse::success([
            'alumno_id'                        => $alumno->id,
            'numero_control'                   => $alumno->numero_control,
            'autorizacion_consulta_expediente' => $alumno->autorizacion_consulta_expediente,
        ]);
    }

    // PATCH /api/alumnos/{alumno}/autorizacion-expediente
    public function actualizarAutorizacion(AutorizacionExpedienteRequest $request, Alumno $alumno): JsonResponse
    {
        $this->authorize('update', $alumno);

        $alumno->update(['autorizacion_consulta_expediente' => $request->autorizacion_consulta_expediente]);

        return ApiResponse::success($alumno->fresh(), 'Autorización actualizada.');
    }
}
