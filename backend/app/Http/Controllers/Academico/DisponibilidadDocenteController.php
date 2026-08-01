<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\DiaNoLaborable;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisponibilidadDocenteController extends Controller
{
    // GET /disponibilidad-docente?docente_id=&periodo_id=
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_id' => ['required', 'uuid', 'exists:users,id'],
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $user = $request->user();

        // Docente solo puede ver su propia disponibilidad
        if ($user->hasRole('docente') && !$user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera'])) {
            $data['docente_id'] = $user->id;
        }

        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $data['docente_id'] !== $user->id) {
            abort_unless(
                \App\Models\User::query()->whereKey($data['docente_id'])->deCarrera($carreraForzada)->exists(),
                403,
                'Sin acceso a la disponibilidad de docentes de otras carreras.'
            );
        }

        $bloques = DisponibilidadDocente::where('docente_id', $data['docente_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get(['id', 'dia_semana', 'hora_inicio', 'hora_fin']);

        $periodo = Periodo::find($data['periodo_id']);
        $diasNoLaborables = $periodo
            ? DiaNoLaborable::whereBetween('fecha', [$periodo->fecha_inicio ?? now(), $periodo->fecha_fin ?? now()])
                ->orderBy('fecha')
                ->get(['fecha', 'descripcion'])
            : collect();

        return ApiResponse::success([
            'bloques'           => $bloques,
            'dias_no_laborables'=> $diasNoLaborables,
        ]);
    }

    // PUT /disponibilidad-docente   — reemplaza todos los bloques del docente en el periodo
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_id' => ['required', 'uuid', 'exists:users,id'],
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'bloques'    => ['required', 'array'],
            'bloques.*.dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'bloques.*.hora_inicio' => ['required', 'date_format:H:i'],
            'bloques.*.hora_fin'    => ['required', 'date_format:H:i', 'after:bloques.*.hora_inicio'],
        ]);

        if ($error = $this->validarLimitesDeHoras($data['bloques'])) {
            return ApiResponse::error($error, 422);
        }

        $user = $request->user();

        // Docente solo puede editar su propia disponibilidad
        if ($user->hasRole('docente') && !$user->hasAnyRole(['superadmin', 'admin'])) {
            $data['docente_id'] = $user->id;
        }

        DisponibilidadDocente::where('docente_id', $data['docente_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->delete();

        $creados = collect($data['bloques'])->map(function ($bloque) use ($data) {
            return DisponibilidadDocente::create([
                'docente_id' => $data['docente_id'],
                'periodo_id' => $data['periodo_id'],
                'dia_semana' => $bloque['dia_semana'],
                'hora_inicio'=> $bloque['hora_inicio'],
                'hora_fin'   => $bloque['hora_fin'],
            ]);
        });

        return ApiResponse::success($creados, 'Disponibilidad actualizada.');
    }

    /**
     * Valida que la disponibilidad declarada no exceda 8h por día (12h los
     * sábados) ni 40h por semana en total. Devuelve un mensaje de error o
     * null si todo está dentro de los límites.
     */
    private function validarLimitesDeHoras(array $bloques): ?string
    {
        $minutos = fn(string $h): int => (int) explode(':', $h)[0] * 60 + (int) explode(':', $h)[1];

        $porDia = [];
        foreach ($bloques as $b) {
            $dia = $b['dia_semana'];
            $porDia[$dia] = ($porDia[$dia] ?? 0) + ($minutos($b['hora_fin']) - $minutos($b['hora_inicio']));
        }

        $totalSemana = 0;
        foreach ($porDia as $dia => $min) {
            $limite = $dia === 'sabado' ? 12 * 60 : 8 * 60;
            if ($min > $limite) {
                return sprintf('El %s no puede exceder %dh de disponibilidad (declaraste %.1fh).', $dia, $limite / 60, $min / 60);
            }
            $totalSemana += $min;
        }

        if ($totalSemana > 40 * 60) {
            return sprintf('La disponibilidad semanal no puede exceder 40h (declaraste %.1fh).', $totalSemana / 60);
        }

        return null;
    }
}
