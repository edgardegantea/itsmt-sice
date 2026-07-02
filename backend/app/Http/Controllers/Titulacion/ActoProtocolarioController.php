<?php

namespace App\Http\Controllers\Titulacion;

use App\Domains\Titulacion\Models\ActoProtocolario;
use App\Domains\Titulacion\Models\SolicitudActoProtocolario;
use App\Domains\Titulacion\Models\Titulacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ActoProtocolarioController extends Controller
{
    // POST /actos-protocolarios  (S7-04 — programa el acto)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        // Política PO-006: Aviso de Realización debe enviarse con ≥3 días hábiles de anticipación
        $minFecha = Carbon::now();
        $diasHabiles = 0;
        while ($diasHabiles < 3) {
            $minFecha->addDay();
            if ($minFecha->isWeekday()) {
                $diasHabiles++;
            }
        }

        $data = $request->validate([
            'solicitud_id'       => ['required', 'uuid', 'exists:solicitudes_acto_protocolario,id'],
            'fecha'              => ['required', 'date', 'after_or_equal:' . $minFecha->toDateString()],
            'hora'               => ['required', 'date_format:H:i'],
            'lugar'              => ['required', 'string', 'max:200'],
            'sinodales_json'     => ['nullable', 'array'],
            'sinodales_json.*.nombre'        => ['required_with:sinodales_json', 'string'],
            'sinodales_json.*.rol_sinodal'   => ['required_with:sinodales_json', 'string'],
            'libro_actas_folio'  => ['nullable', 'string', 'max:50'],
        ]);

        $solicitud = SolicitudActoProtocolario::findOrFail($data['solicitud_id']);

        if ($solicitud->estatus !== 'con_no_inconveniencia') {
            return ApiResponse::error('La solicitud debe contar con Constancia de No Inconveniencia antes de programar el Acto Protocolario.', 422);
        }

        if ($solicitud->actoProtocolario()->exists()) {
            return ApiResponse::error('Ya existe un Acto Protocolario programado para esta solicitud.', 422);
        }

        $acto = ActoProtocolario::create(array_merge($data, [
            'resultado'          => 'pendiente',
            'aviso_enviado_en'   => now(),
        ]));

        $solicitud->update(['estatus' => 'agendado']);

        return ApiResponse::success(
            $acto->load(['solicitud.alumno.user', 'solicitud.modalidad']),
            'Acto Protocolario programado. Aviso de Realización (PO-006-03) generado.',
            201
        );
    }

    // GET /actos-protocolarios/{id}/aviso/pdf  (PO-006-03)
    public function avisoPdf(ActoProtocolario $actoProtocolario): Response
    {
        $actoProtocolario->load(['solicitud.alumno.user', 'solicitud.alumno.carrera', 'solicitud.modalidad']);

        $pdf = Pdf::loadView('pdfs.aviso_realizacion_acto', [
            'acto' => $actoProtocolario,
        ])->setPaper('letter');

        return $pdf->download("aviso_realizacion_acto_{$actoProtocolario->id}.pdf");
    }

    // PATCH /actos-protocolarios/{id}/resultado  (S7-04 — registra resultado)
    public function registrarResultado(Request $request, ActoProtocolario $actoProtocolario): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        if ($actoProtocolario->resultado !== 'pendiente') {
            return ApiResponse::error('El resultado de este Acto Protocolario ya fue registrado.', 422);
        }

        $data = $request->validate([
            'resultado'               => ['required', 'in:aprobado,reprobado'],
            'firmado_jefe_servicios'  => ['boolean'],
            'firmado_director'        => ['boolean'],
        ]);

        $actoProtocolario->update($data);
        $solicitud = $actoProtocolario->solicitud()->with('modalidad')->first();

        if ($data['resultado'] === 'reprobado') {
            // Política 3.2 PO-006: plazo de 3 meses para retake
            $solicitud->update([
                'estatus'              => 'reprobado',
                'retake_plazo_hasta'   => Carbon::now()->addMonths(3)->toDateString(),
            ]);
            return ApiResponse::success(
                $actoProtocolario->fresh(['solicitud.alumno.user', 'solicitud.modalidad']),
                'Resultado REPROBADO registrado. El egresado dispone de 3 meses para presentar nuevamente (política 3.2 PO-006).'
            );
        }

        // Aprobado — determinar estatus final según modalidad
        $nuevoEstatus = $solicitud->modalidad->requiere_examen ? 'aprobado' : 'exento';
        $solicitud->update(['estatus' => $nuevoEstatus]);

        // Crear registro de Titulación
        Titulacion::create([
            'alumno_id'            => $solicitud->alumno_id,
            'modalidad_id'         => $solicitud->modalidad_id,
            'acto_protocolario_id' => $actoProtocolario->id,
            'estatus'              => $nuevoEstatus,
            'etapa_actual'         => 'titulado',
        ]);

        $msg = $nuevoEstatus === 'exento'
            ? 'Resultado APROBADO (Exención de Examen Profesional). Constancia de Exención generada.'
            : 'Resultado APROBADO. Acta de Examen Profesional generada.';

        return ApiResponse::success(
            $actoProtocolario->fresh(['solicitud.alumno.user', 'solicitud.modalidad']),
            $msg
        );
    }

    // GET /actos-protocolarios/{id}/acta/pdf
    public function actaPdf(ActoProtocolario $actoProtocolario): Response
    {
        if ($actoProtocolario->resultado !== 'aprobado') {
            abort(422, 'El Acta de Examen Profesional solo puede generarse para actos con resultado APROBADO.');
        }

        $actoProtocolario->load(['solicitud.alumno.user', 'solicitud.alumno.carrera', 'solicitud.modalidad']);

        $pdf = Pdf::loadView('pdfs.acta_examen_profesional', [
            'acto' => $actoProtocolario,
        ])->setPaper('letter');

        return $pdf->download("acta_examen_profesional_{$actoProtocolario->id}.pdf");
    }

    // GET /actos-protocolarios/{id}/constancia-exencion/pdf
    public function constanciaExencionPdf(ActoProtocolario $actoProtocolario): Response
    {
        $solicitud = $actoProtocolario->solicitud()->with('modalidad')->first();

        if ($actoProtocolario->resultado !== 'aprobado' || $solicitud?->modalidad?->requiere_examen) {
            abort(422, 'La Constancia de Exención solo aplica para modalidades sin examen (opciones VIII, IX y Titulación Integral).');
        }

        $actoProtocolario->load(['solicitud.alumno.user', 'solicitud.alumno.carrera', 'solicitud.modalidad']);

        $pdf = Pdf::loadView('pdfs.constancia_exencion', [
            'acto' => $actoProtocolario,
        ])->setPaper('letter');

        return $pdf->download("constancia_exencion_{$actoProtocolario->id}.pdf");
    }
}
