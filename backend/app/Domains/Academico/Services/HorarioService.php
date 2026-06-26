<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HorarioService
{
    const LIMITE_HORAS_DIA = 8;

    /** Convierte "HH:MM" a minutos desde medianoche. */
    private function toMin(string $hora): int
    {
        [$h, $m] = explode(':', $hora);
        return (int)$h * 60 + (int)$m;
    }

    /**
     * Detecta conflictos antes de guardar un bloque de horario.
     *
     * Reglas TecNM:
     *  - Un docente no puede impartir dos materias al mismo tiempo.
     *  - Un aula no puede ser usada por dos grupos al mismo tiempo.
     *  - Un docente no puede exceder 8 horas diarias (excepto sábado).
     *
     * @return array  Lista de conflictos; vacía si no hay ninguno.
     */
    public function detectarConflictos(
        string $cargaAcademicaId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
        ?string $excluirHorarioId = null
    ): array {
        $carga = CargaAcademica::with(['docente', 'aula', 'grupo.periodo'])->findOrFail($cargaAcademicaId);
        $periodoId = $carga->periodo_id;
        $conflictos = [];

        // Horarios del mismo periodo que se solapan con el bloque propuesto
        $solapados = Horario::query()
            ->where('dia_semana', $diaSemana)
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin', '>', $horaInicio)
            ->when($excluirHorarioId, fn($q) => $q->where('id', '!=', $excluirHorarioId))
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('periodo_id', $periodoId)
                  ->where('id', '!=', $cargaAcademicaId)
            )
            ->with(['cargaAcademica.docente', 'cargaAcademica.aula', 'cargaAcademica.materia', 'cargaAcademica.grupo'])
            ->get();

        foreach ($solapados as $otro) {
            $otraCarga = $otro->cargaAcademica;

            if ($otraCarga->docente_id === $carga->docente_id) {
                $conflictos[] = [
                    'tipo'    => 'docente',
                    'mensaje' => "El docente {$carga->docente->name} ya tiene clase el {$diaSemana} {$horaInicio}–{$horaFin} ({$otraCarga->materia->nombre} / {$otraCarga->grupo->clave}).",
                ];
            }

            if ($carga->aula_id && $otraCarga->aula_id === $carga->aula_id) {
                $conflictos[] = [
                    'tipo'    => 'aula',
                    'mensaje' => "El aula {$carga->aula->nombre} ya está ocupada el {$diaSemana} {$horaInicio}–{$horaFin} ({$otraCarga->materia->nombre} / {$otraCarga->grupo->clave}).",
                ];
            }
        }

        // Límite de 8 horas diarias (sábado no tiene límite)
        if ($diaSemana !== 'sabado') {
            $minutosBloque = $this->toMin($horaFin) - $this->toMin($horaInicio);

            $minutosExistentes = Horario::query()
                ->where('dia_semana', $diaSemana)
                ->whereHas('cargaAcademica', fn($q) =>
                    $q->where('docente_id', $carga->docente_id)
                      ->where('periodo_id', $periodoId)
                      ->where('id', '!=', $cargaAcademicaId)
                )
                ->get()
                ->sum(fn($h) => $this->toMin($h->hora_fin) - $this->toMin($h->hora_inicio));

            $totalMin = $minutosExistentes + $minutosBloque;

            if ($totalMin > self::LIMITE_HORAS_DIA * 60) {
                $existentesH = round($minutosExistentes / 60, 1);
                $bloqueH     = round($minutosBloque / 60, 1);
                $totalH      = round($totalMin / 60, 1);
                $conflictos[] = [
                    'tipo'    => 'limite_diario',
                    'mensaje' => "El {$diaSemana}, el docente ya acumula {$existentesH}h; agregar {$bloqueH}h llegaría a {$totalH}h (límite: " . self::LIMITE_HORAS_DIA . "h).",
                ];
            }
        }

        return $conflictos;
    }

    /**
     * Guarda los bloques de horario para una carga académica,
     * rechazando si hay conflictos.
     *
     * @param  array $bloques  [['dia_semana','hora_inicio','hora_fin'], ...]
     * @throws \DomainException si algún bloque genera conflicto
     */
    public function guardarHorarios(CargaAcademica $carga, array $bloques): Collection
    {
        // Verificar conflictos con horarios ya existentes en DB
        foreach ($bloques as $bloque) {
            $conflictos = $this->detectarConflictos(
                $carga->id,
                $bloque['dia_semana'],
                $bloque['hora_inicio'],
                $bloque['hora_fin'],
            );
            if (!empty($conflictos)) {
                throw new \DomainException(implode(' | ', array_column($conflictos, 'mensaje')));
            }
        }

        // Verificar conflictos dentro del mismo lote
        foreach ($bloques as $i => $a) {
            foreach ($bloques as $j => $b) {
                if ($i >= $j) continue;
                if ($a['dia_semana'] !== $b['dia_semana']) continue;
                if ($a['hora_inicio'] < $b['hora_fin'] && $a['hora_fin'] > $b['hora_inicio']) {
                    throw new \DomainException(
                        "Conflicto interno: los bloques {$a['dia_semana']} {$a['hora_inicio']}–{$a['hora_fin']} y {$b['hora_inicio']}–{$b['hora_fin']} se solapan entre sí."
                    );
                }
            }
        }

        // Verificar límite de 8h/día dentro del lote (sábado excluido)
        $minutosPorDia = [];
        foreach ($bloques as $bloque) {
            if ($bloque['dia_semana'] === 'sabado') continue;
            $dia = $bloque['dia_semana'];
            $min = $this->toMin($bloque['hora_fin']) - $this->toMin($bloque['hora_inicio']);
            $minutosPorDia[$dia] = ($minutosPorDia[$dia] ?? 0) + $min;
        }

        foreach ($minutosPorDia as $dia => $minLote) {
            // Horas de otras cargas del mismo docente ese día
            $minOtras = Horario::query()
                ->where('dia_semana', $dia)
                ->whereHas('cargaAcademica', fn($q) =>
                    $q->where('docente_id', $carga->docente_id)
                      ->where('periodo_id', $carga->periodo_id)
                      ->where('id', '!=', $carga->id)
                )
                ->get()
                ->sum(fn($h) => $this->toMin($h->hora_fin) - $this->toMin($h->hora_inicio));

            $totalMin = $minOtras + $minLote;
            if ($totalMin > self::LIMITE_HORAS_DIA * 60) {
                $totalH = round($totalMin / 60, 1);
                throw new \DomainException(
                    "El {$dia}, el docente acumularía {$totalH}h incluyendo otras materias (límite: " . self::LIMITE_HORAS_DIA . "h)."
                );
            }
        }

        return DB::transaction(function () use ($carga, $bloques) {
            Horario::where('carga_academica_id', $carga->id)->delete();

            return collect($bloques)->map(fn($b) => Horario::create([
                'carga_academica_id' => $carga->id,
                'dia_semana'         => $b['dia_semana'],
                'hora_inicio'        => $b['hora_inicio'],
                'hora_fin'           => $b['hora_fin'],
            ]));
        });
    }
}
