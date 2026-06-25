<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Permanencia\Models\Adeudo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdeudoController extends Controller
{
    // GET /api/adeudos  — lista admin
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()->carreraRestringida();

        $adeudos = Adeudo::with(['alumno.user', 'alumno.carrera'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('alumno_id'),  fn($q, $v) => $q->where('alumno_id', $v))
            ->when($request->query('pagado') !== null, fn($q) =>
                $q->where('pagado', filter_var($request->query('pagado'), FILTER_VALIDATE_BOOLEAN))
            )
            ->when(($cp = $request->query('carrera_id')) && preg_match('/^[0-9a-f-]{36}$/i', $cp), fn($q) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $cp))
            )
            ->latest()
            ->paginate(20);

        return ApiResponse::success($adeudos);
    }

    // POST /api/adeudos
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'alumno_id' => ['required', 'uuid', 'exists:alumnos,id'],
            'concepto'  => ['required', 'string', 'max:200'],
            'monto'     => ['required', 'numeric', 'min:0'],
        ]);

        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $alumno = \App\Domains\Academico\Models\Alumno::findOrFail($data['alumno_id']);
            if ($alumno->carrera_id !== $carreraForzada) {
                abort(403, 'Solo puedes gestionar adeudos de alumnos de tu carrera.');
            }
        }

        $adeudo = Adeudo::create(array_merge($data, ['pagado' => false]));

        return ApiResponse::success($adeudo->load('alumno.user'), 'Adeudo registrado.', 201);
    }

    // PATCH /api/adeudos/{adeudo}/pagar
    public function marcarPagado(Request $request, Adeudo $adeudo): JsonResponse
    {
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $adeudo->loadMissing('alumno');
            if ($adeudo->alumno?->carrera_id !== $carreraForzada) {
                abort(403, 'No puedes modificar adeudos de otra carrera.');
            }
        }

        $adeudo->update(['pagado' => true]);

        return ApiResponse::success($adeudo, 'Adeudo marcado como pagado.');
    }

    // DELETE /api/adeudos/{adeudo}
    public function destroy(Request $request, Adeudo $adeudo): JsonResponse
    {
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $adeudo->loadMissing('alumno');
            if ($adeudo->alumno?->carrera_id !== $carreraForzada) {
                abort(403, 'No puedes eliminar adeudos de otra carrera.');
            }
        }

        $adeudo->delete();

        return ApiResponse::success(null, 'Adeudo eliminado.');
    }
}
