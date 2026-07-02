<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ConvenioMovilidad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConvenioMovilidadController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico',
                                  'direccion_academica', 'subdireccion_academica'];

    // GET /api/convenios-movilidad
    public function index(Request $request): JsonResponse
    {
        $convenios = ConvenioMovilidad::query()
            ->when($request->tipo,   fn($q, $v) => $q->where('tipo', $v))
            ->when($request->activo !== null, fn($q) => $q->where('activo', $request->boolean('activo')))
            ->orderBy('nombre_institucion')
            ->paginate(20);

        return ApiResponse::success($convenios);
    }

    // POST /api/convenios-movilidad
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'nombre_institucion' => 'required|string|max:200',
            'tipo'               => 'required|in:tecnm,nacional,extranjera',
            'vigente_desde'      => 'required|date',
            'vigente_hasta'      => 'nullable|date|after:vigente_desde',
            'url_convenio'       => 'nullable|string|max:500',
            'activo'             => 'sometimes|boolean',
        ]);

        $convenio = ConvenioMovilidad::create($data);

        return ApiResponse::success($convenio->fresh(), 'Convenio registrado.', 201);
    }
}
