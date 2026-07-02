<?php

namespace App\Http\Controllers\Personal;

use App\Domains\Personal\Models\Comision;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ComisionController extends Controller
{
    private const ROLES_DIRECTOR = ['superadmin', 'admin', 'director_academico',
                                     'direccion_academica', 'subdireccion_academica'];
    private const ROLES_PERSONAL = ['docente', 'personal_administrativo', 'jefe_carrera',
                                     'superadmin', 'admin', 'director_academico',
                                     'control_escolar', 'direccion_general',
                                     'direccion_academica', 'subdireccion_academica'];

    // GET /api/comisiones  (S10-03/S10-04)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_PERSONAL)) {
            abort(403);
        }

        $isDirector = $user->hasAnyRole(self::ROLES_DIRECTOR);

        $comisiones = Comision::with(['personal', 'asignadaPor'])
            ->when(! $isDirector, fn($q) => $q->where('personal_id', $user->id))
            ->when($request->query('personal_id') && $isDirector,
                   fn($q) => $q->where('personal_id', $request->query('personal_id')))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($comisiones);
    }

    // POST /api/comisiones  (S10-03 — director registra comisión)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_DIRECTOR)) {
            abort(403);
        }

        $data = $request->validate([
            'personal_id'   => ['required', 'uuid', 'exists:users,id'],
            'destino'       => ['required', 'string', 'max:200'],
            'proposito'     => ['required', 'string'],
            'fecha_inicio'  => ['required', 'date'],
            'fecha_fin'     => ['required', 'date', 'gte:fecha_inicio'],
            'con_viaticos'  => ['boolean'],
            'monto_viaticos'=> ['nullable', 'numeric', 'min:0', 'required_if:con_viaticos,true'],
        ]);

        $comision = Comision::create(array_merge($data, [
            'asignada_por' => $user->id,
        ]));

        return ApiResponse::success(
            $comision->load(['personal', 'asignadaPor']),
            'Comisión registrada. El personal asignado ha sido notificado.',
            201
        );
    }

    // GET /api/comisiones/{id}/oficio/pdf  (S10-03 — oficio de comisión PDF)
    public function oficioPdf(Comision $comision): Response
    {
        $comision->load(['personal', 'asignadaPor']);

        $pdf = Pdf::loadView('pdfs.oficio_comision', [
            'comision' => $comision,
        ])->setPaper('letter');

        return $pdf->download("oficio_comision_{$comision->id}.pdf");
    }
}
