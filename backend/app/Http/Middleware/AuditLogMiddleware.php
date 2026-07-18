<?php

namespace App\Http\Middleware;

use App\Services\AuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditLogMiddleware
{
    private const METODOS_AUDITABLES = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $rutaAuditadaAparte = $request->is('api/auth/*'); // login/logout ya se auditan explícitamente en AuthController

        if (! $rutaAuditadaAparte && in_array($request->method(), self::METODOS_AUDITABLES, true) && $request->user()) {
            $segmentos = explode('/', trim($request->path(), '/'));
            $entidad = $segmentos[1] ?? null; // api/{entidad}/...
            $entidadId = collect($segmentos)->first(fn ($s) => preg_match('/^[0-9a-f-]{36}$/i', $s));

            AuditLogService::record(
                accion: strtolower($request->method()),
                entidad: $entidad,
                entidadId: $entidadId,
                statusCode: $response->getStatusCode(),
                request: $request,
            );
        }

        return $response;
    }
}
