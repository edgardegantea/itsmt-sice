<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AulaController extends Controller
{
    // GET /api/aulas
    public function index(Request $request): JsonResponse
    {
        $aulas = Aula::query()
            ->when($request->query('tipo'),   fn($q, $v) => $q->where('tipo', $v))
            ->when($request->query('activa'), fn($q, $v) => $q->where('activa', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($aulas);
    }

    // POST /api/aulas
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['required', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['required', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula = Aula::create($data);

        return ApiResponse::success($aula, 'Aula registrada.', 201);
    }

    // PATCH /api/aulas/{aula}
    public function update(Request $request, Aula $aula): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['sometimes', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['sometimes', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula->update($data);

        return ApiResponse::success($aula, 'Aula actualizada.');
    }

    // DELETE /api/aulas/{aula}
    public function destroy(Aula $aula): JsonResponse
    {
        $aula->delete();
        return ApiResponse::success(null, 'Aula eliminada.');
    }

    // GET /api/aulas/disponibles?dia_semana=lunes&hora_inicio=08:00&hora_fin=09:00&periodo_id=...
    // S11-01: aulas sin conflicto en el bloque horario solicitado
    public function disponibles(Request $request): JsonResponse
    {
        $request->validate([
            'dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'periodo_id'  => ['nullable', 'uuid'],
        ]);

        // IDs de aulas ocupadas en ese bloque
        $ocupadas = CargaAcademica::whereNotNull('aula_id')
            ->when($request->periodo_id, fn($q, $v) => $q->where('periodo_id', $v))
            ->whereHas('horarios', function ($q) use ($request) {
                $q->where('dia_semana', $request->dia_semana)
                  ->where(function ($q2) use ($request) {
                      $q2->where(function ($q3) use ($request) {
                          // traslape: inicio del bloque cae dentro de un horario existente
                          $q3->where('hora_inicio', '<', $request->hora_fin)
                             ->where('hora_fin',    '>',  $request->hora_inicio);
                      });
                  });
            })
            ->pluck('aula_id');

        $disponibles = Aula::where('activa', true)
            ->whereNotIn('id', $ocupadas)
            ->when($request->tipo, fn($q, $v) => $q->where('tipo', $v))
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($disponibles);
    }
}
