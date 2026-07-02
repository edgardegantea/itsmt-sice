<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Equivalencia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquivalenciaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'control_escolar',
                                  'director_academico', 'direccion_academica',
                                  'subdireccion_academica'];

    // GET /api/equivalencias
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Equivalencia::with([
            'alumno:id,name,email',
            'validadoPor:id,name',
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

    // POST /api/equivalencias
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'alumno_id'         => 'required|uuid|exists:users,id',
            'institucion_origen' => 'required|string|max:200',
            'materias_json'     => 'required|array|min:1',
            'materias_json.*.clave'                => 'required|string|max:50',
            'materias_json.*.nombre'               => 'required|string|max:200',
            'materias_json.*.calificacion'         => 'required|numeric|min:0|max:100',
            'materias_json.*.creditos'             => 'required|integer|min:1',
            'materias_json.*.materia_equivalente_id' => 'nullable|uuid|exists:materias,id',
            'dictamen_url'      => 'nullable|string|max:500',
        ]);

        $data['validado_por'] = $request->user()->id;

        $equivalencia = Equivalencia::create($data);

        return ApiResponse::success(
            $equivalencia->load(['alumno:id,name,email', 'validadoPor:id,name']),
            'Equivalencia registrada.',
            201
        );
    }
}
