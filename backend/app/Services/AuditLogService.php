<?php

namespace App\Services;

use App\Domains\Seguridad\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogService
{
    public static function record(
        string $accion,
        ?string $entidad = null,
        ?string $entidadId = null,
        ?array $metadata = null,
        ?int $statusCode = null,
        ?Request $request = null,
    ): AuditLog {
        $request ??= request();

        return AuditLog::create([
            'user_id'     => Auth::id(),
            'accion'      => $accion,
            'metodo'      => $request?->method(),
            'ruta'        => $request?->path(),
            'entidad'     => $entidad,
            'entidad_id'  => $entidadId,
            'status_code' => $statusCode,
            'ip_address'  => $request?->ip(),
            'user_agent'  => $request?->userAgent(),
            'metadata'    => $metadata,
            'created_at'  => now(),
        ]);
    }
}
