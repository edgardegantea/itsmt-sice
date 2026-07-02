<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\FichaSindical;
use App\Domains\Academico\Models\MovimientoPlaza;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlazaController extends Controller
{
    private const ROLES_ADMIN  = ['superadmin', 'admin'];
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica', 'control_escolar'];

    // GET /api/plazas
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $query = FichaSindical::with(['docente', 'departamento', 'movimientos'])
            ->when($request->query('tipo_nombramiento'),
                fn ($q, $v) => $q->where('tipo_nombramiento', $v))
            ->when($request->query('activo') !== null,
                fn ($q) => $q->where('activo', $request->boolean('activo')))
            ->when($request->query('departamento_id'),
                fn ($q, $v) => $q->where('departamento_id', $v));

        return ApiResponse::success($query->latest()->paginate(30));
    }

    // POST /api/plazas/{plaza}/movimientos
    public function registrarMovimiento(Request $request, FichaSindical $plaza): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'tipo_movimiento'       => 'required|in:alta,cambio_categoria,baja,reingreso',
            'categoria_anterior'    => 'nullable|string|max:30',
            'categoria_nueva'       => 'nullable|string|max:30',
            'fecha_efectiva'        => 'required|date',
            'documento_soporte_url' => 'nullable|url|max:500',
            'notas'                 => 'nullable|string|max:1000',
        ]);

        $movimiento = MovimientoPlaza::create(array_merge($validated, [
            'ficha_sindical_id' => $plaza->id,
            'registrado_por'    => $request->user()->id,
        ]));

        // Actualizar categoría en la ficha si aplica
        if ($validated['tipo_movimiento'] === 'cambio_categoria' && isset($validated['categoria_nueva'])) {
            $plaza->update(['categoria_tbc' => $validated['categoria_nueva']]);
        }

        return ApiResponse::success(
            $movimiento->load('registradoPor'),
            'Movimiento de plaza registrado.',
            201
        );
    }
}
