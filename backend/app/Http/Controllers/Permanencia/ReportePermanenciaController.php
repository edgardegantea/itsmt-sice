<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Reporte agregado de altas/bajas por carrera y periodo — el desglose que
 * institucionalmente se pide (tipo formato 911 de la SEP): cuántos alumnos
 * entraron (nuevo ingreso + reingreso de baja temporal) y cuántos salieron
 * (por tipo de baja) en el periodo, sin tener que cruzar Bajas + Alumnos a mano
 * cada vez que dirección lo pide.
 */
class ReportePermanenciaController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'control_escolar',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/reportes/altas-bajas?periodo_id=
    public function altasBajas(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }
        $periodo = Periodo::findOrFail($periodoId);

        $resultado = $this->calcular($periodoId, $periodo, $user->carreraRestringida());

        return ApiResponse::success([
            'periodo'  => ['id' => $periodo->id, 'nombre' => $periodo->nombre],
            'carreras' => $resultado,
            'totales'  => $this->totales($resultado),
        ]);
    }

    // GET /api/reportes/altas-bajas/pdf?periodo_id=
    public function pdf(Request $request): Response|JsonResponse
    {
        $user = $request->user();
        if (! $user?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }
        $periodo = Periodo::findOrFail($periodoId);

        $carreras = $this->calcular($periodoId, $periodo, $user->carreraRestringida());
        $totales  = $this->totales($carreras);

        $pdf = Pdf::loadView('pdfs.reporte_altas_bajas', compact('periodo', 'carreras', 'totales'))
            ->setPaper('letter', 'landscape');

        return $pdf->download("reporte_altas_bajas_{$periodo->nombre}.pdf");
    }

    /** @return Collection<int, array> */
    private function calcular(string $periodoId, Periodo $periodo, ?string $carreraForzada): Collection
    {
        $altasNuevoIngreso = Alumno::where('periodo_ingreso_id', $periodoId)
            ->when($carreraForzada, fn ($q, $v) => $q->where('carrera_id', $v))
            ->selectRaw('carrera_id, COUNT(*) as total')
            ->groupBy('carrera_id')
            ->pluck('total', 'carrera_id');

        // Reingreso: bajas temporales cuyo reingreso se formalizó dentro de las
        // fechas de este periodo (no tienen periodo_id propio de reingreso).
        $altasReingreso = DB::table('bajas as b')
            ->join('alumnos as a', 'a.id', '=', 'b.alumno_id')
            ->where('b.tipo_baja', 'temporal')
            ->where('b.reingreso_registrado', true)
            ->whereBetween('b.fecha_reingreso', [$periodo->fecha_inicio, $periodo->fecha_fin])
            ->when($carreraForzada, fn ($q, $v) => $q->where('a.carrera_id', $v))
            ->selectRaw('a.carrera_id, COUNT(*) as total')
            ->groupBy('a.carrera_id')
            ->pluck('total', 'a.carrera_id');

        $bajasPorTipo = DB::table('bajas as b')
            ->join('alumnos as a', 'a.id', '=', 'b.alumno_id')
            ->where('b.periodo_id', $periodoId)
            ->where('b.estatus', 'aprobada')
            ->when($carreraForzada, fn ($q, $v) => $q->where('a.carrera_id', $v))
            ->selectRaw('a.carrera_id, b.tipo_baja, COUNT(*) as total')
            ->groupBy('a.carrera_id', 'b.tipo_baja')
            ->get()
            ->groupBy('carrera_id');

        $carreras = Carrera::when($carreraForzada, fn ($q, $v) => $q->where('id', $v))
            ->orderBy('nombre')
            ->get();

        return $carreras->map(function (Carrera $c) use ($altasNuevoIngreso, $altasReingreso, $bajasPorTipo) {
            $porTipo = $bajasPorTipo->get($c->id, collect())->keyBy('tipo_baja');
            $nuevoIngreso   = (int) ($altasNuevoIngreso->get($c->id) ?? 0);
            $reingreso      = (int) ($altasReingreso->get($c->id) ?? 0);
            $bajaTemporal   = (int) ($porTipo->get('temporal')->total ?? 0);
            $bajaDefinitiva = (int) ($porTipo->get('definitiva')->total ?? 0);
            $bajaParcial    = (int) ($porTipo->get('parcial')->total ?? 0);

            return [
                'carrera_id' => $c->id,
                'carrera'    => $c->nombre,
                'altas'      => [
                    'nuevo_ingreso' => $nuevoIngreso,
                    'reingreso'     => $reingreso,
                    'total'         => $nuevoIngreso + $reingreso,
                ],
                'bajas' => [
                    'temporal'   => $bajaTemporal,
                    'definitiva' => $bajaDefinitiva,
                    'parcial'    => $bajaParcial,
                    'total'      => $bajaTemporal + $bajaDefinitiva + $bajaParcial,
                ],
                // Bajas parciales no cuentan contra la matrícula (son de una
                // materia, no del alumno) — el saldo neto solo resta temporal/definitiva.
                'saldo_neto' => ($nuevoIngreso + $reingreso) - ($bajaTemporal + $bajaDefinitiva),
            ];
        })->values();
    }

    private function totales(Collection $resultado): array
    {
        return [
            'altas'      => $resultado->sum(fn ($f) => $f['altas']['total']),
            'bajas'      => $resultado->sum(fn ($f) => $f['bajas']['total']),
            'saldo_neto' => $resultado->sum('saldo_neto'),
        ];
    }
}
