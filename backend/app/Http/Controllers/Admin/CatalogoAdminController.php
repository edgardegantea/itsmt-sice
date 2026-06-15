<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Catalogos\Models\EscuelaBachillerato;
use App\Domains\Catalogos\Models\Estado;
use App\Domains\Catalogos\Models\Municipio;
use App\Domains\Catalogos\Models\Turno;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoAdminController extends Controller
{
    // ── Estados ───────────────────────────────────────────────────────────────

    public function estadosIndex(): JsonResponse
    {
        return ApiResponse::success(Estado::withCount('municipios')->orderBy('nombre')->get());
    }

    public function estadosStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'     => ['required', 'string', 'max:100'],
            'clave_curp' => ['required', 'string', 'size:2', 'unique:estados,clave_curp'],
        ]);
        return ApiResponse::success(Estado::create($data), 'Estado creado.', 201);
    }

    public function estadosUpdate(Estado $estado, Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'     => ['required', 'string', 'max:100'],
            'clave_curp' => ['required', 'string', 'size:2', "unique:estados,clave_curp,{$estado->id}"],
        ]);
        $estado->update($data);
        return ApiResponse::success($estado, 'Estado actualizado.');
    }

    public function estadosDestroy(Estado $estado): JsonResponse
    {
        if ($estado->municipios()->exists()) {
            return ApiResponse::error('No se puede eliminar: tiene municipios asociados.', 422);
        }
        $estado->delete();
        return ApiResponse::success(null, 'Estado eliminado.');
    }

    // ── Municipios ────────────────────────────────────────────────────────────

    public function municipiosIndex(Request $request): JsonResponse
    {
        $query = Municipio::with('estado')->withCount('escuelas')->orderBy('nombre');
        if ($request->estado_id) {
            $query->where('estado_id', $request->estado_id);
        }
        return ApiResponse::success($query->get());
    }

    public function municipiosStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'estado_id' => ['required', 'exists:estados,id'],
            'nombre'    => ['required', 'string', 'max:150'],
        ]);
        return ApiResponse::success(Municipio::create($data), 'Municipio creado.', 201);
    }

    public function municipiosUpdate(Municipio $municipio, Request $request): JsonResponse
    {
        $data = $request->validate([
            'estado_id' => ['required', 'exists:estados,id'],
            'nombre'    => ['required', 'string', 'max:150'],
        ]);
        $municipio->update($data);
        return ApiResponse::success($municipio->load('estado'), 'Municipio actualizado.');
    }

    public function municipiosDestroy(Municipio $municipio): JsonResponse
    {
        $municipio->delete();
        return ApiResponse::success(null, 'Municipio eliminado.');
    }

    // ── Escuelas ──────────────────────────────────────────────────────────────

    public function escuelasIndex(Request $request): JsonResponse
    {
        $query = EscuelaBachillerato::with('municipio.estado')->orderBy('nombre');
        if ($request->municipio_id) {
            $query->where('municipio_id', $request->municipio_id);
        }
        if ($request->estado_id) {
            $query->whereHas('municipio', fn($q) => $q->where('estado_id', $request->estado_id));
        }
        return ApiResponse::success($query->get());
    }

    public function escuelasStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'       => ['required', 'string', 'max:200'],
            'municipio_id' => ['nullable', 'exists:municipios,id'],
            'tipo'         => ['required', 'in:preparatoria,cbtis,cetis,cobach,cobaev,cecyte,telebachillerato,otra'],
            'activa'       => ['boolean'],
        ]);
        return ApiResponse::success(
            EscuelaBachillerato::create($data)->load('municipio.estado'),
            'Escuela creada.', 201
        );
    }

    public function escuelasUpdate(EscuelaBachillerato $escuela, Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'       => ['required', 'string', 'max:200'],
            'municipio_id' => ['nullable', 'exists:municipios,id'],
            'tipo'         => ['required', 'in:preparatoria,cbtis,cetis,cobach,cobaev,cecyte,telebachillerato,otra'],
            'activa'       => ['boolean'],
        ]);
        $escuela->update($data);
        return ApiResponse::success($escuela->load('municipio.estado'), 'Escuela actualizada.');
    }

    public function escuelasDestroy(EscuelaBachillerato $escuela): JsonResponse
    {
        $escuela->delete();
        return ApiResponse::success(null, 'Escuela eliminada.');
    }

    // ── Turnos ────────────────────────────────────────────────────────────────

    public function turnosIndex(): JsonResponse
    {
        return ApiResponse::success(Turno::orderBy('nombre')->get());
    }

    public function turnosStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:50'],
            'clave'  => ['required', 'string', 'max:30', 'unique:turnos,clave'],
            'activo' => ['boolean'],
        ]);
        return ApiResponse::success(Turno::create($data), 'Turno creado.', 201);
    }

    public function turnosUpdate(Turno $turno, Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:50'],
            'clave'  => ['required', 'string', 'max:30', "unique:turnos,clave,{$turno->id}"],
            'activo' => ['boolean'],
        ]);
        $turno->update($data);
        return ApiResponse::success($turno, 'Turno actualizado.');
    }

    public function turnosDestroy(Turno $turno): JsonResponse
    {
        $turno->delete();
        return ApiResponse::success(null, 'Turno eliminado.');
    }
}
