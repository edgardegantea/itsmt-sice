<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\PlaneacionDocente;
use App\Mail\RecordatorioEvaluacionUnidadMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Recorre las instrumentaciones didácticas liberadas y, para cada unidad, calcula su
 * "semana de evaluación" tal como lo hace el frontend (última semana dosificada + 1
 * semana de holgura — ver calendarizacionEvaluaciones() en planeacionCatalogo.ts, misma
 * fórmula replicada aquí). Cuando la semana actual del periodo coincide exactamente con
 * esa semana de holgura, se avisa al docente por correo que ya puede/debe cargar las
 * calificaciones de esa unidad — un solo recordatorio por unidad (deduplicado con caché),
 * no uno diario, para no saturar al docente.
 */
class EnviarRecordatorioEvaluacionCommand extends Command
{
    protected $signature = 'planeaciones:enviar-recordatorio-evaluacion';

    protected $description = 'Avisa por correo al docente cuando inicia la semana de holgura para evaluar y cargar calificaciones de una unidad.';

    private const TOTAL_SEMANAS = 16;

    public function handle(): int
    {
        $enviados = 0;

        PlaneacionDocente::with(['docente', 'periodo', 'cargaAcademica.materia'])
            ->where('estatus', 'liberada')
            ->whereHas('periodo', fn ($q) => $q->whereNotNull('fecha_inicio'))
            ->chunk(100, function ($planeaciones) use (&$enviados) {
                foreach ($planeaciones as $planeacion) {
                    $enviados += $this->procesarPlaneacion($planeacion);
                }
            });

        $this->info("Recordatorios de evaluación enviados: {$enviados}.");

        return self::SUCCESS;
    }

    private function procesarPlaneacion(PlaneacionDocente $planeacion): int
    {
        $semanaActual = $this->semanaActualDePeriodo($planeacion->periodo?->fecha_inicio);
        if ($semanaActual === null || ! $planeacion->docente?->email) {
            return 0;
        }

        $competencias = $planeacion->competencias ?? [];
        $enviados = 0;

        foreach ($competencias as $competencia) {
            $semanaEvaluacion = $this->semanaEvaluacionDeUnidad($competencia);
            if ($semanaEvaluacion !== $semanaActual) {
                continue;
            }

            $claveDedup = "recordatorio-evaluacion:{$planeacion->id}:{$competencia['numero']}";
            if (Cache::has($claveDedup)) {
                continue;
            }

            Mail::to($planeacion->docente->email)->queue(new RecordatorioEvaluacionUnidadMail(
                $planeacion,
                $competencia['numero'],
                $competencia['nombre_unidad'] ?? '',
                $semanaEvaluacion
            ));
            Cache::put($claveDedup, true, now()->addDays(30));
            $enviados++;
        }

        return $enviados;
    }

    /** Misma fórmula que semanaActualDePeriodo() en el frontend (planeacionCatalogo.ts). */
    private function semanaActualDePeriodo(?string $fechaInicioPeriodo): ?int
    {
        if (! $fechaInicioPeriodo) {
            return null;
        }
        $inicio = \Carbon\Carbon::parse($fechaInicioPeriodo)->startOfDay();
        $dias = $inicio->diffInDays(now()->startOfDay(), false);
        if ($dias < 0) {
            return null;
        }
        return min(self::TOTAL_SEMANAS, intdiv((int) $dias, 7) + 1);
    }

    /** Misma fórmula que calendarizacionEvaluaciones() en el frontend: última semana
     * dosificada de la unidad + 1 semana de holgura, tope en TOTAL_SEMANAS. */
    private function semanaEvaluacionDeUnidad(array $competencia): ?int
    {
        $finesSemana = array_filter(array_map(
            fn ($d) => $d['semana_fin'] ?? null,
            $competencia['dosificacion'] ?? []
        ), fn ($s) => $s !== null);

        if (empty($finesSemana)) {
            return null;
        }

        return min(self::TOTAL_SEMANAS, max($finesSemana) + 1);
    }
}
