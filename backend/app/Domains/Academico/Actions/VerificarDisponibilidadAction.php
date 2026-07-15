<?php

namespace App\Domains\Academico\Actions;

use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Materia;
use Illuminate\Support\Facades\DB;

/**
 * Verifica si una carga académica propuesta es válida:
 *  - No se traslapa con otra carga del mismo docente o aula en el mismo periodo.
 *  - No se traslapa con otra carga del mismo grupo (misma materia, otro horario).
 *  - Cae dentro de un bloque de disponibilidad declarado por el docente.
 *  - No excede las horas semanales declaradas en la materia.
 *  - Los sábados, respeta el módulo sabatino (módulo 1 y 2 pueden coexistir
 *    en el mismo horario ya que corresponden a semanas distintas).
 */
class VerificarDisponibilidadAction
{
    /** @return array{conflictos: array, dentro_disponibilidad: bool, mensaje_disponibilidad: string|null} */
    public function ejecutar(
        string $periodoId,
        string $docenteId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
        ?string $aulaId = null,
        ?string $grupoId = null,
        ?string $ignorarCargaId = null,
        ?string $materiaId = null,
    ): array {
        $conflictos = [];

        $moduloSabatino = ($diaSemana === 'sabado' && $materiaId)
            ? Materia::find($materiaId)?->modulo_sabatino
            : null;

        // ── Conflicto docente ─────────────────────────────────────────────────
        if ($this->tieneConflicto($periodoId, $diaSemana, $horaInicio, $horaFin, 'docente_id', $docenteId, $ignorarCargaId, $moduloSabatino)) {
            $conflictos[] = ['tipo' => 'docente', 'mensaje' => 'El docente ya tiene una clase en ese horario.'];
        }

        // ── Conflicto aula ────────────────────────────────────────────────────
        if ($aulaId && $this->tieneConflicto($periodoId, $diaSemana, $horaInicio, $horaFin, 'aula_id', $aulaId, $ignorarCargaId, $moduloSabatino)) {
            $conflictos[] = ['tipo' => 'aula', 'mensaje' => 'El aula ya está ocupada en ese horario.'];
        }

        // ── Conflicto grupo ───────────────────────────────────────────────────
        if ($grupoId && $this->tieneConflictoGrupo($periodoId, $diaSemana, $horaInicio, $horaFin, $grupoId, $ignorarCargaId, $moduloSabatino)) {
            $conflictos[] = ['tipo' => 'grupo', 'mensaje' => 'El grupo ya tiene clase en ese horario.'];
        }

        // ── Horas semanales ───────────────────────────────────────────────────
        if ($materiaId && $grupoId) {
            $mensajeHoras = $this->excedeHorasSemana($materiaId, $grupoId, $periodoId, $horaInicio, $horaFin, $ignorarCargaId);
            if ($mensajeHoras) {
                $conflictos[] = ['tipo' => 'horas_semana', 'mensaje' => $mensajeHoras];
            }
        }

        // ── Disponibilidad declarada ──────────────────────────────────────────
        [$dentro, $mensajeDisp] = $this->cabeEnDisponibilidad($docenteId, $periodoId, $diaSemana, $horaInicio, $horaFin);

        return [
            'conflictos'               => $conflictos,
            'dentro_disponibilidad'    => $dentro,
            'mensaje_disponibilidad'   => $mensajeDisp,
        ];
    }

    /** Resumen de horas declaradas vs asignadas para una materia+grupo+periodo. */
    public function resumenHoras(string $materiaId, string $grupoId, string $periodoId, ?string $ignorarCargaId = null): ?array
    {
        $materia = Materia::find($materiaId);

        if (!$materia || !$materia->horas_teoria && !$materia->horas_practica) {
            return null;
        }

        $horasSemana = ($materia->horas_teoria ?? 0) + ($materia->horas_practica ?? 0);
        $minutosSemana = $horasSemana * 60;

        $minutosAsignados = $this->minutosAsignados($materiaId, $grupoId, $periodoId, $ignorarCargaId);
        $minutosRestantes = max(0, $minutosSemana - $minutosAsignados);

        return [
            'horas_semana' => $horasSemana,
            'asignadas'    => round($minutosAsignados / 60, 2),
            'restantes'    => round($minutosRestantes / 60, 2),
        ];
    }

    private function tieneConflicto(
        string $periodoId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
        string $columna,
        string $valor,
        ?string $ignorarCargaId,
        ?int $moduloSabatino,
    ): bool {
        return Horario::query()
            ->where('dia_semana', $diaSemana)
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin', '>', $horaInicio)
            ->whereHas('cargaAcademica', function ($q) use ($periodoId, $columna, $valor, $ignorarCargaId, $diaSemana, $moduloSabatino) {
                $q->where('periodo_id', $periodoId)
                  ->where($columna, $valor)
                  ->when($ignorarCargaId, fn($q2) => $q2->where('id', '!=', $ignorarCargaId))
                  ->when($moduloSabatino !== null && $diaSemana === 'sabado', function ($q2) use ($moduloSabatino) {
                      $q2->whereHas('materia', function ($q3) use ($moduloSabatino) {
                          $q3->where('modulo_sabatino', $moduloSabatino)
                             ->orWhereNull('modulo_sabatino');
                      });
                  });
            })
            ->exists();
    }

    private function tieneConflictoGrupo(
        string $periodoId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
        string $grupoId,
        ?string $ignorarCargaId,
        ?int $moduloSabatino,
    ): bool {
        return Horario::query()
            ->where('dia_semana', $diaSemana)
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin', '>', $horaInicio)
            ->whereHas('cargaAcademica', function ($q) use ($periodoId, $grupoId, $ignorarCargaId, $diaSemana, $moduloSabatino) {
                $q->where('periodo_id', $periodoId)
                  ->where('grupo_id', $grupoId)
                  ->when($ignorarCargaId, fn($q2) => $q2->where('id', '!=', $ignorarCargaId))
                  ->when($moduloSabatino !== null && $diaSemana === 'sabado', function ($q2) use ($moduloSabatino) {
                      $q2->whereHas('materia', function ($q3) use ($moduloSabatino) {
                          $q3->where('modulo_sabatino', $moduloSabatino)
                             ->orWhereNull('modulo_sabatino');
                      });
                  });
            })
            ->exists();
    }

    private function excedeHorasSemana(
        string $materiaId,
        string $grupoId,
        string $periodoId,
        string $horaInicio,
        string $horaFin,
        ?string $ignorarCargaId,
    ): ?string {
        $materia = Materia::find($materiaId);
        if (!$materia) {
            return null;
        }

        $horasSemana = ($materia->horas_teoria ?? 0) + ($materia->horas_practica ?? 0);
        if ($horasSemana <= 0) {
            return null;
        }

        $minutosAsignados = $this->minutosAsignados($materiaId, $grupoId, $periodoId, $ignorarCargaId);
        $minutosNuevos = $this->aMinutos($horaFin) - $this->aMinutos($horaInicio);
        $total = $minutosAsignados + $minutosNuevos;
        $limite = $horasSemana * 60;

        if ($total > $limite) {
            $totalHoras = number_format($total / 60, 1);
            return "\"{$materia->nombre}\" quedaría con {$totalHoras}h asignadas (límite: {$horasSemana}h/semana).";
        }

        return null;
    }

    private function minutosAsignados(string $materiaId, string $grupoId, string $periodoId, ?string $ignorarCargaId): int
    {
        $bloques = Horario::whereHas('cargaAcademica', function ($q) use ($materiaId, $grupoId, $periodoId, $ignorarCargaId) {
            $q->where('materia_id', $materiaId)
              ->where('grupo_id', $grupoId)
              ->where('periodo_id', $periodoId)
              ->when($ignorarCargaId, fn($q2) => $q2->where('id', '!=', $ignorarCargaId));
        })->get(['hora_inicio', 'hora_fin']);

        return $bloques->sum(fn($h) => $this->aMinutos($h->hora_fin) - $this->aMinutos($h->hora_inicio));
    }

    /** @return array{0: bool, 1: string|null} */
    private function cabeEnDisponibilidad(
        string $docenteId,
        string $periodoId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
    ): array {
        $bloques = DisponibilidadDocente::where('docente_id', $docenteId)
            ->where('periodo_id', $periodoId)
            ->where('dia_semana', $diaSemana)
            ->orderBy('hora_inicio')
            ->get(['hora_inicio', 'hora_fin']);

        if ($bloques->isEmpty()) {
            return [false, 'El docente no tiene disponibilidad registrada ese día.'];
        }

        $inicio = $this->aMinutos($horaInicio);
        $fin    = $this->aMinutos($horaFin);

        $cabe = $bloques->contains(function ($bloque) use ($inicio, $fin) {
            return $inicio >= $this->aMinutos($bloque->hora_inicio)
                && $fin <= $this->aMinutos($bloque->hora_fin);
        });

        if (!$cabe) {
            return [false, 'El horario está fuera de la disponibilidad declarada del docente.'];
        }

        // Límite laboral: 8h entre semana, 12h los sábados
        $limiteHoras = $diaSemana === 'sabado' ? 12 : 8;
        $limiteMaximo = $this->aMinutos($bloques->first()->hora_inicio) + $limiteHoras * 60;

        if ($fin > $limiteMaximo) {
            return [false, "El horario excede el límite de {$limiteHoras} horas laborales del día."];
        }

        return [true, null];
    }

    private function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($hora, 0, 5)));
        return $h * 60 + $m;
    }
}
