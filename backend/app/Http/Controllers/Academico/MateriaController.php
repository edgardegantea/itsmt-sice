<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Materia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $materias = Materia::with('carrera')
            ->when($carreraForzada,                                    fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && $request->query('carrera_id'), fn($q, $c) => $q->where('carrera_id', $c))
            ->when($request->query('semestre'),   fn($q, $s) => $q->where('semestre', $s))
            ->when($request->query('q'),          fn($q, $s) => $q->where(fn($q) =>
                $q->where('nombre', 'ilike', "%$s%")->orWhere('clave', 'ilike', "%$s%")
            ))
            ->orderBy('semestre')->orderBy('nombre')
            ->get();

        return ApiResponse::success($materias);
    }

    private function verificarCarrera(Request $request, string $carreraId): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida && $restringida !== $carreraId) {
            abort(403, 'No tienes permiso para gestionar materias de otra carrera.');
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrera_id'           => ['required', 'uuid', 'exists:carreras,id'],
            'clave'                => ['required', 'string', 'max:20', 'unique:materias,clave'],
            'clave_oficial_tecnm'  => ['required', 'string', 'max:20'],
            'nombre'               => ['required', 'string', 'max:150'],
            'semestre'        => ['required', 'integer', 'min:1', 'max:10'],
            'creditos'        => ['required', 'integer', 'min:0'],
            'horas_teoria'    => ['required', 'integer', 'min:0'],
            'horas_practica'  => ['required', 'integer', 'min:0'],
            'tipo'            => ['required', Rule::in(['obligatoria', 'optativa'])],
        ]);

        $this->verificarCarrera($request, $data['carrera_id']);

        $materia = Materia::create($data);

        return ApiResponse::success($materia->load('carrera'), 'Materia creada.', 201);
    }

    public function update(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        $data = $request->validate([
            'carrera_id'          => ['sometimes', 'uuid', 'exists:carreras,id'],
            'clave'               => ['sometimes', 'string', 'max:20', Rule::unique('materias', 'clave')->ignore($materia->id)],
            'clave_oficial_tecnm' => ['sometimes', 'string', 'max:20'],
            'nombre'              => ['sometimes', 'string', 'max:150'],
            'semestre'       => ['sometimes', 'integer', 'min:1', 'max:10'],
            'creditos'       => ['sometimes', 'integer', 'min:0'],
            'horas_teoria'   => ['sometimes', 'integer', 'min:0'],
            'horas_practica' => ['sometimes', 'integer', 'min:0'],
            'tipo'           => ['sometimes', Rule::in(['obligatoria', 'optativa'])],
            'activa'         => ['sometimes', 'boolean'],
        ]);

        $materia->update($data);

        return ApiResponse::success($materia->fresh('carrera'), 'Materia actualizada.');
    }

    public function destroy(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        if ($materia->cargas()->exists()) {
            return ApiResponse::error('No se puede eliminar: la materia tiene cargas académicas asignadas.', 422);
        }

        $materia->delete();

        return ApiResponse::success(null, 'Materia eliminada.');
    }
}
