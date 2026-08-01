<?php

namespace App\Mail;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecordatorioAsistenciaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CargaAcademica $carga,
        public readonly Horario $horario,
    ) {
    }

    public function envelope(): Envelope
    {
        $materia = $this->carga->materia?->nombre ?? 'tu materia';

        return new Envelope(subject: "Tu clase de {$materia} empieza en 10 minutos");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.recordatorio_asistencia');
    }
}
