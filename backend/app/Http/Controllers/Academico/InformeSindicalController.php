<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\PermisoSindical;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\CargaAcademica;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InformeSindicalController extends Controller
{
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica'];

    // GET /api/reportes/permisos-sindicales/{periodo}/pdf
    public function pdf(Request $request, Periodo $periodo): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $permisos = PermisoSindical::with(['docente', 'autorizadoPor'])
            ->where('periodo_id', $periodo->id)
            ->orderBy('fecha_inicio')
            ->get();

        // Enriquecer con grupos afectados de cada docente
        $permisos->each(function ($p) use ($periodo) {
            $p->grupos_afectados = CargaAcademica::with(['grupos:id,clave,semestre,periodo_id', 'materia:id,nombre'])
                ->where('docente_id', $p->docente_id)
                ->whereHas('grupos', fn ($q) => $q->where('periodo_id', $periodo->id))
                ->get()
                ->map(fn ($c) => ($c->grupos->pluck('clave')->implode(',') ?: '—') . ' — ' . ($c->materia?->nombre ?? '—'))
                ->implode(', ');
        });

        $fecha = now()->format('d/m/Y');

        $pdf = Pdf::loadView('pdfs.informe_permisos_sindicales', compact('permisos', 'periodo', 'fecha'))
            ->setPaper('letter', 'landscape');

        return $pdf->download("informe_permisos_sindicales_{$periodo->nombre}.pdf");
    }
}
