<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\Baja;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BajaResueltaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Baja $baja) {}

    public function envelope(): Envelope
    {
        $aprobada = $this->baja->estatus === 'aprobada';

        return new Envelope(
            subject: $aprobada
                ? 'Tu solicitud de baja fue aprobada — ITSMT'
                : 'Tu solicitud de baja fue rechazada — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.baja_resuelta',
        );
    }
}
