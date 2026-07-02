<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\PermisoSindical;
use App\Domains\Academico\Models\CargaAcademica;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AusentismoSindicalController extends Controller
{
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica'];

    // GET /api/dashboard/ausentismo-sindical
    public function dashboard(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $periodoId = $request->query('periodo_id');
        $hoy       = now()->toDateString();

        // Permisos activos hoy
        $permisosActivos = PermisoSindical::where('fecha_inicio', '<=', $hoy)
            ->where('fecha_fin', '>=', $hoy)
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->with('docente')
            ->get();

        // Días acumulados por docente en el semestre actual
        $query = PermisoSindical::query()
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->select('docente_id', DB::raw('SUM(dias_totales) as total_dias'))
            ->groupBy('docente_id')
            ->having('total_dias', '>', 5)
            ->with('docente:id,name,email');

        $docentesConMasDe5Dias = $query->get();

        // Grupos afectados: grupos de docentes con permisos activos
        $docentesIds = $permisosActivos->pluck('docente_id')->unique();

        $gruposAfectados = CargaAcademica::with(['grupo:id,clave,semestre', 'materia:id,nombre'])
            ->whereIn('docente_id', $docentesIds)
            ->when($periodoId, fn ($q) => $q->whereHas('grupo', fn ($gq) => $gq->where('periodo_id', $periodoId)))
            ->get()
            ->map(fn ($c) => [
                'grupo'   => $c->grupo,
                'materia' => $c->materia,
                'docente_id' => $c->docente_id,
            ]);

        return ApiResponse::success([
            'total_permisos_activos'       => $permisosActivos->count(),
            'permisos_activos'             => $permisosActivos,
            'docentes_mas_de_5_dias'       => $docentesConMasDe5Dias,
            'total_docentes_mas_5_dias'    => $docentesConMasDe5Dias->count(),
            'grupos_afectados'             => $gruposAfectados,
            'total_grupos_afectados'       => $gruposAfectados->count(),
        ]);
    }
}
