<?php

namespace App\Mail;

use App\Domains\Academico\Models\PlaneacionDocente;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecordatorioEvaluacionUnidadMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PlaneacionDocente $planeacion,
        public readonly int $numeroUnidad,
        public readonly string $nombreUnidad,
        public readonly int $semanaEvaluacion,
    ) {
    }

    public function envelope(): Envelope
    {
        $materia = $this->planeacion->cargaAcademica?->materia?->nombre ?? 'tu materia';

        return new Envelope(subject: "Ya puedes cargar calificaciones — Unidad {$this->numeroUnidad} de {$materia}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.recordatorio_evaluacion_unidad');
    }
}
