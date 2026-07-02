<?php

namespace App\Http\Controllers\Personal;

use App\Domains\Personal\Models\SolicitudPersonal;
use App\Domains\Personal\Models\TipoSolicitudPersonal;
use App\Domains\Personal\Models\Comision;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SolicitudPersonalController extends Controller
{
    private const ROLES_DIRECTOR = ['superadmin', 'admin', 'director_academico',
                                     'direccion_academica', 'subdireccion_academica'];
    private const ROLES_PERSONAL = ['docente', 'personal_administrativo', 'jefe_carrera',
                                     'superadmin', 'admin', 'director_academico',
                                     'control_escolar', 'direccion_general',
                                     'direccion_academica', 'subdireccion_academica'];

    // GET /api/tipos-solicitud-personal  (catálogo público autenticado)
    public function tipos(Request $request): JsonResponse
    {
        return ApiResponse::success(TipoSolicitudPersonal::orderBy('nombre')->get());
    }

    // GET /api/solicitudes-personal  (S10-01/S10-04)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_PERSONAL)) {
            abort(403);
        }

        $isDirector = $user->hasAnyRole(self::ROLES_DIRECTOR);

        $query = SolicitudPersonal::with(['solicitante', 'tipo', 'atendidaPor'])
            ->when(! $isDirector, fn($q) => $q->where('solicitante_id', $user->id))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('solicitante_id') && $isDirector,
                   fn($q) => $q->where('solicitante_id', $request->query('solicitante_id')))
            ->latest();

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/solicitudes-personal  (S10-01 — personal solicita permiso)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_PERSONAL)) {
            abort(403);
        }

        $data = $request->validate([
            'tipo_id'      => ['required', 'uuid', 'exists:tipos_solicitud_personal,id'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin'    => ['required', 'date', 'after_or_equal:fecha_inicio'],
            'motivo'       => ['required', 'string', 'max:1000'],
            'documentos'   => ['nullable', 'array'],
        ]);

        $solicitud = SolicitudPersonal::create(array_merge($data, [
            'solicitante_id' => $user->id,
            'estatus'        => 'pendiente',
        ]));

        return ApiResponse::success(
            $solicitud->load(['solicitante', 'tipo']),
            'Solicitud registrada en estatus "pendiente". El Director Académico ha sido notificado.',
            201
        );
    }

    // PATCH /api/solicitudes-personal/{id}/resolver  (S10-02 — director resuelve)
    public function resolver(Request $request, SolicitudPersonal $solicitudPersonal): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_DIRECTOR)) {
            abort(403);
        }

        if ($solicitudPersonal->estatus !== 'pendiente') {
            return ApiResponse::error('Esta solicitud ya fue resuelta.', 422);
        }

        $data = $request->validate([
            'estatus'      => ['required', 'in:aprobada,rechazada'],
            'observaciones'=> ['nullable', 'string', 'max:500'],
        ]);

        $solicitudPersonal->update(array_merge($data, [
            'atendida_por' => $user->id,
        ]));

        $msg = $data['estatus'] === 'aprobada'
            ? 'Solicitud aprobada. El documento oficial ha sido generado.'
            : 'Solicitud rechazada. El solicitante ha sido notificado.';

        return ApiResponse::success(
            $solicitudPersonal->fresh(['solicitante', 'tipo', 'atendidaPor']),
            $msg
        );
    }

    // GET /api/solicitudes-personal/{id}/documento/pdf  (S10-02 — PDF permiso aprobado)
    public function documentoPdf(SolicitudPersonal $solicitudPersonal): Response
    {
        if ($solicitudPersonal->estatus !== 'aprobada') {
            abort(422, 'El documento oficial solo se genera para solicitudes aprobadas.');
        }

        $solicitudPersonal->load(['solicitante', 'tipo', 'atendidaPor']);

        $pdf = Pdf::loadView('pdfs.permiso_aprobado', [
            'solicitud' => $solicitudPersonal,
        ])->setPaper('letter');

        return $pdf->download("permiso_{$solicitudPersonal->id}.pdf");
    }

    // GET /api/personal/{id}/historial  (S10-04 — historial personal)
    public function historial(Request $request, string $personalId): JsonResponse
    {
        $user = $request->user();

        // Solo el propio usuario o un director puede ver el historial
        if ($user->id !== $personalId && ! $user->hasAnyRole(self::ROLES_DIRECTOR)) {
            abort(403);
        }

        $solicitudes = SolicitudPersonal::with(['tipo', 'atendidaPor'])
            ->where('solicitante_id', $personalId)
            ->latest()
            ->get();

        $comisiones = Comision::with(['asignadaPor'])
            ->where('personal_id', $personalId)
            ->latest()
            ->get();

        return ApiResponse::success([
            'solicitudes' => $solicitudes,
            'comisiones'  => $comisiones,
        ]);
    }
}
