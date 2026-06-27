<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaBajaDefinitiva;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertaBajaDefinitivaController extends Controller
{
    // GET /api/alertas-baja-definitiva?revisada=0|1&carrera_id=...
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $carreraForzada = $user->carreraRestringida();

        $query = AlertaBajaDefinitiva::with(['alumno.user', 'alumno.carrera', 'grupo.periodo', 'revisadaPor'])
            ->when($carreraForzada, fn ($q, $v) =>
                $q->whereHas('alumno', fn ($aq) => $aq->where('carrera_id', $v)))
            ->when($request->query('revisada') !== null,
                fn ($q) => $q->where('revisada', $request->boolean('revisada')))
            ->when($request->query('carrera_id') && ! $carreraForzada,
                fn ($q) => $q->whereHas('alumno', fn ($aq) =>
                    $aq->where('carrera_id', $request->query('carrera_id'))));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // PATCH /api/alertas-baja-definitiva/{alerta}/revisar
    public function revisar(Request $request, AlertaBajaDefinitiva $alerta): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        // Jefe de carrera solo puede revisar alertas de su carrera
        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $alerta->alumno?->carrera_id !== $carreraForzada) {
            return ApiResponse::error('No tienes acceso a esta alerta.', 403);
        }

        if ($alerta->revisada) {
            return ApiResponse::error('Esta alerta ya fue revisada.', 422);
        }

        $alerta->update([
            'revisada'    => true,
            'revisada_por'=> $user->id,
            'revisada_en' => now(),
        ]);

        return ApiResponse::success($alerta->fresh(['alumno.user', 'alumno.carrera', 'revisadaPor']));
    }
}
