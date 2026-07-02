<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Traslado;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TrasladoController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'control_escolar',
                                  'director_academico', 'direccion_general',
                                  'direccion_academica', 'subdireccion_academica'];

    // GET /api/traslados
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Traslado::with(['alumno:id,name,email'])
            ->when($request->tipo,    fn($q, $v) => $q->where('tipo', $v))
            ->when($request->estatus, fn($q, $v) => $q->where('estatus', $v));

        if ($user->hasAnyRole(self::ROLES_ADMIN)) {
            // admin ve todos
        } elseif ($user->hasRole('alumno')) {
            $query->where('alumno_id', $user->id);
        } else {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/traslados
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(self::ROLES_ADMIN);
        $esAlumno = $user->hasRole('alumno');

        if (! $esAdmin && ! $esAlumno) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'tipo'               => 'required|in:entrada,salida',
            'instituto_origen'   => 'nullable|string|max:200',
            'instituto_destino'  => 'nullable|string|max:200',
            'fecha_solicitud'    => 'required|date',
            'alumno_id'          => 'nullable|uuid|exists:users,id',
        ]);

        // Si es alumno, usa su propio id (solo puede solicitar tipo=entrada)
        if ($esAlumno) {
            if ($data['tipo'] === 'salida') {
                return ApiResponse::error('Los alumnos solo pueden solicitar traslados de entrada.', 422);
            }
            $data['alumno_id'] = $user->id;
        } else {
            $data['alumno_id'] ??= $user->id;
        }

        $traslado = Traslado::create($data);

        return ApiResponse::success($traslado->fresh()->load('alumno:id,name,email'), 'Solicitud de traslado registrada.', 201);
    }

    // PATCH /api/traslados/{traslado}/gestionar
    public function gestionar(Request $request, Traslado $traslado): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'estatus'        => 'required|in:aceptado,rechazado',
            'motivo_rechazo' => 'nullable|string|max:500',
        ]);

        if ($traslado->estatus !== 'solicitado') {
            return ApiResponse::error('El traslado ya fue gestionado.', 422);
        }

        $traslado->update($data);

        return ApiResponse::success($traslado->fresh('alumno:id,name,email'), 'Traslado gestionado correctamente.');
    }

    // GET /api/traslados/{traslado}/kardex/pdf
    // Cap. 6 TecNM: NUNCA certificado incompleto; solo kardex o constancia de calificaciones
    public function kardexPdf(Request $request, Traslado $traslado): Response
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            abort(403, 'No tienes permiso.');
        }

        $traslado->load('alumno');
        $alumno = Alumno::with(['carrera', 'grupos.cargas.materia',
                                'grupos.cargas.calificaciones' => fn($q) => $q->where('alumno_id', $traslado->alumno_id),
                                'grupos.periodo'])
                        ->whereHas('user', fn($q) => $q->where('id', $traslado->alumno_id))
                        ->first();

        $pdf = Pdf::loadView('pdf.kardex-traslado', [
            'traslado' => $traslado,
            'alumno'   => $alumno,
            'fecha'    => now()->format('d/m/Y'),
        ]);

        $filename = 'kardex_traslado_' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
