<?php

namespace App\Mail;

use App\Domains\Academico\Models\PlaneacionDocente;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlaneacionDocenteEntregadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PlaneacionDocente $planeacion) {}

    public function envelope(): Envelope
    {
        $materia = $this->planeacion->cargaAcademica?->materia?->nombre ?? 'materia';
        $docente = $this->planeacion->docente?->name ?? 'docente';

        return new Envelope(subject: "Planeación entregada: {$materia} — {$docente}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.planeacion_entregada');
    }
}
