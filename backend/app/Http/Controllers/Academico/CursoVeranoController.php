<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CursoVerano;
use App\Domains\Academico\Models\InscripcionVerano;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CursoVeranoController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica',
                                  'control_escolar', 'jefe_carrera'];

    // GET /api/cursos-verano
    public function index(Request $request): JsonResponse
    {
        $cursos = CursoVerano::with([
            'materia:id,nombre,clave,creditos',
            'docente:id,name,email',
            'periodo:id,nombre',
        ])
            ->withCount('inscripciones')
            ->when($request->estatus,     fn($q, $v) => $q->where('estatus', $v))
            ->when($request->periodo_id,  fn($q, $v) => $q->where('periodo_padre_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($cursos);
    }

    // POST /api/cursos-verano
    // TecNM Cap. 13: cursos solo presenciales, 6 semanas, grupos 15–30 alumnos
    // Criterios docente: ≥90% asistencia, eval ≥80%, aprobación ≥60%
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'periodo_padre_id' => 'required|uuid|exists:periodos,id',
            'materia_id'       => 'required|uuid|exists:materias,id',
            'docente_id'       => 'required|uuid|exists:users,id',
            'aula_id'          => 'nullable|uuid|exists:aulas,id',
            'fecha_inicio'     => 'required|date',
            'fecha_fin'        => 'nullable|date|after:fecha_inicio',
            'max_alumnos'      => 'sometimes|integer|min:15|max:30',
            'min_alumnos'      => 'sometimes|integer|min:15',
        ]);

        // TecNM Cap. 13: máximo 30 alumnos por grupo
        if (isset($data['max_alumnos']) && $data['max_alumnos'] > 30) {
            return ApiResponse::error('Los cursos de verano no pueden superar 30 alumnos (TecNM Cap. 13).', 422);
        }

        $curso = CursoVerano::create($data);

        return ApiResponse::success(
            $curso->fresh(['materia:id,nombre,clave', 'docente:id,name,email', 'periodo:id,nombre']),
            'Curso de verano programado.',
            201
        );
    }

    // POST /api/cursos-verano/{cursoVerano}/inscripciones
    public function inscribir(Request $request, CursoVerano $cursoVerano): JsonResponse
    {
        $user = $request->user();
        $esAdmin  = $user->hasAnyRole(self::ROLES_ADMIN);
        $esAlumno = $user->hasRole('alumno');

        if (! $esAdmin && ! $esAlumno) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        if ($cursoVerano->estatus === 'cerrado' || $cursoVerano->estatus === 'cancelado') {
            return ApiResponse::error('El curso ya no acepta inscripciones.', 422);
        }

        $alumnoId = $esAlumno ? $user->id : $request->validate([
            'alumno_id' => 'required|uuid|exists:users,id',
        ])['alumno_id'];

        // TecNM Cap. 13: máximo 30 alumnos
        $inscritos = InscripcionVerano::where('curso_verano_id', $cursoVerano->id)->count();
        if ($inscritos >= $cursoVerano->max_alumnos) {
            return ApiResponse::error('El curso ha alcanzado el cupo máximo de alumnos (TecNM Cap. 13).', 422);
        }

        $inscripcion = InscripcionVerano::firstOrCreate([
            'alumno_id'      => $alumnoId,
            'curso_verano_id' => $cursoVerano->id,
        ]);

        if (! $inscripcion->wasRecentlyCreated) {
            return ApiResponse::error('El alumno ya está inscrito en este curso.', 422);
        }

        return ApiResponse::success(
            $inscripcion->fresh(['alumno:id,name,email', 'cursoVerano.materia:id,nombre,clave']),
            'Inscripción registrada.',
            201
        );
    }

    // PATCH /api/cursos-verano/{cursoVerano}/cerrar
    public function cerrar(Request $request, CursoVerano $cursoVerano): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        if ($cursoVerano->estatus === 'cerrado') {
            return ApiResponse::error('El curso ya está cerrado.', 422);
        }

        $data = $request->validate([
            'calificaciones'                  => 'sometimes|array',
            'calificaciones.*.alumno_id'      => 'required|uuid|exists:users,id',
            'calificaciones.*.calificacion'   => 'nullable|numeric|min:0|max:100',
            'calificaciones.*.acreditado'     => 'nullable|boolean',
        ]);

        // Actualiza calificaciones si se proporcionan
        if (! empty($data['calificaciones'])) {
            foreach ($data['calificaciones'] as $cal) {
                InscripcionVerano::where('curso_verano_id', $cursoVerano->id)
                    ->where('alumno_id', $cal['alumno_id'])
                    ->update([
                        'calificacion' => $cal['calificacion'] ?? null,
                        'acreditado'   => $cal['acreditado']   ?? null,
                    ]);
            }
        }

        $cursoVerano->update(['estatus' => 'cerrado']);

        return ApiResponse::success(
            $cursoVerano->fresh(['materia:id,nombre,clave', 'docente:id,name', 'inscripciones.alumno:id,name']),
            'Curso de verano cerrado y calificaciones publicadas.'
        );
    }
}
