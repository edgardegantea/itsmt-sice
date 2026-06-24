<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ActaCalificaciones;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\Grupo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\GotenbergService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ActaCalificacionesController extends Controller
{
    public function __construct(private GotenbergService $gotenberg) {}

    public function pdf(Request $request, string $grupoId): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', 'director_academico'])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $grupo = Grupo::with([
            'cargas.docente',
            'cargas.materia',
            'cargas.horarios',
            'periodo',
            'carrera',
            'alumnos.user',
        ])->findOrFail($grupoId);

        $periodo = $grupo->periodo;

        $calificaciones = Calificacion::with('alumno.user')
            ->where('grupo_id', $grupoId)
            ->orderBy('created_at')
            ->get()
            ->keyBy('alumno_id');

        $carga  = $grupo->cargas->first();
        $docente = $carga?->docente;

        // Crear o recuperar el acta
        $acta = ActaCalificaciones::firstOrCreate(
            ['grupo_id' => $grupoId, 'periodo_id' => $periodo?->id],
            [
                'docente_id' => $docente?->id,
                'url_pdf'    => null,
            ]
        );

        $html = view('pdfs.acta_calificaciones', compact(
            'grupo', 'periodo', 'carga', 'docente', 'calificaciones', 'acta'
        ))->render();

        $pdf = $this->gotenberg->htmlToPdf($html);

        $filename = "acta_{$grupo->clave}_{$periodo?->nombre}.pdf";

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ]);
    }

    public function firmar(Request $request, string $grupoId): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            return ApiResponse::error('No tienes permiso para firmar actas.', 403);
        }

        $grupo = Grupo::findOrFail($grupoId);

        $acta = ActaCalificaciones::where('grupo_id', $grupoId)->firstOrFail();

        if ($acta->firmada) {
            return ApiResponse::error('El acta ya fue firmada.', 422);
        }

        $acta->update([
            'firmada'               => true,
            'fecha_firma'           => now()->toDateString(),
            'firmada_por'           => $request->user()->id,
            'integrada_libro_actas' => true,
        ]);

        return ApiResponse::success($acta->fresh(['grupo', 'periodo', 'docente', 'firmadaPor']), 'Acta firmada e integrada al libro de actas.');
    }
}
