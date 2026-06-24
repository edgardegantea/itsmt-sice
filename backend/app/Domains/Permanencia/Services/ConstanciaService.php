<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Constancia;
use App\Mail\ConstanciaSolicitadaMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ConstanciaService
{
    public function solicitar(Alumno $alumno, string $tipo, User $solicitante): Constancia
    {
        $constancia = Constancia::create([
            'alumno_id'      => $alumno->id,
            'tipo'           => $tipo,
            'folio_unico'    => Constancia::generarFolio($tipo),
            'estatus'        => 'solicitada',
            'solicitada_por' => $solicitante->id,
        ]);

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

        return $constancia;
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

            return $constancia->fresh(['alumno.carrera', 'alumno.periodoIngreso', 'emitidaPor']);
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
