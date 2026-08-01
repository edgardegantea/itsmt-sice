<?php

namespace App\Mail;

use App\Domains\Vinculacion\Models\ResidenciaProfesional;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Se envía tanto al asesor interno asignado como al alumno (S6-04, PO-004-02).
 * `$paraAsesor` cambia el saludo/contexto de la plantilla según el destinatario.
 */
class AsesorInternoAsignadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResidenciaProfesional $residencia,
        public readonly bool $paraAsesor,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->paraAsesor
                ? 'Fuiste asignado como Asesor Interno de Residencia Profesional — ITSMT'
                : 'Se asignó tu Asesor Interno de Residencia Profesional — ITSMT',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.vinculacion.asesor_asignado');
    }
}
