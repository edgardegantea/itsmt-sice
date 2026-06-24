<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\Constancia;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConstanciaSolicitadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Constancia $constancia) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nueva solicitud de constancia — SICE ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.constancia_solicitada',
        );
    }
}
