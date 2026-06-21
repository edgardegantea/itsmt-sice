<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Constancia;
use App\Domains\Permanencia\Services\ConstanciaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\GotenbergService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ConstanciaController extends Controller
{
    public function __construct(
        private ConstanciaService $service,
        private GotenbergService  $gotenberg,
    ) {}

    // POST /api/constancias  (alumno solicita)
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo' => ['required', 'in:estudios,inscripcion,calificaciones'],
        ]);

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        $constancia = $this->service->solicitar($alumno, $data['tipo'], $request->user());

        return ApiResponse::success($constancia->load(['alumno']), 'Constancia solicitada. Control Escolar la emitirá a la brevedad.', 201);
    }

    // GET /api/alumnos/{alumno}/constancias
    public function porAlumno(Alumno $alumno): JsonResponse
    {
        $constancias = Constancia::with(['solicitadaPor', 'emitidaPor'])
            ->where('alumno_id', $alumno->id)
            ->latest()
            ->get();

        return ApiResponse::success($constancias);
    }

    // GET /api/constancias  (admin lista todas)
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Constancia::class);

        $filtros = $request->only(['estatus', 'tipo', 'alumno_id', 'carrera_id']);

        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $filtros['carrera_id'] = $carreraForzada;
        }

        return ApiResponse::success($this->service->listar($filtros));
    }

    // POST /api/constancias/{constancia}/emitir  (admin emite y genera PDF)
    public function emitir(Request $request, Constancia $constancia): JsonResponse
    {
        $this->authorize('update', $constancia);

        try {
            $c = $this->service->emitir($constancia, $request->user());
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($c, 'Constancia emitida.');
    }

    // GET /api/constancias/{constancia}/pdf
    public function pdf(Constancia $constancia): Response
    {
        $this->authorize('viewAny', Constancia::class);

        abort_if($constancia->estatus !== 'emitida', 422, 'La constancia aún no ha sido emitida.');

        $constancia->load(['alumno.inscripcion.carrera', 'alumno.periodoIngreso', 'emitidaPor']);

        $cfg               = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
        $directorGeneral   = \App\Models\User::role('admin')->orderBy('created_at')->first();
        $jefeControlEscolar = \App\Models\User::where('email', 'servescolares@martineztorre.tecnm.mx')->first()
                              ?? \App\Models\User::role('personal_administrativo')->orderBy('created_at')->first();

        $html = view('pdfs.constancia', compact('constancia', 'cfg', 'directorGeneral', 'jefeControlEscolar'))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $folio = $constancia->folio_unico ?? 'constancia';
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$folio}.pdf\"",
        ]);
    }
}
