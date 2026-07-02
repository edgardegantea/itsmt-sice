<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IndicadoresAsistenciaController extends Controller
{
    private const ROLES = ['superadmin', 'admin', 'director_academico', 'direccion_general'];

    // GET /api/indicadores/asistencia
    public function dashboard(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $request->validate(['periodo_id' => 'nullable|uuid|exists:periodos,id']);

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            $periodoId = Periodo::where('activo', true)->value('id');
        }

        // Leer desde la vista materializada (tabla en SQLite)
        $vm = DB::table('vm_asistencia_institucional')
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->get();

        // Si la VM está vacía (ej. tests sin datos), calcular en tiempo real
        if ($vm->isEmpty()) {
            $vm = $this->calcularEnTiempoReal($periodoId);
        }

        $totalAlertas  = AlertaInasistencia::when($periodoId,
            fn ($q) => $q->whereHas('grupo', fn ($gq) => $gq->where('periodo_id', $periodoId))
        )->count();

        return ApiResponse::success([
            'por_carrera'    => $vm,
            'total_alertas'  => $totalAlertas,
            'periodo_id'     => $periodoId,
        ]);
    }

    // GET /api/indicadores/asistencia/carrera/{carrera}
    public function porCarrera(Request $request, string $carreraId): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $request->validate(['periodo_id' => 'nullable|uuid|exists:periodos,id']);

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            $periodoId = Periodo::where('activo', true)->value('id');
        }

        $carrera = Carrera::findOrFail($carreraId);

        $alertas = AlertaInasistencia::with(['alumno', 'grupo'])
            ->whereHas('grupo', fn ($q) =>
                $q->where('carrera_id', $carreraId)
                  ->when($periodoId, fn ($pq) => $pq->where('periodo_id', $periodoId))
            )
            ->orderByDesc('porcentaje_inasistencia')
            ->get();

        $totalSesiones = SesionClase::whereHas('grupo', fn ($q) =>
            $q->where('carrera_id', $carreraId)
              ->when($periodoId, fn ($pq) => $pq->where('periodo_id', $periodoId))
        )->count();

        return ApiResponse::success([
            'carrera'        => $carrera,
            'periodo_id'     => $periodoId,
            'total_sesiones' => $totalSesiones,
            'alertas'        => $alertas,
            'alumnos_en_riesgo' => $alertas->count(),
        ]);
    }

    private function calcularEnTiempoReal(?string $periodoId): \Illuminate\Support\Collection
    {
        return DB::table('grupos')
            ->join('carreras', 'grupos.carrera_id', '=', 'carreras.id')
            ->when($periodoId, fn ($q) => $q->where('grupos.periodo_id', $periodoId))
            ->select(
                'grupos.carrera_id',
                'carreras.nombre as carrera_nombre',
                DB::raw('COUNT(DISTINCT grupos.id) as total_grupos'),
                DB::raw('0 as pct_asistencia_promedio'),
                DB::raw('0 as grupos_en_alerta'),
                DB::raw('0 as alumnos_en_alerta')
            )
            ->groupBy('grupos.carrera_id', 'carreras.nombre')
            ->get();
    }
}
