<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\FichaSindical;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PlantillaSindicalController extends Controller
{
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica'];

    // GET /api/reportes/plantilla-sindical/pdf
    public function pdf(Request $request): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $fichas = FichaSindical::with(['docente', 'departamento', 'movimientos'])
            ->when($request->query('tipo_nombramiento'),
                fn ($q, $v) => $q->where('tipo_nombramiento', $v))
            ->where('activo', true)
            ->orderBy('tipo_nombramiento')
            ->get();

        $fecha = now()->format('d/m/Y');

        $pdf = Pdf::loadView('pdfs.plantilla_sindical', compact('fichas', 'fecha'))
            ->setPaper('letter', 'landscape');

        return $pdf->download('plantilla_docente_sindicalizada.pdf');
    }
}
