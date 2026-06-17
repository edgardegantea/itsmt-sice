<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Models\User;
use Carbon\Carbon;

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
        $periodo = Periodo::findOrFail($data['periodo_id']);

        $this->validarPlazo(
            $periodo,
            $data['tipo_baja'],
            Carbon::parse($data['fecha_solicitud'])
        );

        $baja = Baja::create(array_merge($data, ['registrada_por' => $registradaPor->id]));

        $estatus = $data['tipo_baja'] === 'definitiva' ? 'baja_definitiva' : 'baja_temporal';
        Alumno::where('id', $data['alumno_id'])->update(['estatus' => $estatus]);

        return $baja->load(['alumno.user', 'alumno.carrera', 'periodo']);
    }

    /**
     * Baja temporal solicitada por el propio alumno (S2-06).
     * Solo permite tipo=temporal y fuerza alumno_id desde el modelo de alumno.
     */
    public function solicitarBajaTemporal(Alumno $alumno, array $data): Baja
    {
        $periodo = Periodo::findOrFail($data['periodo_id']);

        $this->validarPlazo($periodo, 'temporal', Carbon::parse($data['fecha_solicitud']));

        $baja = Baja::create([
            'alumno_id'                 => $alumno->id,
            'periodo_id'                => $data['periodo_id'],
            'tipo_baja'                 => 'temporal',
            'motivo_texto'              => $data['motivo_texto'] ?? null,
            'fecha_solicitud'           => $data['fecha_solicitud'],
            'registrada_por'            => $alumno->user_id,
            'reingreso_posible'         => true,
            'numero_semestres_cursados' => $data['numero_semestres_cursados'] ?? null,
        ]);

        Alumno::where('id', $alumno->id)->update(['estatus' => 'baja_temporal']);

        return $baja->load(['alumno.user', 'periodo']);
    }
}
