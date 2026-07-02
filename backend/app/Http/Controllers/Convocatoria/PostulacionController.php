<?php

namespace App\Http\Controllers\Convocatoria;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Convocatoria\Models\Convocatoria;
use App\Domains\Convocatoria\Models\Postulacion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulacionController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica'];

    // GET /api/convocatorias/{convocatoria}/postulaciones
    public function indexPorConvocatoria(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $postulaciones = $convocatoria->postulaciones()
            ->with(['postulante:id,name,email', 'revisadoPor:id,name'])
            ->when($request->query('estatus'), fn ($q, $v) => $q->where('estatus', $v))
            ->latest('fecha_postulacion')
            ->get();

        return ApiResponse::success($postulaciones);
    }

    // POST /api/convocatorias/{convocatoria}/postulaciones
    public function store(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        $user = $request->user();

        if ($convocatoria->estatus !== 'activa') {
            return ApiResponse::error('Esta convocatoria no está abierta para postulaciones.', 422);
        }

        // Verificar cupo
        if ($convocatoria->cupo_maximo !== null) {
            $totalPostulaciones = $convocatoria->postulaciones()->count();
            if ($totalPostulaciones >= $convocatoria->cupo_maximo) {
                return ApiResponse::error('El cupo de esta convocatoria está lleno. No se aceptan más postulaciones.', 422);
            }
        }

        // Verificar duplicado
        $existe = $convocatoria->postulaciones()->where('user_id', $user->id)->exists();
        if ($existe) {
            return ApiResponse::error('Ya tienes una postulación registrada para esta convocatoria.', 422);
        }

        $validated = $request->validate([
            'documentos'   => 'nullable|array',
            'documentos.*' => 'url|max:500',
        ]);

        $postulacion = Postulacion::create([
            'convocatoria_id'   => $convocatoria->id,
            'user_id'           => $user->id,
            'estatus'           => 'pendiente',
            'documentos'        => $validated['documentos'] ?? [],
            'fecha_postulacion' => now(),
        ]);

        return ApiResponse::success(
            $postulacion->fresh(['postulante:id,name,email', 'convocatoria']),
            'Postulación registrada.',
            201
        );
    }

    // PATCH /api/postulaciones/{postulacion}/estatus
    public function updateEstatus(Request $request, Postulacion $postulacion): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'estatus'       => 'required|in:pendiente,en_revision,admitido,no_admitido',
            'observaciones' => 'nullable|string|max:1000',
        ]);

        $postulacion->update([
            'estatus'        => $validated['estatus'],
            'observaciones'  => $validated['observaciones'] ?? $postulacion->observaciones,
            'revisado_por'   => $request->user()->id,
        ]);

        return ApiResponse::success(
            $postulacion->fresh(['postulante:id,name,email', 'revisadoPor:id,name', 'convocatoria']),
            'Estatus de postulación actualizado.'
        );
    }

    // GET /api/users/{user}/postulaciones  (S20-05 — historial del postulante)
    public function misPostulaciones(Request $request, User $user): JsonResponse
    {
        $caller = $request->user();

        // Solo el propio usuario o un admin puede ver el historial
        if ($caller->id !== $user->id && ! $caller->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso para ver las postulaciones de otro usuario.', 403);
        }

        $postulaciones = Postulacion::with(['convocatoria:id,titulo,tipo,estatus', 'revisadoPor:id,name'])
            ->where('user_id', $user->id)
            ->latest('fecha_postulacion')
            ->get();

        return ApiResponse::success($postulaciones);
    }
}
