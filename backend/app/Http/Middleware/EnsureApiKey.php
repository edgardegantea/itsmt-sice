<?php

namespace App\Http\Middleware;

use App\Domains\Seguridad\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autenticación para el feed de datos que consumen herramientas externas
 * (Power BI, Looker Studio) — esas herramientas no pueden hacer el login de la SPA
 * (Sanctum + cookie/token de sesión), así que usan una llave fija por header en vez
 * de una sesión de usuario.
 */
class EnsureApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $llave = $request->header('X-Api-Key') ?? $request->query('api_key');

        if (! $llave) {
            return response()->json(['message' => 'Falta la llave de acceso (header X-Api-Key).'], 401);
        }

        $apiKey = ApiKey::validar($llave);
        if (! $apiKey) {
            return response()->json(['message' => 'Llave de acceso inválida o desactivada.'], 401);
        }

        $apiKey->update(['ultimo_uso_en' => now()]);

        return $next($request);
    }
}
