<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Vinculacion\Models\AsesoriaRp;
use App\Domains\Vinculacion\Models\ResidenciaProfesional;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsesoriaRpController extends Controller
{
    // GET /asesorias-rp
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AsesoriaRp::with(['residencia.alumno.user', 'asesorInterno'])
            ->when(
                $user->hasRole('docente') && ! $user->hasAnyRole(['superadmin', 'admin']),
                fn($q) => $q->where('asesor_interno_id', $user->id)
            )
            ->when($request->query('residencia_id'), fn($q, $v) => $q->where('residencia_id', $v));

        return ApiResponse::success($query->latest('fecha')->paginate(20));
    }

    // POST /asesorias-rp
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'residencia_id'       => ['required', 'uuid', 'exists:residencias_profesionales,id'],
            'fecha'               => ['required', 'date'],
            'lugar'               => ['nullable', 'string', 'max:150'],
            'tipo'                => ['nullable', 'string', 'max:50'],
            'temas'               => ['nullable', 'array'],
            'solucion_recomendada'=> ['nullable', 'string'],
        ]);

        $residencia = ResidenciaProfesional::findOrFail($data['residencia_id']);

        // Asesor interno solo puede registrar asesorías de sus residencias
        if ($user->hasRole('docente') && ! $user->hasAnyRole(['superadmin', 'admin'])) {
            if ($residencia->asesor_id !== $user->id) {
                return ApiResponse::error('Solo puedes registrar asesorías de residencias donde eres asesor interno.', 403);
            }
        }

        $numAsesoria = AsesoriaRp::where('residencia_id', $data['residencia_id'])->count() + 1;

        $asesoria = AsesoriaRp::create(array_merge($data, [
            'asesor_interno_id' => $user->id,
            'num_asesoria'      => $numAsesoria,
        ]));

        return ApiResponse::success(
            $asesoria->load(['residencia.alumno.user', 'asesorInterno']),
            'Asesoría registrada (TecNM-AC-PO-004-07).',
            201
        );
    }
}
