<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Vinculacion\Models\DictamenAnteproyecto;
use App\Domains\Vinculacion\Models\SolicitudRp;
use App\Domains\Vinculacion\Services\PrerequisitosResidenciaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DictamenAnteproyectoController extends Controller
{
    public function __construct(private PrerequisitosResidenciaService $prerequisitos) {}

    // POST /dictamenes-anteproyecto  (jefe_carrera registra dictamen — S6-07)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        // Restringido a jefe_carrera (el actor que la historia especifica) con
        // superadmin/admin como respaldo operativo — antes cualquier rol
        // directivo genérico (control_escolar, dirección general, etc.) podía
        // registrar un dictamen académico que no le corresponde.
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera'])) {
            abort(403);
        }

        $data = $request->validate([
            'solicitud_rp_id'         => ['required', 'uuid', 'exists:solicitudes_rp,id'],
            'anteproyecto'            => ['nullable', 'string'],
            'empresa'                 => ['nullable', 'string', 'max:200'],
            'asesor_interno_id'       => ['nullable', 'uuid', 'exists:users,id'],
            'asesor_externo'          => ['nullable', 'string', 'max:150'],
            'dictamen'                => ['required', 'in:aceptado,rechazado'],
            'fecha_dictamen'          => ['required', 'date'],
            'presidente_academia_id'  => ['nullable', 'uuid', 'exists:users,id'],
            'jefe_depto_id'           => ['nullable', 'uuid', 'exists:users,id'],
            'subdirector_academico_id'=> ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $solicitud = SolicitudRp::findOrFail($data['solicitud_rp_id']);

        // Verificar acceso por carrera
        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $solicitud->alumno?->carrera_id !== $carreraForzada) {
            return ApiResponse::error('No tienes acceso a esta solicitud.', 403);
        }

        // Solo se puede emitir un dictamen si la solicitud está pendiente
        if ($solicitud->estatus !== 'pendiente_dictamen') {
            return ApiResponse::error('Esta solicitud ya cuenta con un dictamen.', 422);
        }

        // Re-verificar los prerequisitos TecNM al momento del dictamen: pudieron
        // haber cambiado desde que el alumno envió la solicitud (p.ej. cayó por
        // debajo del 80% de créditos, o entró a un curso especial).
        if ($data['dictamen'] === 'aceptado' && $solicitud->alumno && ! $this->prerequisitos->cumple($solicitud->alumno)) {
            return ApiResponse::error(
                'El alumno ya no cumple los prerequisitos TecNM (SS acreditado, AC completas, ≥80% créditos, fuera de curso especial, dentro de 12 semestres) para aceptar este anteproyecto.',
                422
            );
        }

        $dictamen = DictamenAnteproyecto::create(array_merge($data, [
            'alumno_id' => $solicitud->alumno_id,
        ]));

        // Actualizar estatus de la solicitud
        $nuevoEstatus = $data['dictamen'] === 'aceptado'
            ? 'con_dictamen_aceptado'
            : 'con_dictamen_rechazado';
        $solicitud->update(['estatus' => $nuevoEstatus]);

        return ApiResponse::success(
            $dictamen->load(['solicitudRp.alumno.user', 'asesorInterno']),
            'Dictamen de anteproyecto registrado.',
            201
        );
    }

    // GET /dictamenes-anteproyecto/{dictamen}/pdf
    public function pdf(Request $request, DictamenAnteproyecto $dictamenAnteproyecto): Response
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $dictamenAnteproyecto->load([
            'solicitudRp.alumno.user',
            'solicitudRp.alumno.carrera',
            'asesorInterno',
            'presidenteAcademia',
            'jefeDepto',
            'subdirectorAcademico',
        ]);

        $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();

        $pdf = Pdf::loadView('pdfs.dictamen_anteproyecto', [
            'dictamen' => $dictamenAnteproyecto,
            'cfg'      => $cfg,
        ])->setPaper('letter', 'portrait');

        $nc = $dictamenAnteproyecto->solicitudRp?->alumno?->numero_control ?? 'NC';
        return $pdf->download("DictamenAnteproyecto_{$nc}.pdf");
    }
}
