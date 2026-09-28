<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResumenSemanalAsistenciaMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array<int, array{materia: string, grupo: string, esperadas: int, registradas: int, pct: float}> $detalle
     */
    public function __construct(
        public readonly User $docente,
        public readonly array $detalle,
        public readonly int $totalEsperadas,
        public readonly int $totalRegistradas,
        public readonly float $pctGeneral,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Resumen semanal de asistencia — ' . now()->subDays(6)->format('d/m') . ' al ' . now()->format('d/m'));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.resumen_semanal_asistencia');
    }
}
