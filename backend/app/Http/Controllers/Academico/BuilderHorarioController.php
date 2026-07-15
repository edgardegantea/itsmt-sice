<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Actions\VerificarDisponibilidadAction;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\Horario;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderHorarioController extends Controller
{
    private const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    private const HORA_INICIO = 7;
    private const HORA_FIN    = 21;

    /**
     * GET /horarios/builder-grid
     *
     * Devuelve el estado de cada franja horaria (disponible/fuera_disponibilidad/
     * reservado_actual/reservado_otro) para un docente en un periodo, con la
     * opción de superponer la ocupación de un grupo específico.
     */
    public function gridData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'docente_id' => ['required', 'uuid', 'exists:users,id'],
            'grupo_id'   => ['nullable', 'uuid', 'exists:grupos,id'],
        ]);

        $carreraForzada = $request->user()?->carreraRestringida();

        $disponibilidad = DisponibilidadDocente::where('docente_id', $data['docente_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->get(['dia_semana', 'hora_inicio', 'hora_fin']);

        // Cargas del docente en el periodo (cualquier carrera) con sus horarios
        $cargasDocente = CargaAcademica::with(['materia:id,nombre,modulo_sabatino', 'grupo:id,clave', 'aula:id,nombre', 'horarios'])
            ->where('periodo_id', $data['periodo_id'])
            ->where('docente_id', $data['docente_id'])
            ->get();

        // Cargas del grupo seleccionado con cualquier docente
        $cargasGrupo = $data['grupo_id']
            ? CargaAcademica::with(['materia:id,nombre', 'docente:id,name', 'horarios'])
                ->where('periodo_id', $data['periodo_id'])
                ->where('grupo_id', $data['grupo_id'])
                ->get()
            : collect();

        $slots = $this->generarSlots();
        $dias  = [];

        foreach (self::DIAS as $dia) {
            $bloquesDia     = $disponibilidad->where('dia_semana', $dia);
            $cargasDia      = $cargasDocente->filter(fn($c) => $c->horarios->where('dia_semana', $dia)->isNotEmpty());
            $cargasGrupoDia = $cargasGrupo->filter(fn($c) => $c->horarios->where('dia_semana', $dia)->isNotEmpty());

            $dias[] = [
                'dia_semana'    => $dia,
                'disponibilidad'=> $bloquesDia->map(fn($b) => [
                    'hora_inicio' => substr($b->hora_inicio, 0, 5),
                    'hora_fin'    => substr($b->hora_fin, 0, 5),
                ])->values(),
                'horas'         => $this->construirHoras($slots, $cargasDia, $cargasGrupoDia, $bloquesDia, $dia, $data['grupo_id'] ?? null, 1),
                'horas_modulo2' => $dia === 'sabado'
                    ? $this->construirHoras($slots, $cargasDia, $cargasGrupoDia, $bloquesDia, $dia, $data['grupo_id'] ?? null, 2)
                    : null,
            ];
        }

        return ApiResponse::success(['dias' => $dias]);
    }

    /**
     * POST /horarios/verificar-disponibilidad
     */
    public function verificar(Request $request, VerificarDisponibilidadAction $accion): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'       => ['required', 'uuid', 'exists:periodos,id'],
            'docente_id'       => ['required', 'uuid', 'exists:users,id'],
            'dia_semana'       => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio'      => ['required', 'date_format:H:i'],
            'hora_fin'         => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'aula_id'          => ['nullable', 'uuid', 'exists:aulas,id'],
            'grupo_id'         => ['nullable', 'uuid', 'exists:grupos,id'],
            'materia_id'       => ['nullable', 'uuid', 'exists:materias,id'],
            'ignorar_carga_id' => ['nullable', 'uuid', 'exists:cargas_academicas,id'],
        ]);

        $resultado = $accion->ejecutar(
            periodoId:       $data['periodo_id'],
            docenteId:       $data['docente_id'],
            diaSemana:       $data['dia_semana'],
            horaInicio:      $data['hora_inicio'],
            horaFin:         $data['hora_fin'],
            aulaId:          $data['aula_id'] ?? null,
            grupoId:         $data['grupo_id'] ?? null,
            ignorarCargaId:  $data['ignorar_carga_id'] ?? null,
            materiaId:       $data['materia_id'] ?? null,
        );

        $resumenHoras = ($data['materia_id'] ?? null) && ($data['grupo_id'] ?? null)
            ? $accion->resumenHoras($data['materia_id'], $data['grupo_id'], $data['periodo_id'], $data['ignorar_carga_id'] ?? null)
            : null;

        return ApiResponse::success([
            'resultado'    => $resultado,
            'horas'        => $resumenHoras,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function generarSlots(): array
    {
        $slots = [];
        for ($h = self::HORA_INICIO; $h < self::HORA_FIN; $h++) {
            $slots[] = sprintf('%02d:00', $h);
        }
        return $slots;
    }

    private function construirHoras(
        array $slots,
        $cargasDia,
        $cargasGrupoDia,
        $bloquesDia,
        string $dia,
        ?string $grupoId,
        int $modulo,
    ): array {
        $horas = [];

        foreach ($slots as $hora) {
            $inicioMin = $this->aMinutos($hora);
            $finMin    = $inicioMin + 60;

            // Filtrar por módulo sabatino si es sábado
            $cargasFiltradas = $dia === 'sabado'
                ? $cargasDia->filter(fn($c) => (int)($c->materia?->modulo_sabatino ?? 1) === $modulo
                    || (int)($c->materia?->modulo_sabatino ?? 0) === 0)
                : $cargasDia;

            $carga = $cargasFiltradas->first(function ($c) use ($inicioMin, $finMin, $dia) {
                return $c->horarios->where('dia_semana', $dia)->contains(function ($h) use ($inicioMin, $finMin) {
                    return $this->aMinutos($h->hora_inicio) < $finMin
                        && $this->aMinutos($h->hora_fin) > $inicioMin;
                });
            });

            if ($carga) {
                $horas[] = [
                    'hora'        => $hora,
                    'estado'      => 'reservado',
                    'carga_id'    => $carga->id,
                    'materia'     => $carga->materia?->nombre,
                    'materia_id'  => $carga->materia_id,
                    'grupo'       => $carga->grupo?->clave,
                    'grupo_id'    => $carga->grupo_id,
                    'aula'        => $carga->aula?->nombre,
                    'aula_id'     => $carga->aula_id,
                    'carga_estado'=> $carga->estado,
                    'hora_inicio' => $carga->horarios->where('dia_semana', $dia)->first()?->hora_inicio,
                    'hora_fin'    => $carga->horarios->where('dia_semana', $dia)->first()?->hora_fin,
                ];
                continue;
            }

            // El grupo tiene clase con otro docente
            $cargaGrupo = $grupoId ? $cargasGrupoDia->first(function ($c) use ($inicioMin, $finMin, $dia) {
                return $c->horarios->where('dia_semana', $dia)->contains(function ($h) use ($inicioMin, $finMin) {
                    return $this->aMinutos($h->hora_inicio) < $finMin
                        && $this->aMinutos($h->hora_fin) > $inicioMin;
                });
            }) : null;

            if ($cargaGrupo) {
                $horas[] = [
                    'hora'     => $hora,
                    'estado'   => 'grupo_ocupado',
                    'materia'  => $cargaGrupo->materia?->nombre,
                    'docente'  => $cargaGrupo->docente?->name,
                ];
                continue;
            }

            // Verificar si cae dentro de disponibilidad
            $dentro = $bloquesDia->contains(function ($b) use ($inicioMin, $finMin) {
                return $inicioMin >= $this->aMinutos($b->hora_inicio)
                    && $finMin <= $this->aMinutos($b->hora_fin);
            });

            $horas[] = ['hora' => $hora, 'estado' => $dentro ? 'disponible' : 'fuera_disponibilidad'];
        }

        return $horas;
    }

    private function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($hora, 0, 5)));
        return $h * 60 + $m;
    }
}
