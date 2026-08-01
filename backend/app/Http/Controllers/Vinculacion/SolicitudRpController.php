<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Vinculacion\Models\SolicitudRp;
use App\Domains\Vinculacion\Services\PrerequisitosResidenciaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SolicitudRpController extends Controller
{
    public function __construct(private PrerequisitosResidenciaService $prerequisitos) {}

    // GET /solicitudes-rp  (admin/jefe_carrera lista; alumno ve las suyas)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::success([]);
            }
            $query = SolicitudRp::with(['alumno.user', 'alumno.carrera', 'dictamen'])
                ->where('alumno_id', $alumno->id);
            return ApiResponse::success($query->latest()->paginate(20));
        }

        $carreraForzada = $user->carreraRestringida();

        $query = SolicitudRp::with(['alumno.user', 'alumno.carrera', 'dictamen'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('alumno_id'),  fn($q, $v) => $q->where('alumno_id', $v));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /solicitudes-rp  (alumno envía solicitud RP — S6-06)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $alumno = Alumno::where('user_id', $user->id)->first();
        if (! $alumno) {
            return ApiResponse::error('No se encontró el registro de alumno.', 404);
        }

        // Verificar prerequisitos TecNM completos (política 3.4.5 PO-004): SS
        // acreditado, TODAS las actividades complementarias oficiales, ≥80%
        // créditos, no estar en curso especial, y dentro de 12 semestres.
        $prereq = $this->prerequisitos->verificar($alumno);

        if (! $prereq['ss_acreditado']) {
            return ApiResponse::error('Debes tener el Servicio Social acreditado para solicitar Residencia Profesional (política 3.4.5 PO-004).', 422);
        }

        if (! $prereq['ac_completadas']) {
            $faltantes = collect($prereq['ac_faltantes'])->pluck('nombre')->implode(', ');
            return ApiResponse::error(
                "Debes completar todas las Actividades Complementarias oficiales para solicitar Residencia Profesional (política 3.4.5 PO-004). Te faltan: {$faltantes}.",
                422
            );
        }

        if ($prereq['porcentaje_creditos'] < 80) {
            return ApiResponse::error(
                "Necesitas al menos 80% de créditos acreditados para solicitar Residencia Profesional. Tienes {$prereq['porcentaje_creditos']}%.",
                422
            );
        }

        if (! $prereq['dentro_limite_semestres']) {
            return ApiResponse::error(
                'Para solicitar Residencia Profesional debes estar dentro de los primeros 12 semestres. Tienes ' . $alumno->semestre_actual . ' semestres cursados.',
                422
            );
        }

        if (! $prereq['no_en_curso_especial']) {
            return ApiResponse::error(
                'No puedes solicitar Residencia Profesional mientras tengas una materia pendiente en oportunidad especial.',
                422
            );
        }

        // Solo una solicitud activa permitida
        $existente = SolicitudRp::where('alumno_id', $alumno->id)
            ->whereNotIn('estatus', ['con_dictamen_rechazado'])
            ->first();
        if ($existente) {
            return ApiResponse::error('Ya tienes una solicitud de Residencia Profesional activa o en proceso.', 422);
        }

        $data = $request->validate([
            'opcion'               => ['required', 'in:banco_proyectos,propuesta_propia,trabajador'],
            'datos_empresa'        => ['required', 'array'],
            'datos_empresa.nombre' => ['required', 'string', 'max:200'],
            'datos_empresa.giro'   => ['nullable', 'string', 'max:150'],
            'datos_empresa.rfc'    => ['nullable', 'string', 'max:13'],
            'datos_empresa.domicilio'    => ['nullable', 'string'],
            'datos_empresa.mision'       => ['nullable', 'string'],
            'datos_empresa.titular'      => ['nullable', 'string'],
            'datos_empresa.asesor_externo'    => ['nullable', 'string'],
            'datos_empresa.firmante_acuerdo'  => ['nullable', 'string'],
            'numero_seguro_social' => ['nullable', 'string', 'max:20'],
            'tipo_seguro'          => ['nullable', 'in:imss,issste'],
            'periodo_proyectado'   => ['nullable', 'string', 'max:20'],
        ]);

        $solicitud = SolicitudRp::create(array_merge($data, [
            'alumno_id' => $alumno->id,
            'estatus'   => 'pendiente_dictamen',
        ]));

        return ApiResponse::success(
            $solicitud->load(['alumno.user', 'alumno.carrera']),
            'Solicitud de Residencia Profesional enviada. En espera de dictamen de anteproyecto.',
            201
        );
    }

    // GET /solicitudes-rp/{solicitudRp}/carta-presentacion/pdf  (S6-07 — TecNM-AC-PO-004-03)
    public function cartaPresentacionPdf(Request $request, SolicitudRp $solicitudRp): Response
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno || $alumno->id !== $solicitudRp->alumno_id) {
                abort(403);
            }
        }

        $solicitudRp->load(['alumno.user', 'alumno.carrera', 'alumno.inscripcion']);
        $cfg = ConfiguracionInstitucional::instancia();

        $pdf = Pdf::loadView('pdfs.carta_presentacion_rp', [
            'solicitud'         => $solicitudRp,
            'alumno'            => $solicitudRp->alumno,
            'nombreInstitucion' => $cfg?->nombre_institucion ?? 'Instituto Tecnológico Superior de Martínez de la Torre',
            'fecha'             => now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY'),
        ])->setPaper('letter');

        return $pdf->download("carta_presentacion_rp_{$solicitudRp->id}.pdf");
    }
}
