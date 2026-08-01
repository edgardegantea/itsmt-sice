<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ActaCalificaciones;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Kardex;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\GotenbergService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ActaCalificacionesController extends Controller
{
    public function __construct(private GotenbergService $gotenberg) {}

    /**
     * Resuelve la carga académica (grupo/materia) sobre la que aplica el acta.
     * Un grupo puede agrupar varias materias (N:N); si no se especifica y hay
     * más de una, se exige indicarla explícitamente para no mezclar materias.
     */
    private function resolverCarga(Grupo $grupo, ?string $cargaAcademicaId): CargaAcademica|JsonResponse
    {
        if ($cargaAcademicaId) {
            $carga = $grupo->cargas->firstWhere('id', $cargaAcademicaId);
            if (! $carga) {
                return ApiResponse::error('La materia indicada no pertenece a este grupo.', 422);
            }
            return $carga;
        }

        if ($grupo->cargas->isEmpty()) {
            return ApiResponse::error('Este grupo no tiene materias asignadas.', 422);
        }

        if ($grupo->cargas->count() > 1) {
            return ApiResponse::error('Este grupo tiene varias materias; especifica carga_academica_id para generar el acta.', 422);
        }

        return $grupo->cargas->first();
    }

    public function pdf(Request $request, string $grupoId): Response|JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', 'director_academico'])) {
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

        // Jefe de carrera: solo su carrera
        if ($user->hasRole('jefe_carrera') && $user->carrera_id !== $grupo->carrera_id) {
            return ApiResponse::error('No tienes acceso a grupos de otra carrera.', 403);
        }

        $carga = $this->resolverCarga($grupo, $request->query('carga_academica_id'));
        if ($carga instanceof JsonResponse) {
            return $carga;
        }

        $periodo = $grupo->periodo;

        // S4-07: el acta solo puede generarse tras el cierre formal del curso
        // (calificaciones publicadas).
        $cerrado = CierreDeCurso::where('grupo_id', $grupoId)
            ->where('periodo_id', $periodo?->id)
            ->exists();

        if (! $cerrado) {
            return ApiResponse::error('Debes cerrar el curso antes de generar el acta de calificaciones.', 422);
        }

        $calificaciones = Calificacion::with('alumno.user')
            ->where('grupo_id', $grupoId)
            ->where('carga_academica_id', $carga->id)
            ->orderBy('created_at')
            ->get()
            ->keyBy('alumno_id');

        $docente = $carga->docente;

        // Crear o recuperar el acta (una por grupo/materia)
        $acta = ActaCalificaciones::firstOrCreate(
            ['grupo_id' => $grupoId, 'periodo_id' => $periodo?->id, 'carga_academica_id' => $carga->id],
            [
                'docente_id' => $docente?->id,
                'url_pdf'    => null,
            ]
        );

        $html = view('pdfs.acta_calificaciones', compact(
            'grupo', 'periodo', 'carga', 'docente', 'calificaciones', 'acta'
        ))->render();

        $pdf = $this->gotenberg->htmlToPdf($html);

        $filename = "acta_{$grupo->clave}_{$carga->materia?->clave}_{$periodo?->nombre}.pdf";

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

        $grupo = Grupo::with('cargas')->findOrFail($grupoId);

        $carga = $this->resolverCarga($grupo, $request->input('carga_academica_id'));
        if ($carga instanceof JsonResponse) {
            return $carga;
        }

        $cerrado = CierreDeCurso::where('grupo_id', $grupoId)
            ->where('periodo_id', $grupo->periodo_id)
            ->exists();

        if (! $cerrado) {
            return ApiResponse::error('Debes cerrar el curso antes de firmar el acta.', 422);
        }

        $acta = ActaCalificaciones::where('grupo_id', $grupoId)
            ->where('periodo_id', $grupo->periodo_id)
            ->where('carga_academica_id', $carga->id)
            ->firstOrFail();

        if ($acta->firmada) {
            return ApiResponse::error('El acta ya fue firmada.', 422);
        }

        $acta->update([
            'firmada'               => true,
            'fecha_firma'           => now()->toDateString(),
            'firmada_por'           => $request->user()->id,
            'integrada_libro_actas' => true,
        ]);

        // S4-07: al firmar el acta se actualiza el kardex de cada alumno (solo la
        // materia de esta acta, no todo el grupo).
        $calificaciones = Calificacion::with('alumno')
            ->where('grupo_id', $grupoId)
            ->where('carga_academica_id', $carga->id)
            ->get();

        foreach ($calificaciones as $cal) {
            $cal->update(['kardex_actualizado' => true]);

            Kardex::updateOrCreate(
                ['alumno_id' => $cal->alumno_id, 'calificacion_id' => $cal->id],
                [
                    'carga_academica_id' => $carga->id,
                    'grupo_id'           => $grupoId,
                    'periodo_id'         => $grupo->periodo_id,
                    'materia_nombre'     => $carga->materia?->nombre ?? 'Materia',
                    'promedio'           => $cal->promedio,
                    'acreditado'         => $cal->acreditado,
                    'tipo_curso'         => $cal->tipo_curso,
                    'acta_calificaciones_id' => $acta->id,
                    'fecha_registro'     => now()->toDateString(),
                ]
            );
        }

        return ApiResponse::success($acta->fresh(['grupo', 'periodo', 'docente', 'firmadaPor']), 'Acta firmada e integrada al libro de actas.');
    }
}
