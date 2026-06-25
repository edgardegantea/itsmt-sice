<?php

namespace App\Mail;

use App\Domains\Admision\Models\Aspirante;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AceptacionAspiranteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Aspirante $aspirante) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu solicitud de admisión fue aceptada — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.aceptacion_aspirante',
        );
    }
}
