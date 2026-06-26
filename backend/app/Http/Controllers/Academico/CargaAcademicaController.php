<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CargaAcademicaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $cargas = CargaAcademica::with(['docente', 'materia.carrera', 'grupo', 'periodo', 'aula', 'horarios'])
            ->when($carreraForzada, fn($q, $v) => $q->whereHas('grupo', fn($gq) => $gq->where('carrera_id', $v)))
            ->when($request->query('docente_id'), fn($q, $d) => $q->where('docente_id', $d))
            ->when($request->query('periodo_id'), fn($q, $p) => $q->where('periodo_id', $p))
            ->when($request->query('grupo_id'),   fn($q, $g) => $q->where('grupo_id', $g))
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success($cargas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_id'  => ['required', 'uuid', 'exists:users,id'],
            'materia_id'  => ['required', 'uuid', 'exists:materias,id'],
            'grupo_id'    => ['required', 'uuid', 'exists:grupos,id'],
            'periodo_id'  => ['required', 'uuid', 'exists:periodos,id'],
            'aula_id'     => ['nullable', 'uuid', 'exists:aulas,id'],
            'horas_semana'=> ['required', 'integer', 'min:1', 'max:40'],
        ]);

        $docente = User::findOrFail($data['docente_id']);
        if (! $docente->hasRole(['docente', 'jefe_carrera', 'director_academico', 'admin', 'superadmin'])) {
            return ApiResponse::error('El usuario seleccionado no tiene perfil de docente.', 422);
        }

        // Jefe de carrera solo puede asignar cargas a grupos de su propia carrera
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $grupo = \App\Domains\Academico\Models\Grupo::findOrFail($data['grupo_id']);
            if ($grupo->carrera_id !== $carreraForzada) {
                return ApiResponse::error('Solo puedes asignar cargas a grupos de tu carrera.', 403);
            }
        }

        $carga = CargaAcademica::create($data);

        return ApiResponse::success(
            $carga->load(['docente', 'materia.carrera', 'grupo', 'periodo', 'aula']),
            'Carga académica asignada.',
            201
        );
    }

    private function verificarCarreraEnCarga(Request $request, CargaAcademica $carga): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida) {
            $carga->loadMissing('grupo');
            if ($carga->grupo?->carrera_id !== $restringida) {
                abort(403, 'No tienes permiso para modificar cargas de otra carrera.');
            }
        }
    }

    public function update(Request $request, CargaAcademica $cargaAcademica): JsonResponse
    {
        $this->verificarCarreraEnCarga($request, $cargaAcademica);

        $data = $request->validate([
            'docente_id'   => ['sometimes', 'uuid', 'exists:users,id'],
            'materia_id'   => ['sometimes', 'uuid', 'exists:materias,id'],
            'grupo_id'     => ['sometimes', 'uuid', 'exists:grupos,id'],
            'periodo_id'   => ['sometimes', 'uuid', 'exists:periodos,id'],
            'aula_id'      => ['nullable', 'uuid', 'exists:aulas,id'],
            'horas_semana' => ['sometimes', 'integer', 'min:1', 'max:40'],
        ]);

        $cargaAcademica->update($data);

        return ApiResponse::success(
            $cargaAcademica->fresh(['docente', 'materia.carrera', 'grupo', 'periodo']),
            'Carga actualizada.'
        );
    }

    public function destroy(Request $request, CargaAcademica $cargaAcademica): JsonResponse
    {
        $this->verificarCarreraEnCarga($request, $cargaAcademica);

        $cargaAcademica->delete();

        return ApiResponse::success(null, 'Carga académica eliminada.');
    }

    // GET /api/admin/docentes — usuarios con rol docente para selects
    public function docentes(): JsonResponse
    {
        $docentes = User::role(['docente', 'jefe_carrera', 'director_academico'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'clave_empleado', 'no_huella', 'nombramiento', 'tipo_horas']);

        return ApiResponse::success($docentes);
    }
}
