<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Mail\BajaIniciadaDesdeAlertaMail;
use App\Mail\BajaResueltaMail;
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

        // Notificaciones internas en el sistema
        if ($alumno->user) {
            \App\Services\NotificacionService::enviarAUsuario(
                $alumno->user,
                'Solicitud de Baja Temporal Registrada',
                'Has iniciado una solicitud de baja temporal en el sistema.',
                'baja',
                '/alumno/tramites'
            );
        }

        $alumnoNombre = $alumno->user?->name ?? 'Estudiante';
        $alumnoNC = $alumno->user?->numero_control ?? '';
        \App\Services\NotificacionService::enviarARoles(
            ['superadmin', 'admin', 'control_escolar', 'personal_administrativo', 'jefe_carrera'],
            'Nueva Solicitud de Baja Temporal',
            "El estudiante {$alumnoNombre} ({$alumnoNC}) ha solicitado una baja temporal.",
            'baja',
            '/admin/bajas'
        );

        return $baja;
    }

    /**
     * Convierte una alerta de riesgo (académico o deserción temprana) en un trámite
     * de baja formal — hasta ahora esas alertas eran de solo lectura, sin ninguna
     * acción posible desde ahí. Queda en estatus "pendiente" (igual que una
     * solicitud del propio alumno) porque quien la inicia es personal reaccionando
     * a una señal automática, no el alumno pidiéndola: alguien debe revisarla y
     * aprobarla antes de que se toque el estatus del alumno.
     */
    public function iniciarDesdeAlerta(array $data, User $iniciadaPor): Baja
    {
        $alumno = Alumno::findOrFail($data['alumno_id']);
        if (!in_array($alumno->estatus, ['activo', 'baja_temporal'])) {
            throw new \DomainException('El alumno no tiene un estatus que permita registrar una baja.');
        }

        Periodo::findOrFail($data['periodo_id']);

        $yaTieneTramiteActivo = Baja::where('alumno_id', $alumno->id)
            ->where('periodo_id', $data['periodo_id'])
            ->whereIn('estatus', ['pendiente', 'aprobada'])
            ->exists();
        if ($yaTieneTramiteActivo) {
            throw new \DomainException('Ya existe un trámite de baja activo para este alumno en este periodo.');
        }

        $origen = $data['tipo_alerta'] === 'desercion_temprana' ? 'deserción temprana' : 'riesgo académico';
        $motivo = "Trámite iniciado desde alerta de {$origen}.";
        if (!empty($data['contexto_alerta'])) {
            $motivo .= ' ' . $data['contexto_alerta'];
        }
        if (!empty($data['motivo_texto'])) {
            $motivo .= ' ' . $data['motivo_texto'];
        }

        $baja = Baja::create([
            'alumno_id'         => $alumno->id,
            'periodo_id'        => $data['periodo_id'],
            'tipo_baja'         => $data['tipo_baja'] ?? 'temporal',
            'estatus'           => 'pendiente',
            'motivo_enum'       => 'otro',
            'motivo_texto'      => $motivo,
            'fecha_solicitud'   => now()->toDateString(),
            'registrada_por'    => $iniciadaPor->id,
            'reingreso_posible' => true,
        ]);

        $baja->load(['alumno.user', 'alumno.carrera', 'periodo']);

        // El alumno no pidió esto — merece enterarse de que alguien inició un
        // trámite sobre su expediente antes de que se resuelva, no solo cuando
        // ya esté aprobado/rechazado.
        $emailAlumno = $baja->alumno?->user?->email;
        if ($emailAlumno) {
            Mail::to($emailAlumno)->queue(new BajaIniciadaDesdeAlertaMail($baja));
        }

        return $baja;
    }

    /**
     * Aprueba o rechaza una baja pendiente. Antes vivía inline en el controlador
     * sin notificar a nadie del resultado — ahora también avisa al alumno por
     * correo, sea aprobación (con el cambio de estatus ya aplicado) o rechazo
     * (con el motivo).
     */
    public function actualizarEstatus(Baja $baja, string $estatus, ?string $motivoRechazo, User $revisadaPor): Baja
    {
        if ($baja->estatus !== 'pendiente') {
            throw new \DomainException('Solo se pueden aprobar o rechazar bajas en estado pendiente.');
        }

        $baja->update([
            'estatus'        => $estatus,
            'motivo_rechazo' => $estatus === 'rechazada' ? $motivoRechazo : null,
            'revisada_por'   => $revisadaPor->id,
            'revisada_en'    => now(),
        ]);

        if ($estatus === 'aprobada') {
            $estatusAlumno = $baja->tipo_baja === 'definitiva' ? 'baja_definitiva' : 'baja_temporal';
            $baja->alumno->update(['estatus' => $estatusAlumno]);
        }

        $baja = $baja->fresh(['alumno.user', 'alumno.carrera', 'periodo']);

        $emailAlumno = $baja->alumno?->user?->email;
        if ($emailAlumno) {
            Mail::to($emailAlumno)->queue(new BajaResueltaMail($baja));
        }

        if ($baja->alumno?->user) {
            $resultadoText = $estatus === 'aprobada' ? 'APROBADA' : 'RECHAZADA';
            \App\Services\NotificacionService::enviarAUsuario(
                $baja->alumno->user,
                "Solicitud de Baja {$resultadoText}",
                "Tu solicitud de baja temporal fue {$estatus}." . ($motivoRechazo ? " Motivo: {$motivoRechazo}" : ''),
                'baja',
                '/alumno/tramites'
            );
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
