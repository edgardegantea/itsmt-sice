<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\MovilidadEstudiantil;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovilidadEstudiantilController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica',
                                  'control_escolar'];

    // GET /api/movilidad-estudiantil
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MovilidadEstudiantil::with(['alumno:id,name,email', 'convenio:id,nombre_institucion,tipo'])
            ->when($request->estatus, fn($q, $v) => $q->where('estatus', $v));

        if ($user->hasAnyRole(self::ROLES_ADMIN)) {
            // admin ve todas
        } elseif ($user->hasRole('alumno')) {
            $query->where('alumno_id', $user->id);
        } else {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/movilidad-estudiantil
    // TecNM Cap. 8: ≥50% créditos, máx. 1 materia en repetición, máx. 3 semestres movilidad
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin  = $user->hasAnyRole(self::ROLES_ADMIN);
        $esAlumno = $user->hasRole('alumno');

        if (! $esAdmin && ! $esAlumno) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'alumno_id'   => 'nullable|uuid|exists:users,id',
            'convenio_id' => 'nullable|uuid|exists:convenios_movilidad,id',
            'ies_receptora' => 'required|string|max:200',
            'fecha_inicio'  => 'required|date',
            'fecha_fin'     => 'nullable|date|after:fecha_inicio',
        ]);

        $alumnoId = $esAlumno ? $user->id : ($data['alumno_id'] ?? $user->id);

        // TecNM Cap. 8: máx. 3 semestres en movilidad
        $semestresActuales = MovilidadEstudiantil::where('alumno_id', $alumnoId)
            ->whereIn('estatus', ['activa', 'concluida'])
            ->sum('semestres_acumulados_movilidad');

        if ($semestresActuales >= 3) {
            return ApiResponse::error('El alumno ya ha alcanzado el máximo de 3 semestres en movilidad (TecNM Cap. 8).', 422);
        }

        $movilidad = MovilidadEstudiantil::create([
            'alumno_id'   => $alumnoId,
            'convenio_id' => $data['convenio_id'] ?? null,
            'ies_receptora' => $data['ies_receptora'],
            'fecha_inicio'  => $data['fecha_inicio'],
            'fecha_fin'     => $data['fecha_fin'] ?? null,
            'semestres_acumulados_movilidad' => 1,
        ]);

        return ApiResponse::success(
            $movilidad->fresh(['alumno:id,name,email', 'convenio:id,nombre_institucion']),
            'Estancia de movilidad registrada.',
            201
        );
    }

    // PATCH /api/movilidad-estudiantil/{movilidad}/calificaciones
    // TecNM Cap. 8: IES TecNM → calificación numérica; IES externa → AC o NA
    public function registrarCalificaciones(Request $request, MovilidadEstudiantil $movilidad): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'materias_cursadas'                        => 'required|array|min:1',
            'materias_cursadas.*.nombre'               => 'required|string|max:200',
            'materias_cursadas.*.calificacion'         => 'nullable|numeric|min:0|max:100',
            'materias_cursadas.*.tipo_acreditacion'    => 'required|in:numerica,AC,NA',
        ]);

        // Validar coherencia: si tipo_acreditacion=numerica debe haber calificación
        foreach ($data['materias_cursadas'] as $m) {
            if ($m['tipo_acreditacion'] === 'numerica' && ! isset($m['calificacion'])) {
                return ApiResponse::error('Las materias con acreditación numérica requieren calificación.', 422);
            }
        }

        $movilidad->update([
            'materias_cursadas' => $data['materias_cursadas'],
            'estatus'           => 'concluida',
        ]);

        return ApiResponse::success($movilidad->fresh(), 'Calificaciones de movilidad registradas.');
    }
}
