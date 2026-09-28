<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Contadores de pendientes para el índice de Gestión Académica, en una sola petición.
 *
 * Antes la página llamaba a cuatro endpoints completos (riesgo académico, deserción
 * temprana, torre de control, tickets) y descartaba todo salvo cuántos resultados había;
 * riesgo y deserción analizan a todos los alumnos del periodo. Aquí se reutilizan esos
 * mismos controladores —sin duplicar su lógica ni sus reglas de permisos y alcance— y el
 * resultado se guarda en caché unos minutos por usuario.
 */
class GestionAcademicaAvisosController extends Controller
{
    private const TTL_SEGUNDOS = 300;

    // GET /api/gestion-academica/avisos
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $periodo = Periodo::activo();

        // Por usuario: el alcance depende de su rol (p. ej. jefe_carrera solo ve su carrera).
        $clave = 'ga-avisos:' . $user->id . ':' . ($periodo?->id ?? 'sin-periodo');

        $avisos = Cache::remember($clave, self::TTL_SEGUNDOS, function () use ($request, $periodo) {
            $periodoId = $periodo?->id;
            return [
                'mantenimiento' => $this->contar($request, TicketMantenimientoController::class, ['estatus' => 'abierto']),
                'riesgo'        => $periodoId ? $this->contar($request, AlertaRiesgoAcademicoController::class, ['periodo_id' => $periodoId, 'nivel' => 'alto']) : null,
                'desercion'     => $periodoId ? $this->contar($request, AlertaDesercionTempranaController::class, ['periodo_id' => $periodoId, 'nivel' => 'alto']) : null,
                'incidencias'   => $periodoId ? $this->valor($request, TorreControlController::class, ['periodo_id' => $periodoId], 'incidencias_hoy.con_novedad') : null,
            ];
        });

        return ApiResponse::success($avisos);
    }

    /** Llama al index() del controlador con esos parámetros, como el mismo usuario. */
    private function respuesta(Request $request, string $controlador, array $params): ?array
    {
        $sub = Request::create('/', 'GET', $params);
        $sub->setUserResolver(fn () => $request->user());

        try {
            $res = app($controlador)->index($sub);
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
        // Sin permiso u otro error: el aviso simplemente no se muestra.
        if ($res->getStatusCode() !== 200) return null;

        return $res->getData(true)['data'] ?? null;
    }

    private function contar(Request $request, string $controlador, array $params): ?int
    {
        $data = $this->respuesta($request, $controlador, $params);
        return is_array($data) ? count($data) : null;
    }

    private function valor(Request $request, string $controlador, array $params, string $ruta): ?int
    {
        $data = $this->respuesta($request, $controlador, $params);
        $v = $data !== null ? data_get($data, $ruta) : null;
        return is_numeric($v) ? (int) $v : null;
    }
}
