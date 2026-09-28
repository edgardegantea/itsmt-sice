<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Egresado;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReporteDirectivoController extends Controller
{
    private const ROLES_DIRECTIVOS = ['superadmin', 'admin', 'director_academico', 'direccion_general'];

    // GET /api/reportes/matricula/pdf
    public function matriculaPdf(Request $request): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_DIRECTIVOS)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $request->validate([
            'periodo_id' => 'nullable|uuid|exists:periodos,id',
        ]);

        $periodoId = $request->query('periodo_id');
        $periodo   = $periodoId ? Periodo::find($periodoId) : Periodo::activo();

        // Sin periodo_id se usa el activo: el reporte es "del periodo", no histórico (antes
        // no filtraba y metía a todos los alumnos registrados, agotando la memoria de dompdf).
        $periodoId = $periodo?->id;

        $inscritos = Alumno::with(['carrera', 'inscripcion'])
            ->when($periodoId, fn ($q) => $q->where('periodo_ingreso_id', $periodoId))
            ->get();

        $bajas = \App\Domains\Permanencia\Models\Baja::with(['alumno.carrera'])
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->get();

        $reinscripciones = \App\Domains\Permanencia\Models\Reinscripcion::with(['alumno.carrera'])
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->where('estatus', 'aprobada')
            ->get();

        return $this->descargarPdf('pdfs.reporte_matricula', compact(
            'periodo', 'inscritos', 'bajas', 'reinscripciones'
        ), "reporte_matricula_{$periodo?->nombre}.pdf", true);
    }

    // GET /api/reportes/calificaciones/pdf
    public function calificacionesPdf(Request $request): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole([...self::ROLES_DIRECTIVOS, 'jefe_carrera'])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $request->validate([
            'carrera_id' => 'nullable|uuid|exists:carreras,id',
            'grupo_id'   => 'nullable|uuid|exists:grupos,id',
            'periodo_id' => 'nullable|uuid|exists:periodos,id',
        ]);

        $carreraForzada = $request->user()->carreraRestringida();

        $query = Grupo::with(['carrera', 'periodo', 'cargas.docente', 'alumnos'])
            ->when($carreraForzada ?? $request->query('carrera_id'),
                fn ($q, $v) => $q->where('carrera_id', $v))
            ->when($request->query('grupo_id'),
                fn ($q) => $q->where('id', $request->query('grupo_id')))
            ->when($request->query('periodo_id'),
                fn ($q) => $q->where('periodo_id', $request->query('periodo_id')));

        $grupos = $query->get();

        $pdf = Pdf::loadView('pdfs.reporte_calificaciones', compact('grupos'))
            ->setPaper('letter', 'landscape');

        return $pdf->download('reporte_calificaciones.pdf');
    }

    // GET /api/reportes/directorio/{tipo}/pdf
    public function directorioPdf(Request $request, string $tipo): Response|JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_DIRECTIVOS)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        if (! in_array($tipo, ['alumnos', 'docentes', 'egresados'])) {
            return ApiResponse::error('Tipo de directorio inválido. Use: alumnos, docentes, egresados.', 422);
        }

        $datos = match ($tipo) {
            'alumnos'   => Alumno::with(['user', 'carrera'])->whereIn(
                'estatus', ['activo', 'baja_temporal']
            )->get(),
            'docentes'  => User::role('docente')->with('fichaDocente')->get(),
            'egresados' => Egresado::with(['alumno'])->get(),
        };

        return $this->descargarPdf("pdfs.directorio_{$tipo}", ['datos' => $datos, 'tipo' => $tipo], "directorio_{$tipo}.pdf");
    }

    /**
     * Genera el PDF con Gotenberg (Chromium) y, si no está disponible, con dompdf.
     * Los directorios y la matrícula pueden tener miles de filas: dompdf arma todo el
     * documento en memoria y con ~5 000 alumnos agotaba los 256 MB y tardaba minutos;
     * Chromium los resuelve en segundos.
     */
    private function descargarPdf(string $vista, array $datos, string $nombre, bool $horizontal = false): Response
    {
        try {
            $html = view($vista, $datos)->render();
            $gotenberg = app(\App\Services\GotenbergService::class);
            $contenido = $horizontal ? $gotenberg->htmlToPdfLandscape($html) : $gotenberg->htmlToPdf($html);
            return response($contenido, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $nombre . '"',
            ]);
        } catch (\RuntimeException $e) {
            report($e);
        }

        ini_set('memory_limit', '1024M');
        set_time_limit(300);
        return Pdf::loadView($vista, $datos)->setPaper('letter', $horizontal ? 'landscape' : 'portrait')->download($nombre);
    }
}
