<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CargaEstadoController extends Controller
{
    // PATCH /cargas-academicas/{carga}/confirmar
    public function confirmar(Request $request, CargaAcademica $carga): JsonResponse
    {
        $user = $request->user();

        // Solo el docente asignado o admin pueden confirmar
        if ($user->hasRole('docente') && !$user->hasAnyRole(['superadmin', 'admin'])) {
            if ($carga->docente_id !== $user->id) {
                return ApiResponse::error('Solo puedes confirmar tus propias cargas.', 403);
            }
        }

        $carga->update(['estado' => 'confirmada', 'comentario_docente' => null]);

        return ApiResponse::success($carga->fresh(['materia', 'grupo', 'periodo', 'horarios']), 'Carga confirmada.');
    }

    // PATCH /cargas-academicas/{carga}/reportar-conflicto
    public function reportarConflicto(Request $request, CargaAcademica $carga): JsonResponse
    {
        $data = $request->validate([
            'comentario' => ['required', 'string', 'max:500'],
        ]);

        $user = $request->user();

        if ($user->hasRole('docente') && !$user->hasAnyRole(['superadmin', 'admin'])) {
            if ($carga->docente_id !== $user->id) {
                return ApiResponse::error('Solo puedes reportar conflictos de tus propias cargas.', 403);
            }
        }

        $carga->update(['estado' => 'conflicto', 'comentario_docente' => $data['comentario']]);

        return ApiResponse::success($carga->fresh(['materia', 'grupo', 'periodo', 'horarios']), 'Conflicto reportado.');
    }
}
