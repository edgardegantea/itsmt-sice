<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Mail\BajaSolicitadaMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class BajaService
{
    /**
     * Valida que la fecha_solicitud no supere el límite TecNM-AC-PO-002.
     * Lanza \DomainException si el plazo ya venció.
     */
    public function validarPlazo(Periodo $periodo, string $tipoBaja, Carbon $fechaSolicitud): void
    {
        $limite = match ($tipoBaja) {
            'parcial'   => $periodo->fecha_limite_baja_parcial,
            'temporal'  => $periodo->fecha_limite_baja_temporal,
            default     => null, // definitiva: sin restricción de plazo
        };

        if ($limite === null) {
            return; // No configurado — no bloquear
        }

        if ($fechaSolicitud->gt($limite)) {
            $tipo  = $tipoBaja === 'parcial' ? 'parcial' : 'temporal';
            $label = $limite->translatedFormat('d \d\e F \d\e Y');
            throw new \DomainException(
                "El plazo para solicitar baja {$tipo} venció el {$label} (TecNM-AC-PO-002)."
            );
        }
    }

    public function registrar(array $data, User $registradaPor): Baja
    {
        $alumnoModel = Alumno::findOrFail($data['alumno_id']);
        if (!in_array($alumnoModel->estatus, ['activo', 'baja_temporal'])) {
            throw new \DomainException('El alumno no tiene un estatus que permita registrar una baja.');
        }

        $periodo = Periodo::findOrFail($data['periodo_id']);

        $this->validarPlazo(
            $periodo,
            $data['tipo_baja'],
            Carbon::parse($data['fecha_solicitud'])
        );

        $baja = Baja::create(array_merge($data, [
            'registrada_por' => $registradaPor->id,
            'estatus'        => 'aprobada', // admin registra directamente: aprobada
        ]));

        $estatusAlumno = $data['tipo_baja'] === 'definitiva' ? 'baja_definitiva' : 'baja_temporal';
        Alumno::where('id', $data['alumno_id'])->update(['estatus' => $estatusAlumno]);

        return $baja->load(['alumno.user', 'alumno.carrera', 'periodo']);
    }

    /**
     * Baja temporal solicitada por el propio alumno (S2-06).
     * Solo permite tipo=temporal y fuerza alumno_id desde el modelo de alumno.
     */
    public function solicitarBajaTemporal(Alumno $alumno, array $data): Baja
    {
        if ($alumno->estatus !== 'activo') {
            throw new \DomainException('Solo los alumnos con estatus activo pueden solicitar baja temporal.');
        }

        $periodo = Periodo::findOrFail($data['periodo_id']);

        $this->validarPlazo($periodo, 'temporal', Carbon::parse($data['fecha_solicitud']));

        if (Baja::where('alumno_id', $alumno->id)->where('periodo_id', $data['periodo_id'])->exists()) {
            throw new \DomainException('Ya existe una solicitud de baja para este periodo.');
        }

        $baja = Baja::create([
            'alumno_id'                 => $alumno->id,
            'periodo_id'                => $data['periodo_id'],
            'tipo_baja'                 => 'temporal',
            'estatus'                   => 'pendiente', // S2-06: queda pendiente hasta que admin apruebe
            'motivo_enum'               => $data['motivo_enum'] ?? null,
            'motivo_texto'              => $data['motivo_texto'] ?? null,
            'fecha_solicitud'           => $data['fecha_solicitud'],
            'registrada_por'            => $alumno->user_id,
            'reingreso_posible'         => true,
            'numero_semestres_cursados' => $data['numero_semestres_cursados'] ?? null,
        ]);

        // El estatus del alumno se actualiza cuando el admin apruebe la baja

        $baja->load(['alumno.user', 'periodo']);

        // Correo de confirmación al alumno (S2-06)
        $emailAlumno = $alumno->user?->email ?? $baja->alumno?->user?->email;
        if ($emailAlumno) {
            Mail::to($emailAlumno)->queue(new BajaSolicitadaMail($baja));
        }

        return $baja;
    }

    /**
     * Formaliza el reingreso de un alumno cuya baja temporal fue aprobada,
     * regresándolo a estatus activo. Cierra el hueco funcional en el que
     * reingreso_posible se guardaba pero nunca se usaba (S2 complementario).
     */
    public function registrarReingreso(Baja $baja, User $por): Baja
    {
        if ($baja->tipo_baja !== 'temporal') {
            throw new \DomainException('Solo las bajas temporales admiten reingreso.');
        }
        if ($baja->estatus !== 'aprobada') {
            throw new \DomainException('Solo se puede registrar el reingreso de una baja aprobada.');
        }
        if (! $baja->reingreso_posible) {
            throw new \DomainException('Esta baja no permite reingreso.');
        }
        if ($baja->reingreso_registrado) {
            throw new \DomainException('El reingreso de esta baja ya fue registrado.');
        }
        if ($baja->alumno->estatus !== 'baja_temporal') {
            throw new \DomainException('El alumno no se encuentra actualmente en baja temporal.');
        }

        return DB::transaction(function () use ($baja, $por) {
            $baja->update([
                'reingreso_registrado' => true,
                'fecha_reingreso'      => now()->toDateString(),
                'reingreso_por'        => $por->id,
            ]);

            $baja->alumno->update(['estatus' => 'activo']);

            return $baja->fresh(['alumno.user', 'periodo', 'reingresoPor']);
        });
    }
}
