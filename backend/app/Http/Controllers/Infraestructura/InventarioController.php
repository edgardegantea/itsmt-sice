<?php

namespace App\Http\Controllers\Infraestructura;

use App\Domains\Infraestructura\Models\Inventario;
use App\Domains\Infraestructura\Models\PrestamoEquipo;
use App\Domains\Infraestructura\Models\ReservaEspacio;
use App\Domains\Infraestructura\Models\SolicitudMantenimiento;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    private array $rolesGestion = ['superadmin', 'admin', 'personal_administrativo', 'direccion_academica'];

    // GET /api/inventario
    public function index(Request $request): JsonResponse
    {
        $inventario = Inventario::with(['aula', 'responsable'])
            ->when($request->query('categoria'), fn($q, $v) => $q->where('categoria', $v))
            ->when($request->query('estado'), fn($q, $v) => $q->where('estado', $v))
            ->when($request->query('aula_id'), fn($q, $v) => $q->where('aula_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($inventario);
    }

    // POST /api/inventario
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para registrar bienes de inventario.');
        }

        $data = $request->validate([
            'clave'             => ['required', 'string', 'max:50', 'unique:inventario,clave'],
            'nombre'            => ['required', 'string', 'max:200'],
            'categoria'         => ['nullable', 'in:mobiliario,equipo_computo,laboratorio,audiovisual,otro'],
            'descripcion'       => ['nullable', 'string'],
            'aula_id'           => ['nullable', 'uuid', 'exists:aulas,id'],
            'fecha_adquisicion' => ['nullable', 'date'],
            'valor'             => ['nullable', 'numeric', 'min:0'],
            'responsable_id'    => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $item = Inventario::create(array_merge($data, [
            'categoria' => $data['categoria'] ?? 'otro',
            'estado'    => 'activo',
            'activo'    => true,
        ]));

        return ApiResponse::success($item->load(['aula', 'responsable']), 'Bien de inventario registrado.', 201);
    }

    // GET /api/inventario/{item}
    public function show(Inventario $item): JsonResponse
    {
        return ApiResponse::success($item->load(['aula', 'responsable', 'prestamos', 'mantenimientos']));
    }

    // PATCH /api/inventario/{item}/estado
    public function actualizarEstado(Request $request, Inventario $item): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para actualizar el estado del bien.');
        }

        $data = $request->validate([
            'estado' => ['required', 'in:activo,mantenimiento,baja'],
        ]);

        $item->update([
            'estado' => $data['estado'],
            'activo' => $data['estado'] !== 'baja',
        ]);

        return ApiResponse::success($item->fresh(), 'Estado del bien actualizado.');
    }

    // GET /api/prestamos-equipo
    public function prestamos(Request $request): JsonResponse
    {
        $prestamos = PrestamoEquipo::with(['inventario', 'solicitante'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('solicitante_id'), fn($q, $v) => $q->where('solicitante_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($prestamos);
    }

    // POST /api/prestamos-equipo
    public function storePrestamo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'inventario_id'             => ['required', 'uuid', 'exists:inventario,id'],
            'fecha_prestamo'            => ['required', 'date'],
            'fecha_devolucion_prevista' => ['required', 'date', 'after_or_equal:fecha_prestamo'],
            'observaciones'             => ['nullable', 'string'],
        ]);

        $prestamo = PrestamoEquipo::create(array_merge($data, [
            'solicitante_id' => $request->user()->id,
            'estatus'        => 'prestado',
        ]));

        return ApiResponse::success($prestamo->load(['inventario', 'solicitante']), 'Préstamo de equipo registrado.', 201);
    }

    // PATCH /api/prestamos-equipo/{prestamo}/devolver
    public function devolverPrestamo(Request $request, PrestamoEquipo $prestamo): JsonResponse
    {
        $data = $request->validate([
            'estatus'       => ['nullable', 'in:devuelto,dañado'],
            'observaciones' => ['nullable', 'string'],
        ]);

        $prestamo->update([
            'estatus'                => $data['estatus'] ?? 'devuelto',
            'fecha_devolucion_real'  => now()->toDateString(),
            'observaciones'          => $data['observaciones'] ?? $prestamo->observaciones,
        ]);

        return ApiResponse::success($prestamo->fresh(), 'Devolución registrada.');
    }

    // GET /api/reservas-espacios
    public function reservas(Request $request): JsonResponse
    {
        $reservas = ReservaEspacio::with(['aula', 'solicitante', 'aprobador'])
            ->when($request->query('aula_id'), fn($q, $v) => $q->where('aula_id', $v))
            ->when($request->query('fecha'), fn($q, $v) => $q->where('fecha', $v))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($reservas);
    }

    // POST /api/reservas-espacios
    public function storeReserva(Request $request): JsonResponse
    {
        $data = $request->validate([
            'aula_id'     => ['required', 'uuid', 'exists:aulas,id'],
            'fecha'       => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'motivo'      => ['required', 'string', 'max:250'],
        ]);

        $traslape = ReservaEspacio::where('aula_id', $data['aula_id'])
            ->where('fecha', $data['fecha'])
            ->whereIn('estatus', ['pendiente', 'aprobada'])
            ->where(fn($q) => $q->where('hora_inicio', '<', $data['hora_fin'])
                                 ->where('hora_fin', '>', $data['hora_inicio']))
            ->exists();

        if ($traslape) {
            return ApiResponse::error('El aula ya tiene una reserva en ese horario.', 422);
        }

        $reserva = ReservaEspacio::create(array_merge($data, [
            'solicitante_id' => $request->user()->id,
            'estatus'        => 'pendiente',
        ]));

        return ApiResponse::success($reserva->load(['aula', 'solicitante']), 'Reserva de espacio solicitada.', 201);
    }

    // PATCH /api/reservas-espacios/{reserva}/estatus
    public function actualizarEstatusReserva(Request $request, ReservaEspacio $reserva): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para aprobar reservas de espacios.');
        }

        $data = $request->validate([
            'estatus' => ['required', 'in:aprobada,rechazada,cancelada'],
        ]);

        $reserva->update([
            'estatus'      => $data['estatus'],
            'aprobado_por' => $request->user()->id,
        ]);

        return ApiResponse::success($reserva->fresh(['aprobador']), 'Estatus de la reserva actualizado.');
    }

    // GET /api/mantenimiento
    public function mantenimiento(Request $request): JsonResponse
    {
        $solicitudes = SolicitudMantenimiento::with(['inventario', 'aula', 'reportador', 'atendedor'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('prioridad'), fn($q, $v) => $q->where('prioridad', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($solicitudes);
    }

    // POST /api/mantenimiento
    public function storeMantenimiento(Request $request): JsonResponse
    {
        $data = $request->validate([
            'inventario_id' => ['nullable', 'uuid', 'exists:inventario,id'],
            'aula_id'       => ['nullable', 'uuid', 'exists:aulas,id'],
            'tipo'          => ['nullable', 'in:correctivo,preventivo'],
            'descripcion'   => ['required', 'string'],
            'prioridad'     => ['nullable', 'in:baja,media,alta,urgente'],
        ]);

        $solicitud = SolicitudMantenimiento::create(array_merge($data, [
            'tipo'          => $data['tipo'] ?? 'correctivo',
            'prioridad'     => $data['prioridad'] ?? 'media',
            'estatus'       => 'abierta',
            'reportado_por' => $request->user()->id,
            'fecha_reporte' => now()->toDateString(),
        ]));

        return ApiResponse::success($solicitud->load(['inventario', 'aula', 'reportador']), 'Solicitud de mantenimiento registrada.', 201);
    }

    // PATCH /api/mantenimiento/{solicitud}/atender
    public function atenderMantenimiento(Request $request, SolicitudMantenimiento $solicitud): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para atender solicitudes de mantenimiento.');
        }

        $data = $request->validate([
            'estatus'          => ['required', 'in:en_proceso,resuelta,cancelada'],
            'notas_resolucion' => ['nullable', 'string'],
        ]);

        $solicitud->update([
            'estatus'          => $data['estatus'],
            'notas_resolucion' => $data['notas_resolucion'] ?? $solicitud->notas_resolucion,
            'atendido_por'     => $request->user()->id,
            'fecha_resolucion' => in_array($data['estatus'], ['resuelta', 'cancelada']) ? now()->toDateString() : null,
        ]);

        if ($data['estatus'] === 'resuelta' && $solicitud->inventario_id) {
            $solicitud->inventario()->update(['estado' => 'activo']);
        }

        return ApiResponse::success($solicitud->fresh(['atendedor']), 'Solicitud de mantenimiento actualizada.');
    }

    // GET /api/indicadores/infraestructura
    public function indicadores(): JsonResponse
    {
        $inventario = Inventario::all();
        $prestamos = PrestamoEquipo::all();
        $mantenimiento = SolicitudMantenimiento::all();

        return ApiResponse::success([
            'total_bienes'              => $inventario->count(),
            'bienes_por_categoria'      => $inventario->groupBy('categoria')->map->count(),
            'bienes_en_mantenimiento'   => $inventario->where('estado', 'mantenimiento')->count(),
            'bienes_baja'               => $inventario->where('estado', 'baja')->count(),
            'prestamos_activos'         => $prestamos->where('estatus', 'prestado')->count(),
            'prestamos_vencidos'        => $prestamos->where('estatus', 'prestado')
                ->filter(fn($p) => $p->fecha_devolucion_prevista?->isPast())->count(),
            'mantenimiento_abiertas'    => $mantenimiento->whereIn('estatus', ['abierta', 'en_proceso'])->count(),
            'mantenimiento_por_prioridad' => $mantenimiento->whereIn('estatus', ['abierta', 'en_proceso'])->groupBy('prioridad')->map->count(),
        ]);
    }
}
