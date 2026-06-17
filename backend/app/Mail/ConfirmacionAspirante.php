<?php

namespace App\Mail;

use App\Domains\Admision\Models\Aspirante;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConfirmacionAspirante extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Aspirante $aspirante) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Solicitud de admisión recibida — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.confirmacion_aspirante',
        );
    }
}
