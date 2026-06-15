<?php

namespace App\Http\Controllers\Cobros;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Cobros\Models\ReciboCobro;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admision\RegistrarCobroRequest;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CobroInscripcionController extends Controller
{
    // POST /api/cobros-inscripcion
    public function store(RegistrarCobroRequest $request): JsonResponse
    {
        $data                   = $request->validated();
        $data['registrado_por'] = $request->user()->id;

        $recibo = ReciboCobro::create($data);
        $recibo->load(['inscripcion.aspirante', 'alumno.carrera']);

        return ApiResponse::success($recibo, 'Recibo registrado correctamente.', 201);
    }

    // GET /api/cobros-inscripcion/{recibo}/recibo/pdf
    public function reciboPdf(ReciboCobro $recibo): Response
    {
        $this->authorize('viewAny', Alumno::class);

        $recibo->load(['inscripcion.aspirante', 'alumno.carrera', 'registradoPor']);

        $pdf = Pdf::loadView('pdfs.recibo_cobro', compact('recibo'))
            ->setPaper('letter', 'portrait');

        return $pdf->stream("recibo-{$recibo->folio_fiscal}.pdf");
    }
}
