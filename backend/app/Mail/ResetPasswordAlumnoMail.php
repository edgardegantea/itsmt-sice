<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordAlumnoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nombreAlumno,
        public readonly string $resetUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Restablecimiento de contraseña — ITSMT');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.auth.reset_password_alumno');
    }
}
