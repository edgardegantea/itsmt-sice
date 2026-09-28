<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Constancia;
use App\Mail\ConstanciaSolicitadaMail;
use App\Models\User;
use App\Services\NotificacionService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ConstanciaService
{
    public function solicitar(Alumno $alumno, string $tipo, User $solicitante): Constancia
    {
        // Reintenta ante colisión de folio_unico (constraint UNIQUE) en motores sin
        // advisory lock (el lock de Postgres cubre el caso normal; esto es la red
        // de seguridad para SQLite/MySQL u otra condición de carrera residual).
        $intentosRestantes = 3;

        do {
            try {
                return DB::transaction(function () use ($alumno, $tipo, $solicitante) {
                    if (DB::getDriverName() === 'pgsql') {
                        DB::statement('SELECT pg_advisory_xact_lock(?)', [crc32('folio_constancia:' . $tipo . ':' . now()->year)]);
                    }

                    $constancia = Constancia::create([
                        'alumno_id'      => $alumno->id,
                        'tipo'           => $tipo,
                        'folio_unico'    => Constancia::generarFolio($tipo),
                        'estatus'        => 'solicitada',
                        'solicitada_por' => $solicitante->id,
                    ]);

                    $this->notificarControlEscolar($constancia);

                    // Notificaciones internas en el sistema
                    NotificacionService::enviarAUsuario(
                        $solicitante,
                        'Solicitud de Constancia Registrada',
                        "Has solicitado una constancia de tipo '{$tipo}'. Folio único: {$constancia->folio_unico}.",
                        'constancia',
                        '/alumno/tramites'
                    );

                    $alumnoNombre = $alumno->user?->name ?? 'Estudiante';
                    $alumnoNC = $alumno->user?->numero_control ?? '';
                    NotificacionService::enviarARoles(
                        ['superadmin', 'admin', 'control_escolar', 'personal_administrativo'],
                        'Nueva Solicitud de Constancia',
                        "El estudiante {$alumnoNombre} ({$alumnoNC}) solicitó una constancia de tipo '{$tipo}'. Folio: {$constancia->folio_unico}.",
                        'constancia',
                        '/admin/constancias'
                    );

                    return $constancia;
                });
            } catch (QueryException $e) {
                $esViolacionUnicidad = str_contains($e->getMessage(), 'folio_unico');
                if (! $esViolacionUnicidad || --$intentosRestantes <= 0) {
                    throw $e;
                }
            }
        } while (true);
    }

    private function notificarControlEscolar(Constancia $constancia): void
    {
        // Notificar al personal de Control Escolar (S2-03)
        $ceEmails = User::role(['admin', 'personal_administrativo'])
            ->whereNotNull('email')
            ->pluck('email');

        if ($ceEmails->isNotEmpty()) {
            $constancia->load(['alumno.user', 'alumno.carrera']);
            foreach ($ceEmails as $email) {
                Mail::to($email)->queue(new ConstanciaSolicitadaMail($constancia));
            }
        }
    }

    public function emitir(Constancia $constancia, User $emisor): Constancia
    {
        if ($constancia->estatus === 'emitida') {
            throw new \DomainException('Esta constancia ya fue emitida.');
        }

        return DB::transaction(function () use ($constancia, $emisor) {
            $constancia->update([
                'estatus'     => 'emitida',
                'emitida_por' => $emisor->id,
                'emitida_en'  => now(),
                'url_pdf'     => "/api/constancias/{$constancia->id}/pdf",
            ]);

            $constanciaActualizada = $constancia->fresh(['alumno.carrera', 'alumno.periodoIngreso', 'alumno.user', 'emitidaPor']);

            if ($constanciaActualizada->alumno?->user) {
                NotificacionService::enviarAUsuario(
                    $constanciaActualizada->alumno->user,
                    'Constancia Emitida',
                    "Tu constancia de tipo '{$constancia->tipo}' (Folio: {$constancia->folio_unico}) ha sido emitida y está lista para su consulta.",
                    'constancia',
                    '/alumno/tramites'
                );
            }

            return $constanciaActualizada;
        });
    }

    public function listar(array $filtros = [])
    {
        $q = Constancia::with(['alumno.carrera', 'alumno.user', 'solicitadaPor', 'emitidaPor']);

        if (!empty($filtros['estatus'])) {
            $q->where('estatus', $filtros['estatus']);
        }
        if (!empty($filtros['tipo'])) {
            $q->where('tipo', $filtros['tipo']);
        }
        if (!empty($filtros['alumno_id'])) {
            $q->where('alumno_id', $filtros['alumno_id']);
        }
        if (!empty($filtros['carrera_id'])) {
            $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $filtros['carrera_id']));
        }

        return $q->latest()->paginate(20);
    }
}
