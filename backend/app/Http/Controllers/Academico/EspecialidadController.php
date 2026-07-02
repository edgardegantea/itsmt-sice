<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\AlumnoEspecialidad;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Especialidad;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SolicitudAperturaEspecialidad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EspecialidadController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                   'direccion_academica', 'subdireccion_academica'];
    private const ROLES_ALL   = ['superadmin', 'admin', 'jefe_carrera', 'docente',
                                   'director_academico', 'direccion_academica',
                                   'subdireccion_academica', 'control_escolar',
                                   'direccion_general', 'alumno'];

    // GET /api/especialidades
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_ALL)) {
            abort(403);
        }

        $query = Especialidad::with(['carrera', 'autorizadaPor'])
            ->when($request->query('carrera_id'), fn($q, $v) => $q->where('carrera_id', $v))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->latest();

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/especialidades
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            abort(403);
        }

        $data = $request->validate([
            'carrera_id'              => ['required', 'uuid', 'exists:carreras,id'],
            'nombre'                  => ['required', 'string', 'max:150'],
            'descripcion'             => ['nullable', 'string'],
            'porcentaje_creditos_min' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ]);

        $especialidad = Especialidad::create($data);

        return ApiResponse::success(
            $especialidad->load('carrera'),
            'Especialidad registrada.',
            201
        );
    }

    // PATCH /api/especialidades/{especialidad}
    public function update(Request $request, Especialidad $especialidad): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            abort(403);
        }

        $data = $request->validate([
            'nombre'                  => ['sometimes', 'string', 'max:150'],
            'descripcion'             => ['sometimes', 'nullable', 'string'],
            'porcentaje_creditos_min' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ]);

        $especialidad->update($data);

        return ApiResponse::success($especialidad->fresh('carrera'));
    }

    // PATCH /api/especialidades/{especialidad}/autorizar
    public function autorizar(Request $request, Especialidad $especialidad): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            abort(403);
        }

        if ($especialidad->estatus === 'activa') {
            return ApiResponse::error('La especialidad ya está activa.', 422);
        }

        $especialidad->update([
            'estatus'        => 'activa',
            'autorizada_por' => $user->id,
        ]);

        return ApiResponse::success($especialidad->fresh(['carrera', 'autorizadaPor']), 'Especialidad autorizada.');
    }

    // GET /api/especialidades/{especialidad}/oficio/pdf
    public function oficio(Especialidad $especialidad): Response
    {
        $especialidad->load(['carrera', 'autorizadaPor']);

        $pdf = Pdf::loadView('pdfs.oficio_especialidad', [
            'especialidad' => $especialidad,
        ])->setPaper('letter');

        return $pdf->download("oficio_especialidad_{$especialidad->id}.pdf");
    }

    // GET /api/programas-educativos/{carrera}/especialidades
    public function porCarrera(Request $request, Carrera $carrera): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ALL)) {
            abort(403);
        }

        $especialidades = Especialidad::with(['programas.materia'])
            ->where('carrera_id', $carrera->id)
            ->where('estatus', 'activa')
            ->get();

        return ApiResponse::success($especialidades);
    }

    // POST /api/solicitudes-apertura-especialidad
    public function solicitarApertura(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', 'director_academico'])) {
            abort(403);
        }

        $data = $request->validate([
            'carrera_id'      => ['required', 'uuid', 'exists:carreras,id'],
            'nombre_propuesto'=> ['required', 'string', 'max:150'],
            'justificacion'   => ['required', 'string'],
        ]);

        $solicitud = SolicitudAperturaEspecialidad::create(array_merge($data, [
            'solicitante_id' => $user->id,
            'estatus'        => 'pendiente',
        ]));

        return ApiResponse::success(
            $solicitud->load(['carrera', 'solicitante']),
            'Solicitud de apertura de especialidad registrada.',
            201
        );
    }

    // PATCH /api/solicitudes-apertura-especialidad/{solicitud}/dictaminar
    public function dictaminar(Request $request, SolicitudAperturaEspecialidad $solicitud): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            abort(403);
        }

        if ($solicitud->estatus !== 'pendiente') {
            return ApiResponse::error('Esta solicitud ya fue dictaminada.', 422);
        }

        $data = $request->validate([
            'estatus'      => ['required', 'in:aprobada,rechazada'],
            'observaciones'=> ['nullable', 'string'],
        ]);

        $solicitud->update(array_merge($data, ['dictaminada_por' => $user->id]));

        if ($data['estatus'] === 'aprobada') {
            Especialidad::create([
                'carrera_id'  => $solicitud->carrera_id,
                'nombre'      => $solicitud->nombre_propuesto,
                'estatus'     => 'activa',
                'autorizada_por' => $user->id,
            ]);
        }

        return ApiResponse::success(
            $solicitud->fresh(['carrera', 'solicitante', 'dictaminadaPor']),
            'Solicitud dictaminada.'
        );
    }

    // POST /api/alumnos/{alumno}/especialidad-seleccionada
    public function seleccionar(Request $request, Alumno $alumno): JsonResponse
    {
        $user = $request->user();

        // Alumno solo puede operar sobre sí mismo, admin puede operar sobre cualquiera
        $esAdmin = $user->hasAnyRole(self::ROLES_ADMIN);
        if (! $esAdmin) {
            $alumnoDelUser = Alumno::where('user_id', $user->id)->first();
            if (! $alumnoDelUser || $alumnoDelUser->id !== $alumno->id) {
                abort(403);
            }
        }

        $data = $request->validate([
            'especialidad_id' => ['required', 'uuid', 'exists:especialidades,id'],
            'periodo_id'      => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $especialidad = Especialidad::findOrFail($data['especialidad_id']);
        if ($especialidad->carrera_id !== $alumno->carrera_id) {
            return ApiResponse::error('La especialidad no pertenece a la carrera del alumno.', 422);
        }

        $existente = AlumnoEspecialidad::where('alumno_id', $alumno->id)
            ->whereIn('estatus', ['solicitada', 'inscrita'])
            ->first();
        if ($existente) {
            return ApiResponse::error('El alumno ya tiene una especialidad seleccionada activa.', 422);
        }

        $inscripcion = AlumnoEspecialidad::create(array_merge($data, [
            'alumno_id' => $alumno->id,
            'estatus'   => 'solicitada',
        ]));

        return ApiResponse::success(
            $inscripcion->load(['especialidad.carrera', 'periodo']),
            'Especialidad seleccionada.',
            201
        );
    }
}
