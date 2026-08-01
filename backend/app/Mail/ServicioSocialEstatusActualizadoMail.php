<?php

namespace App\Mail;

use App\Domains\Vinculacion\Models\ServicioSocial;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ServicioSocialEstatusActualizadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly ServicioSocial $servicioSocial) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Actualización de tu Servicio Social — ITSMT');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.vinculacion.servicio_social_estatus');
    }
}
