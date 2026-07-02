<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\InscripcionDistancia;
use App\Domains\Academico\Models\ProgramaDistancia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InscripcionDistanciaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica',
                                  'control_escolar'];

    // POST /api/inscripciones-distancia
    // TecNM Cap. 16: el aspirante DEBE acreditar el Módulo de Competencias antes de activar inscripción
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'alumno_id'                      => 'required|uuid|exists:users,id',
            'programa_id'                    => 'required|uuid|exists:programas_distancia,id',
            'periodo_ingreso_id'             => 'required|uuid|exists:periodos,id',
            'carga_trimestral'               => 'sometimes|boolean',
            'modulo_competencias_acreditado' => 'sometimes|boolean',
        ]);

        $programa = ProgramaDistancia::findOrFail($data['programa_id']);

        if (! $programa->activo) {
            return ApiResponse::error('El programa de modalidad a distancia no está activo.', 422);
        }

        $existe = InscripcionDistancia::withTrashed()
            ->where('alumno_id', $data['alumno_id'])
            ->where('programa_id', $data['programa_id'])
            ->exists();

        if ($existe) {
            return ApiResponse::error('El alumno ya está inscrito en este programa a distancia.', 422);
        }

        $inscripcion = InscripcionDistancia::create($data);

        return ApiResponse::success(
            $inscripcion->fresh(['alumno:id,name,email', 'programa.carrera:id,nombre', 'periodoIngreso:id,nombre']),
            'Alumno inscrito en programa a distancia. Módulo de Competencias: ' .
                ($inscripcion->modulo_competencias_acreditado ? 'acreditado.' : 'pendiente de acreditar (TecNM Cap. 16).'),
            201
        );
    }
}
