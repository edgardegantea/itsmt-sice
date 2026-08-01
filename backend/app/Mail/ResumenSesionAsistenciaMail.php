<?php

namespace App\Mail;

use App\Domains\Academico\Models\SesionClase;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResumenSesionAsistenciaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly SesionClase $sesion)
    {
    }

    public function envelope(): Envelope
    {
        $materia = $this->sesion->grupo?->cargas
            ?->firstWhere('docente_id', $this->sesion->docente_id)
            ?->materia?->nombre ?? 'tu materia';
        $fecha = $this->sesion->fecha?->format('d/m/Y');

        return new Envelope(subject: "Resumen de asistencia — {$materia} — {$fecha}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.resumen_sesion_asistencia');
    }
}
