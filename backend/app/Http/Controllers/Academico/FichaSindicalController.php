<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Academico\Models\ConcursoOposicion;
use App\Domains\Academico\Models\FichaSindical;
use App\Domains\Academico\Models\MovimientoPlaza;
use App\Domains\Academico\Models\ParticipanteConcurso;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FichaSindicalController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin'];
    private const ROLES_ACCESO = ['superadmin', 'admin', 'director_academico', 'direccion_general',
                                   'subdireccion_academica', 'control_escolar'];

    // GET /api/docentes/{docente}/ficha-sindical
    public function show(Request $request, User $docente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $ficha = FichaSindical::with(['docente', 'departamento', 'movimientos.registradoPor'])
            ->where('docente_id', $docente->id)
            ->first();

        if (! $ficha) {
            return ApiResponse::error('Este docente no tiene ficha sindical registrada.', 404);
        }

        return ApiResponse::success($ficha);
    }

    // POST /api/docentes/{docente}/ficha-sindical
    public function store(Request $request, User $docente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'clave_plaza'          => 'required|string|max:50|unique:fichas_sindicales,clave_plaza',
            'tipo_nombramiento'    => 'required|in:Base,Interino,Hora-Clase,Medio-Tiempo',
            'categoria_tbc'        => 'nullable|string|max:20',
            'nivel_tbc'            => 'nullable|string|max:20',
            'numero_issste'        => 'nullable|string|max:20|unique:fichas_sindicales,numero_issste',
            'fecha_ingreso_sep'    => 'required|date',
            'fecha_ingreso_tecnm'  => 'nullable|date',
            'departamento_id'      => 'nullable|uuid|exists:directorio_areas,id',
            'activo'               => 'boolean',
        ]);

        $fechaSep  = Carbon::parse($validated['fecha_ingreso_sep']);
        $anios     = $fechaSep->diffInYears(now());

        $ficha = FichaSindical::create(array_merge($validated, [
            'docente_id'    => $docente->id,
            'anios_servicio' => $anios,
        ]));

        $alerta = isset($validated['fecha_ingreso_tecnm'])
            && Carbon::parse($validated['fecha_ingreso_sep'])->gt(Carbon::parse($validated['fecha_ingreso_tecnm']));

        $data = $ficha->fresh(['docente', 'departamento']);

        return ApiResponse::success(
            array_merge($data->toArray(), ['alerta_fecha' => $alerta]),
            $alerta
                ? 'Ficha sindical registrada. Alerta: fecha_ingreso_sep es posterior a fecha_ingreso_tecnm.'
                : 'Ficha sindical registrada.',
            201
        );
    }

    // GET /api/docentes/{docente}/historial-escalafon
    public function historialEscalafon(Request $request, User $docente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ACCESO)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $ficha = FichaSindical::where('docente_id', $docente->id)->first();

        $movimientos = $ficha
            ? MovimientoPlaza::with('registradoPor:id,name')
                ->where('ficha_sindical_id', $ficha->id)
                ->orderBy('fecha_efectiva')
                ->get()
                ->map(fn ($m) => array_merge($m->toArray(), ['_tipo_evento' => 'movimiento_plaza']))
            : collect();

        $concursos = ParticipanteConcurso::with(['concurso', 'movimientoPlaza'])
            ->where('docente_id', $docente->id)
            ->get()
            ->map(fn ($p) => [
                '_tipo_evento'    => 'concurso_oposicion',
                'id'              => $p->id,
                'fecha_efectiva'  => $p->concurso?->fecha_realizacion?->toDateString(),
                'concurso'        => $p->concurso,
                'puntaje_obtenido' => $p->puntaje_obtenido,
                'resultado'       => $p->resultado,
                'movimiento_plaza' => $p->movimientoPlaza,
            ]);

        $historial = $movimientos->concat($concursos)
            ->sortBy('fecha_efectiva')
            ->values();

        return ApiResponse::success([
            'docente'  => $docente->only(['id', 'name', 'email']),
            'ficha'    => $ficha,
            'historial' => $historial,
        ]);
    }
}
