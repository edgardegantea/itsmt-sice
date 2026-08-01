<?php

namespace App\Mail;

use App\Domains\Academico\Models\CargaAcademica;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ListaAsistenciaBlancoMail extends Mailable
{
    use Queueable, SerializesModels;

    // El PDF se recibe y almacena en base64: el binario crudo de DomPDF no es
    // UTF-8 válido y json_encode() falla al serializar el job en la cola.
    private readonly string $pdfBase64;

    public function __construct(public readonly CargaAcademica $carga, string $pdfBinario)
    {
        $this->pdfBase64 = base64_encode($pdfBinario);
    }

    public function envelope(): Envelope
    {
        $materia = $this->carga->materia?->nombre ?? 'tu materia';

        return new Envelope(subject: "Lista de asistencia — {$materia}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.academico.lista_asistencia_blanco');
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => base64_decode($this->pdfBase64), 'lista-asistencia.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
