<?php

namespace App\Mail;

use App\Domains\Academico\Models\IncidenciaClase;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IncidenciaClaseRegistradaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly IncidenciaClase $incidencia)
    {
    }

    public function envelope(): Envelope
    {
        $grupo = $this->incidencia->grupo?->clave ?? 'tu grupo';

        return new Envelope(subject: "Prefectura reportó una incidencia en {$grupo}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.incidencia_clase_registrada');
    }
}
