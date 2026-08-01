<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AsignacionDocente;
use App\Domains\Academico\Models\InstrumentacionDidactica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstrumentacionDidacticaController extends Controller
{
    private const ROLES_JEFE  = ['superadmin', 'admin', 'jefe_carrera', 'director_academico',
                                   'direccion_academica', 'subdireccion_academica'];
    private const ROLES_DIRECTOR = ['superadmin', 'admin', 'director_academico',
                                     'direccion_academica', 'subdireccion_academica'];
    private const ROLES_DA = ['superadmin', 'admin', 'desarrollo_academico'];

    // Áreas de la instrumentación sobre las que un revisor puede anclar una observación —
    // deben coincidir con las secciones que el frontend muestra en el detalle.
    private const SECCIONES_OBSERVABLES = [
        'objetivo_general', 'competencias', 'unidades', 'metodologia', 'criterios_evaluacion', 'bibliografia',
    ];

    // GET /api/instrumentaciones-didacticas?periodo_id=&docente_id=  (S9-03/S9-04/S9-05)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isDocente = $user->hasRole('docente');

        if (! $isDocente && ! $user->hasAnyRole(self::ROLES_JEFE) && ! $user->hasAnyRole(self::ROLES_DA)) {
            abort(403);
        }

        $periodoId = $request->query('periodo_id');
        $docenteId = $request->query('docente_id');

        $query = InstrumentacionDidactica::with([
            'asignacion.docente', 'asignacion.materia', 'asignacion.carrera',
            'asignacion.periodo', 'asignacion.grupo', 'liberadaPor', 'vistoBuenoPor',
        ]);

        // Docente solo ve sus propias instrumentaciones
        if ($isDocente) {
            $query->whereHas('asignacion', fn($q) => $q->where('docente_id', $user->id));
        } else {
            $carreraForzada = $user->carreraRestringida();
            if ($carreraForzada) {
                $query->whereHas('asignacion', fn($q) => $q->where('carrera_id', $carreraForzada));
            }
            if ($docenteId) {
                $query->whereHas('asignacion', fn($q) => $q->where('docente_id', $docenteId));
            }
        }

        $query->when($periodoId, fn($q) => $q->where('periodo_id', $periodoId));

        return ApiResponse::success($query->latest()->get());
    }

    // POST /api/instrumentaciones-didacticas  (S9-03 — docente crea borrador)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['docente', 'superadmin', 'admin'])) {
            abort(403);
        }

        $data = $request->validate([
            'asignacion_id'        => ['required', 'uuid', 'exists:asignaciones_docentes,id'],
            'objetivo_general'     => ['nullable', 'string'],
            'competencias'         => ['nullable', 'array'],
            'unidades'             => ['nullable', 'array'],
            'metodologia'          => ['nullable', 'string'],
            'criterios_evaluacion' => ['nullable', 'array'],
            'bibliografia'         => ['nullable', 'string'],
        ]);

        // Verificar que la asignación pertenece al docente si es docente
        $asignacion = AsignacionDocente::findOrFail($data['asignacion_id']);
        if ($user->hasRole('docente') && $asignacion->docente_id !== $user->id) {
            abort(403, 'Solo puede crear instrumentaciones para sus propias asignaciones.');
        }

        // No puede existir más de una instrumentación por asignación
        if ($asignacion->instrumentacion()->exists()) {
            return ApiResponse::error('Ya existe una instrumentación para esta asignación.', 422);
        }

        $instrumentacion = InstrumentacionDidactica::create(array_merge($data, [
            'periodo_id' => $asignacion->periodo_id,
            'estatus'    => 'borrador',
        ]));

        return ApiResponse::success(
            $instrumentacion->load(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo']),
            'Instrumentación creada en borrador.',
            201
        );
    }

    // PATCH /api/instrumentaciones-didacticas/{id}  (S9-03 — docente edita borrador)
    public function update(Request $request, InstrumentacionDidactica $instrumentacionDidactica): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('docente')) {
            if ($instrumentacionDidactica->asignacion->docente_id !== $user->id) {
                abort(403);
            }
        } elseif (! $user->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        if (! in_array($instrumentacionDidactica->estatus, ['borrador', 'observaciones'])) {
            return ApiResponse::error(
                'Solo se puede editar una instrumentación en estatus "borrador" u "observaciones".',
                422
            );
        }

        $data = $request->validate([
            'objetivo_general'     => ['nullable', 'string'],
            'competencias'         => ['nullable', 'array'],
            'unidades'             => ['nullable', 'array'],
            'metodologia'          => ['nullable', 'string'],
            'criterios_evaluacion' => ['nullable', 'array'],
            'bibliografia'         => ['nullable', 'string'],
        ]);

        $instrumentacionDidactica->update($data);

        return ApiResponse::success($instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo']));
    }

    // PATCH /api/instrumentaciones-didacticas/{id}/enviar  (S9-03 — docente envía a revisión)
    public function enviar(Request $request, InstrumentacionDidactica $instrumentacionDidactica): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['docente', 'superadmin', 'admin'])) {
            abort(403);
        }

        if ($user->hasRole('docente') && $instrumentacionDidactica->asignacion->docente_id !== $user->id) {
            abort(403);
        }

        if (! in_array($instrumentacionDidactica->estatus, ['borrador', 'observaciones'])) {
            return ApiResponse::error(
                'Solo puede enviarse una instrumentación en estatus "borrador" u "observaciones".',
                422
            );
        }

        // Política 3.4 PO-003: debe entregarse ≥3 días hábiles antes del inicio de clases.
        // No se bloquea el envío (el docente puede estar entregando ya iniciado el periodo),
        // pero se registra la tardanza para que Jefatura/Dirección la tengan en cuenta al
        // liberar (mismo criterio de conteo de días hábiles que PlaneacionDocenteController).
        $entregaTardia = false;
        $periodo = $instrumentacionDidactica->periodo;
        if ($periodo?->fecha_inicio) {
            $hoy    = Carbon::today();
            $inicio = Carbon::parse($periodo->fecha_inicio);
            $dias   = 0;
            $cursor = $hoy->copy()->addDay();
            while ($cursor->lte($inicio)) {
                if ($cursor->isWeekday()) $dias++;
                $cursor->addDay();
            }
            $entregaTardia = $hoy->gt($inicio) || $dias < 3;
        }

        $instrumentacionDidactica->update([
            'estatus'              => 'enviada',
            'entrega_en'           => now(),
            'entrega_tardia'       => $entregaTardia,
            // Cualquier reenvío (venga de Desarrollo Académico o de Jefatura) borra las
            // observaciones anteriores — ya fueron atendidas en esta nueva versión.
            'observaciones_jefe'   => null,
            'observaciones_campos' => null,
        ]);

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo']),
            $entregaTardia
                ? 'Instrumentación enviada fuera del plazo de 3 días hábiles (TecNM PO-003 §3.4). Quedó registrada como entrega tardía.'
                : 'Instrumentación enviada a revisión de Desarrollo Académico.'
        );
    }

    private function validarObservaciones(Request $request): array
    {
        return $request->validate([
            'accion'                            => ['required', 'in:aprobar,rechazar,liberar,devolver'],
            'observaciones_jefe'                => ['nullable', 'string', 'max:1000'],
            'observaciones_campos'               => ['nullable', 'array'],
            'observaciones_campos.*.id'          => ['required_with:observaciones_campos', 'string'],
            'observaciones_campos.*.seccion'     => ['required_with:observaciones_campos', 'in:' . implode(',', self::SECCIONES_OBSERVABLES)],
            'observaciones_campos.*.texto'       => ['required_with:observaciones_campos', 'string', 'max:1000'],
        ]);
    }

    // PATCH /api/instrumentaciones-didacticas/{id}/revisar-da  (Desarrollo Académico aprueba o rechaza)
    public function revisarDesarrolloAcademico(Request $request, InstrumentacionDidactica $instrumentacionDidactica): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_DA)) {
            abort(403);
        }

        if ($instrumentacionDidactica->estatus !== 'enviada') {
            return ApiResponse::error(
                'Solo puede revisarse una instrumentación en estatus "enviada".',
                422
            );
        }

        $data = $this->validarObservaciones($request);
        if (! in_array($data['accion'], ['aprobar', 'rechazar'])) {
            return ApiResponse::error('Acción no válida para esta revisión.', 422);
        }

        if ($data['accion'] === 'rechazar' && empty($data['observaciones_jefe']) && empty($data['observaciones_campos'])) {
            return ApiResponse::error('Debes indicar al menos una observación (general o anclada a una sección) al rechazar.', 422);
        }

        if ($data['accion'] === 'aprobar') {
            $instrumentacionDidactica->update([
                'estatus'              => 'enviada_jc',
                'observaciones_jefe'   => null,
                'observaciones_campos' => null,
            ]);
            $msg = 'Instrumentación aprobada por Desarrollo Académico y enviada a Jefatura de Carrera.';
        } else {
            $instrumentacionDidactica->update([
                'estatus'              => 'observaciones',
                'observaciones_jefe'   => $data['observaciones_jefe'] ?? null,
                'observaciones_campos' => $data['observaciones_campos'] ?? null,
            ]);
            $msg = 'Instrumentación devuelta al docente con observaciones de Desarrollo Académico.';
        }

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo']),
            $msg
        );
    }

    // PATCH /api/instrumentaciones-didacticas/{id}/liberar  (S9-04 — jefe libera o devuelve)
    public function liberar(Request $request, InstrumentacionDidactica $instrumentacionDidactica): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        // jefe_carrera solo puede gestionar instrumentaciones de su carrera
        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $instrumentacionDidactica->asignacion->carrera_id !== $carreraForzada) {
            abort(403, 'Solo puede gestionar instrumentaciones de su carrera.');
        }

        if ($instrumentacionDidactica->estatus !== 'enviada_jc') {
            return ApiResponse::error(
                'Solo puede liberarse o devolverse una instrumentación ya aprobada por Desarrollo Académico ("enviada_jc").',
                422
            );
        }

        $data = $this->validarObservaciones($request);
        if (! in_array($data['accion'], ['liberar', 'devolver'])) {
            return ApiResponse::error('Acción no válida para esta revisión.', 422);
        }

        if ($data['accion'] === 'devolver' && empty($data['observaciones_jefe']) && empty($data['observaciones_campos'])) {
            return ApiResponse::error('Debes indicar al menos una observación (general o anclada a una sección) al devolver.', 422);
        }

        if ($data['accion'] === 'liberar') {
            $instrumentacionDidactica->update([
                'estatus'              => 'liberada',
                'liberada_por'         => $user->id,
                'observaciones_jefe'   => null,
                'observaciones_campos' => null,
            ]);
            $msg = 'Instrumentación liberada. El Director Académico puede dar visto bueno.';
        } else {
            $instrumentacionDidactica->update([
                'estatus'              => 'observaciones',
                'observaciones_jefe'   => $data['observaciones_jefe'] ?? null,
                'observaciones_campos' => $data['observaciones_campos'] ?? null,
            ]);
            $msg = 'Instrumentación devuelta al docente con observaciones de Jefatura de Carrera.';
        }

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo', 'liberadaPor']),
            $msg
        );
    }

    // PATCH /api/instrumentaciones-didacticas/{id}/visto-bueno  (S9-05 — director da visto bueno)
    public function vistoBueno(Request $request, InstrumentacionDidactica $instrumentacionDidactica): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_DIRECTOR)) {
            abort(403);
        }

        if ($instrumentacionDidactica->estatus !== 'liberada') {
            return ApiResponse::error(
                'Solo puede darse visto bueno a instrumentaciones en estatus "liberada".',
                422
            );
        }

        $instrumentacionDidactica->update([
            'estatus'         => 'vigente',
            'visto_bueno_por' => $user->id,
        ]);

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'asignacion.docente', 'asignacion.grupo', 'asignacion.periodo',
                                              'liberadaPor', 'vistoBuenoPor']),
            'Visto bueno otorgado. Instrumentación marcada como "Vigente" (TecNM-AC-PO-003).'
        );
    }

    // GET /api/instrumentaciones-didacticas/{id}/pdf — documento formal para archivo/impresión
    public function pdf(Request $request, InstrumentacionDidactica $instrumentacionDidactica)
    {
        $user = $request->user();
        $instrumentacionDidactica->loadMissing([
            'asignacion.docente', 'asignacion.materia', 'asignacion.carrera.coordinador',
            'asignacion.periodo', 'asignacion.grupo', 'liberadaPor', 'vistoBuenoPor',
        ]);
        $asignacion = $instrumentacionDidactica->asignacion;

        $esDocentePropietario = $user->hasRole('docente') && $asignacion?->docente_id === $user->id;
        $carreraForzada = $user->carreraRestringida();
        if (! $esDocentePropietario) {
            if (! $user->hasAnyRole(array_unique([...self::ROLES_JEFE, ...self::ROLES_DIRECTOR, ...self::ROLES_DA]))) {
                abort(403);
            }
            if ($carreraForzada && $asignacion?->carrera_id !== $carreraForzada) {
                abort(403, 'Solo puede ver instrumentaciones de su carrera.');
            }
        }

        $pdf = Pdf::loadView('pdfs.instrumentacion_didactica', [
            'inst'       => $instrumentacionDidactica,
            'asignacion' => $asignacion,
        ])->setPaper('letter', 'portrait');

        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf']);
    }
}
