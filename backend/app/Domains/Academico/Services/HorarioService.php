<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HorarioService
{
    const LIMITE_SPAN_DIA_MIN    = 8 * 60;   // 8 h — intervalo entrada→salida por día
    const LIMITE_HORAS_SEMANA    = 40;        // 40 h — suma de horas frente a grupo

    private function toMin(string $hora): int
    {
        [$h, $m] = explode(':', $hora);
        return (int)$h * 60 + (int)$m;
    }

    private function minToStr(int $min): string
    {
        return sprintf('%02d:%02d', intdiv($min, 60), $min % 60);
    }

    /**
     * Para un docente y un día dado, calcula el span (entrada más temprana → salida más tardía)
     * combinando los horarios ya en DB (excluyendo una carga) con un bloque nuevo propuesto.
     *
     * Devuelve ['inicio' => int, 'fin' => int, 'span' => int] en minutos.
     */
    private function spanDelDia(
        string $docenteId,
        string $periodoId,
        string $dia,
        string $excluirCargaId,
        int $nuevoInicioMin,
        int $nuevoFinMin
    ): array {
        $existentes = Horario::query()
            ->where('dia_semana', $dia)
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('docente_id', $docenteId)
                  ->where('periodo_id', $periodoId)
                  ->where('id', '!=', $excluirCargaId)
            )
            ->get();

        $inicios = $existentes->map(fn($h) => $this->toMin($h->hora_inicio))->push($nuevoInicioMin);
        $fines   = $existentes->map(fn($h) => $this->toMin($h->hora_fin))->push($nuevoFinMin);

        $inicio = $inicios->min();
        $fin    = $fines->max();

        return ['inicio' => $inicio, 'fin' => $fin, 'span' => $fin - $inicio];
    }

    /**
     * Minutos totales de horas frente a grupo del docente en la semana
     * (excluyendo la carga indicada).
     */
    private function minutosSemanaEnDB(string $docenteId, string $periodoId, string $excluirCargaId): int
    {
        return Horario::query()
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('docente_id', $docenteId)
                  ->where('periodo_id', $periodoId)
                  ->where('id', '!=', $excluirCargaId)
            )
            ->get()
            ->sum(fn($h) => $this->toMin($h->hora_fin) - $this->toMin($h->hora_inicio));
    }

    /**
     * Detecta conflictos antes de guardar un bloque de horario.
     *
     * Reglas:
     *  - Empalme de docente (misma hora, mismo periodo).
     *  - Empalme de aula.
     *  - Span diario > 8 h (entrada más temprana → salida más tardía del día).
     *  - Horas semanales frente a grupo > 40 h.
     */
    public function detectarConflictos(
        string $cargaAcademicaId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
        ?string $excluirHorarioId = null
    ): array {
        $carga     = CargaAcademica::with(['docente', 'aula'])->findOrFail($cargaAcademicaId);
        $periodoId = $carga->periodo_id;
        $conflictos = [];

        // ── Empalmes ─────────────────────────────────────────────────────────
        $solapados = Horario::query()
            ->where('dia_semana', $diaSemana)
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin',    '>', $horaInicio)
            ->when($excluirHorarioId, fn($q) => $q->where('id', '!=', $excluirHorarioId))
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('periodo_id', $periodoId)
                  ->where('id', '!=', $cargaAcademicaId)
            )
            ->with(['cargaAcademica.docente', 'cargaAcademica.aula', 'cargaAcademica.materia', 'cargaAcademica.grupo'])
            ->get();

        foreach ($solapados as $otro) {
            $oc = $otro->cargaAcademica;
            if ($oc->docente_id === $carga->docente_id) {
                $conflictos[] = [
                    'tipo'    => 'docente',
                    'mensaje' => "El docente ya tiene clase el {$diaSemana} {$horaInicio}–{$horaFin} ({$oc->materia->nombre} / {$oc->grupo->clave}).",
                ];
            }
            if ($carga->aula_id && $oc->aula_id === $carga->aula_id) {
                $conflictos[] = [
                    'tipo'    => 'aula',
                    'mensaje' => "El aula {$carga->aula->nombre} ya está ocupada el {$diaSemana} {$horaInicio}–{$horaFin} ({$oc->materia->nombre} / {$oc->grupo->clave}).",
                ];
            }
        }

        // ── Span diario ≤ 8 h ────────────────────────────────────────────────
        $span = $this->spanDelDia(
            $carga->docente_id, $periodoId, $diaSemana, $cargaAcademicaId,
            $this->toMin($horaInicio), $this->toMin($horaFin)
        );

        if ($span['span'] > self::LIMITE_SPAN_DIA_MIN) {
            $conflictos[] = [
                'tipo'    => 'limite_diario',
                'mensaje' => sprintf(
                    'El %s, el docente estaría de %s a %s (%.1fh); excede el límite de 8h diarias.',
                    $diaSemana,
                    $this->minToStr($span['inicio']),
                    $this->minToStr($span['fin']),
                    $span['span'] / 60
                ),
            ];
        }

        // ── Horas semanales frente a grupo ≤ 40 h ────────────────────────────
        $minBloque      = $this->toMin($horaFin) - $this->toMin($horaInicio);
        $minSemanaDB    = $this->minutosSemanaEnDB($carga->docente_id, $periodoId, $cargaAcademicaId);
        $totalSemanaMin = $minSemanaDB + $minBloque;

        if ($totalSemanaMin > self::LIMITE_HORAS_SEMANA * 60) {
            $conflictos[] = [
                'tipo'    => 'limite_semanal',
                'mensaje' => sprintf(
                    'El docente ya acumula %.1fh/sem frente a grupo; agregar %.1fh llegaría a %.1fh (límite: %dh/sem).',
                    $minSemanaDB / 60, $minBloque / 60, $totalSemanaMin / 60, self::LIMITE_HORAS_SEMANA
                ),
            ];
        }

        return $conflictos;
    }

    /**
     * Guarda los bloques de horario para una carga académica,
     * rechazando si hay conflictos.
     *
     * @throws \DomainException si algún bloque genera conflicto
     */
    public function guardarHorarios(CargaAcademica $carga, array $bloques): Collection
    {
        // Conflictos con horarios ya existentes en DB
        foreach ($bloques as $bloque) {
            $conflictos = $this->detectarConflictos(
                $carga->id, $bloque['dia_semana'], $bloque['hora_inicio'], $bloque['hora_fin']
            );
            if (!empty($conflictos)) {
                throw new \DomainException(implode(' | ', array_column($conflictos, 'mensaje')));
            }
        }

        // Empalmes dentro del mismo lote
        foreach ($bloques as $i => $a) {
            foreach ($bloques as $j => $b) {
                if ($i >= $j) continue;
                if ($a['dia_semana'] !== $b['dia_semana']) continue;
                if ($a['hora_inicio'] < $b['hora_fin'] && $a['hora_fin'] > $b['hora_inicio']) {
                    throw new \DomainException(
                        "Conflicto interno: {$a['dia_semana']} {$a['hora_inicio']}–{$a['hora_fin']} y {$b['hora_inicio']}–{$b['hora_fin']} se solapan."
                    );
                }
            }
        }

        // Span diario del lote completo (lote + lo que ya hay en DB de otras cargas)
        $diasEnLote = array_unique(array_column($bloques, 'dia_semana'));

        foreach ($diasEnLote as $dia) {
            // Recopilar inicios y fines de los bloques de este día
            $iniciosLote = [];
            $finesLote   = [];
            foreach ($bloques as $b) {
                if ($b['dia_semana'] !== $dia) continue;
                $iniciosLote[] = $this->toMin($b['hora_inicio']);
                $finesLote[]   = $this->toMin($b['hora_fin']);
            }

            // Horarios de otras cargas del mismo docente ese día
            $existentes = Horario::query()
                ->where('dia_semana', $dia)
                ->whereHas('cargaAcademica', fn($q) =>
                    $q->where('docente_id', $carga->docente_id)
                      ->where('periodo_id', $carga->periodo_id)
                      ->where('id', '!=', $carga->id)
                )
                ->get();

            foreach ($existentes as $h) {
                $iniciosLote[] = $this->toMin($h->hora_inicio);
                $finesLote[]   = $this->toMin($h->hora_fin);
            }

            $span = max($finesLote) - min($iniciosLote);
            if ($span > self::LIMITE_SPAN_DIA_MIN) {
                throw new \DomainException(sprintf(
                    'El %s, el docente estaría de %s a %s (%.1fh); excede el límite de 8h/día.',
                    $dia,
                    $this->minToStr(min($iniciosLote)),
                    $this->minToStr(max($finesLote)),
                    $span / 60
                ));
            }
        }

        // Horas semanales frente a grupo
        $minLoteSemana  = array_sum(array_map(
            fn($b) => $this->toMin($b['hora_fin']) - $this->toMin($b['hora_inicio']), $bloques
        ));
        $minOtrasSemana = $this->minutosSemanaEnDB($carga->docente_id, $carga->periodo_id, $carga->id);
        $totalSemana    = $minOtrasSemana + $minLoteSemana;

        if ($totalSemana > self::LIMITE_HORAS_SEMANA * 60) {
            throw new \DomainException(sprintf(
                'El docente acumularía %.1fh/sem frente a grupo (límite: %dh/sem).',
                $totalSemana / 60, self::LIMITE_HORAS_SEMANA
            ));
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
