<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Domains\Academico\Models\ReglaIa;
use App\Domains\Academico\Services\DisponibilidadIa;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Activar/desactivar el asistente de IA de la instrumentación por ámbito (solo superadmin). */
class ReglaIaController extends Controller
{
    // GET /api/ia/disponibilidad?planeacion_id=  — para que el editor muestre u oculte la IA
    public function disponibilidad(Request $request, DisponibilidadIa $ia): JsonResponse
    {
        $planeacion = $request->query('planeacion_id') ? PlaneacionDocente::find($request->query('planeacion_id')) : null;
        // Se evalúa para el docente dueño de la planeación (quien revisa ve lo mismo que él).
        $docente = $planeacion?->docente ?? $request->user();
        return ApiResponse::success($ia->evaluar($docente, $planeacion));
    }

    // GET /api/admin/ia/reglas
    public function index(Request $request): JsonResponse
    {
        $this->soloSuperadmin($request);

        $reglas = ReglaIa::with('actualizadaPor:id,name')->orderByRaw(
            "CASE ambito WHEN 'global' THEN 0 WHEN 'carrera' THEN 1 WHEN 'docente' THEN 2 ELSE 3 END"
        )->latest('updated_at')->get();

        // Nombre legible de lo que afecta cada regla.
        $carreras = Carrera::whereIn('id', $reglas->where('ambito', 'carrera')->pluck('referencia_id'))->pluck('nombre', 'id');
        $docentes = User::whereIn('id', $reglas->where('ambito', 'docente')->pluck('referencia_id'))->pluck('name', 'id');
        $grupos = Grupo::with(['carrera:id,clave', 'periodo:id,nombre'])->whereIn('id', $reglas->where('ambito', 'grupo')->pluck('referencia_id'))->get()->keyBy('id');

        return ApiResponse::success($reglas->map(fn (ReglaIa $r) => [
            'id'             => $r->id,
            'ambito'         => $r->ambito,
            'referencia_id'  => $r->referencia_id,
            'referencia'     => match ($r->ambito) {
                'global'  => 'Toda la institución',
                'carrera' => $carreras[$r->referencia_id] ?? '(carrera eliminada)',
                'docente' => $docentes[$r->referencia_id] ?? '(docente eliminado)',
                'grupo'   => ($g = $grupos->get($r->referencia_id))
                    ? trim(($g->clave ?? $g->nombre ?? 'Grupo') . ' · ' . ($g->carrera?->clave ?? '') . ' · ' . ($g->periodo?->nombre ?? ''), ' ·')
                    : '(grupo eliminado)',
            },
            'habilitada'     => $r->habilitada,
            'nota'           => $r->nota,
            'actualizada_por'=> $r->actualizadaPor?->name,
            'updated_at'     => $r->updated_at,
        ]));
    }

    // PUT /api/admin/ia/reglas  — crea o actualiza la regla de un ámbito
    public function guardar(Request $request): JsonResponse
    {
        $this->soloSuperadmin($request);

        $data = $request->validate([
            'ambito'        => ['required', Rule::in(ReglaIa::AMBITOS)],
            'referencia_id' => ['nullable', 'uuid', Rule::requiredIf(fn () => $request->input('ambito') !== 'global')],
            'habilitada'    => ['required', 'boolean'],
            'nota'          => ['nullable', 'string', 'max:255'],
        ]);
        $ref = $data['ambito'] === 'global' ? null : $data['referencia_id'];

        $existe = match ($data['ambito']) {
            'global'  => true,
            'carrera' => Carrera::whereKey($ref)->exists(),
            'docente' => User::whereKey($ref)->exists(),
            'grupo'   => Grupo::whereKey($ref)->exists(),
        };
        if (! $existe) return ApiResponse::error('No se encontró el elemento seleccionado.', 422);

        $regla = ReglaIa::updateOrCreate(
            ['ambito' => $data['ambito'], 'referencia_id' => $ref],
            ['habilitada' => $data['habilitada'], 'nota' => $data['nota'] ?? null, 'actualizada_por' => $request->user()->id],
        );

        return ApiResponse::success($regla, 'Regla guardada.');
    }

    // DELETE /api/admin/ia/reglas/{regla}  — quitar la regla (vuelve a heredar del ámbito superior)
    public function destroy(Request $request, ReglaIa $regla): JsonResponse
    {
        $this->soloSuperadmin($request);
        $regla->delete();
        return ApiResponse::success(null, 'Regla eliminada.');
    }

    private function soloSuperadmin(Request $request): void
    {
        abort_unless($request->user()->hasRole('superadmin'), 403, 'Solo el superadministrador puede administrar el asistente de IA.');
    }
}
