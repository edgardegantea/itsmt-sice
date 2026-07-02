<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Convalidacion;
use App\Domains\Academico\Models\Equivalencia;
use App\Domains\Academico\Models\InscripcionDistancia;
use Illuminate\Support\Facades\DB;
use App\Domains\Academico\Models\ExpedienteAlumnoExt;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Models\Constancia;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admision\ActualizarAlumnoRequest;
use App\Http\Requests\Admision\AutorizacionExpedienteRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlumnoController extends Controller
{
    // GET /api/alumnos
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumno::class);

        $carreraForzada = $request->user()->carreraRestringida();

        $alumnos = Alumno::with(['carrera', 'periodoIngreso', 'inscripcion.aspirante', 'user'])
            ->when($carreraForzada,                                     fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && $request->carrera_id,           fn($q) => $q->where('carrera_id', $request->carrera_id))
            ->when($request->estatus,    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->semestre,   fn($q, $v) => $q->where('semestre_actual', $v))
            ->when($request->grupo_id,   fn($q, $v) => $q->whereHas('grupos', fn($g) => $g->where('grupos.id', $v)))
            ->when($request->search, fn($q, $v) => $q
                ->where('numero_control', 'ilike', "%{$v}%")
                ->orWhereHas('inscripcion.aspirante', fn($q2) =>
                    $q2->whereRaw("CONCAT(nombres, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) ILIKE ?", ["%{$v}%"])
                ))
            ->orderBy('numero_control')
            ->paginate(min((int) ($request->query('per_page', 20)), 500));

        return ApiResponse::success($alumnos, 'Alumnos listados.');
    }

    // GET /api/alumnos/{alumno}
    public function show(Request $request, Alumno $alumno): JsonResponse
    {
        $this->authorize('view', $alumno);

        // TecNM-AC-PO-001-04: si autorizacion='nadie', solo CE/admin o el propio alumno pueden acceder
        if ($alumno->autorizacion_consulta_expediente === 'nadie') {
            $esPropioAlumno = $request->user()->hasRole('alumno') && $alumno->user_id === $request->user()->id;
            $rolCE = $request->user()->hasAnyRole(['superadmin', 'admin', 'personal_administrativo']);
            abort_if(! $esPropioAlumno && ! $rolCE, 403, 'El alumno no ha autorizado el acceso a su expediente a terceros (TecNM-AC-PO-001-04).');
        }

        return ApiResponse::success(
            $alumno->load([
                'carrera', 'periodoIngreso', 'inscripcion.aspirante', 'user',
                'grupos.cargas.materia',
                'grupos.cargas.docente',
                'grupos.cargas.aula',
                'grupos.cargas.horarios',
                'grupos.periodo',
            ]),
            'Detalle de alumno.'
        );
    }

    // PATCH /api/alumnos/{alumno}
    public function update(ActualizarAlumnoRequest $request, Alumno $alumno): JsonResponse
    {
        $this->authorize('update', $alumno);

        $datos = $request->validated();

        if (isset($datos['estatus']) && $datos['estatus'] !== $alumno->estatus) {
            $datos['fecha_cambio_estatus'] = now()->toDateString();
        }

        $alumno->update($datos);

        return ApiResponse::success($alumno->fresh(['carrera', 'periodoIngreso']), 'Alumno actualizado.');
    }

    // GET /api/alumnos/{alumno}/autorizacion-expediente
    public function autorizacionExpediente(Alumno $alumno): JsonResponse
    {
        $this->authorize('view', $alumno);

        return ApiResponse::success([
            'alumno_id'                        => $alumno->id,
            'numero_control'                   => $alumno->numero_control,
            'autorizacion_consulta_expediente' => $alumno->autorizacion_consulta_expediente,
        ]);
    }

    // PATCH /api/alumnos/{alumno}/autorizacion-expediente
    public function actualizarAutorizacion(AutorizacionExpedienteRequest $request, Alumno $alumno): JsonResponse
    {
        $this->authorize('update', $alumno);

        $alumno->update(['autorizacion_consulta_expediente' => $request->autorizacion_consulta_expediente]);

        return ApiResponse::success($alumno->fresh(), 'Autorización actualizada.');
    }

    // GET /api/alumnos/{alumno}/expediente  (S11-03)
    // Admin/Director: expediente completo — materias, calificaciones, reinscripciones, constancias, estatus
    public function expediente(Request $request, Alumno $alumno): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'director_academico',
                                  'control_escolar', 'direccion_general',
                                  'direccion_academica', 'subdireccion_academica',
                                  'jefe_carrera'])) {
            abort(403);
        }

        // Restricción jefe de carrera a su propia carrera
        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $alumno->carrera_id !== $carreraForzada) {
            abort(403, 'Sin acceso al expediente de alumnos de otras carreras.');
        }

        $alumno->load([
            'user', 'carrera', 'periodoIngreso',
            'inscripcion.aspirante',
            'grupos.periodo',
            'grupos.cargas.materia',
            'grupos.cargas.calificaciones' => fn($q) => $q->where('alumno_id', $alumno->id),
        ]);

        // Expediente extendido (puede no existir)
        $expedienteExt = ExpedienteAlumnoExt::where('alumno_id', $alumno->id)->first();

        // Historial permanencia
        $reinscripciones = Reinscripcion::where('alumno_id', $alumno->id)
            ->with('periodo')
            ->orderBy('created_at', 'desc')
            ->get();

        $bajas = Baja::where('alumno_id', $alumno->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $constancias = Constancia::where('alumno_id', $alumno->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success([
            'alumno'          => $alumno,
            'expediente_ext'  => $expedienteExt,
            'reinscripciones' => $reinscripciones,
            'bajas'           => $bajas,
            'constancias'     => $constancias,
        ]);
    }

    // GET /api/alumnos/{alumno}/historial-academico  (S15)
    // Historial completo: materias propias + convalidadas + equivalencias
    public function historialAcademico(Request $request, Alumno $alumno): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'control_escolar',
                                       'director_academico', 'jefe_carrera',
                                       'direccion_general', 'direccion_academica',
                                       'subdireccion_academica']);
        $esPropioAlumno = $user->hasRole('alumno') && $alumno->user_id === $user->id;

        if (! $esAdmin && ! $esPropioAlumno) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $alumno->load([
            'carrera',
            'grupos.periodo',
            'grupos.cargas.materia',
            'grupos.cargas.calificaciones' => fn($q) => $q->where('alumno_id', $alumno->id),
        ]);

        $convalidaciones = Convalidacion::with('materiaEquivalente:id,nombre,clave')
            ->where('alumno_id', $alumno->user_id)
            ->get();

        $equivalencias = Equivalencia::where('alumno_id', $alumno->user_id)->get();

        return ApiResponse::success([
            'alumno'          => $alumno,
            'convalidaciones' => $convalidaciones,
            'equivalencias'   => $equivalencias,
        ], 'Historial académico completo.');
    }

    // GET /api/alumnos/{alumno}/avance-distancia  (S17)
    // TecNM Cap. 16: avance del alumno en modalidad a distancia con alertas de riesgo
    public function avanceDistancia(Request $request, Alumno $alumno): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'director_academico',
                                       'direccion_academica', 'subdireccion_academica',
                                       'control_escolar']);
        $esCoord = $user->hasRole('coord_distancia');
        $esPropioAlumno = $user->hasRole('alumno') && $alumno->user_id === $user->id;

        if (! $esAdmin && ! $esCoord && ! $esPropioAlumno) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $inscripcion = InscripcionDistancia::with(['programa.carrera:id,nombre,clave', 'periodoIngreso:id,nombre'])
            ->where('alumno_id', $alumno->user_id)
            ->first();

        // Contar semestres cursados: periodos distintos en los que el alumno ha estado en un grupo
        $semestres_cursados = DB::table('alumno_grupo')
            ->join('grupos', 'grupos.id', '=', 'alumno_grupo.grupo_id')
            ->where('alumno_grupo.alumno_id', $alumno->id)
            ->distinct()
            ->count('grupos.periodo_id');

        $semestres_maximos     = $inscripcion?->programa?->semestres_maximos      ?? 16;
        $creditos_min          = $inscripcion?->programa?->creditos_minimos_carga ?? 12;
        $creditos_max          = $inscripcion?->programa?->creditos_maximos_carga ?? 36;
        // TecNM Cap. 16: alerta si supera 50% del tiempo máximo sin egresar
        $alerta_riesgo         = $semestres_cursados > ($semestres_maximos * 0.5);

        return ApiResponse::success([
            'alumno'                    => $alumno->only(['id', 'name', 'numero_control']),
            'inscripcion_distancia'     => $inscripcion,
            'semestres_cursados'        => $semestres_cursados,
            'semestres_maximos'         => $semestres_maximos,
            'creditos_minimos_carga'    => $creditos_min,
            'creditos_maximos_carga'    => $creditos_max,
            'alerta_riesgo'             => $alerta_riesgo,
            'porcentaje_tiempo_cursado' => $semestres_maximos > 0
                ? round(($semestres_cursados / $semestres_maximos) * 100, 1)
                : 0,
        ]);
    }
}
