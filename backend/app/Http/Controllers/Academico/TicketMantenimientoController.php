<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\TicketMantenimiento;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bitácora simple de mantenimiento de aulas — no reemplaza un sistema de tickets
 * completo, solo da seguimiento a lo que prefectura reporta como problema físico
 * del espacio (vs. un problema de horario, que ya cubre "aula fantasma").
 */
class TicketMantenimientoController extends Controller
{
    private const ROLES_GESTION = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/tickets-mantenimiento?estatus=&aula_id=
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_GESTION)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $tickets = TicketMantenimiento::with(['aula', 'reportadoPor', 'atendidoPor', 'incidenciaClase'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('aula_id'), fn($q, $v) => $q->where('aula_id', $v))
            ->orderByRaw("CASE estatus WHEN 'abierto' THEN 0 WHEN 'en_progreso' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->limit(300)
            ->get();

        return ApiResponse::success($tickets);
    }

    // PATCH /api/tickets-mantenimiento/{ticketMantenimiento}
    public function update(Request $request, TicketMantenimiento $ticketMantenimiento): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_GESTION)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'estatus'          => ['required', 'in:abierto,en_progreso,resuelto'],
            'notas_resolucion' => ['nullable', 'string', 'max:2000'],
        ]);

        $data['atendido_por_id'] = $request->user()->id;
        $data['resuelto_en'] = $data['estatus'] === 'resuelto' ? now() : null;

        $ticketMantenimiento->update($data);

        return ApiResponse::success(
            $ticketMantenimiento->load(['aula', 'reportadoPor', 'atendidoPor', 'incidenciaClase']),
            'Ticket actualizado.'
        );
    }
}
