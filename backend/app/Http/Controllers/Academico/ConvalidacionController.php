<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Convalidacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConvalidacionController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'control_escolar',
                                  'director_academico', 'direccion_academica',
                                  'subdireccion_academica'];

    // GET /api/convalidaciones
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Convalidacion::with([
            'alumno:id,name,email',
            'materiaEquivalente:id,nombre,clave',
            'registradoPor:id,name',
        ])->when($request->alumno_id, fn($q, $v) => $q->where('alumno_id', $v));

        if ($user->hasAnyRole(self::ROLES_ADMIN)) {
            // admin ve todas
        } elseif ($user->hasRole('alumno')) {
            $query->where('alumno_id', $user->id);
        } else {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/convalidaciones
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'alumno_id'               => 'required|uuid|exists:users,id',
            'materia_origen_nombre'   => 'required|string|max:200',
            'materia_origen_clave'    => 'required|string|max:50',
            'calificacion_obtenida'   => 'required|numeric|min:0|max:100',
            'institucion_origen'      => 'required|string|max:200',
            'materia_equivalente_id'  => 'nullable|uuid|exists:materias,id',
            'dictamen_url'            => 'nullable|string|max:500',
        ]);

        $data['registrado_por'] = $request->user()->id;

        $convalidacion = Convalidacion::create($data);

        return ApiResponse::success(
            $convalidacion->load(['alumno:id,name,email', 'materiaEquivalente:id,nombre,clave', 'registradoPor:id,name']),
            'Convalidación registrada.',
            201
        );
    }
}
