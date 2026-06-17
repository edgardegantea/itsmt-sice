<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\FuncionPersonal;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncionPersonalController extends Controller
{
    private function verificarUsuarioDeCarrera(Request $request, string $userId): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida) {
            $target = User::findOrFail($userId);
            if ($target->carrera_id !== $restringida) {
                abort(403, 'Solo puedes gestionar funciones de personal de tu carrera.');
            }
        }
    }

    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $funciones = FuncionPersonal::with('user.roles')
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('user', fn($uq) => $uq->where('carrera_id', $v))
            )
            ->when($request->query('user_id'), fn($q, $u) => $q->where('user_id', $u))
            ->when($request->query('activa'),  fn($q, $v) => $q->where('activa', $v === 'true'))
            ->orderBy('activa', 'desc')
            ->orderBy('area')
            ->get();

        return ApiResponse::success($funciones);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'      => ['required', 'uuid', 'exists:users,id'],
            'funcion'      => ['required', 'string', 'max:150'],
            'area'         => ['nullable', 'string', 'max:100'],
            'descripcion'  => ['nullable', 'string'],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin'    => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ]);

        $this->verificarUsuarioDeCarrera($request, $data['user_id']);

        $funcion = FuncionPersonal::create($data);

        return ApiResponse::success($funcion->load('user'), 'Función asignada.', 201);
    }

    public function update(Request $request, FuncionPersonal $funcionPersonal): JsonResponse
    {
        $this->verificarUsuarioDeCarrera($request, $funcionPersonal->user_id);

        $data = $request->validate([
            'funcion'      => ['sometimes', 'string', 'max:150'],
            'area'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'descripcion'  => ['sometimes', 'nullable', 'string'],
            'fecha_inicio' => ['sometimes', 'nullable', 'date'],
            'fecha_fin'    => ['sometimes', 'nullable', 'date'],
            'activa'       => ['sometimes', 'boolean'],
        ]);

        $funcionPersonal->update($data);

        return ApiResponse::success($funcionPersonal->fresh('user'), 'Función actualizada.');
    }

    public function destroy(Request $request, FuncionPersonal $funcionPersonal): JsonResponse
    {
        $this->verificarUsuarioDeCarrera($request, $funcionPersonal->user_id);

        $funcionPersonal->delete();

        return ApiResponse::success(null, 'Función eliminada.');
    }
}
