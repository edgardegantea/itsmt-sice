<?php

namespace App\Http\Controllers\Seguridad;

use App\Domains\Seguridad\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    // GET /api/audit-logs
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Sin permiso para consultar la bitácora de auditoría.');
        }

        $logs = AuditLog::with('user')
            ->when($request->query('user_id'), fn($q, $v) => $q->where('user_id', $v))
            ->when($request->query('accion'), fn($q, $v) => $q->where('accion', $v))
            ->when($request->query('entidad'), fn($q, $v) => $q->where('entidad', $v))
            ->when($request->query('desde'), fn($q, $v) => $q->where('created_at', '>=', $v))
            ->when($request->query('hasta'), fn($q, $v) => $q->where('created_at', '<=', $v))
            ->latest('created_at')
            ->paginate(50);

        return ApiResponse::success($logs);
    }

    // GET /api/audit-logs/indicadores
    public function indicadores(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Sin permiso para consultar indicadores de auditoría.');
        }

        $logs = AuditLog::where('created_at', '>=', now()->subDays(30))->get();

        return ApiResponse::success([
            'total_eventos_30d'  => $logs->count(),
            'por_accion'         => $logs->groupBy('accion')->map->count(),
            'por_entidad'        => $logs->whereNotNull('entidad')->groupBy('entidad')->map->count(),
            'logins_fallidos_30d'=> $logs->where('accion', 'login_fallido')->count(),
        ]);
    }
}
