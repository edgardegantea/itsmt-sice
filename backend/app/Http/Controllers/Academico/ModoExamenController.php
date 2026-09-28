<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ModoExamen;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * "Modo día de examen": activa, solo para una fecha puntual, que el check-in QR exija
 * foto obligatoria (en vez de opcional) y capture geolocalización — sin tener que
 * reconfigurar nada permanente del sistema para un evento de un solo día.
 */
class ModoExamenController extends Controller
{
    // Quién puede consultar qué fechas tienen modo examen activo.
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // Activar/desactivar es una política institucional (afecta el check-in de TODOS
    // los docentes de TODAS las carreras ese día — ModoExamen::activoHoy() no filtra
    // por carrera), así que jefe_carrera queda fuera: solo puede consultar.
    private const ROLES_GESTION = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS];

    // GET /api/modos-examen?periodo_id=
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');

        return ApiResponse::success(
            ModoExamen::with('activadoPor')
                ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
                ->orderByDesc('fecha')
                ->get()
        );
    }

    // POST /api/modos-examen  {periodo_id, fecha}
    public function activar(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_GESTION)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'fecha'      => ['required', 'date'],
        ]);

        // No se usa firstOrCreate(['fecha' => ...]) porque el cast 'date' del modelo
        // serializa la fecha con hora (Y-m-d H:i:s) al guardar, y esa comparación
        // directa contra el string plano de la fecha nunca hace match — activar
        // dos veces la misma fecha terminaría violando el índice único en vez de
        // devolver el registro existente.
        $modo = ModoExamen::where('periodo_id', $data['periodo_id'])
            ->whereDate('fecha', $data['fecha'])
            ->first();

        if (! $modo) {
            $modo = ModoExamen::create([
                'periodo_id'      => $data['periodo_id'],
                'fecha'           => $data['fecha'],
                'activado_por_id' => $request->user()->id,
            ]);
        }

        return ApiResponse::success($modo, 'Modo examen activado para esa fecha.', 201);
    }

    // DELETE /api/modos-examen/{modoExamen}
    public function desactivar(Request $request, ModoExamen $modoExamen): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_GESTION)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $modoExamen->delete();

        return ApiResponse::success(null, 'Modo examen desactivado.');
    }
}
