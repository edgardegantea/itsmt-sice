<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\OrdenReinscripcion;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrdenReinscripcionPublicadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly OrdenReinscripcion $orden,
        public readonly string $destinatarioNombre,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Calendario de reinscripción publicado — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.orden_reinscripcion',
        );
    }
}
