<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Mail\ResumenSemanalAsistenciaMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Cada semana, le manda a cada docente activo un resumen de cuántas de sus
 * sesiones de clase esperadas (una por cada bloque semanal en su horario)
 * quedaron registradas en el sistema — para que se dé cuenta de huecos en su
 * pase de lista sin tener que entrar a revisarlo manualmente.
 */
class EnviarResumenSemanalAsistenciaCommand extends Command
{
    protected $signature = 'asistencia:enviar-resumen-semanal';

    protected $description = 'Envía a cada docente un resumen semanal de sus sesiones de clase registradas vs. esperadas.';

    public function handle(): int
    {
        $periodoActivo = Periodo::where('activo', true)->first();
        if (! $periodoActivo) {
            $this->info('No hay periodo activo; nada que resumir.');
            return self::SUCCESS;
        }

        $desde = now()->subDays(6)->startOfDay();
        $hasta = now()->endOfDay();

        $cargas = CargaAcademica::with(['docente', 'materia', 'grupos', 'horarios'])
            ->where('periodo_id', $periodoActivo->id)
            ->whereNotNull('docente_id')
            ->get()
            ->groupBy('docente_id');

        $enviados = 0;

        foreach ($cargas as $docenteId => $cargasDocente) {
            $docente = $cargasDocente->first()->docente;
            if (! $docente?->email) {
                continue;
            }

            $detalle = [];
            $totalEsperadas = 0;
            $totalRegistradas = 0;

            foreach ($cargasDocente as $carga) {
                $esperadas = $carga->horarios->count();
                if ($esperadas === 0) {
                    continue;
                }

                $registradas = SesionClase::where('carga_academica_id', $carga->id)
                    ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
                    ->count();

                $pct = $esperadas > 0 ? round(min(100, $registradas / $esperadas * 100)) : 0;

                $detalle[] = [
                    'materia'     => $carga->materia?->nombre ?? 'Materia',
                    'grupo'       => $carga->grupos->pluck('clave')->join(', '),
                    'esperadas'   => $esperadas,
                    'registradas' => $registradas,
                    'pct'         => $pct,
                ];

                $totalEsperadas += $esperadas;
                $totalRegistradas += $registradas;
            }

            if (empty($detalle)) {
                continue;
            }

            $pctGeneral = $totalEsperadas > 0 ? round(min(100, $totalRegistradas / $totalEsperadas * 100)) : 0;

            Mail::to($docente->email)->queue(new ResumenSemanalAsistenciaMail(
                docente: $docente,
                detalle: $detalle,
                totalEsperadas: $totalEsperadas,
                totalRegistradas: $totalRegistradas,
                pctGeneral: $pctGeneral,
            ));
            $enviados++;
        }

        $this->info("Resúmenes semanales de asistencia enviados: {$enviados}.");

        return self::SUCCESS;
    }
}
