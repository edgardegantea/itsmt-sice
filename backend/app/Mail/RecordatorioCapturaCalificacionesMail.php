<?php

namespace App\Mail;

use App\Domains\Academico\Models\AlertaCorteCaptura;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecordatorioCapturaCalificacionesMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly AlertaCorteCaptura $alerta)
    {
    }

    public function envelope(): Envelope
    {
        $materia = $this->alerta->cargaAcademica?->materia?->nombre ?? 'tu materia';

        return new Envelope(subject: "Captura de calificaciones pendiente — {$materia}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.recordatorio_captura_calificaciones');
    }
}
