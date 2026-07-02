<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\ConcursoOposicion;
use App\Domains\Academico\Models\FichaSindical;
use App\Domains\Academico\Models\MovimientoPlaza;
use App\Domains\Academico\Models\ParticipanteConcurso;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcursoOposicionController extends Controller
{
    private const ROLES_ADMIN  = ['superadmin', 'admin'];
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica'];

    // GET /api/concursos-oposicion
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $concursos = ConcursoOposicion::with([
            'convocadoPor',
            'participantes.docente',
            'participantes.movimientoPlaza',
        ])->latest()->paginate(20);

        return ApiResponse::success($concursos);
    }

    // POST /api/concursos-oposicion
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'nombre'             => 'required|string|max:200',
            'fecha_realizacion'  => 'required|date',
            'descripcion'        => 'nullable|string|max:2000',
            'participantes'      => 'nullable|array',
            'participantes.*.docente_id'       => 'required|uuid|exists:users,id',
            'participantes.*.puntaje_obtenido' => 'nullable|numeric|min:0|max:10',
            'participantes.*.resultado'        => 'nullable|in:promovido,no_promovido,pendiente',
            'participantes.*.categoria_nueva'  => 'nullable|string|max:30',
        ]);

        $concurso = ConcursoOposicion::create([
            'nombre'            => $validated['nombre'],
            'fecha_realizacion' => $validated['fecha_realizacion'],
            'descripcion'       => $validated['descripcion'] ?? null,
            'convocado_por'     => $request->user()->id,
        ]);

        $participantesData = $validated['participantes'] ?? [];

        foreach ($participantesData as $p) {
            $resultado       = $p['resultado'] ?? 'pendiente';
            $movimientoId    = null;

            // Si promovido, crear movimiento_plaza automáticamente
            if ($resultado === 'promovido') {
                $ficha = FichaSindical::where('docente_id', $p['docente_id'])->first();
                if ($ficha) {
                    $movimiento = MovimientoPlaza::create([
                        'ficha_sindical_id'  => $ficha->id,
                        'tipo_movimiento'    => 'cambio_categoria',
                        'categoria_anterior' => $ficha->categoria_tbc,
                        'categoria_nueva'    => $p['categoria_nueva'] ?? null,
                        'fecha_efectiva'     => $validated['fecha_realizacion'],
                        'registrado_por'     => $request->user()->id,
                        'notas'              => "Promovido en concurso de oposición: {$validated['nombre']}",
                    ]);
                    $movimientoId = $movimiento->id;

                    if ($p['categoria_nueva'] ?? null) {
                        $ficha->update(['categoria_tbc' => $p['categoria_nueva']]);
                    }
                }
            }

            ParticipanteConcurso::create([
                'concurso_id'       => $concurso->id,
                'docente_id'        => $p['docente_id'],
                'puntaje_obtenido'  => $p['puntaje_obtenido'] ?? null,
                'resultado'         => $resultado,
                'movimiento_plaza_id' => $movimientoId,
            ]);
        }

        return ApiResponse::success(
            $concurso->fresh(['convocadoPor', 'participantes.docente', 'participantes.movimientoPlaza']),
            'Concurso de oposición registrado.',
            201
        );
    }
}
