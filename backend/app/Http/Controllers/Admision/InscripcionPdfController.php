<?php

namespace App\Http\Controllers\Admision;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class InscripcionPdfController extends Controller
{
    // GET /api/inscripciones/{inscripcion}/solicitud-inscripcion/pdf
    public function solicitudInscripcion(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo']);

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

        $pdf = Pdf::loadView('pdfs.solicitud_inscripcion', compact('inscripcion', 'documentos'))
            ->setPaper('letter', 'portrait')
            ->setOption('margin-top', 0)->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0)->setOption('margin-right', 0)
            ->setOption('dpi', 120)->setOption('defaultFont', 'Arial');

        $inscripcion->update(['solicitud_inscripcion_generada' => true]);

        return $pdf->stream("solicitud-inscripcion-{$inscripcion->numero_control}.pdf");
    }

    // GET /api/inscripciones/{inscripcion}/carta-compromiso/pdf
    public function cartaCompromiso(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo']);

        $pdf = Pdf::loadView('pdfs.carta_compromiso', compact('inscripcion'));
        $inscripcion->update(['carta_compromiso_generada' => true]);

        return $pdf->stream("carta-compromiso-{$inscripcion->numero_control}.pdf");
    }

    // GET /api/inscripciones/{inscripcion}/contrato-estudiante/pdf
    public function contratoEstudiante(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo']);

        $pdf = Pdf::loadView('pdfs.contrato_estudiante', compact('inscripcion'));
        $inscripcion->update(['contrato_generado' => true]);

        return $pdf->stream("contrato-estudiante-{$inscripcion->numero_control}.pdf");
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

        $pdf = Pdf::loadView('pdfs.lista_aspirantes_aceptados', compact('periodo', 'aspirantes'))
            ->setPaper('letter', 'portrait')
            ->setOption('margin-top', 0)->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0)->setOption('margin-right', 0)
            ->setOption('dpi', 120)->setOption('defaultFont', 'Arial');

        return $pdf->stream("lista-aceptados-{$periodo->id}.pdf");
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

        $pdf = Pdf::loadView('pdfs.lista_aspirantes_por_carrera', compact('periodo', 'aspirantes'))
            ->setPaper('letter', 'portrait')
            ->setOption('margin-top', 0)->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0)->setOption('margin-right', 0)
            ->setOption('dpi', 120)->setOption('defaultFont', 'Arial');

        return $pdf->stream("lista-aceptados-por-carrera-{$periodo->id}.pdf");
    }

    // GET /api/inscripciones/{inscripcion}/carta-compromiso-docs/pdf
    public function cartaCompromisoDocs(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $inscripcion->load(['aspirante', 'carrera', 'periodo']);

        $pdf = Pdf::loadView('pdfs.carta_compromiso_docs', compact('inscripcion'));

        return $pdf->stream("carta-compromiso-docs-{$inscripcion->numero_control}.pdf");
    }

    // GET /api/inscripciones/{inscripcion}/credencial/pdf
    public function credencial(Inscripcion $inscripcion): Response
    {
        $this->authorize('view', $inscripcion->aspirante);

        $alumno = $inscripcion->alumno()->with(['carrera', 'periodoIngreso', 'inscripcion.aspirante'])->firstOrFail();

        $pdf = Pdf::loadView('pdfs.credencial', compact('alumno'))
            ->setPaper([0, 0, 242.64, 153.07]);

        return $pdf->stream("credencial-{$alumno->numero_control}.pdf");
    }

    // GET /api/libro-registro-nc
    public function libroRegistroNc(): Response
    {
        $this->authorize('viewAny', Alumno::class);

        $alumnos = Alumno::with(['inscripcion.aspirante', 'carrera', 'periodoIngreso'])
            ->orderBy('numero_control')
            ->get();

        $pdf = Pdf::loadView('pdfs.libro_registro_nc', compact('alumnos'))
            ->setPaper('letter', 'landscape')
            ->setOption('margin-top', 0)->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0)->setOption('margin-right', 0)
            ->setOption('dpi', 120)->setOption('defaultFont', 'Arial');

        return $pdf->stream('libro-registro-nc-' . now()->format('Ymd') . '.pdf');
    }
}
