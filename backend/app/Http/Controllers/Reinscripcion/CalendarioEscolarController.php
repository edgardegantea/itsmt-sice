<?php

namespace App\Http\Controllers\Reinscripcion;

use App\Domains\Reinscripcion\Models\CalendarioEscolar;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarioEscolarController extends Controller
{
    // GET /api/calendario-escolar/{periodo_id}
    public function show(string $periodoId): JsonResponse
    {
        $calendario = CalendarioEscolar::with('autorizadoPor')
            ->where('periodo_id', $periodoId)
            ->first();

        return ApiResponse::success($calendario);
    }

    // POST /api/calendario-escolar
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'      => ['required', 'uuid', 'exists:periodos,id'],
            'periodo_escolar' => ['required', 'string', 'max:50'],
            'actividades'     => ['required', 'array'],
            'actividades.*.no'          => ['required', 'integer'],
            'actividades.*.actividad'   => ['required', 'string'],
            'actividades.*.fecha_inicio'=> ['required', 'date'],
            'actividades.*.fecha_fin'   => ['nullable', 'date'],
            'elaboro_nombre'  => ['nullable', 'string', 'max:200'],
            'elaboro_fecha'   => ['nullable', 'date'],
            'autorizo_nombre' => ['nullable', 'string', 'max:200'],
            'autorizo_fecha'  => ['nullable', 'date'],
        ]);

        $calendario = CalendarioEscolar::updateOrCreate(
            ['periodo_id' => $data['periodo_id']],
            array_merge($data, ['autorizado' => false])
        );

        return ApiResponse::success($calendario->load('autorizadoPor'), 'Calendario guardado.', 201);
    }

    // PATCH /api/calendario-escolar/{calendario}/autorizar
    public function autorizar(Request $request, CalendarioEscolar $calendario): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'subdireccion_academica', 'director_academico'])) {
            abort(403, 'Solo la Subdirección Académica puede autorizar el calendario.');
        }

        $calendario->update([
            'autorizado'     => true,
            'autorizado_por' => $request->user()->id,
            'autorizo_nombre'=> $request->user()->name,
            'autorizo_fecha' => now()->toDateString(),
        ]);

        return ApiResponse::success($calendario->fresh('autorizadoPor'), 'Calendario autorizado.');
    }
}
