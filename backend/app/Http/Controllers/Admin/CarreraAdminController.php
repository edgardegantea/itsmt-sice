<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Institucional\Models\DirectorioPersonal;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CarreraRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarreraAdminController extends Controller
{
    // GET /api/admin/carreras
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        return ApiResponse::success(
            Carrera::withCount(['alumnos', 'aspirantes'])->orderBy('nombre')->get()
        );
    }

    // GET /api/admin/carreras/{carrera}
    public function show(Request $request, Carrera $carrera): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(['superadmin', 'admin', 'director_academico', 'jefe_carrera'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $carrera->loadCount(['alumnos', 'aspirantes']);

        // Jefe de carrera asignado
        $jefe = User::with('roles')
            ->whereHas('roles', fn($q) => $q->where('name', 'jefe_carrera'))
            ->where('carrera_id', $carrera->id)
            ->first();

        // Personal en directorio relacionado con el área de la carrera
        $personal = DirectorioPersonal::with(['directorio_area', 'puesto'])
            ->whereHas('directorio_area', fn($q) => $q->where('nombre', 'LIKE', '%' . $carrera->nombre . '%'))
            ->orWhereHas('puesto', fn($q) => $q->whereHas('area', fn($q2) => $q2->where('nombre', 'LIKE', '%' . $carrera->nombre . '%')))
            ->get();

        // Alumnos activos por semestre
        $alumnosPorSemestre = $carrera->alumnos()
            ->where('estatus', 'activo')
            ->selectRaw('semestre_actual, count(*) as total')
            ->groupBy('semestre_actual')
            ->orderBy('semestre_actual')
            ->get();

        // Malla curricular si existe
        $mallas = MallaCurricular::where('carrera_id', $carrera->id)
            ->orderBy('semestre')
            ->orderBy('nombre_materia')
            ->get();

        return ApiResponse::success([
            'carrera'             => $carrera,
            'jefe'                => $jefe ? ['id' => $jefe->id, 'nombre' => $jefe->name, 'email' => $jefe->email] : null,
            'personal_directorio' => $personal,
            'alumnos_por_semestre'=> $alumnosPorSemestre,
            'mallas'              => $mallas,
        ]);
    }

    // POST /api/admin/carreras
    public function store(CarreraRequest $request): JsonResponse
    {
        return ApiResponse::success(Carrera::create($request->validated()), 'Carrera creada correctamente.', 201);
    }

    // PATCH /api/admin/carreras/{carrera}
    public function update(CarreraRequest $request, Carrera $carrera): JsonResponse
    {
        $carrera->update($request->validated());

        return ApiResponse::success($carrera->fresh()->loadCount(['alumnos', 'aspirantes']), 'Carrera actualizada.');
    }

    // PATCH /api/admin/carreras/{carrera}/toggle-activa
    public function toggleActiva(Request $request, Carrera $carrera): JsonResponse
    {
        if (! $request->user()?->hasRole(['admin', 'superadmin'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $carrera->update(['activa' => ! $carrera->activa]);

        return ApiResponse::success($carrera->fresh(), $carrera->activa ? 'Carrera activada.' : 'Carrera desactivada.');
    }
}
