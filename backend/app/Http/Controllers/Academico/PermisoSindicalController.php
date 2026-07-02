<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\FichaSindical;
use App\Domains\Academico\Models\PermisoSindical;
use App\Domains\Academico\Models\CargaAcademica;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PermisoSindicalController extends Controller
{
    private const ROLES_ADMIN  = ['superadmin', 'admin'];
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica', 'control_escolar'];

    // GET /api/permisos-sindicales
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $query = PermisoSindical::with(['docente', 'autorizadoPor', 'periodo'])
            ->when($request->query('docente_id'),
                fn ($q, $v) => $q->where('docente_id', $v))
            ->when($request->query('tipo_permiso'),
                fn ($q, $v) => $q->where('tipo_permiso', $v))
            ->when($request->query('periodo_id'),
                fn ($q, $v) => $q->where('periodo_id', $v));

        return ApiResponse::success($query->latest()->paginate(30));
    }

    // POST /api/permisos-sindicales
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'docente_id'   => 'required|uuid|exists:users,id',
            'tipo_permiso' => 'required|in:comision_sindical,licencia_con_goce,licencia_sin_goce',
            'fecha_inicio' => 'required|date',
            'fecha_fin'    => 'required|date|after_or_equal:fecha_inicio',
            'motivo'       => 'required|string|max:1000',
            'periodo_id'   => 'nullable|uuid|exists:periodos,id',
        ]);

        // Verificar que el docente tenga ficha sindical
        $fichaSindical = FichaSindical::where('docente_id', $validated['docente_id'])->first();
        if (! $fichaSindical) {
            return ApiResponse::error('El docente no tiene ficha sindical registrada. Registre la ficha sindical antes de agregar permisos.', 422);
        }

        $fechaInicio = Carbon::parse($validated['fecha_inicio']);
        $fechaFin    = Carbon::parse($validated['fecha_fin']);
        $diasTotales = $fechaInicio->diffInDays($fechaFin) + 1;

        // Inferir con_goce_sueldo del tipo_permiso
        $conGoce = $validated['tipo_permiso'] !== 'licencia_sin_goce';

        $permiso = PermisoSindical::create(array_merge($validated, [
            'dias_totales'    => $diasTotales,
            'con_goce_sueldo' => $conGoce,
            'autorizado_por'  => $request->user()->id,
        ]));

        return ApiResponse::success(
            $permiso->fresh(['docente', 'autorizadoPor', 'periodo']),
            'Permiso sindical registrado.',
            201
        );
    }

    // GET /api/permisos-sindicales/{permiso}/oficio-pdf
    public function oficio(Request $request, PermisoSindical $permiso): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $permiso->load(['docente', 'autorizadoPor', 'periodo']);

        // Grupos afectados por el docente en el período del permiso
        $grupos = CargaAcademica::with(['grupo', 'materia'])
            ->where('docente_id', $permiso->docente_id)
            ->when($permiso->periodo_id, fn ($q) => $q->whereHas('grupo', fn ($gq) => $gq->where('periodo_id', $permiso->periodo_id)))
            ->get();

        $fecha = now()->format('d/m/Y');

        $pdf = Pdf::loadView('pdfs.oficio_permiso_sindical', compact('permiso', 'grupos', 'fecha'))
            ->setPaper('letter');

        $permiso->update(['oficio_generado' => true]);

        return $pdf->download("oficio_permiso_sindical_{$permiso->id}.pdf");
    }
}
