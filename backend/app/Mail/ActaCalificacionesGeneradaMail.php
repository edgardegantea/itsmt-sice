<?php

namespace App\Mail;

use App\Domains\Academico\Models\ActaCalificacionesCaptura;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ActaCalificacionesGeneradaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ActaCalificacionesCaptura $acta,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Acta de calificaciones generada — folio {$this->acta->folio}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.acta_calificaciones_generada');
    }
}
