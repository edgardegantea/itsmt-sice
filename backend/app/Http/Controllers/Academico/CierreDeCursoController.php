<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaBajaDefinitiva;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\Grupo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CierreDeCursoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'jefe_carrera'])) {
            return ApiResponse::error('No tienes permiso para cerrar cursos.', 403);
        }

        $data = $request->validate([
            'grupo_id'  => ['required', 'uuid', 'exists:grupos,id'],
            'periodo_id'=> ['required', 'uuid', 'exists:periodos,id'],
        ]);

        // Verificar que no ya esté cerrado
        $existente = CierreDeCurso::where('grupo_id', $data['grupo_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->exists();

        if ($existente) {
            return ApiResponse::error('Este curso ya fue cerrado anteriormente.', 422);
        }

        DB::transaction(function () use ($data, $request, &$cierre) {
            $cierre = CierreDeCurso::create([
                'grupo_id'    => $data['grupo_id'],
                'periodo_id'  => $data['periodo_id'],
                'cerrado_por' => $request->user()->id,
                'fecha_cierre'=> now(),
            ]);

            // S4-06: Clasificación automática tras cierre
            $this->clasificarYGenerarAlertas($data['grupo_id'], $data['periodo_id']);
        });

        return ApiResponse::success($cierre->load(['grupo', 'periodo', 'cerradoPor']), 'Curso cerrado exitosamente.', 201);
    }

    private function clasificarYGenerarAlertas(string $grupoId, string $periodoId): void
    {
        $grupo = Grupo::with(['cargas.materia'])->findOrFail($grupoId);
        $materiaId = $grupo->cargas()->value('materia_id');
        $materiaNombre = $grupo->cargas()->with('materia')->first()?->materia?->nombre ?? 'Materia';

        // Obtener calificaciones no acreditadas de este grupo
        $noAcreditadas = Calificacion::where('grupo_id', $grupoId)
            ->where('acreditado', false)
            ->whereNotNull('acreditado')
            ->get();

        foreach ($noAcreditadas as $cal) {
            // Determinar siguiente intento
            $intentoActual = $cal->intento_numero;

            // Si falla un especial (3er intento), genera alerta de baja definitiva
            if ($intentoActual >= 3 || $cal->tipo_curso === 'especial') {
                // Verificar no duplicar alerta
                $alertaExistente = AlertaBajaDefinitiva::where('alumno_id', $cal->alumno_id)
                    ->where('grupo_id', $grupoId)
                    ->exists();

                if (! $alertaExistente) {
                    AlertaBajaDefinitiva::create([
                        'alumno_id'      => $cal->alumno_id,
                        'grupo_id'       => $grupoId,
                        'periodo_id'     => $periodoId,
                        'materia_nombre' => $materiaNombre,
                        'intento_numero' => $intentoActual,
                    ]);
                }
            }
        }
    }
}
