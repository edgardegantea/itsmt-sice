<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CorteCaptura;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Services\CorteCapturaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CorteCapturaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico'];

    public function __construct(private CorteCapturaService $corteCapturaService)
    {
    }

    // GET /api/admin/periodos/{periodo}/cortes-captura
    public function index(Request $request, Periodo $periodo): JsonResponse
    {
        return ApiResponse::success($this->corteCapturaService->listarPorPeriodo($periodo->id));
    }

    // POST /api/admin/periodos/{periodo}/cortes-captura
    public function store(Request $request, Periodo $periodo): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $datos = $request->validate([
            'numero'               => ['required', 'integer', 'min:1', 'max:3'],
            'nombre'               => ['nullable', 'string', 'max:100'],
            'fecha_corte'          => ['required', 'date'],
            'fecha_limite_captura' => ['required', 'date', 'after_or_equal:fecha_corte'],
        ]);

        $corte = $this->corteCapturaService->guardar($periodo, $datos);

        return ApiResponse::success($corte, 'Corte de captura guardado.', 201);
    }

    // PATCH /api/admin/cortes-captura/{corte}
    public function update(Request $request, CorteCaptura $corte): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $datos = $request->validate([
            'nombre'               => ['nullable', 'string', 'max:100'],
            'fecha_corte'          => ['required', 'date'],
            'fecha_limite_captura' => ['required', 'date', 'after_or_equal:fecha_corte'],
        ]);

        $corte->update($datos);

        return ApiResponse::success($corte->fresh(), 'Corte de captura actualizado.');
    }

    // POST /api/cortes-captura/{corte}/evaluar
    public function evaluar(Request $request, CorteCaptura $corte): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $resumen = DB::transaction(fn () => $this->corteCapturaService->evaluar($corte));

        return ApiResponse::success($resumen, 'Cumplimiento evaluado.');
    }

    // GET /api/cortes-captura/{corte}/cumplimiento
    public function cumplimiento(Request $request, CorteCaptura $corte): JsonResponse
    {
        $user = $request->user();

        if (! $user?->hasAnyRole([...self::ROLES_ADMIN, 'jefe_carrera', 'docente'])) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $query = $corte->alertas()->with(['cargaAcademica.materia', 'docente']);

        if ($user->hasRole('docente') && ! $user->hasAnyRole(self::ROLES_ADMIN)) {
            $query->where('docente_id', $user->id);
        } elseif ($user->hasRole('jefe_carrera')) {
            $query->whereHas('cargaAcademica.grupos', fn ($q) => $q->where('carrera_id', $user->carrera_id));
        }

        return ApiResponse::success($query->get());
    }
}
