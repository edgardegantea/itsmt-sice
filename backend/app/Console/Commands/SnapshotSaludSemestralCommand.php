<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SaludSemestralCarrera;
use App\Http\Controllers\Academico\SaludSemestralController;
use Illuminate\Console\Command;

/**
 * Guarda, una vez por semana, el índice de salud de cada carrera del periodo activo
 * — sin este snapshot no habría forma de mostrar tendencia (¿mejora o empeora?),
 * solo el valor del momento.
 */
class SnapshotSaludSemestralCommand extends Command
{
    protected $signature = 'academico:snapshot-salud-semestral';

    protected $description = 'Guarda el snapshot semanal del índice de salud por carrera del periodo activo.';

    public function handle(): int
    {
        $periodo = Periodo::where('activo', true)->first();
        if (! $periodo) {
            $this->info('No hay periodo activo.');
            return self::SUCCESS;
        }

        $semana = now()->startOfWeek()->toDateString();
        $filas = SaludSemestralController::calcular($periodo->id);
        $guardadas = 0;

        foreach ($filas as $fila) {
            if ($fila['score'] === null) continue;

            SaludSemestralCarrera::updateOrCreate(
                ['periodo_id' => $periodo->id, 'carrera_id' => $fila['carrera_id'], 'semana' => $semana],
                [
                    'score' => $fila['score'],
                    'pct_riesgo_academico' => $fila['pct_aprobacion'],
                    'pct_ocupacion_aulas' => null,
                    'pct_cumplimiento_docente' => $fila['pct_cumplimiento_docente'],
                    'pct_incidencias_sin_novedad' => $fila['pct_sin_novedad'],
                ]
            );
            $guardadas++;
        }

        $this->info("Snapshots guardados: {$guardadas}.");
        return self::SUCCESS;
    }
}
