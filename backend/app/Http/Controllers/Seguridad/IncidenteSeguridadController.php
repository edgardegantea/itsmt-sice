<?php

namespace App\Http\Controllers\Seguridad;

use App\Domains\Seguridad\Models\IncidenteSeguridad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidenteSeguridadController extends Controller
{
    private array $rolesGestion = ['superadmin', 'admin'];

    // GET /api/incidentes-seguridad
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para consultar incidentes de seguridad.');
        }

        $incidentes = IncidenteSeguridad::with(['user', 'resolvedor'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('severidad'), fn($q, $v) => $q->where('severidad', $v))
            ->latest('detectado_en')
            ->paginate(30);

        return ApiResponse::success($incidentes);
    }

    // POST /api/incidentes-seguridad
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para registrar incidentes de seguridad.');
        }

        $data = $request->validate([
            'tipo'        => ['required', 'string', 'max:100'],
            'user_id'     => ['nullable', 'uuid', 'exists:users,id'],
            'ip_address'  => ['nullable', 'string', 'max:64'],
            'descripcion' => ['nullable', 'string'],
            'severidad'   => ['nullable', 'in:baja,media,alta,critica'],
        ]);

        $incidente = IncidenteSeguridad::create(array_merge($data, [
            'severidad'    => $data['severidad'] ?? 'media',
            'estatus'      => 'abierto',
            'detectado_en' => now(),
        ]));

        return ApiResponse::success($incidente, 'Incidente de seguridad registrado.', 201);
    }

    // PATCH /api/incidentes-seguridad/{incidente}/estatus
    public function actualizarEstatus(Request $request, IncidenteSeguridad $incidente): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para actualizar incidentes de seguridad.');
        }

        $data = $request->validate([
            'estatus' => ['required', 'in:en_revision,cerrado'],
        ]);

        $incidente->update([
            'estatus'      => $data['estatus'],
            'resuelto_en'  => $data['estatus'] === 'cerrado' ? now() : null,
            'resuelto_por' => $data['estatus'] === 'cerrado' ? $request->user()->id : null,
        ]);

        return ApiResponse::success($incidente->fresh(['resolvedor']), 'Incidente actualizado.');
    }
}
