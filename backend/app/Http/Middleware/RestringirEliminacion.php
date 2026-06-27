<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Roles con acceso total de lectura y escritura pero sin capacidad de eliminar.
 * Bloquea todas las peticiones DELETE para estos roles.
 */
class RestringirEliminacion
{
    public const ROLES = [
        'control_escolar',
        'direccion_general',
        'direccion_academica',
        'subdireccion_academica',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('DELETE') && $request->user()?->hasAnyRole(self::ROLES)) {
            abort(403, 'Tu rol no tiene permiso para eliminar registros.');
        }

        return $next($request);
    }
}
