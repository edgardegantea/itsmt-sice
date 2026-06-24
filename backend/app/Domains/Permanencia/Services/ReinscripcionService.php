<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Adeudo;
use App\Domains\Permanencia\Models\OrdenReinscripcion;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReinscripcionService
{
    public function tieneAdeudos(Alumno $alumno): bool
    {
        return Adeudo::where('alumno_id', $alumno->id)
            ->where('pagado', false)
            ->exists();
    }

    public function solicitar(Alumno $alumno, string $periodoId): Reinscripcion
    {
        if ($alumno->estatus !== 'activo') {
            throw new \DomainException('Solo los alumnos con estatus activo pueden solicitar reinscripción.');
        }

        if ($this->tieneAdeudos($alumno)) {
            throw new \DomainException('El alumno tiene adeudos pendientes.');
        }

        // TecNM-AC-PO-001-05: alumno con certificado de bachillerato pendiente no puede reinscribirse
        if ($alumno->pendiente_certificado_bachillerato) {
            throw new \DomainException(
                'No puedes reinscribirte hasta entregar el certificado de bachillerato (TecNM-AC-PO-001-05). Acude a Control Escolar.'
            );
        }

        // S2-07: validar ventana publicada del Orden de Reinscripción
        $orden = OrdenReinscripcion::where('periodo_id', $periodoId)
            ->where('carrera_id', $alumno->carrera_id)
            ->where('semestre', $alumno->semestre_actual)
            ->where('publicado', true)
            ->first();

        if ($orden) {
            $hoy = Carbon::today();
            $inicio = Carbon::parse($orden->fecha_inicio_reinscripcion);
            $fin    = Carbon::parse($orden->fecha_fin_reinscripcion);

            if ($hoy->lt($inicio)) {
                throw new \DomainException(
                    "El periodo de reinscripción para tu semestre aún no ha comenzado. Inicia el {$inicio->translatedFormat('d \de F \de Y')}."
                );
            }
            if ($hoy->gt($fin)) {
                throw new \DomainException(
                    "El periodo de reinscripción para tu semestre ha concluido (finalizó el {$fin->translatedFormat('d \de F \de Y')})."
                );
            }
        }

        $existente = Reinscripcion::where('alumno_id', $alumno->id)
            ->where('periodo_id', $periodoId)
            ->first();

        if ($existente) {
            throw new \DomainException('Ya existe una solicitud de reinscripción para este periodo.');
        }

        return Reinscripcion::create([
            'alumno_id'  => $alumno->id,
            'periodo_id' => $periodoId,
            'estatus'    => 'pendiente',
        ]);
    }

    public function actualizarEstatus(Reinscripcion $reinscripcion, string $estatus, ?string $observaciones, User $aprobadoPor): Reinscripcion
    {
        $reinscripcion->update([
            'estatus'       => $estatus,
            'observaciones' => $observaciones,
            'aprobado_por'  => $aprobadoPor->id,
            'aprobado_en'   => now(),
        ]);

        if ($estatus === 'aprobada') {
            $reinscripcion->alumno->update(['semestre_actual' => $reinscripcion->alumno->semestre_actual + 1]);
        }

        return $reinscripcion->fresh(['alumno', 'periodo']);
    }

    public function registrarResello(Reinscripcion $reinscripcion, User $por): Reinscripcion
    {
        if ($reinscripcion->estatus !== 'aprobada') {
            throw new \DomainException('Solo se puede resellar una reinscripción aprobada.');
        }

        $reinscripcion->update([
            'resello_registrado' => true,
            'fecha_resello'      => now()->toDateString(),
            'resello_por'        => $por->id,
        ]);

        return $reinscripcion->fresh();
    }

    public function listar(array $filtros = [])
    {
        $q = Reinscripcion::with(['alumno.carrera', 'alumno.user', 'alumno.inscripcion', 'periodo', 'aprobadoPor', 'reciboCobro']);

        if (!empty($filtros['estatus'])) {
            $q->where('estatus', $filtros['estatus']);
        }
        if (!empty($filtros['periodo_id'])) {
            $q->where('periodo_id', $filtros['periodo_id']);
        }
        if (!empty($filtros['carrera_id'])) {
            $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $filtros['carrera_id']));
        }
        if (!empty($filtros['alumno_id'])) {
            $q->where('alumno_id', $filtros['alumno_id']);
        }

        return $q->latest()->paginate(20);
    }
}
