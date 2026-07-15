<?php

namespace App\Http\Controllers\Calidad;

use App\Domains\Calidad\Models\AccionCorrectiva;
use App\Domains\Calidad\Models\EvidenciaCalidad;
use App\Domains\Calidad\Models\NoConformidad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EvidenciaCalidadController extends Controller
{
    // GET /api/evidencias-calidad
    public function index(Request $request): JsonResponse
    {
        $evidencias = EvidenciaCalidad::with(['periodo', 'subidor', 'validador'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('proceso'),    fn($q, $v) => $q->where('proceso', $v))
            ->when($request->query('estatus'),    fn($q, $v) => $q->where('estatus', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($evidencias);
    }

    // POST /api/evidencias-calidad
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'     => ['nullable', 'uuid', 'exists:periodos,id'],
            'proceso'        => ['required', 'string', 'max:150'],
            'indicador'      => ['required', 'string', 'max:150'],
            'tipo_evidencia' => ['required', 'string', 'max:100'],
            'descripcion'    => ['nullable', 'string'],
            'fecha_evidencia'=> ['required', 'date'],
            'archivo'        => ['nullable', 'file', 'max:10240'],
        ]);

        $archivoPath = null;
        $archivoNombre = null;
        if ($request->hasFile('archivo')) {
            $archivoPath   = $request->file('archivo')->store('evidencias_calidad', 'local');
            $archivoNombre = $request->file('archivo')->getClientOriginalName();
        }

        $evidencia = EvidenciaCalidad::create([
            'periodo_id'      => $data['periodo_id'] ?? null,
            'proceso'         => $data['proceso'],
            'indicador'       => $data['indicador'],
            'tipo_evidencia'  => $data['tipo_evidencia'],
            'descripcion'     => $data['descripcion'] ?? null,
            'fecha_evidencia' => $data['fecha_evidencia'],
            'archivo_path'    => $archivoPath,
            'archivo_nombre'  => $archivoNombre,
            'estatus'         => 'pendiente',
            'subido_por'      => $request->user()->id,
        ]);

        return ApiResponse::success($evidencia->load(['periodo', 'subidor']), 'Evidencia registrada.', 201);
    }

    // PATCH /api/evidencias-calidad/{evidencia}/validar
    public function validar(Request $request, EvidenciaCalidad $evidencia): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'director_academico', 'direccion_academica'])) {
            abort(403, 'Sin permiso para validar evidencias.');
        }

        $data = $request->validate([
            'estatus' => ['required', 'in:validada,rechazada'],
        ]);

        $evidencia->update([
            'estatus'      => $data['estatus'],
            'validado_por' => $request->user()->id,
            'validado_en'  => now(),
        ]);

        return ApiResponse::success($evidencia->fresh(['validador']), 'Evidencia actualizada.');
    }

    // GET /api/no-conformidades
    public function noConformidades(Request $request): JsonResponse
    {
        $query = NoConformidad::with(['detectador', 'responsable', 'acciones'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('proceso'), fn($q, $v) => $q->where('proceso', $v))
            ->latest();

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/no-conformidades
    public function crearNoConformidad(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo'                  => ['nullable', 'in:interna,externa,observacion'],
            'proceso'               => ['required', 'string', 'max:150'],
            'descripcion'           => ['required', 'string'],
            'clausula_iso'          => ['nullable', 'string', 'max:50'],
            'fecha_deteccion'       => ['required', 'date'],
            'fecha_cierre_esperada' => ['nullable', 'date', 'after:fecha_deteccion'],
            'responsable_id'        => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $folio = 'NC-' . date('Y') . '-' . str_pad(NoConformidad::whereYear('created_at', date('Y'))->count() + 1, 3, '0', STR_PAD_LEFT);

        $nc = NoConformidad::create(array_merge($data, [
            'folio'         => $folio,
            'tipo'          => $data['tipo'] ?? 'interna',
            'estatus'       => 'abierta',
            'detectado_por' => $request->user()->id,
        ]));

        return ApiResponse::success($nc->load(['detectador', 'responsable']), 'No conformidad registrada.', 201);
    }

    // POST /api/no-conformidades/{nc}/acciones
    public function agregarAccion(Request $request, NoConformidad $nc): JsonResponse
    {
        $data = $request->validate([
            'descripcion'       => ['required', 'string'],
            'fecha_compromiso'  => ['required', 'date', 'after_or_equal:today'],
            'responsable_id'    => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $accion = AccionCorrectiva::create(array_merge($data, [
            'no_conformidad_id' => $nc->id,
            'estatus'           => 'pendiente',
        ]));

        return ApiResponse::success($accion->load('responsable'), 'Acción correctiva registrada.', 201);
    }

    // PATCH /api/no-conformidades/{nc}/cerrar
    public function cerrarNoConformidad(Request $request, NoConformidad $nc): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'director_academico', 'direccion_academica'])) {
            abort(403, 'Sin permiso para cerrar no conformidades.');
        }

        $data = $request->validate([
            'causa_raiz' => ['required', 'string'],
        ]);

        $nc->update([
            'estatus'           => 'cerrada',
            'causa_raiz'        => $data['causa_raiz'],
            'fecha_cierre_real' => now()->toDateString(),
            'cerrado_por'       => $request->user()->id,
        ]);

        return ApiResponse::success($nc->fresh(['cerrador', 'acciones']), 'No conformidad cerrada.');
    }

    // GET /api/indicadores/calidad/{periodo_id}
    public function indicadores(string $periodoId): JsonResponse
    {
        $evidencias = EvidenciaCalidad::where('periodo_id', $periodoId)->get();
        $ncs = NoConformidad::where('estatus', 'abierta')->get();

        return ApiResponse::success([
            'total_evidencias'        => $evidencias->count(),
            'evidencias_validadas'    => $evidencias->where('estatus', 'validada')->count(),
            'evidencias_pendientes'   => $evidencias->where('estatus', 'pendiente')->count(),
            'no_conformidades_abiertas' => $ncs->count(),
            'no_conformidades_vencidas' => $ncs->filter(fn($nc) =>
                $nc->fecha_cierre_esperada && $nc->fecha_cierre_esperada->isPast()
            )->count(),
            'por_proceso'             => $evidencias->groupBy('proceso')->map->count(),
        ]);
    }
}
