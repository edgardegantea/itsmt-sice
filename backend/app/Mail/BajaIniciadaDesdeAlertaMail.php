<?php

namespace App\Mail;

use App\Domains\Permanencia\Models\Baja;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BajaIniciadaDesdeAlertaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Baja $baja) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Se inició un trámite de baja sobre tu expediente — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.permanencia.baja_iniciada_alerta',
        );
    }
}
