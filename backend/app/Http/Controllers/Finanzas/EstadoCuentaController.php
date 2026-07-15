<?php

namespace App\Http\Controllers\Finanzas;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Finanzas\Models\Pago;
use App\Domains\Permanencia\Models\Adeudo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstadoCuentaController extends Controller
{
    // GET /api/alumnos/{alumno}/estado-cuenta
    public function estadoCuenta(Request $request, Alumno $alumno): JsonResponse
    {
        $this->autorizarAccesoAlumno($request, $alumno);

        $adeudos = Adeudo::where('alumno_id', $alumno->id)
            ->orderBy('pagado')
            ->orderByDesc('created_at')
            ->get();

        $pagos = Pago::with('periodo')
            ->where('alumno_id', $alumno->id)
            ->orderByDesc('fecha_pago')
            ->get();

        $totalAdeudado = $adeudos->where('pagado', false)->sum('monto');
        $totalPagado   = $pagos->sum('monto');

        return ApiResponse::success([
            'alumno'        => $alumno->load('user', 'carrera'),
            'adeudos'       => $adeudos,
            'pagos'         => $pagos,
            'total_adeudado'=> $totalAdeudado,
            'total_pagado'  => $totalPagado,
        ]);
    }

    // GET /api/alumnos/{alumno}/historial-pagos
    public function historialPagos(Request $request, Alumno $alumno): JsonResponse
    {
        $this->autorizarAccesoAlumno($request, $alumno);

        $pagos = Pago::with(['periodo', 'registrador'])
            ->where('alumno_id', $alumno->id)
            ->orderByDesc('fecha_pago')
            ->paginate(20);

        return ApiResponse::success($pagos);
    }

    // POST /api/adeudos/{adeudo}/pagar
    public function registrarPago(Request $request, Adeudo $adeudo): JsonResponse
    {
        if ($adeudo->pagado) {
            return ApiResponse::error('Este adeudo ya fue pagado.', 422);
        }

        $data = $request->validate([
            'periodo_id'  => ['nullable', 'uuid', 'exists:periodos,id'],
            'metodo_pago' => ['nullable', 'in:efectivo,transferencia,tarjeta,cheque'],
            'folio_cfdi'  => ['nullable', 'string', 'max:50'],
            'serie_cfdi'  => ['nullable', 'string', 'max:20'],
            'uuid_cfdi'   => ['nullable', 'string', 'max:100'],
        ]);

        $pago = Pago::create([
            'alumno_id'      => $adeudo->alumno_id,
            'adeudo_id'      => $adeudo->id,
            'periodo_id'     => $data['periodo_id'] ?? null,
            'monto'          => $adeudo->monto,
            'concepto'       => $adeudo->concepto,
            'fecha_pago'     => now()->toDateString(),
            'metodo_pago'    => $data['metodo_pago'] ?? 'efectivo',
            'folio_cfdi'     => $data['folio_cfdi'] ?? null,
            'serie_cfdi'     => $data['serie_cfdi'] ?? null,
            'uuid_cfdi'      => $data['uuid_cfdi'] ?? null,
            'registrado_por' => $request->user()->id,
        ]);

        $adeudo->update(['pagado' => true]);

        return ApiResponse::success($pago->load('alumno.user'), 'Pago registrado.', 201);
    }

    // GET /api/reportes/ingresos/{periodo_id}
    public function reporteIngresos(string $periodoId): JsonResponse
    {
        $pagos = Pago::with(['alumno.user', 'alumno.carrera'])
            ->where('periodo_id', $periodoId)
            ->orderByDesc('fecha_pago')
            ->get();

        $totalPorMetodo = $pagos->groupBy('metodo_pago')
            ->map(fn($g) => $g->sum('monto'));

        return ApiResponse::success([
            'pagos'            => $pagos,
            'total_ingresos'   => $pagos->sum('monto'),
            'por_metodo_pago'  => $totalPorMetodo,
            'total_transacciones' => $pagos->count(),
        ]);
    }

    private function autorizarAccesoAlumno(Request $request, Alumno $alumno): void
    {
        if ($request->user()->hasRole('alumno')) {
            $propio = Alumno::where('user_id', $request->user()->id)->value('id');
            abort_if($propio !== $alumno->id, 403, 'Solo puedes ver tu propio estado de cuenta.');
        }
    }
}
