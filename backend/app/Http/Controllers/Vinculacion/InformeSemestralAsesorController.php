<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Vinculacion\Models\InformeSemestralAsesor;
use App\Domains\Vinculacion\Models\ResidenciaProfesional;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InformeSemestralAsesorController extends Controller
{
    private const ROLES_AUTORIZADOS = ['superadmin', 'admin', 'docente', 'jefe_carrera',
                                        'director_academico', 'control_escolar',
                                        'direccion_general', 'direccion_academica',
                                        'subdireccion_academica'];

    // GET /api/informes-semestral-asesor  (S6-10)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_AUTORIZADOS)) {
            abort(403);
        }

        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera',
                                       'director_academico', 'control_escolar',
                                       'direccion_general', 'direccion_academica',
                                       'subdireccion_academica']);

        $query = InformeSemestralAsesor::with(['residencia.alumno.user', 'asesor'])
            ->when(! $esAdmin, fn($q) => $q->where('asesor_id', $user->id))
            ->when($request->query('residencia_id'), fn($q, $v) => $q->where('residencia_id', $v))
            ->when($request->query('periodo'), fn($q, $v) => $q->where('periodo', $v))
            ->latest();

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/informes-semestral-asesor  (S6-10 — TecNM-AC-PO-004-06)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_AUTORIZADOS)) {
            abort(403);
        }

        $data = $request->validate([
            'residencia_id' => ['required', 'uuid', 'exists:residencias_profesionales,id'],
            'periodo'       => ['required', 'string', 'max:20'],
            'contenido'     => ['required', 'string'],
        ]);

        // Verificar que el docente sea el asesor asignado (o es admin)
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera',
                                       'director_academico', ...\App\Models\User::ROLES_DIRECTIVOS]);
        if (! $esAdmin) {
            $residencia = ResidenciaProfesional::find($data['residencia_id']);
            if (! $residencia || $residencia->asesor_id !== $user->id) {
                return ApiResponse::error('Solo el asesor asignado puede registrar el informe semestral.', 403);
            }
        }

        $informe = InformeSemestralAsesor::create(array_merge($data, [
            'asesor_id' => $user->id,
            'estatus'   => 'enviado',
        ]));

        return ApiResponse::success(
            $informe->load(['residencia.alumno.user', 'asesor']),
            'Informe semestral registrado.',
            201
        );
    }
}
