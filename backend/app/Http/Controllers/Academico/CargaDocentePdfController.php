<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CargaDocentePdfController extends Controller
{
    /**
     * GET /api/docentes/{docente}/carga-academica/pdf?periodo_id=xxx
     */
    public function __invoke(Request $request, User $docente): Response
    {
        if (! $request->user()?->hasAnyRole(['superadmin', 'admin', 'director_academico', 'jefe_carrera'])) {
            abort(403, 'No autorizado.');
        }

        $periodoId = $request->query('periodo_id');
        $periodo   = $periodoId
            ? Periodo::findOrFail($periodoId)
            : (Periodo::where('activo', true)->first() ?? Periodo::latest()->first());

        if (! $periodo) {
            abort(422, 'No se encontró ningún periodo.');
        }

        $cargas = CargaAcademica::with([
            'materia.carrera',
            'grupo.carrera',
            'horarios',
            'aula',
        ])
            ->where('docente_id', $docente->id)
            ->where('periodo_id', $periodo->id)
            ->orderBy('created_at')
            ->get();

        $pdf = Pdf::loadView('pdfs.carga_docente_fsac03', [
            'docente' => $docente,
            'periodo' => $periodo,
            'cargas'  => $cargas,
        ])->setPaper('letter', 'portrait');

        $filename = 'CargaAcademica_' . str_replace(' ', '_', $docente->name) . '_' . $periodo->nombre . '.pdf';

        return $pdf->download($filename);
    }
}
