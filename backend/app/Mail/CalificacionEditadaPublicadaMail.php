<?php

namespace App\Mail;

use App\Domains\Academico\Models\Calificacion;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CalificacionEditadaPublicadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Calificacion $calificacion,
        public readonly User $editor,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Calificación editada después de publicada — requiere revisión');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.calificacion_editada_publicada');
    }
}
