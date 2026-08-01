<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\MallaCurricular;
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

        $cargas = CargaAcademica::with([
                'docente', 'materia.carrera', 'periodo', 'aula', 'horarios', 'planeacion',
                'grupos' => fn ($q) => $q->with('carrera')->withCount('alumnos'),
            ])
            ->when($carreraForzada, fn($q, $v) => $q->whereHas('grupos', fn($gq) => $gq->where('carrera_id', $v)))
            ->when($request->query('docente_id'), fn($q, $d) => $q->where('docente_id', $d))
            ->when($request->query('periodo_id'), fn($q, $p) => $q->where('periodo_id', $p))
            ->when($request->query('grupo_id'),   fn($q, $g) => $q->whereHas('grupos', fn($gq) => $gq->where('grupos.id', $g)))
            ->orderBy('created_at', 'desc')
            ->get();

        $cargas->each(fn($carga) => $carga->setAttribute(
            'instrumentacion_liberada',
            $carga->planeacion?->estatus === 'liberada'
        ));

        return ApiResponse::success($cargas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_id'   => ['required', 'uuid', 'exists:users,id'],
            'materia_id'   => ['required', 'uuid', 'exists:materias,id'],
            'grupo_ids'    => ['required', 'array', 'min:1'],
            'grupo_ids.*'  => ['uuid', 'exists:grupos,id'],
            'periodo_id'   => ['required', 'uuid', 'exists:periodos,id'],
            'aula_id'      => ['nullable', 'uuid', 'exists:aulas,id'],
            'horas_semana' => ['required', 'integer', 'min:1', 'max:40'],
        ]);

        $docente = User::findOrFail($data['docente_id']);
        if (! $docente->hasRole(['docente', 'jefe_carrera', 'director_academico', 'admin', 'superadmin'])) {
            return ApiResponse::error('El usuario seleccionado no tiene perfil de docente.', 422);
        }

        $grupos = Grupo::whereIn('id', $data['grupo_ids'])->get();

        // Jefe de carrera solo puede asignar cargas a grupos de su propia carrera
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada && $grupos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
            return ApiResponse::error('Solo puedes asignar cargas a grupos de tu carrera.', 403);
        }

        foreach ($grupos as $grupo) {
            if (! $this->materiaEnMalla($grupo, $data['materia_id'])) {
                return ApiResponse::error("Esa materia no pertenece a la malla curricular del grupo {$grupo->clave} (carrera/semestre).", 422);
            }
        }

        $carga = CargaAcademica::create([
            'docente_id'   => $data['docente_id'],
            'materia_id'   => $data['materia_id'],
            'periodo_id'   => $data['periodo_id'],
            'aula_id'      => $data['aula_id'] ?? null,
            'horas_semana' => $data['horas_semana'],
        ]);
        $carga->grupos()->sync($data['grupo_ids']);

        return ApiResponse::success(
            $carga->load(['docente', 'materia.carrera', 'grupos', 'periodo', 'aula']),
            'Carga académica asignada.',
            201
        );
    }

    /** S3-01: valida que la materia pertenezca a la malla curricular del grupo (carrera + semestre). */
    private function materiaEnMalla(Grupo $grupo, string $materiaId): bool
    {
        return MallaCurricular::where('carrera_id', $grupo->carrera_id)
            ->where('materia_id', $materiaId)
            ->where('semestre', $grupo->semestre)
            ->exists();
    }

    private function verificarCarreraEnCarga(Request $request, CargaAcademica $carga): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida) {
            $carga->loadMissing('grupos');
            if ($carga->grupos->isNotEmpty() && $carga->grupos->contains(fn($g) => $g->carrera_id !== $restringida)) {
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
            'grupo_ids'    => ['sometimes', 'array', 'min:1'],
            'grupo_ids.*'  => ['uuid', 'exists:grupos,id'],
            'periodo_id'   => ['sometimes', 'uuid', 'exists:periodos,id'],
            'aula_id'      => ['nullable', 'uuid', 'exists:aulas,id'],
            'horas_semana' => ['sometimes', 'integer', 'min:1', 'max:40'],
        ]);

        if (array_key_exists('materia_id', $data) || array_key_exists('grupo_ids', $data)) {
            $grupos    = isset($data['grupo_ids']) ? Grupo::whereIn('id', $data['grupo_ids'])->get() : $cargaAcademica->grupos;
            $materiaId = $data['materia_id'] ?? $cargaAcademica->materia_id;

            foreach ($grupos as $grupo) {
                if (! $this->materiaEnMalla($grupo, $materiaId)) {
                    return ApiResponse::error("Esa materia no pertenece a la malla curricular del grupo {$grupo->clave} (carrera/semestre).", 422);
                }
            }
        }

        $grupoIds = $data['grupo_ids'] ?? null;
        unset($data['grupo_ids']);

        $cargaAcademica->update($data);
        if ($grupoIds !== null) {
            $cargaAcademica->grupos()->sync($grupoIds);
        }

        return ApiResponse::success(
            $cargaAcademica->fresh(['docente', 'materia.carrera', 'grupos', 'periodo']),
            'Carga actualizada.'
        );
    }

    public function destroy(Request $request, CargaAcademica $cargaAcademica): JsonResponse
    {
        $this->verificarCarreraEnCarga($request, $cargaAcademica);

        $cargaAcademica->delete();

        return ApiResponse::success(null, 'Carga académica eliminada.');
    }

    // GET /api/admin/docentes?carrera_id=  — usuarios con rol docente para selects
    public function docentes(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();
        $carreraFiltro  = $carreraForzada ?? $request->query('carrera_id');

        $docentes = User::role(['docente', 'jefe_carrera', 'director_academico'])
            ->with('carreras:id,nombre,clave')
            ->when($carreraFiltro, fn($q, $v) => $q->deCarrera($v))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'clave_empleado', 'no_huella', 'nombramiento', 'tipo_horas', 'carrera_id']);

        return ApiResponse::success($docentes);
    }
}
