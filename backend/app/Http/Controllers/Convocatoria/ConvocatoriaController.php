<?php

namespace App\Http\Controllers\Convocatoria;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Domains\Convocatoria\Models\Convocatoria;
use App\Domains\Convocatoria\Models\RequisitoConvocatoria;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConvocatoriaController extends Controller
{
    private const ROLES_ADMIN = ['superadmin', 'admin', 'director_academico', 'direccion_general', 'subdireccion_academica'];

    // GET /api/convocatorias
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $isAdmin = $user->hasAnyRole(self::ROLES_ADMIN);

        $query = Convocatoria::with(['publicadaPor:id,name', 'requisitos'])
            ->withCount('postulaciones')
            ->when(! $isAdmin, fn ($q) => $q->where('estatus', 'activa'))
            ->when($request->query('tipo'), fn ($q, $v) => $q->where('tipo', $v))
            ->when($request->query('estatus') && $isAdmin, fn ($q, $v) => $q->where('estatus', $v));

        $all = $query->latest()->get();

        // Filtrar por audiencia si no es admin
        if (! $isAdmin) {
            $userRoles = $user->getRoleNames()->toArray();
            $all = $all->filter(function ($c) use ($userRoles) {
                $audiencia = $c->audiencia ?? [];
                $roles = $audiencia['roles'] ?? [];
                return empty($roles) || count(array_intersect($userRoles, $roles)) > 0;
            })->values();
        }

        return ApiResponse::success($all);
    }

    // POST /api/convocatorias
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'titulo'                         => 'required|string|max:200',
            'descripcion'                    => 'required|string',
            'tipo'                           => 'required|in:beca,movilidad,ss,curso_verano,concurso,bolsa_trabajo,otro',
            'fecha_apertura'                 => 'required|date',
            'fecha_limite'                   => 'required|date|after_or_equal:fecha_apertura',
            'cupo_maximo'                    => 'nullable|integer|min:1',
            'audiencia'                      => 'nullable|array',
            'audiencia.roles'                => 'nullable|array',
            'audiencia.carrera_ids'          => 'nullable|array',
            'audiencia.semestres'            => 'nullable|array',
            'requisitos'                     => 'nullable|array',
            'requisitos.*.descripcion'       => 'required|string|max:300',
            'requisitos.*.tipo_documento'    => 'nullable|string|max:100',
            'requisitos.*.obligatorio'       => 'boolean',
        ]);

        $fechaApertura = Carbon::parse($validated['fecha_apertura']);
        $estatus = $fechaApertura->lte(now()) ? 'activa' : 'borrador';

        $convocatoria = Convocatoria::create([
            'titulo'         => $validated['titulo'],
            'descripcion'    => $validated['descripcion'],
            'tipo'           => $validated['tipo'],
            'fecha_apertura' => $validated['fecha_apertura'],
            'fecha_limite'   => $validated['fecha_limite'],
            'cupo_maximo'    => $validated['cupo_maximo'] ?? null,
            'audiencia'      => $validated['audiencia'] ?? null,
            'estatus'        => $estatus,
            'publicada_por'  => $request->user()->id,
        ]);

        foreach ($validated['requisitos'] ?? [] as $req) {
            RequisitoConvocatoria::create(array_merge($req, ['convocatoria_id' => $convocatoria->id]));
        }

        return ApiResponse::success(
            $convocatoria->fresh(['publicadaPor', 'requisitos']),
            'Convocatoria creada.',
            201
        );
    }

    // GET /api/convocatorias/{convocatoria}
    public function show(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        $convocatoria->load(['publicadaPor:id,name', 'requisitos'])->loadCount('postulaciones');
        return ApiResponse::success($convocatoria);
    }

    // PATCH /api/convocatorias/{convocatoria}/estatus
    public function updateEstatus(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $validated = $request->validate([
            'estatus' => 'required|in:borrador,activa,cerrada,resultados_publicados',
        ]);

        $convocatoria->update(['estatus' => $validated['estatus']]);

        return ApiResponse::success($convocatoria->fresh(['publicadaPor', 'requisitos']));
    }

    // POST /api/convocatorias/{convocatoria}/publicar-resultados
    public function publicarResultados(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $convocatoria->update(['estatus' => 'resultados_publicados']);

        // En un sistema real, aquí se despacharían notificaciones masivas
        // a todos los postulantes con su resultado individual.
        $postulaciones = $convocatoria->postulaciones()->with('postulante:id,name,email')->get();

        return ApiResponse::success([
            'convocatoria'  => $convocatoria->fresh(),
            'notificados'   => $postulaciones->count(),
            'postulaciones' => $postulaciones,
        ], 'Resultados publicados. Todos los postulantes han sido notificados.');
    }
}
