<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Detecta horarios de docentes que superan el span de 8h/día y los corrige
 * eliminando los bloques que quedan fuera de la ventana permitida.
 *
 * Uso:
 *   php artisan horarios:reestructurar           — modo dry-run (solo reporte)
 *   php artisan horarios:reestructurar --fix     — aplica los cambios
 */
class ReestructurarHorarios extends Command
{
    protected $signature   = 'horarios:reestructurar {--fix : Aplica los cambios (sin este flag solo reporta)}';
    protected $description = 'Detecta y corrige horarios de docentes que superan 8h de span por día';

    private const LIMITE_MIN = 8 * 60;

    public function handle(): int
    {
        $fix = $this->option('fix');
        $this->info($fix ? '🔧  Modo corrección activado.' : '🔍  Modo dry-run (sin --fix no se modifica nada).');
        $this->newLine();

        // Obtener todos los horarios agrupados por docente + periodo + dia
        $grupos = Horario::query()
            ->join('carga_academicas as ca', 'horarios.carga_academica_id', '=', 'ca.id')
            ->join('users as u', 'ca.docente_id', '=', 'u.id')
            ->select(
                'horarios.id',
                'horarios.carga_academica_id',
                'horarios.dia_semana',
                'horarios.hora_inicio',
                'horarios.hora_fin',
                'ca.docente_id',
                'ca.periodo_id',
                DB::raw("CONCAT(u.name) as docente_nombre")
            )
            ->orderBy('ca.docente_id')
            ->orderBy('ca.periodo_id')
            ->orderBy('horarios.dia_semana')
            ->orderBy('horarios.hora_inicio')
            ->get()
            ->groupBy(fn($h) => "{$h->docente_id}|{$h->periodo_id}|{$h->dia_semana}");

        $totalViolaciones = 0;
        $totalEliminados  = 0;

        foreach ($grupos as $clave => $bloques) {
            [$docenteId, $periodoId, $dia] = explode('|', $clave);

            // Ordenar por hora_inicio
            $ordenados = $bloques->sortBy('hora_inicio')->values();
            $entradaMin = $this->toMin($ordenados->first()->hora_inicio);
            $limiteFinMin = $entradaMin + self::LIMITE_MIN;

            // Detectar bloques que exceden el límite
            $fuera = $ordenados->filter(
                fn($b) => $this->toMin($b->hora_fin) > $limiteFinMin
            );

            if ($fuera->isEmpty()) {
                continue;
            }

            $totalViolaciones++;
            $docente    = $ordenados->first()->docente_nombre;
            $entradaStr = $this->minToStr($entradaMin);
            $salidaMaxStr = $this->minToStr($limiteFinMin);

            $this->line("<fg=yellow>⚠  {$docente} — {$dia}</>");
            $this->line("   Entrada: <fg=cyan>{$entradaStr}</> → máximo permitido hasta <fg=cyan>{$salidaMaxStr}</>");

            foreach ($fuera as $b) {
                $totalEliminados++;
                $this->line("   <fg=red>✗ Eliminar:</> {$b->hora_inicio}–{$b->hora_fin} (carga {$b->carga_academica_id})");

                if ($fix) {
                    Horario::where('id', $b->id)->delete();
                }
            }

            $this->newLine();
        }

        if ($totalViolaciones === 0) {
            $this->info('✅  Todos los horarios cumplen con el límite de 8h/día. No se requieren cambios.');
            return 0;
        }

        $this->newLine();
        if ($fix) {
            $this->info("✅  Corrección aplicada: {$totalViolaciones} día(s) con violaciones — {$totalEliminados} bloque(s) eliminado(s).");
        } else {
            $this->warn("Se encontraron {$totalViolaciones} día(s) con violaciones ({$totalEliminados} bloque(s) a eliminar).");
            $this->line('Ejecuta con <fg=cyan>--fix</> para aplicar los cambios:');
            $this->line('  php artisan horarios:reestructurar --fix');
        }

        return $totalViolaciones > 0 && !$fix ? 1 : 0;
    }

    private function toMin(string $hora): int
    {
        [$h, $m] = explode(':', $hora);
        return (int)$h * 60 + (int)$m;
    }

    private function minToStr(int $min): string
    {
        return sprintf('%02d:%02d', intdiv($min, 60), $min % 60);
    }
}
