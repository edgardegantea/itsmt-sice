<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Services\HorarioService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HorarioController extends Controller
{
    public function __construct(private HorarioService $service) {}

    // GET /api/horarios?periodo_id=&grupo_id=&docente_id=
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $horarios = Horario::with(['cargaAcademica.docente', 'cargaAcademica.materia', 'cargaAcademica.grupo.carrera', 'cargaAcademica.aula'])
            ->when($request->query('periodo_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica', fn($cq) => $cq->where('periodo_id', $v))
            )
            ->when($request->query('grupo_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica', fn($cq) => $cq->where('grupo_id', $v))
            )
            ->when($request->query('docente_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica', fn($cq) => $cq->where('docente_id', $v))
            )
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupo', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->get();

        return ApiResponse::success($horarios);
    }

    // GET /api/horarios/conflictos?carga_academica_id=&dia_semana=&hora_inicio=&hora_fin=
    public function conflictos(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'dia_semana'         => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio'        => ['required', 'date_format:H:i'],
            'hora_fin'           => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        $conflictos = $this->service->detectarConflictos(
            $data['carga_academica_id'],
            $data['dia_semana'],
            $data['hora_inicio'],
            $data['hora_fin'],
            $request->query('excluir_horario_id'),
        );

        return ApiResponse::success(['conflictos' => $conflictos, 'tiene_conflictos' => !empty($conflictos)]);
    }

    // POST /api/horarios  — guarda bloques para una carga (reemplaza los existentes)
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'bloques'            => ['required', 'array', 'min:1'],
            'bloques.*.dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'bloques.*.hora_inicio' => ['required', 'date_format:H:i'],
            'bloques.*.hora_fin'    => ['required', 'date_format:H:i', 'after:bloques.*.hora_inicio'],
        ]);

        $carga = CargaAcademica::findOrFail($data['carga_academica_id']);

        // Validar carrera del jefe
        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada) {
            $carga->loadMissing('grupo');
            if ($carga->grupo?->carrera_id !== $carreraForzada) {
                return ApiResponse::error('No tienes permiso para modificar horarios de otra carrera.', 403);
            }
        }

        try {
            $horarios = $this->service->guardarHorarios($carga, $data['bloques']);
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($horarios, 'Horarios guardados.', 201);
    }

    // DELETE /api/horarios/{horario}
    public function destroy(Horario $horario): JsonResponse
    {
        $horario->delete();
        return ApiResponse::success(null, 'Bloque de horario eliminado.');
    }
}
