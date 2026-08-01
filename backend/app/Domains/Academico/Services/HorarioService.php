<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Actions\VerificarDisponibilidadAction;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HorarioService
{
    const LIMITE_SPAN_DIA_MIN    = 8 * 60;   // 8 h — intervalo entrada→salida por día
    const LIMITE_HORAS_SEMANA    = 40;        // 40 h — suma de horas frente a grupo

    public function __construct(private VerificarDisponibilidadAction $verificar) {}

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
     * Reglas (delegadas a VerificarDisponibilidadAction, salvo las dos últimas
     * que son específicas de esta ruta de guardado por lote):
     *  - Empalme de docente, aula o grupo (misma hora, mismo periodo).
     *  - Fuera de la disponibilidad declarada del docente / módulo sabatino.
     *  - Span diario > 8 h (entrada más temprana → salida más tardía del día).
     *  - Horas semanales frente a grupo > 40 h.
     */
    public function detectarConflictos(
        string $cargaAcademicaId,
        string $diaSemana,
        string $horaInicio,
        string $horaFin,
    ): array {
        $carga     = CargaAcademica::with(['docente', 'aula', 'grupos'])->findOrFail($cargaAcademicaId);
        $periodoId = $carga->periodo_id;

        // Empalmes de docente/aula/grupo, disponibilidad declarada y módulo
        // sabatino: delegado a VerificarDisponibilidadAction, la misma lógica
        // que usa BuilderHorarioController::asignar(), para que ambas rutas de
        // escritura (builder de un solo slot y guardado por lote) coincidan
        // exactamente en qué cuenta como conflicto.
        $resultado = $this->verificar->ejecutar(
            periodoId:      $periodoId,
            docenteId:      $carga->docente_id,
            diaSemana:      $diaSemana,
            horaInicio:     $horaInicio,
            horaFin:        $horaFin,
            aulaId:         $carga->aula_id,
            grupoIds:       $carga->grupos->pluck('id')->all(),
            ignorarCargaId: $cargaAcademicaId,
            materiaId:      $carga->materia_id,
        );

        $conflictos = $resultado['conflictos'];
        if (! $resultado['dentro_disponibilidad'] && $resultado['mensaje_disponibilidad']) {
            $conflictos[] = ['tipo' => 'disponibilidad', 'mensaje' => $resultado['mensaje_disponibilidad']];
        }

        // ── Span diario ≤ 8 h ────────────────────────────────────────────────
        $span = $this->spanDelDia(
            $carga->docente_id, $periodoId, $diaSemana, $cargaAcademicaId,
            $this->toMin($horaInicio), $this->toMin($horaFin)
        );

        if ($span['span'] > self::LIMITE_SPAN_DIA_MIN) {
            $salidaMax = $this->minToStr($span['inicio'] + self::LIMITE_SPAN_DIA_MIN);
            $conflictos[] = [
                'tipo'    => 'limite_diario',
                'mensaje' => sprintf(
                    'El %s, el docente entra a las %s — la jornada máxima es de 8h, por lo que no se puede asignar nada después de las %s (propuesto hasta las %s).',
                    $diaSemana,
                    $this->minToStr($span['inicio']),
                    $salidaMax,
                    $this->minToStr($span['fin'])
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
        // Empalmes dentro del mismo lote (validación sin DB)
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

        return DB::transaction(function () use ($carga, $bloques) {
            // Advisory locks (Postgres): serializa guardados concurrentes sobre el
            // mismo docente/aula, igual que BuilderHorarioController::asignar(),
            // para que la verificación de conflictos de abajo sea confiable.
            if (DB::getDriverName() === 'pgsql') {
                $llaves = array_filter([
                    crc32('docente:' . $carga->docente_id),
                    $carga->aula_id ? crc32('aula:' . $carga->aula_id) : null,
                ]);
                sort($llaves);
                foreach ($llaves as $llave) {
                    DB::statement('SELECT pg_advisory_xact_lock(?)', [$llave]);
                }
            }

            // Conflictos con horarios de otras cargas — detectarConflictos() ya
            // excluye los bloques de esta misma carga (ignorarCargaId), así que
            // no hace falta borrarlos antes de validar.
            foreach ($bloques as $bloque) {
                $conflictos = $this->detectarConflictos(
                    $carga->id, $bloque['dia_semana'], $bloque['hora_inicio'], $bloque['hora_fin']
                );
                if (!empty($conflictos)) {
                    throw new \DomainException(implode(' | ', array_column($conflictos, 'mensaje')));
                }
            }

            // Span diario del lote completo (lote + lo que ya hay en DB de otras cargas)
            $diasEnLote = array_unique(array_column($bloques, 'dia_semana'));

            foreach ($diasEnLote as $dia) {
                $iniciosLote = [];
                $finesLote   = [];
                foreach ($bloques as $b) {
                    if ($b['dia_semana'] !== $dia) continue;
                    $iniciosLote[] = $this->toMin($b['hora_inicio']);
                    $finesLote[]   = $this->toMin($b['hora_fin']);
                }

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

                $entradaMin = min($iniciosLote);
                $salidaMin  = max($finesLote);
                $span       = $salidaMin - $entradaMin;
                if ($span > self::LIMITE_SPAN_DIA_MIN) {
                    $salidaMax = $this->minToStr($entradaMin + self::LIMITE_SPAN_DIA_MIN);
                    throw new \DomainException(sprintf(
                        'El %s, el docente entra a las %s — no se puede asignar nada después de las %s (propuesto hasta las %s).',
                        $dia,
                        $this->minToStr($entradaMin),
                        $salidaMax,
                        $this->minToStr($salidaMin)
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

            Horario::where('carga_academica_id', $carga->id)->delete();

            try {
                return collect($bloques)->map(fn($b) => Horario::create([
                    'carga_academica_id' => $carga->id,
                    'dia_semana'         => $b['dia_semana'],
                    'hora_inicio'        => $b['hora_inicio'],
                    'hora_fin'           => $b['hora_fin'],
                ]));
            } catch (\Illuminate\Database\QueryException $e) {
                if (self::esViolacionDeExclusion($e)) {
                    throw new \DomainException('El horario se empalma con otro registro existente (docente o aula ya ocupados).');
                }
                throw $e;
            }
        });
    }

    /**
     * Red de seguridad: detecta si una QueryException viene de violar el
     * EXCLUDE constraint de Postgres (`horarios_sin_traslape_*`, SQLSTATE
     * 23P01) — el backstop de BD para la rara condición de carrera que la
     * validación de aplicación (arriba) no alcanzó a interceptar.
     */
    public static function esViolacionDeExclusion(\Illuminate\Database\QueryException $e): bool
    {
        return $e->getCode() === '23P01'
            || str_contains($e->getMessage(), 'horarios_sin_traslape');
    }
}
