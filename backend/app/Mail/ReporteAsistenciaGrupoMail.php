<?php

namespace App\Mail;

use App\Domains\Academico\Models\CargaAcademica;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReporteAsistenciaGrupoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CargaAcademica $carga,
        public readonly array $resumenAlumnos,
        public readonly int $totalSesiones,
    ) {
    }

    public function envelope(): Envelope
    {
        $materia = $this->carga->materia?->nombre ?? 'tu materia';

        return new Envelope(subject: "Reporte acumulado de asistencia — {$materia}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.reporte_asistencia_grupo');
    }
}
