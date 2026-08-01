<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\RecordatorioAsistenciaEnviado;
use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Mail\RecordatorioAsistenciaMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class EnviarRecordatoriosAsistenciaCommand extends Command
{
    protected $signature   = 'asistencia:enviar-recordatorios';
    protected $description = 'Envía un correo al docente ~10 minutos antes de que inicie cada una de sus clases, recordándole pasar lista';

    private const MINUTOS_ANTES = 10;

    private const DIA_POR_ISO = [
        1 => 'lunes', 2 => 'martes', 3 => 'miercoles',
        4 => 'jueves', 5 => 'viernes', 6 => 'sabado', 7 => null, // domingo: no hay clases
    ];

    public function handle(): int
    {
        $ahora = now();
        $diaSemana = self::DIA_POR_ISO[$ahora->dayOfWeekIso] ?? null;

        if (!$diaSemana) {
            return self::SUCCESS;
        }

        $objetivo = $ahora->copy()->addMinutes(self::MINUTOS_ANTES)->format('H:i');
        $globalActivo = ConfiguracionInstitucional::instancia()->recordatorios_asistencia_global_activo;

        $horarios = Horario::where('dia_semana', $diaSemana)
            ->get()
            ->filter(fn (Horario $h) => substr($h->hora_inicio, 0, 5) === $objetivo);

        $enviados = 0;

        foreach ($horarios as $horario) {
            $carga = $horario->cargaAcademica()
                ->with(['docente', 'materia', 'grupos', 'periodo'])
                ->first();

            if (!$carga || !$carga->docente?->email || $carga->periodo?->activo !== true) {
                continue;
            }

            $docenteActivo = $carga->docente->recordatorio_asistencia_activo;
            $efectivo = $docenteActivo ?? $globalActivo;

            if (!$efectivo) {
                continue;
            }

            // Idempotente: si ya se envió para este horario hoy, no se repite
            // (protege contra el comando corriendo más de una vez el mismo minuto).
            $registro = RecordatorioAsistenciaEnviado::firstOrCreate([
                'horario_id' => $horario->id,
                'fecha'      => $ahora->toDateString(),
            ]);

            if (!$registro->wasRecentlyCreated) {
                continue;
            }

            Mail::to($carga->docente->email)->send(new RecordatorioAsistenciaMail($carga, $horario));
            $enviados++;
        }

        $this->info("Recordatorios de asistencia enviados: {$enviados}");

        return self::SUCCESS;
    }
}
