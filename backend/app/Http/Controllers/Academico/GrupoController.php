<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Grupo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GrupoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $carreraParam  = $request->query('carrera_id');
        $carreraValida = $carreraParam && preg_match('/^[0-9a-f-]{36}$/i', $carreraParam) ? $carreraParam : null;

        $grupos = Grupo::with(['carrera', 'periodo'])
            ->withCount('alumnos')
            ->when($carreraForzada,                                    fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && $carreraValida,                fn($q)     => $q->where('carrera_id', $carreraValida))
            ->when($request->query('periodo_id'), fn($q, $p) => $q->where('periodo_id', $p))
            ->when($request->query('semestre'),   fn($q, $s) => $q->where('semestre', $s))
            ->orderBy('semestre')->orderBy('clave')
            ->get();

        return ApiResponse::success($grupos);
    }

    public function show(Request $request, Grupo $grupo): JsonResponse
    {
        $this->verificarCarrera($request, $grupo->carrera_id);

        return ApiResponse::success(
            $grupo->load([
                'carrera', 'periodo',
                'alumnos.user',
                'alumnos.inscripcion.aspirante',
                'cargas.docente', 'cargas.materia', 'cargas.aula', 'cargas.horarios',
            ])
        );
    }

    private function verificarCarrera(Request $request, string $carreraId): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida && $restringida !== $carreraId) {
            abort(403, 'No tienes permiso para gestionar datos de otra carrera.');
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrera_id' => ['required', 'uuid', 'exists:carreras,id'],
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'clave'      => ['required', 'string', 'max:20'],
            'semestre'   => ['required', 'integer', 'min:1', 'max:12'],
            'turno'      => ['required', Rule::in(['matutino', 'vespertino', 'sabatino'])],
            'capacidad'  => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $this->verificarCarrera($request, $data['carrera_id']);

        $grupo = Grupo::create($data);

        return ApiResponse::success($grupo->load(['carrera', 'periodo']), 'Grupo creado.', 201);
    }

    public function update(Request $request, Grupo $grupo): JsonResponse
    {
        $this->verificarCarrera($request, $grupo->carrera_id);

        $data = $request->validate([
            'clave'     => ['sometimes', 'string', 'max:20'],
            'semestre'  => ['sometimes', 'integer', 'min:1', 'max:12'],
            'turno'     => ['sometimes', Rule::in(['matutino', 'vespertino', 'sabatino'])],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'activo'    => ['sometimes', 'boolean'],
        ]);

        $grupo->update($data);

        return ApiResponse::success($grupo->fresh(['carrera', 'periodo']), 'Grupo actualizado.');
    }

    public function destroy(Request $request, Grupo $grupo): JsonResponse
    {
        $this->verificarCarrera($request, $grupo->carrera_id);

        $grupo->delete();

        return ApiResponse::success(null, 'Grupo eliminado.');
    }

    // POST /api/admin/grupos/{grupo}/alumnos
    public function asignarAlumnos(Request $request, Grupo $grupo): JsonResponse
    {
        $this->verificarCarrera($request, $grupo->carrera_id);

        $data = $request->validate([
            'alumno_ids'   => ['required', 'array'],
            'alumno_ids.*' => ['uuid', 'exists:alumnos,id'],
        ]);

        $sync = collect($data['alumno_ids'])->mapWithKeys(fn($id) => [
            $id => ['fecha_asignacion' => now()->toDateString()],
        ]);

        $grupo->alumnos()->syncWithoutDetaching($sync->all());

        return ApiResponse::success(
            $grupo->load(['alumnos.user', 'alumnos.inscripcion.aspirante'])->alumnos,
            count($data['alumno_ids']) . ' alumno(s) asignado(s).'
        );
    }

    // DELETE /api/admin/grupos/{grupo}/alumnos/{alumno}
    public function quitarAlumno(Request $request, Grupo $grupo, Alumno $alumno): JsonResponse
    {
        $this->verificarCarrera($request, $grupo->carrera_id);

        $grupo->alumnos()->detach($alumno->id);

        return ApiResponse::success(null, 'Alumno retirado del grupo.');
    }

    // PATCH /api/grupos/{grupo}/liberar-horarios
    public function liberarHorarios(Request $request, Grupo $grupo): JsonResponse
    {
        if (! $request->user()?->hasRole(['admin', 'superadmin'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $liberar = $request->boolean('liberar', true);
        $grupo->update(['horarios_liberados' => $liberar]);

        $estado = $liberar ? 'liberados' : 'ocultados';
        return ApiResponse::success($grupo->fresh(), "Horarios del grupo «{$grupo->clave}» {$estado}.");
    }

    // POST /api/grupos/liberar-horarios-bulk
    public function liberarHorariosBulk(Request $request): JsonResponse
    {
        if (! $request->user()?->hasRole(['admin', 'superadmin'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'liberar'    => ['required', 'boolean'],
            'periodo_id' => ['sometimes', 'uuid', 'exists:periodos,id'],
            'carrera_id' => ['sometimes', 'uuid', 'exists:carreras,id'],
            'semestre'   => ['sometimes', 'integer', 'min:1', 'max:12'],
        ]);

        $query = Grupo::query();

        if (isset($data['periodo_id'])) $query->where('periodo_id', $data['periodo_id']);
        if (isset($data['carrera_id'])) $query->where('carrera_id', $data['carrera_id']);
        if (isset($data['semestre']))   $query->where('semestre', $data['semestre']);

        $count = $query->update(['horarios_liberados' => $data['liberar']]);

        $estado = $data['liberar'] ? 'liberados' : 'ocultados';
        return ApiResponse::success(['grupos_afectados' => $count], "{$count} grupo(s) {$estado}.");
    }
}
