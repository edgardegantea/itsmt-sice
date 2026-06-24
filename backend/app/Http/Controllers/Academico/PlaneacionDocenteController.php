<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class PlaneacionDocenteController extends Controller
{
    // GET /api/planeaciones-docentes  (admin/jefe_carrera lista)
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $planeaciones = PlaneacionDocente::with(['docente', 'periodo', 'cargaAcademica.materia', 'cargaAcademica.grupo.carrera'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupo', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),   fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($planeaciones);
    }

    // GET /api/planeaciones-docentes/mias  (docente ve las suyas)
    public function mias(Request $request): JsonResponse
    {
        $planeaciones = PlaneacionDocente::with(['periodo', 'cargaAcademica.materia', 'cargaAcademica.grupo'])
            ->where('docente_id', $request->user()->id)
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->latest()
            ->get();

        return ApiResponse::success($planeaciones);
    }

    // POST /api/planeaciones-docentes  (docente crea/actualiza borrador)
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carga_academica_id'    => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'periodo_id'            => ['required', 'uuid', 'exists:periodos,id'],
            'archivo_url'           => ['nullable', 'string', 'max:500'],
            'caracterizacion'       => ['nullable', 'string'],
            'intencion_didactica'   => ['nullable', 'string'],
            'competencias'          => ['nullable', 'array'],
            'fuentes_informacion'   => ['nullable', 'string'],
            'apoyos_didacticos'     => ['nullable', 'string'],
            'calendarizacion'       => ['nullable', 'array'],
            'fecha_entrega'         => ['nullable', 'date', function ($attr, $val, $fail) use ($request) {
                if (! $val) return;
                $periodo = Periodo::find($request->input('periodo_id'));
                if (! $periodo) return;
                $entrega = Carbon::parse($val);
                $inicio  = Carbon::parse($periodo->fecha_inicio);
                $dias    = 0;
                $cursor  = $entrega->copy()->addDay();
                while ($cursor->lte($inicio)) {
                    if ($cursor->isWeekday()) $dias++;
                    $cursor->addDay();
                }
                if ($dias < 3) {
                    $fail('La fecha de entrega debe ser al menos 3 días hábiles antes del inicio del periodo (TecNM PO-003 §3.4).');
                }
            }],
        ]);

        // Validar que la carga pertenece al docente autenticado
        $carga = CargaAcademica::findOrFail($data['carga_academica_id']);
        if ($request->user()->hasRole(['docente']) && $carga->docente_id !== $request->user()->id) {
            return ApiResponse::error('Esta carga académica no te pertenece.', 403);
        }

        $planeacion = PlaneacionDocente::updateOrCreate(
            ['carga_academica_id' => $data['carga_academica_id'], 'periodo_id' => $data['periodo_id']],
            array_merge($data, ['docente_id' => $carga->docente_id])
        );

        return ApiResponse::success(
            $planeacion->fresh(['cargaAcademica.materia', 'periodo']),
            'Planeación guardada.',
            201
        );
    }

    // POST /api/planeaciones-docentes/{planeacion}/entregar  (docente entrega)
    public function entregar(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if ($planeacionDocente->docente_id !== $request->user()->id) {
            return ApiResponse::error('No tienes permiso para entregar esta planeación.', 403);
        }

        if (!in_array($planeacionDocente->estatus, ['borrador', 'devuelta'])) {
            return ApiResponse::error('Solo puedes entregar planeaciones en borrador o devueltas.', 422);
        }

        $planeacionDocente->update(['estatus' => 'entregada', 'entregada_en' => now()]);
        $planeacionDocente->load(['cargaAcademica.materia', 'cargaAcademica.grupo.carrera', 'docente', 'periodo']);

        // Notificar al jefe de carrera (TecNM PO-003)
        $carreraId = $planeacionDocente->cargaAcademica?->grupo?->carrera_id;
        $jefes = User::role('jefe_carrera')
            ->when($carreraId, fn($q) => $q->where('carrera_id', $carreraId))
            ->get();
        foreach ($jefes as $jefe) {
            Mail::to($jefe->email)->queue(new \App\Mail\PlaneacionDocenteEntregadaMail($planeacionDocente));
        }

        return ApiResponse::success($planeacionDocente, 'Planeación entregada.');
    }

    // PATCH /api/planeaciones-docentes/{planeacion}/estatus  (jefe/admin revisa)
    public function cambiarEstatus(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', 'personal_administrativo'])) {
            return ApiResponse::error('No tienes permiso para revisar planeaciones.', 403);
        }

        $data = $request->validate([
            'estatus'                => ['required', 'in:revisada,liberada,devuelta'],
            'observaciones_revision' => ['nullable', 'string', 'max:1000'],
        ]);

        // Transiciones permitidas: solo planeaciones entregadas pueden ser revisadas
        $transicionesPermitidas = [
            'entregada' => ['revisada', 'liberada', 'devuelta'],
            'revisada'  => ['liberada', 'devuelta'],
        ];
        $permitidas = $transicionesPermitidas[$planeacionDocente->estatus] ?? [];
        if (! in_array($data['estatus'], $permitidas)) {
            return ApiResponse::error(
                "Transición no permitida: {$planeacionDocente->estatus} → {$data['estatus']}. La planeación debe estar entregada para poder revisarse.",
                422
            );
        }

        $planeacionDocente->update([
            'estatus'                => $data['estatus'],
            'observaciones_revision' => $data['observaciones_revision'] ?? null,
            'revisado_por'           => $request->user()->id,
            'revisado_en'            => now(),
        ]);

        return ApiResponse::success($planeacionDocente->load(['cargaAcademica.materia', 'revisadoPor']), 'Estatus actualizado.');
    }
}
