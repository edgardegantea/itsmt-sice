<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HorarioService
{
    /**
     * Detecta conflictos antes de guardar un bloque de horario.
     *
     * Reglas TecNM:
     *  - Un docente no puede impartir dos materias al mismo tiempo.
     *  - Un aula no puede ser usada por dos grupos al mismo tiempo.
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
            ->whereHas('cargaAcademica', fn($q) => $q->where('periodo_id', $periodoId))
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

        // Verificar conflictos dentro del mismo lote (ej: dos bloques del mismo docente se solapan entre sí)
        foreach ($bloques as $i => $a) {
            foreach ($bloques as $j => $b) {
                if ($i >= $j) continue;
                if ($a['dia_semana'] !== $b['dia_semana']) continue;
                $solapan = $a['hora_inicio'] < $b['hora_fin'] && $a['hora_fin'] > $b['hora_inicio'];
                if ($solapan) {
                    throw new \DomainException(
                        "Conflicto interno: los bloques {$a['dia_semana']} {$a['hora_inicio']}–{$a['hora_fin']} y {$b['hora_inicio']}–{$b['hora_fin']} se solapan entre sí."
                    );
                }
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
