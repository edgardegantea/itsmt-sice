<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    /**
     * Obtener notificaciones del usuario autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notificaciones = Notificacion::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get();

        $noLeidas = Notificacion::where('user_id', $user->id)
            ->where('leida', false)
            ->count();

        return response()->json([
            'data' => $notificaciones,
            'no_leidas' => $noLeidas,
        ]);
    }

    /**
     * Marcar una notificación como leída.
     */
    public function marcarLeida(Request $request, Notificacion $notificacion): JsonResponse
    {
        if ($notificacion->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $notificacion->update(['leida' => true]);

        return response()->json(['message' => 'Notificación marcada como leída']);
    }

    /**
     * Marcar todas las notificaciones como leídas.
     */
    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        Notificacion::where('user_id', $request->user()->id)
            ->where('leida', false)
            ->update(['leida' => true]);

        return response()->json(['message' => 'Todas las notificaciones se marcaron como leídas']);
    }
}
