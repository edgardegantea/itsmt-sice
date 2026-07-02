<?php

namespace App\Http\Controllers\Capacitacion;

use App\Domains\Capacitacion\Models\CedulaInscripcion;
use App\Domains\Capacitacion\Models\CursoCapacitacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CursoCapacitacionController extends Controller
{
    // Jefe de Desarrollo Académico = admin + personal_administrativo + subdirAcad
    private const ROLES_JEFE = ['superadmin', 'admin', 'personal_administrativo',
                                  'subdireccion_academica', 'direccion_academica'];

    private const ROLES_TODOS = ['superadmin', 'admin', 'docente', 'personal_administrativo',
                                   'jefe_carrera', 'director_academico', 'control_escolar',
                                   'direccion_general', 'direccion_academica', 'subdireccion_academica'];

    // GET /api/cursos-capacitacion  (S10-07/S10-08)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_TODOS)) {
            abort(403);
        }

        $cursos = CursoCapacitacion::with(['jefeDepto'])
            ->when($request->query('tipo'), fn($q, $v) => $q->where('tipo', $v))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($cursos);
    }

    // POST /api/cursos-capacitacion  (S10-07 — Jefe registra curso AP/FD)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $data = $request->validate([
            'nombre'              => ['required', 'string', 'max:200'],
            'clave_registro_tecnm'=> ['nullable', 'string', 'max:50'],
            'tipo'                => ['required', 'in:formacion_docente,actualizacion_profesional'],
            'modalidad'           => ['required', 'in:presencial,distancia,mixto'],
            'origen'              => ['required', 'in:interno,externo'],
            'instructor'          => ['required', 'string', 'max:150'],
            'periodo_inicio'      => ['required', 'date'],
            'periodo_fin'         => ['required', 'date', 'gte:periodo_inicio'],
            'horas_totales'       => ['required', 'integer', 'min:1'],
            'horario'             => ['nullable', 'string', 'max:100'],
        ]);

        $curso = CursoCapacitacion::create(array_merge($data, [
            'jefe_depto_id' => $user->id,
            'estatus'       => 'planeado',
        ]));

        return ApiResponse::success(
            $curso->load('jefeDepto'),
            'Curso registrado en estatus "planeado". Disponible para inscripción de docentes.',
            201
        );
    }

    // PATCH /api/cursos-capacitacion/{id}  (S10-07 — Jefe actualiza o cambia estatus)
    public function update(Request $request, CursoCapacitacion $cursoCapacitacion): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $data = $request->validate([
            'nombre'              => ['sometimes', 'string', 'max:200'],
            'clave_registro_tecnm'=> ['sometimes', 'nullable', 'string', 'max:50'],
            'instructor'          => ['sometimes', 'string', 'max:150'],
            'periodo_inicio'      => ['sometimes', 'date'],
            'periodo_fin'         => ['sometimes', 'date'],
            'horas_totales'       => ['sometimes', 'integer', 'min:1'],
            'horario'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'estatus'             => ['sometimes', 'in:planeado,en_curso,finalizado,cancelado'],
        ]);

        $cursoCapacitacion->update($data);

        return ApiResponse::success($cursoCapacitacion->fresh('jefeDepto'));
    }

    // GET /api/cursos-capacitacion/{id}/inscripciones  (S10-08 — lista inscritos)
    public function inscripciones(Request $request, CursoCapacitacion $cursoCapacitacion): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_TODOS)) {
            abort(403);
        }

        $cedulas = $cursoCapacitacion->cedulas()->with('usuario')->latest()->get();

        return ApiResponse::success($cedulas);
    }

    // POST /api/cursos-capacitacion/{id}/inscripciones  (S10-08 — docente se inscribe)
    public function inscribir(Request $request, CursoCapacitacion $cursoCapacitacion): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_TODOS)) {
            abort(403);
        }

        if (! in_array($cursoCapacitacion->estatus, ['planeado', 'en_curso'])) {
            return ApiResponse::error('Solo es posible inscribirse a cursos en estatus "planeado" o "en curso".', 422);
        }

        // No duplicar inscripción
        $existente = CedulaInscripcion::where('curso_id', $cursoCapacitacion->id)
            ->where('usuario_id', $user->id)
            ->first();

        if ($existente) {
            return ApiResponse::error('Ya está inscrito a este curso.', 422);
        }

        $data = $request->validate([
            'rfc'                  => ['required', 'string', 'max:13'],
            'curp'                 => ['required', 'string', 'max:18'],
            'sexo'                 => ['required', 'in:H,M'],
            'grado_maximo_estudios'=> ['required', 'string', 'max:100'],
            'nombre_carrera'       => ['required', 'string', 'max:150'],
            'area_adscripcion'     => ['required', 'string', 'max:150'],
            'puesto'               => ['required', 'string', 'max:150'],
            'clave_presupuestal'   => ['required', 'string', 'max:30'],
            'jefe_inmediato'       => ['required', 'string', 'max:150'],
            'telefono_oficial'     => ['required', 'string', 'max:20'],
            'ext'                  => ['nullable', 'string', 'max:10'],
            'horario_laboral'      => ['required', 'string', 'max:50'],
        ]);

        $cedula = CedulaInscripcion::create(array_merge($data, [
            'curso_id'   => $cursoCapacitacion->id,
            'usuario_id' => $user->id,
            'estatus'    => 'inscrito',
        ]));

        return ApiResponse::success(
            $cedula->load(['curso', 'usuario']),
            'Inscripción registrada. Folio de Cédula de Inscripción (PO-005-07) generado.',
            201
        );
    }

    // GET /api/cedulas-inscripcion/{cedula}/pdf  (S10-08 — cédula PDF)
    public function cedulaPdf(CedulaInscripcion $cedulaInscripcion): Response
    {
        $cedulaInscripcion->load(['curso.jefeDepto', 'usuario']);

        $pdf = Pdf::loadView('pdfs.cedula_inscripcion_capacitacion', [
            'cedula' => $cedulaInscripcion,
        ])->setPaper('letter');

        return $pdf->download("cedula_inscripcion_{$cedulaInscripcion->id}.pdf");
    }
}
