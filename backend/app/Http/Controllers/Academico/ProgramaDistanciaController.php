<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ProgramaDistancia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgramaDistanciaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica'];

    // GET /api/programas-distancia
    public function index(Request $request): JsonResponse
    {
        $programas = ProgramaDistancia::with('carrera:id,nombre,clave')
            ->when($request->activo !== null, fn($q) => $q->where('activo', $request->boolean('activo')))
            ->when($request->carrera_id, fn($q, $v) => $q->where('carrera_id', $v))
            ->latest()
            ->get();

        return ApiResponse::success($programas);
    }

    // POST /api/programas-distancia
    // TecNM Cap. 16: configura programa con modalidad no_escolarizada/mixta, carga 12–36 créditos, máx. 16 semestres
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'carrera_id'             => 'required|uuid|exists:carreras,id',
            'modalidad'              => 'required|in:no_escolarizada,mixta',
            'creditos_minimos_carga' => 'sometimes|integer|min:12|max:36',
            'creditos_maximos_carga' => 'sometimes|integer|min:12|max:36',
            'semestres_maximos'      => 'sometimes|integer|min:8|max:20',
            'permite_trimestral'     => 'sometimes|boolean',
        ]);

        // TecNM Cap. 16: mínimo 12 créditos, máximo 36
        if (isset($data['creditos_minimos_carga']) && isset($data['creditos_maximos_carga'])) {
            if ($data['creditos_minimos_carga'] > $data['creditos_maximos_carga']) {
                return ApiResponse::error('Los créditos mínimos no pueden superar los créditos máximos.', 422);
            }
        }

        $programa = ProgramaDistancia::create($data);

        return ApiResponse::success(
            $programa->fresh(['carrera:id,nombre,clave']),
            'Programa en modalidad a distancia configurado.',
            201
        );
    }
}
