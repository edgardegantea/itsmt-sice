<?php

namespace App\Domains\Admision\Services;

use RuntimeException;

/**
 * Se lanza cuando dos solicitudes de inscripción concurrentes intentan
 * inscribir al mismo aspirante — la segunda, al perder la carrera por el
 * advisory lock o por la restricción única de BD, recibe esta excepción en
 * vez de crear un alumno/número de control duplicado.
 */
class AspiranteYaInscritoException extends RuntimeException
{
}
