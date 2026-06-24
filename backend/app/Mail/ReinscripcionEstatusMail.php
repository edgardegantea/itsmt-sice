<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\Reinscripcion;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReinscripcionEstatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Reinscripcion $reinscripcion) {}

    public function envelope(): Envelope
    {
        $estatus = $this->reinscripcion->estatus === 'aprobada' ? 'aprobada' : 'rechazada';

        return new Envelope(
            subject: "Tu solicitud de reinscripción fue {$estatus} — ITSMT",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.reinscripcion_estatus',
        );
    }
}
