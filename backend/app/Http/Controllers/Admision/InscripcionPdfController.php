<?php

namespace App\Http\Controllers\Admision;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Http\Controllers\Controller;
use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Domains\Institucional\Models\DirectorioPersonal;
use App\Models\User;
use App\Services\GotenbergService;
use Illuminate\Http\Response;

class InscripcionPdfController extends Controller
{
    public function __construct(private GotenbergService $gotenberg) {}

    private function firmantes(): array
    {
        $map = DirectorioPersonal::where('firma_documentos', true)
            ->whereNotNull('clave_firma')
            ->where('activo', true)
            ->orderBy('orden')
            ->get()
            ->keyBy('clave_firma');

        return [
            'directorGeneral'      => $map->get('director_general'),
            'subdirectorAcademico' => $map->get('subdirector_academico'),
            'jefeControlEscolar'   => $map->get('jefe_servicios_escolares'),
        ];
    }

    // GET /api/inscripciones/{inscripcion}/solicitud-inscripcion/pdf
    public function solicitudInscripcion(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);

        $docs = $inscripcion->aspirante->documentos ?? [];
        $d    = fn(string $key) => (bool) ($docs[$key] ?? false);

        $documentos = [
            ['nombre' => 'Acta de nacimiento (original)',           'entregado' => $d('acta_nacimiento')],
            ['nombre' => 'CURP (original)',                          'entregado' => $d('curp')],
            ['nombre' => 'Certificado de bachillerato (original)',   'entregado' => !$inscripcion->alumno?->pendiente_certificado_bachillerato && $d('certificado_bachillerato')],
            ['nombre' => 'Fotografías tamaño infantil (6)',          'entregado' => $d('fotografias')],
            ['nombre' => 'Comprobante de domicilio (3 meses)',       'entregado' => $d('comprobante_domicilio')],
            ['nombre' => 'Identificación oficial (INE/pasaporte)',   'entregado' => $d('identificacion')],
            ['nombre' => 'NSS (IMSS)',                               'entregado' => $d('nss')],
            ['nombre' => 'Folio de preinscripción TecNM',           'entregado' => (bool) $inscripcion->aspirante->folio_preinscripcion_tecnm],
            ['nombre' => 'Puntaje EXANI-II (constancia)',            'entregado' => (bool) $inscripcion->aspirante->folio_exani],
            ['nombre' => 'Comprobante de pago de inscripción',      'entregado' => $d('comprobante_pago')],
            ['nombre' => 'Carta compromiso (firmada)',               'entregado' => $inscripcion->carta_compromiso_generada],
            ['nombre' => 'Contrato con el estudiante (firmado)',     'entregado' => $inscripcion->contrato_generado],
            ['nombre' => 'Autorización consulta de expediente',     'entregado' => true],
        ];

        $cfg  = ConfiguracionInstitucional::instancia();
        $html = view('pdfs.solicitud_inscripcion', array_merge(compact('inscripcion', 'documentos', 'cfg'), $this->firmantes()))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $inscripcion->update(['solicitud_inscripcion_generada' => true]);

        return response($pdf, 200, $this->headers("solicitud-inscripcion-{$inscripcion->numero_control}.pdf"));
    }

    // GET /api/inscripciones/{inscripcion}/carta-compromiso/pdf
    public function cartaCompromiso(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);

        $html = view('pdfs.carta_compromiso', array_merge(compact('inscripcion'), $this->firmantes()))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $inscripcion->update(['carta_compromiso_generada' => true]);

        return response($pdf, 200, $this->headers("carta-compromiso-{$inscripcion->numero_control}.pdf"));
    }

    // GET /api/inscripciones/{inscripcion}/contrato-estudiante/pdf
    public function contratoEstudiante(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);

        $html = view('pdfs.contrato_estudiante', array_merge(compact('inscripcion'), $this->firmantes()))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        $inscripcion->update(['contrato_generado' => true]);

        return response($pdf, 200, $this->headers("contrato-estudiante-{$inscripcion->numero_control}.pdf"));
    }

    // GET /api/aspirantes/lista-aceptados/{periodo}/pdf
    public function listaAceptados(Periodo $periodo): Response
    {
        $this->authorize('viewAny', Aspirante::class);

        $aspirantes = Aspirante::with('carrera')
            ->where('periodo_id', $periodo->id)
            ->whereIn('estatus', ['aceptado', 'inscrito'])
            ->orderBy('carrera_id')->orderBy('apellido_paterno')
            ->get();

        abort_if($aspirantes->isEmpty(), 404, 'No hay aspirantes aceptados en este periodo.');

        $cfg  = ConfiguracionInstitucional::instancia();
        $html = view('pdfs.lista_aspirantes_aceptados', compact('periodo', 'aspirantes', 'cfg'))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        return response($pdf, 200, $this->headers("lista-aceptados-{$periodo->id}.pdf"));
    }

    // GET /api/aspirantes/lista-aceptados-por-carrera/{periodo}/pdf
    public function listaAceptadosPorCarrera(Periodo $periodo): Response
    {
        $this->authorize('viewAny', Aspirante::class);

        $aspirantes = Aspirante::with('carrera')
            ->where('periodo_id', $periodo->id)
            ->whereIn('estatus', ['aceptado', 'inscrito'])
            ->orderBy('carrera_id')->orderBy('apellido_paterno')
            ->get();

        abort_if($aspirantes->isEmpty(), 404, 'No hay aspirantes aceptados en este periodo.');

        $cfg         = ConfiguracionInstitucional::instancia();
        $porCarrera  = $aspirantes->groupBy(fn($a) => $a->carrera->nombre);
        $totalCarreras = $porCarrera->count();

        $pdfOptions = [
            'paperWidth'        => '210mm',
            'paperHeight'       => '297mm',
            'marginTop'         => '18mm',
            'marginBottom'      => '18mm',
            'marginLeft'        => '20mm',
            'marginRight'       => '20mm',
            'preferCssPageSize' => 'false',
        ];

        $pdfs = [];
        $idx  = 1;
        foreach ($porCarrera as $nombreCarrera => $grupo) {
            $html   = view('pdfs.lista_aspirantes_por_carrera', array_merge(
                compact('periodo', 'cfg', 'nombreCarrera', 'grupo', 'idx', 'totalCarreras'),
                $this->firmantes()
            ))->render();
            $pdfs[] = $this->gotenberg->htmlToPdf($html, $pdfOptions);
            $idx++;
        }

        $pdf = count($pdfs) === 1
            ? $pdfs[0]
            : $this->gotenberg->mergePdfs($pdfs);

        return response($pdf, 200, $this->headers("lista-aceptados-por-carrera-{$periodo->id}.pdf"));
    }

    // GET /api/inscripciones/{inscripcion}/carta-compromiso-docs/pdf
    public function cartaCompromisoDocs(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);

        if ($inscripcion->alumno) {
            $inscripcion->alumno->update(['pendiente_certificado_bachillerato' => true]);
        }

        $html = view('pdfs.carta_compromiso_docs', array_merge(compact('inscripcion'), $this->firmantes()))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        return response($pdf, 200, $this->headers("carta-compromiso-docs-{$inscripcion->numero_control}.pdf"));
    }

    // GET /api/inscripciones/{inscripcion}/credencial/pdf
    public function credencial(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $alumno = $inscripcion->alumno()->with(['carrera', 'periodoIngreso', 'inscripcion.aspirante'])->firstOrFail();

        $directorGeneral = DirectorioPersonal::where('firma_documentos', true)
            ->where('clave_firma', 'director_general')->where('activo', true)->first();
        $html = view('pdfs.credencial', compact('alumno', 'directorGeneral'))->render();

        // Credencial: 85.6mm × 54mm (tamaño tarjeta CR-80)
        $pdf = $this->gotenberg->htmlToPdf($html, [
            'paperWidth'   => '85.6mm',
            'paperHeight'  => '54mm',
            'marginTop'    => '0',
            'marginBottom' => '0',
            'marginLeft'   => '0',
            'marginRight'  => '0',
        ]);

        return response($pdf, 200, $this->headers("credencial-{$alumno->numero_control}.pdf"));
    }

    // GET /api/libro-registro-nc
    public function libroRegistroNc(): Response
    {
        $this->authorize('viewAny', Alumno::class);

        $alumnos = Alumno::withTrashed()
            ->with(['inscripcion.aspirante', 'carrera', 'periodoIngreso'])
            ->orderBy('numero_control')
            ->get();

        $cfg  = ConfiguracionInstitucional::instancia();
        $html = view('pdfs.libro_registro_nc', compact('alumnos', 'cfg'))->render();
        $pdf  = $this->gotenberg->htmlToPdfLandscape($html);

        return response($pdf, 200, $this->headers('libro-registro-nc-' . now()->format('Ymd') . '.pdf'));
    }

    // GET /api/alumnos/{alumno}/carga-academica/{periodo}/pdf
    public function cargaAcademica(Alumno $alumno, Periodo $periodo): Response
    {
        $this->authorize('view', $alumno);

        $alumno->load(['carrera', 'periodoIngreso', 'inscripcion.aspirante']);
        $cfg = ConfiguracionInstitucional::instancia();

        // Grupos del alumno en el periodo
        $grupoIds = \App\Domains\Academico\Models\Grupo::whereHas('alumnos', fn($q) => $q->where('alumnos.id', $alumno->id))
            ->where('periodo_id', $periodo->id)
            ->pluck('id');

        $cargas = CargaAcademica::with(['materia', 'grupo', 'docente', 'aula', 'horarios'])
            ->whereIn('grupo_id', $grupoIds)
            ->where('periodo_id', $periodo->id)
            ->get();

        $html = view('pdfs.carga_academica', compact('alumno', 'periodo', 'cargas', 'cfg'))->render();
        $pdf  = $this->gotenberg->htmlToPdf($html);

        return response($pdf, 200, $this->headers("carga-academica-{$alumno->numero_control}.pdf"));
    }

    private function headers(string $filename): array
    {
        return [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ];
    }
}
