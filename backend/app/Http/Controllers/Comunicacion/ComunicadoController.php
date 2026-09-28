<?php

namespace App\Http\Controllers\Comunicacion;

use App\Domains\Comunicacion\Models\Comunicado;
use App\Domains\Comunicacion\Models\ComunicadoLectura;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComunicadoController extends Controller
{
    // GET /api/comunicados
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $rolesUsuario = $user->getRoleNames()->toArray();

        $query = Comunicado::with(['publicadoPor:id,name,email', 'carrera:id,nombre,clave'])
            ->vigentes()
            ->where(function ($q) use ($rolesUsuario) {
                $q->whereNull('destinatario_rol')
                  ->orWhereIn('destinatario_rol', $rolesUsuario);
            })
            ->when($request->query('categoria'), fn($q, $v) => $q->where('categoria', $v))
            ->when($request->query('prioridad'), fn($q, $v) => $q->where('prioridad', $v))
            ->orderByDesc('fijado')
            ->orderByDesc('publicado_at');

        $comunicados = $query->paginate(20);

        // Adjuntar estado de lectura para el usuario actual
        $lecturasIds = ComunicadoLectura::where('user_id', $user->id)
            ->whereIn('comunicado_id', $comunicados->pluck('id'))
            ->pluck('comunicado_id')
            ->toArray();

        $items = collect($comunicados->items())->map(function ($c) use ($lecturasIds) {
            $data = $c->toArray();
            $data['leido'] = in_array($c->id, $lecturasIds, true);
            return $data;
        });

        return ApiResponse::success([
            'data'         => $items,
            'current_page' => $comunicados->currentPage(),
            'last_page'    => $comunicados->lastPage(),
            'total'        => $comunicados->total(),
            'no_leidos'    => Comunicado::vigentes()
                ->where(function ($q) use ($rolesUsuario) {
                    $q->whereNull('destinatario_rol')->orWhereIn('destinatario_rol', $rolesUsuario);
                })
                ->whereNotIn('id', ComunicadoLectura::where('user_id', $user->id)->pluck('comunicado_id'))
                ->count(),
        ]);
    }

    // GET /api/comunicados/admin (para administradores y jefes de carrera)
    public function adminIndex(Request $request): JsonResponse
    {
        $this->authorizeGestion($request);

        $comunicados = Comunicado::with(['publicadoPor:id,name', 'carrera:id,nombre', 'lecturas'])
            ->when($request->query('categoria'), fn($q, $v) => $q->where('categoria', $v))
            ->when($request->query('activo') !== null, fn($q) => $q->where('activo', filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN)))
            ->orderByDesc('created_at')
            ->paginate(30);

        return ApiResponse::success($comunicados);
    }

    // POST /api/comunicados
    public function store(Request $request): JsonResponse
    {
        $this->authorizeGestion($request);

        $data = $request->validate([
            'titulo'                => ['required', 'string', 'max:255'],
            'contenido'             => ['required', 'string'],
            'resumen'               => ['nullable', 'string', 'max:500'],
            'prioridad'             => ['required', 'in:baja,normal,alta,urgente'],
            'categoria'             => ['required', 'in:general,academico,administrativo,sindical,urgente,evento'],
            'destinatario_rol'      => ['nullable', 'string', 'max:100'],
            'carrera_id'            => ['nullable', 'uuid', 'exists:carreras,id'],
            'fijado'                => ['boolean'],
            'requiere_confirmacion' => ['boolean'],
            'publicado_at'          => ['nullable', 'date'],
            'expira_at'             => ['nullable', 'date', 'after:publicado_at'],
        ]);

        $data['publicado_por_id'] = $request->user()->id;
        $data['publicado_at']     = $data['publicado_at'] ?? now();

        $comunicado = Comunicado::create($data);

        AuditLogService::record('comunicado_creado', 'comunicados', $comunicado->id, ['titulo' => $comunicado->titulo]);

        return ApiResponse::success($comunicado->load(['publicadoPor:id,name', 'carrera:id,nombre']), 'Comunicado publicado correctamente.', 201);
    }

    // GET /api/comunicados/{comunicado}
    public function show(Request $request, Comunicado $comunicado): JsonResponse
    {
        $user = $request->user();

        $leido = ComunicadoLectura::where('comunicado_id', $comunicado->id)
            ->where('user_id', $user->id)
            ->exists();

        $data = $comunicado->load(['publicadoPor:id,name,email', 'carrera:id,nombre'])->toArray();
        $data['leido'] = $leido;

        return ApiResponse::success($data);
    }

    // PATCH /api/comunicados/{comunicado}
    public function update(Request $request, Comunicado $comunicado): JsonResponse
    {
        $this->authorizeGestion($request);

        $data = $request->validate([
            'titulo'                => ['sometimes', 'string', 'max:255'],
            'contenido'             => ['sometimes', 'string'],
            'resumen'               => ['nullable', 'string', 'max:500'],
            'prioridad'             => ['sometimes', 'in:baja,normal,alta,urgente'],
            'categoria'             => ['sometimes', 'in:general,academico,administrativo,sindical,urgente,evento'],
            'destinatario_rol'      => ['nullable', 'string', 'max:100'],
            'carrera_id'            => ['nullable', 'uuid', 'exists:carreras,id'],
            'fijado'                => ['boolean'],
            'requiere_confirmacion' => ['boolean'],
            'activo'                => ['boolean'],
            'expira_at'             => ['nullable', 'date'],
        ]);

        $comunicado->update($data);

        AuditLogService::record('comunicado_actualizado', 'comunicados', $comunicado->id);

        return ApiResponse::success($comunicado, 'Comunicado actualizado correctamente.');
    }

    // DELETE /api/comunicados/{comunicado}
    public function destroy(Request $request, Comunicado $comunicado): JsonResponse
    {
        $this->authorizeGestion($request);

        $comunicado->delete();

        AuditLogService::record('comunicado_eliminado', 'comunicados', $comunicado->id);

        return ApiResponse::success(null, 'Comunicado eliminado correctamente.');
    }

    // POST /api/comunicados/{comunicado}/marcar-leido
    public function marcarLeido(Request $request, Comunicado $comunicado): JsonResponse
    {
        $user = $request->user();

        ComunicadoLectura::firstOrCreate([
            'comunicado_id' => $comunicado->id,
            'user_id'       => $user->id,
        ], [
            'leido_at' => now(),
        ]);

        return ApiResponse::success(null, 'Comunicado marcado como leído.');
    }

    // GET /api/comunicados/indicadores
    public function indicadores(Request $request): JsonResponse
    {
        $this->authorizeGestion($request);

        return ApiResponse::success([
            'total_activos'       => Comunicado::where('activo', true)->count(),
            'fijados'             => Comunicado::where('activo', true)->where('fijado', true)->count(),
            'urgentes_activos'    => Comunicado::where('activo', true)->where('prioridad', 'urgente')->count(),
            'lecturas_totales'    => ComunicadoLectura::count(),
        ]);
    }

    private function authorizeGestion(Request $request): void
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'direccion_general', 'direccion_academica', 'subdireccion_academica'])) {
            abort(403, 'Sin permiso para gestionar comunicados institucionales.');
        }
    }
}
