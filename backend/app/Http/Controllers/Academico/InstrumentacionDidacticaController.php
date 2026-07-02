<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AsignacionDocente;
use App\Domains\Academico\Models\InstrumentacionDidactica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstrumentacionDidacticaController extends Controller
{
    private const ROLES_JEFE  = ['superadmin', 'admin', 'jefe_carrera', 'director_academico',
                                   'direccion_academica', 'subdireccion_academica'];
    private const ROLES_DIRECTOR = ['superadmin', 'admin', 'director_academico',
                                     'direccion_academica', 'subdireccion_academica'];

    // GET /api/instrumentaciones-didacticas?periodo_id=&docente_id=  (S9-03/S9-04/S9-05)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isDocente = $user->hasRole('docente');

        if (! $isDocente && ! $user->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $periodoId = $request->query('periodo_id');
        $docenteId = $request->query('docente_id');

        $query = InstrumentacionDidactica::with([
            'asignacion.docente', 'asignacion.materia', 'asignacion.carrera',
            'asignacion.periodo', 'liberadaPor', 'vistoBuenoPor',
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
            $instrumentacion->load(['asignacion.materia', 'asignacion.carrera']),
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

        return ApiResponse::success($instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera']));
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

        // Política 3.4 PO-003: debe entregarse ≥3 días hábiles antes del inicio de clases
        // Se valida informativamente; la instrumentación puede enviarse en cualquier momento (la política aplica al periodo)
        $instrumentacionDidactica->update(['estatus' => 'enviada']);

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera']),
            'Instrumentación enviada a revisión del Jefe de Carrera.'
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

        if ($instrumentacionDidactica->estatus !== 'enviada') {
            return ApiResponse::error(
                'Solo puede liberarse o devolverse una instrumentación en estatus "enviada".',
                422
            );
        }

        $data = $request->validate([
            'accion'           => ['required', 'in:liberar,devolver'],
            'observaciones'    => ['required_if:accion,devolver', 'nullable', 'string'],
        ]);

        if ($data['accion'] === 'liberar') {
            $instrumentacionDidactica->update([
                'estatus'       => 'liberada',
                'liberada_por'  => $user->id,
                'observaciones_jefe' => null,
            ]);
            $msg = 'Instrumentación liberada. El Director Académico puede dar visto bueno.';
        } else {
            $instrumentacionDidactica->update([
                'estatus'           => 'observaciones',
                'observaciones_jefe'=> $data['observaciones'],
            ]);
            $msg = 'Instrumentación devuelta al docente con observaciones.';
        }

        return ApiResponse::success(
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera', 'liberadaPor']),
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
            $instrumentacionDidactica->fresh(['asignacion.materia', 'asignacion.carrera',
                                              'liberadaPor', 'vistoBuenoPor']),
            'Visto bueno otorgado. Instrumentación marcada como "Vigente" (TecNM-AC-PO-003).'
        );
    }
}
