<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\DiaNoLaborable;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiaNoLaborableController extends Controller
{
    // GET /dias-no-laborables?año=
    public function index(Request $request): JsonResponse
    {
        $query = DiaNoLaborable::orderBy('fecha');

        if ($request->filled('year')) {
            $query->whereYear('fecha', $request->integer('year'));
        }

        return ApiResponse::success($query->get());
    }

    // POST /dias-no-laborables
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fecha'       => ['required', 'date', 'unique:dias_no_laborables,fecha'],
            'descripcion' => ['required', 'string', 'max:200'],
        ]);

        $dia = DiaNoLaborable::create($data);

        return ApiResponse::success($dia, 'Día no laborable registrado.', 201);
    }

    // DELETE /dias-no-laborables/{id}
    public function destroy(string $id): JsonResponse
    {
        $dia = DiaNoLaborable::findOrFail($id);
        $dia->delete();

        return ApiResponse::success(null, 'Día no laborable eliminado.');
    }
}
