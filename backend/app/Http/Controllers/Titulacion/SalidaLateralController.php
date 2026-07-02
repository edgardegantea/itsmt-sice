<?php

namespace App\Http\Controllers\Titulacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Titulacion\Models\SalidaLateral;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SalidaLateralController extends Controller
{
    // GET /salida-lateral
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::success([]);
            }
            return ApiResponse::success(
                SalidaLateral::with(['periodoSolicitud', 'asignaturaEspecialidad', 'aprobadoPor'])
                    ->where('alumno_id', $alumno->id)
                    ->latest()
                    ->get()
            );
        }

        $carreraForzada = $user->carreraRestringida();
        $query = SalidaLateral::with(['alumno.user', 'alumno.carrera', 'periodoSolicitud', 'asignaturaEspecialidad', 'aprobadoPor'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /salida-lateral  (S7-06 — alumno/admin solicita)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'alumno_id'                  => ['nullable', 'uuid', 'exists:alumnos,id'],
            'periodo_solicitud_id'       => ['required', 'uuid', 'exists:periodos,id'],
            'asignatura_especialidad_id' => ['required', 'uuid', 'exists:materias,id'],
        ]);

        // Resolver alumno
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::error('No se encontró el registro de alumno.', 404);
            }
            $data['alumno_id'] = $alumno->id;
        }

        if (empty($data['alumno_id'])) {
            return ApiResponse::error('Se requiere alumno_id.', 422);
        }

        $alumno = Alumno::findOrFail($data['alumno_id']);

        // Validar ≥60% créditos
        $creditos = $this->calcularPorcentajeCreditos($alumno);
        if ($creditos['porcentaje'] < 60) {
            return ApiResponse::error(
                "Necesitas al menos 60% de créditos para solicitar Salida Lateral. Tienes {$creditos['porcentaje']}%.",
                422
            );
        }

        // Validar que la asignatura de especialidad esté acreditada
        $asignaturaAcreditada = Calificacion::where('calificaciones.alumno_id', $alumno->id)
            ->where('calificaciones.acreditado', true)
            ->join('cargas_academicas', 'calificaciones.grupo_id', '=', 'cargas_academicas.grupo_id')
            ->where('cargas_academicas.materia_id', $data['asignatura_especialidad_id'])
            ->exists();

        if (! $asignaturaAcreditada) {
            return ApiResponse::error('La asignatura de especialidad seleccionada no está acreditada.', 422);
        }

        // Sin solicitud activa
        $existente = SalidaLateral::where('alumno_id', $alumno->id)
            ->whereNotIn('estatus', ['rechazado'])
            ->first();
        if ($existente) {
            return ApiResponse::error('Ya tienes una solicitud de Salida Lateral activa.', 422);
        }

        $salidaLateral = SalidaLateral::create([
            'alumno_id'                        => $alumno->id,
            'periodo_solicitud_id'             => $data['periodo_solicitud_id'],
            'porcentaje_creditos_al_solicitar' => $creditos['porcentaje'],
            'asignatura_especialidad_id'       => $data['asignatura_especialidad_id'],
            'estatus'                          => 'solicitado',
        ]);

        return ApiResponse::success(
            $salidaLateral->load(['alumno.user', 'alumno.carrera', 'periodoSolicitud', 'asignaturaEspecialidad']),
            'Solicitud de Salida Lateral registrada.',
            201
        );
    }

    // PATCH /salida-lateral/{id}/estatus  (admin aprueba/rechaza)
    public function actualizarEstatus(Request $request, SalidaLateral $salidaLateral): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'estatus' => ['required', 'in:en_revision,aprobado,rechazado'],
        ]);

        $update = ['estatus' => $data['estatus']];
        if ($data['estatus'] === 'aprobado') {
            $update['aprobado_por'] = $user->id;
        }

        $salidaLateral->update($update);

        return ApiResponse::success(
            $salidaLateral->fresh(['alumno.user', 'alumno.carrera', 'asignaturaEspecialidad', 'aprobadoPor']),
            'Estatus de Salida Lateral actualizado.'
        );
    }

    // GET /salida-lateral/{id}/diploma/pdf  (S7-07)
    public function diplomaPdf(SalidaLateral $salidaLateral): Response
    {
        if ($salidaLateral->estatus !== 'aprobado') {
            abort(422, 'El diploma solo puede generarse para solicitudes aprobadas por el Director.');
        }

        $salidaLateral->load(['alumno.user', 'alumno.carrera', 'periodoSolicitud', 'asignaturaEspecialidad', 'aprobadoPor']);

        $pdf = Pdf::loadView('pdfs.diploma_salida_lateral', [
            'salidaLateral' => $salidaLateral,
        ])->setPaper('letter');

        return $pdf->download("diploma_salida_lateral_{$salidaLateral->alumno->numero_control}.pdf");
    }

    private function calcularPorcentajeCreditos(Alumno $alumno): array
    {
        $total = MallaCurricular::where('mallas_curriculares.carrera_id', $alumno->carrera_id)
            ->join('materias', 'mallas_curriculares.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        if ($total === 0) {
            return ['porcentaje' => 0, 'acreditados' => 0, 'total' => 0];
        }

        $acreditados = Calificacion::where('calificaciones.alumno_id', $alumno->id)
            ->where('calificaciones.acreditado', true)
            ->join('cargas_academicas', 'calificaciones.grupo_id', '=', 'cargas_academicas.grupo_id')
            ->join('materias', 'cargas_academicas.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        $porcentaje = round(($acreditados / $total) * 100, 1);

        return ['porcentaje' => $porcentaje, 'acreditados' => (int) $acreditados, 'total' => (int) $total];
    }
}
