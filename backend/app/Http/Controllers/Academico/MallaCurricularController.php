<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\MallaCurricular;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MallaCurricularController extends Controller
{
    // GET /api/mallas-curriculares?carrera_id=&semestre=
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $mallas = MallaCurricular::with(['materia', 'carrera'])
            ->when($carreraForzada, fn($q, $v) => $q->where('carrera_id', $v))
            ->when(!$carreraForzada && $request->query('carrera_id'), fn($q, $v) => $q->where('carrera_id', $v))
            ->when($request->query('semestre'), fn($q, $v) => $q->where('semestre', $v))
            ->orderBy('semestre')
            ->orderBy('es_especialidad')
            ->get();

        return ApiResponse::success($mallas);
    }

    // POST /api/mallas-curriculares
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrera_id'    => ['required', 'uuid', 'exists:carreras,id'],
            'materia_id'    => ['required', 'uuid', 'exists:materias,id'],
            'semestre'      => ['required', 'integer', 'min:1', 'max:9'],
            'es_especialidad' => ['sometimes', 'boolean'],
        ]);

        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada && $carreraForzada !== $data['carrera_id']) {
            return ApiResponse::error('Solo puedes gestionar la malla de tu carrera.', 403);
        }

        $malla = MallaCurricular::firstOrCreate(
            ['carrera_id' => $data['carrera_id'], 'materia_id' => $data['materia_id'], 'semestre' => $data['semestre']],
            ['es_especialidad' => $data['es_especialidad'] ?? false]
        );

        return ApiResponse::success($malla->load(['materia', 'carrera']), 'Materia añadida a la malla.', 201);
    }

    // PATCH /api/mallas-curriculares/{malla}
    public function update(Request $request, MallaCurricular $mallaCurricular): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada && $carreraForzada !== $mallaCurricular->carrera_id) {
            return ApiResponse::error('No tienes permiso para modificar esta malla.', 403);
        }

        $data = $request->validate([
            'semestre'       => ['sometimes', 'integer', 'min:1', 'max:9'],
            'es_especialidad'=> ['sometimes', 'boolean'],
        ]);

        $mallaCurricular->update($data);

        return ApiResponse::success($mallaCurricular->load(['materia', 'carrera']), 'Malla actualizada.');
    }

    // DELETE /api/mallas-curriculares/{malla}
    public function destroy(Request $request, MallaCurricular $mallaCurricular): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada && $carreraForzada !== $mallaCurricular->carrera_id) {
            return ApiResponse::error('No tienes permiso para modificar esta malla.', 403);
        }

        $mallaCurricular->delete();
        return ApiResponse::success(null, 'Materia retirada de la malla.');
    }
}
