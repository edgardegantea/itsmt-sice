<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Vinculacion\Models\ResidenciaProfesional;
use App\Domains\Vinculacion\Models\SolicitudRp;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ResidenciaProfesionalController extends Controller
{
    // GET /residencias
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $carreraForzada = $user->carreraRestringida();

        $query = ResidenciaProfesional::with(['alumno.user', 'alumno.carrera', 'asesor', 'solicitudRp'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),   fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('asesor_id'), fn($q, $v) => $q->where('asesor_id', $v));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /residencias  (admin crea expediente de residencia — S6-04)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'solicitud_rp_id' => ['required', 'uuid', 'exists:solicitudes_rp,id'],
            'empresa'         => ['nullable', 'string', 'max:200'],
            'proyecto'        => ['nullable', 'string', 'max:300'],
        ]);

        $solicitud = SolicitudRp::findOrFail($data['solicitud_rp_id']);

        if ($solicitud->estatus !== 'con_dictamen_aceptado') {
            return ApiResponse::error('La solicitud debe tener dictamen de anteproyecto ACEPTADO para crear el expediente de residencia.', 422);
        }

        if ($solicitud->residencia()->exists()) {
            return ApiResponse::error('Esta solicitud ya tiene un expediente de residencia.', 422);
        }

        $residencia = ResidenciaProfesional::create([
            'solicitud_rp_id' => $solicitud->id,
            'alumno_id'       => $solicitud->alumno_id,
            'empresa'         => $data['empresa'] ?? $solicitud->datos_empresa['nombre'] ?? null,
            'proyecto'        => $data['proyecto'] ?? null,
            'estatus'         => 'asignado',
        ]);

        return ApiResponse::success(
            $residencia->load(['alumno.user', 'alumno.carrera', 'solicitudRp']),
            'Expediente de residencia profesional creado.',
            201
        );
    }

    // PATCH /residencias/{residencia}/asesor  (admin asigna asesor interno — S6-04)
    public function asignarAsesor(Request $request, ResidenciaProfesional $residenciaProfesional): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'asesor_id' => ['required', 'uuid', 'exists:users,id'],
        ]);

        $asesor = User::findOrFail($data['asesor_id']);

        $residenciaProfesional->update([
            'asesor_id' => $asesor->id,
            'estatus'   => 'en_curso',
        ]);

        return ApiResponse::success(
            $residenciaProfesional->fresh(['alumno.user', 'asesor']),
            'Asesor interno asignado. Se generará el Oficio de Asignación (PO-004-02).'
        );
    }

    // GET /residencias/{residencia}/oficio-asesor/pdf
    public function oficioAsesorPdf(Request $request, ResidenciaProfesional $residenciaProfesional): Response
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $residenciaProfesional->load(['alumno.user', 'alumno.carrera', 'asesor', 'solicitudRp']);

        if (! $residenciaProfesional->asesor_id) {
            abort(422, 'La residencia no tiene asesor interno asignado.');
        }

        $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();

        $pdf = Pdf::loadView('pdfs.oficio_asesor_rp', [
            'residencia' => $residenciaProfesional,
            'cfg'        => $cfg,
        ])->setPaper('letter', 'portrait');

        $nc = $residenciaProfesional->alumno?->numero_control ?? 'NC';
        return $pdf->download("OficioAsesor_{$nc}.pdf");
    }

    // PATCH /residencias/{residencia}/seguimiento  (admin registra eval seguimiento — S6-04)
    public function registrarSeguimiento(Request $request, ResidenciaProfesional $residenciaProfesional): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'tipo'             => ['required', 'in:seguimiento_1,seguimiento_2'],
            'calificacion'     => ['required', 'numeric', 'min:0', 'max:100'],
            'horas_acumuladas' => ['nullable', 'integer', 'min:0'],
        ]);

        $campo = 'calificacion_' . $data['tipo'];

        $updates = [$campo => $data['calificacion']];
        if (isset($data['horas_acumuladas'])) {
            $updates['horas_acumuladas'] = $data['horas_acumuladas'];
        }

        $residenciaProfesional->update($updates);

        return ApiResponse::success(
            $residenciaProfesional->fresh(['alumno.user', 'asesor']),
            "Evaluación de {$data['tipo']} registrada (ponderación 10%, PO-004-08)."
        );
    }

    // PATCH /residencias/{residencia}/evaluacion-reporte  (S6-11 — deferred pero ruta disponible)
    public function evaluacionReporte(Request $request, ResidenciaProfesional $residenciaProfesional): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'calificacion_reporte_final' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        // Calcular calificación final: Seg1(10%) + Seg2(10%) + Reporte(80%)
        $seg1   = $residenciaProfesional->calificacion_seguimiento_1 ?? 0;
        $seg2   = $residenciaProfesional->calificacion_seguimiento_2 ?? 0;
        $reporte = $data['calificacion_reporte_final'];
        $final  = round(($seg1 * 0.10) + ($seg2 * 0.10) + ($reporte * 0.80), 2);

        $residenciaProfesional->update([
            'calificacion_reporte_final' => $reporte,
            'calificacion_final'         => $final,
            'estatus'                    => $final >= 70 ? 'acreditado' : 'no_acreditado',
        ]);

        return ApiResponse::success(
            $residenciaProfesional->fresh(['alumno.user']),
            "Evaluación de reporte final registrada. Calificación final: {$final} (PO-004-09)."
        );
    }
}
