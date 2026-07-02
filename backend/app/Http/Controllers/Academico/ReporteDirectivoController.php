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
        $periodo   = $periodoId ? Periodo::find($periodoId) : Periodo::where('activo', true)->first();

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

        $pdf = Pdf::loadView('pdfs.reporte_matricula', compact(
            'periodo', 'inscritos', 'bajas', 'reinscripciones'
        ))->setPaper('letter', 'landscape');

        return $pdf->download("reporte_matricula_{$periodo?->nombre}.pdf");
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
            'docentes'  => User::role('docente')->with(['fichaDocente', 'cargas.carrera'])->get(),
            'egresados' => Egresado::with(['alumno'])->get(),
        };

        $pdf = Pdf::loadView("pdfs.directorio_{$tipo}", ['datos' => $datos, 'tipo' => $tipo])
            ->setPaper('letter');

        return $pdf->download("directorio_{$tipo}.pdf");
    }
}
