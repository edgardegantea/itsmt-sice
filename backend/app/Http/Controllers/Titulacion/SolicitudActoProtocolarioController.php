<?php

namespace App\Http\Controllers\Titulacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Titulacion\Models\CertificadoIdioma;
use App\Domains\Titulacion\Models\ConstanciaNoInconveniencia;
use App\Domains\Titulacion\Models\SolicitudActoProtocolario;
use App\Domains\Vinculacion\Models\ServicioSocial;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SolicitudActoProtocolarioController extends Controller
{
    // GET /solicitudes-acto-protocolario
    public function index(Request $request): JsonResponse
    {
        $user   = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::success([]);
            }
            $items = SolicitudActoProtocolario::with(['modalidad', 'constanciaNoInconveniencia', 'actoProtocolario'])
                ->where('alumno_id', $alumno->id)
                ->latest()
                ->get();
            return ApiResponse::success($items);
        }

        $carreraForzada = $user->carreraRestringida();
        $query = SolicitudActoProtocolario::with(['alumno.user', 'alumno.carrera', 'modalidad', 'constanciaNoInconveniencia', 'actoProtocolario'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),   fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('alumno_id'), fn($q, $v) => $q->where('alumno_id', $v));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /solicitudes-acto-protocolario  (S7-03 — alumno solicita)
    public function store(Request $request): JsonResponse
    {
        $user   = $request->user();
        $alumno = Alumno::where('user_id', $user->id)->first();
        if (! $alumno) {
            return ApiResponse::error('No se encontró el registro de alumno.', 404);
        }

        $data = $request->validate([
            'modalidad_id' => ['required', 'uuid', 'exists:modalidades_titulacion,id'],
        ]);

        // Prerrequisito 1: SS acreditado
        $ssAcreditado = ServicioSocial::where('alumno_id', $alumno->id)
            ->where('estatus', 'acreditado')
            ->exists();
        if (! $ssAcreditado) {
            return ApiResponse::error('Debes tener el Servicio Social acreditado para solicitar el Acto Protocolario.', 422);
        }

        // Prerrequisito 2: certificado de idioma B1 MCER validado
        $idiomaValidado = CertificadoIdioma::where('alumno_id', $alumno->id)
            ->where('validado', true)
            ->exists();
        if (! $idiomaValidado) {
            return ApiResponse::error('Debes contar con un certificado de lengua extranjera (B1 MCER) validado por la institución.', 422);
        }

        // Prerrequisito 3: créditos de carrera acreditados (≥100%)
        $creditos = $this->calcularPorcentajeCreditos($alumno);
        if ($creditos['porcentaje'] < 100) {
            return ApiResponse::error(
                "Debes haber acreditado todos los créditos de tu carrera. Tienes {$creditos['porcentaje']}% ({$creditos['acreditados']}/{$creditos['total']} créditos).",
                422
            );
        }

        // Sin solicitud activa en proceso
        $existente = SolicitudActoProtocolario::where('alumno_id', $alumno->id)
            ->whereNotIn('estatus', ['no_procede', 'reprobado'])
            ->first();
        if ($existente) {
            return ApiResponse::error('Ya tienes una solicitud de Acto Protocolario activa o concluida favorablemente.', 422);
        }

        $solicitud = SolicitudActoProtocolario::create([
            'alumno_id'    => $alumno->id,
            'modalidad_id' => $data['modalidad_id'],
            'estatus'      => 'pendiente_revision',
        ]);

        return ApiResponse::success(
            $solicitud->load(['alumno.user', 'modalidad']),
            'Solicitud de Acto Protocolario registrada. En espera de revisión por Servicios Escolares.',
            201
        );
    }

    // PATCH /solicitudes-acto-protocolario/{id}/no-inconveniencia  (S7-04)
    public function emitirNoInconveniencia(Request $request, SolicitudActoProtocolario $solicitudActoProtocolario): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $data = $request->validate([
            'procede'               => ['required', 'boolean'],
            'motivo_improcedencia'  => ['nullable', 'string', 'max:1000'],
        ]);

        if ($solicitudActoProtocolario->estatus !== 'pendiente_revision') {
            return ApiResponse::error('La solicitud no está en estado pendiente de revisión.', 422);
        }

        if (! $data['procede']) {
            $solicitudActoProtocolario->update([
                'estatus'               => 'no_procede',
                'motivo_improcedencia'  => $data['motivo_improcedencia'],
            ]);
            return ApiResponse::success(
                $solicitudActoProtocolario->fresh(['alumno.user', 'modalidad']),
                'Solicitud marcada como no procedente.'
            );
        }

        // Emitir Constancia de No Inconveniencia (PO-006-02)
        if ($solicitudActoProtocolario->constanciaNoInconveniencia()->exists()) {
            return ApiResponse::error('Ya existe una Constancia de No Inconveniencia para esta solicitud.', 422);
        }

        $constancia = ConstanciaNoInconveniencia::create([
            'solicitud_id'  => $solicitudActoProtocolario->id,
            'emitida_por'   => $user->id,
            'fecha_emision' => now()->toDateString(),
        ]);

        $solicitudActoProtocolario->update(['estatus' => 'con_no_inconveniencia']);

        return ApiResponse::success(
            $solicitudActoProtocolario->fresh(['alumno.user', 'modalidad', 'constanciaNoInconveniencia.emitidaPor']),
            'Constancia de No Inconveniencia emitida (PO-006-02).',
            201
        );
    }

    // GET /solicitudes-acto-protocolario/{id}/no-inconveniencia/pdf
    public function noInconvenienciaPdf(SolicitudActoProtocolario $solicitudActoProtocolario): Response
    {
        $constancia = $solicitudActoProtocolario->constanciaNoInconveniencia()->with('emitidaPor')->first();
        if (! $constancia) {
            abort(404, 'No se ha emitido la Constancia de No Inconveniencia.');
        }

        $solicitudActoProtocolario->load(['alumno.user', 'alumno.carrera', 'modalidad']);

        $pdf = Pdf::loadView('pdfs.constancia_no_inconveniencia', [
            'solicitud'  => $solicitudActoProtocolario,
            'constancia' => $constancia,
        ])->setPaper('letter');

        return $pdf->download("constancia_no_inconveniencia_{$solicitudActoProtocolario->id}.pdf");
    }

    private function calcularPorcentajeCreditos(Alumno $alumno): array
    {
        $total = MallaCurricular::where('mallas_curriculares.carrera_id', $alumno->carrera_id)
            ->join('materias', 'mallas_curriculares.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        if ($total === 0) {
            return ['porcentaje' => 0, 'acreditados' => 0, 'total' => 0];
        }

        $acreditados = \App\Domains\Academico\Models\Calificacion::where('calificaciones.alumno_id', $alumno->id)
            ->where('calificaciones.acreditado', true)
            ->join('cargas_academicas', 'calificaciones.grupo_id', '=', 'cargas_academicas.grupo_id')
            ->join('materias', 'cargas_academicas.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        $porcentaje = round(($acreditados / $total) * 100, 1);

        return ['porcentaje' => $porcentaje, 'acreditados' => (int) $acreditados, 'total' => (int) $total];
    }
}
