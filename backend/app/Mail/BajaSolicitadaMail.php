<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\Baja;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BajaSolicitadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Baja $baja) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirmación de solicitud de baja temporal — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.baja_solicitada',
        );
    }
}
