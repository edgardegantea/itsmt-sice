<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\HorarioTrabajo;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HorarioTrabajoController extends Controller
{
    // GET /horarios-trabajo  (admin/jefe_carrera lista todos)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $carreraForzada = $user->carreraRestringida();

        $horarios = HorarioTrabajo::with(['docente', 'periodo'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('docente', fn($uq) => $uq->where('carrera_id', $v))
            )
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($horarios);
    }

    // GET /horarios-trabajo/mio  (docente ve el suyo)
    public function mio(Request $request): JsonResponse
    {
        $user = $request->user();
        $periodoId = $request->query('periodo_id');

        $query = HorarioTrabajo::with('periodo')->where('docente_id', $user->id);

        if ($periodoId) {
            $query->where('periodo_id', $periodoId);
        } else {
            $periodoActivo = Periodo::where('activo', true)->first();
            if ($periodoActivo) {
                $query->where('periodo_id', $periodoActivo->id);
            }
        }

        return ApiResponse::success($query->first());
    }

    // POST /horarios-trabajo  (docente crea o actualiza el suyo — upsert por docente+periodo)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'periodo_id'             => ['required', 'uuid', 'exists:periodos,id'],
            'carga_academica_json'   => ['nullable', 'array'],
            'apoyo_docencia_json'    => ['nullable', 'array'],
            'actividades_admin_json' => ['nullable', 'array'],
            'total_horas_semanales'  => ['nullable', 'integer', 'min:0', 'max:80'],
            'cct_docente'            => ['nullable', 'string', 'max:20'],
            'tipo_nombramiento'      => ['nullable', 'string', 'max:80'],
            'fecha_ingreso_sep'      => ['nullable', 'date'],
            'url_pdf'                => ['nullable', 'string', 'max:500'],
        ]);

        $horario = HorarioTrabajo::updateOrCreate(
            ['docente_id' => $user->id, 'periodo_id' => $data['periodo_id']],
            $data + ['docente_id' => $user->id]
        );

        return ApiResponse::success($horario->fresh(['docente', 'periodo']), 'Horario de trabajo guardado.', 201);
    }

    // GET /horarios-trabajo/{horarioTrabajo}  (admin o el propio docente)
    public function show(Request $request, HorarioTrabajo $horarioTrabajo): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin && $horarioTrabajo->docente_id !== $user->id) {
            abort(403);
        }

        return ApiResponse::success($horarioTrabajo->load(['docente', 'periodo']));
    }
}
