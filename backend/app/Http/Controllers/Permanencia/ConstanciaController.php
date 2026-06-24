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
        $this->authorize('create', Constancia::class);

        $data = $request->validate([
            'tipo' => ['required', 'in:estudios,inscripcion,calificaciones'],
        ]);

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        if ($alumno->estatus !== 'activo') {
            return ApiResponse::error('Solo los alumnos con estatus activo pueden solicitar constancias.', 422);
        }

        $constancia = $this->service->solicitar($alumno, $data['tipo'], $request->user());

        return ApiResponse::success($constancia->load(['alumno']), 'Constancia solicitada. Control Escolar la emitirá a la brevedad.', 201);
    }

    // GET /api/alumnos/{alumno}/constancias
    public function porAlumno(Request $request, Alumno $alumno): JsonResponse
    {
        // Alumno solo puede ver sus propias constancias; admin/CE ven cualquiera
        if ($request->user()->hasRole('alumno')) {
            $propio = Alumno::where('user_id', $request->user()->id)->value('id');
            abort_if($propio !== $alumno->id, 403, 'No autorizado.');
        } else {
            $this->authorize('viewAny', Constancia::class);
        }

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
    public function pdf(Request $request, Constancia $constancia): Response
    {
        if ($request->user()->hasRole('alumno')) {
            $propio = Alumno::where('user_id', $request->user()->id)->value('id');
            abort_if($propio !== $constancia->alumno_id, 403, 'No autorizado.');
        } else {
            $this->authorize('viewAny', Constancia::class);
        }

        abort_if($constancia->estatus !== 'emitida', 422, 'La constancia aún no ha sido emitida.');

        $constancia->load(['alumno.carrera', 'alumno.inscripcion.carrera', 'alumno.periodoIngreso', 'emitidaPor']);

        $cfg  = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
        $mapa = \App\Domains\Institucional\Models\DirectorioPersonal::where('firma_documentos', true)
                    ->whereNotNull('clave_firma')->where('activo', true)
                    ->orderBy('orden')->get()->keyBy('clave_firma');
        $directorGeneral    = $mapa->get('director_general');
        $jefeControlEscolar = $mapa->get('jefe_servicios_escolares');

        $html = view('pdfs.constancia', compact('constancia', 'cfg', 'directorGeneral', 'jefeControlEscolar'))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $folio = $constancia->folio_unico ?? 'constancia';
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$folio}.pdf\"",
        ]);
    }
}
