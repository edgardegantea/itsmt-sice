<?php

namespace App\Console\Commands;

use App\Domains\Academico\Actions\EvaluarCumplimientoCorteAction;
use App\Domains\Academico\Models\AlertaCorteCaptura;
use App\Domains\Academico\Models\CorteCaptura;
use App\Mail\RecordatorioCapturaCalificacionesMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Recorre los cortes de captura cuya ventana (fecha_corte..fecha_limite_captura)
 * incluye hoy, recalcula el cumplimiento y avisa por correo a los docentes con
 * captura pendiente que todavía no han sido notificados de ESA alerta — un solo
 * recordatorio por alerta, no uno diario, para no saturar al docente.
 */
class EnviarRecordatoriosCapturaCommand extends Command
{
    protected $signature = 'calificaciones:enviar-recordatorios-captura';

    protected $description = 'Envía un recordatorio por correo a los docentes con captura de calificaciones pendiente en un corte vigente.';

    public function handle(EvaluarCumplimientoCorteAction $evaluarCumplimientoCorteAction): int
    {
        $hoy = now()->toDateString();

        $cortes = CorteCaptura::whereDate('fecha_corte', '<=', $hoy)
            ->whereDate('fecha_limite_captura', '>=', $hoy)
            ->get();

        $enviados = 0;

        foreach ($cortes as $corte) {
            $evaluarCumplimientoCorteAction->ejecutar($corte);

            $alertas = AlertaCorteCaptura::where('corte_captura_id', $corte->id)
                ->where('pendiente', true)
                ->whereNull('notificado_en')
                ->whereNotNull('docente_id')
                ->with(['docente', 'cargaAcademica.materia', 'corteCaptura'])
                ->get();

            foreach ($alertas as $alerta) {
                if ($alerta->docente?->email) {
                    Mail::to($alerta->docente->email)->queue(new RecordatorioCapturaCalificacionesMail($alerta));
                    $enviados++;
                }
                $alerta->notificado_en = now();
                $alerta->save();
            }
        }

        $this->info("Recordatorios de captura enviados: {$enviados}.");

        return self::SUCCESS;
    }
}
