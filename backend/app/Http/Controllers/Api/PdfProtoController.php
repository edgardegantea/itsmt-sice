<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PdfProtoController extends Controller
{
    // GET /api/pdf-prototipo  — spike técnico Sprint 0
    public function constancia(): Response
    {
        $pdf = Pdf::loadView('pdf.constancia_prototipo', [
            'folio'          => 'SICE-' . strtoupper(substr(md5(uniqid()), 0, 8)),
            'fecha'          => now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY'),
            'nombre'         => 'Juan Pérez García',
            'numero_control' => '21030001',
            'semestre'       => 4,
            'carrera'        => 'Ingeniería en Sistemas Computacionales',
            'periodo'        => 'Enero–Junio 2026',
        ]);

        return $pdf->download('constancia_prototipo.pdf');
    }
}
