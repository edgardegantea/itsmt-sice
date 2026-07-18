<?php

namespace App\Http\Controllers\Investigacion;

use App\Domains\Investigacion\Models\CuerpoAcademico;
use App\Domains\Investigacion\Models\IntegranteCa;
use App\Domains\Investigacion\Models\Lgac;
use App\Domains\Investigacion\Models\ProduccionAcademica;
use App\Domains\Investigacion\Models\ProyectoInvestigacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuerpoAcademicoController extends Controller
{
    private array $rolesDireccion = ['superadmin', 'admin', 'director_academico', 'direccion_academica'];

    // GET /api/cuerpos-academicos
    public function index(Request $request): JsonResponse
    {
        $cuerpos = CuerpoAcademico::with(['lider', 'lgacs'])
            ->when($request->query('grado_consolidacion'), fn($q, $v) => $q->where('grado_consolidacion', $v))
            ->when($request->boolean('solo_activos'), fn($q) => $q->where('activo', true))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($cuerpos);
    }

    // POST /api/cuerpos-academicos
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesDireccion)) {
            abort(403, 'Sin permiso para registrar cuerpos académicos.');
        }

        $data = $request->validate([
            'nombre'              => ['required', 'string', 'max:200'],
            'clave'               => ['required', 'string', 'max:50', 'unique:cuerpos_academicos,clave'],
            'lgac_principal'      => ['nullable', 'string', 'max:200'],
            'grado_consolidacion' => ['nullable', 'in:en_formacion,en_consolidacion,consolidado'],
            'fecha_registro'      => ['required', 'date'],
            'fecha_vigencia'      => ['nullable', 'date', 'after:fecha_registro'],
            'lider_id'            => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $ca = CuerpoAcademico::create(array_merge($data, [
            'grado_consolidacion' => $data['grado_consolidacion'] ?? 'en_formacion',
            'activo'              => true,
        ]));

        return ApiResponse::success($ca->load('lider'), 'Cuerpo académico registrado.', 201);
    }

    // GET /api/cuerpos-academicos/{ca}
    public function show(CuerpoAcademico $ca): JsonResponse
    {
        return ApiResponse::success(
            $ca->load(['lider', 'lgacs', 'integrantes.docente', 'proyectos', 'producciones'])
        );
    }

    // POST /api/cuerpos-academicos/{ca}/lgac
    public function agregarLgac(Request $request, CuerpoAcademico $ca): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string'],
        ]);

        $lgac = Lgac::create(array_merge($data, ['cuerpo_academico_id' => $ca->id]));

        return ApiResponse::success($lgac, 'LGAC registrada.', 201);
    }

    // POST /api/cuerpos-academicos/{ca}/integrantes
    public function agregarIntegrante(Request $request, CuerpoAcademico $ca): JsonResponse
    {
        $data = $request->validate([
            'docente_id'    => ['required', 'uuid', 'exists:users,id'],
            'rol'           => ['nullable', 'in:lider,integrante,colaborador'],
            'fecha_ingreso' => ['required', 'date'],
        ]);

        $integrante = IntegranteCa::create(array_merge($data, [
            'cuerpo_academico_id' => $ca->id,
            'rol'                 => $data['rol'] ?? 'integrante',
        ]));

        return ApiResponse::success($integrante->load('docente'), 'Integrante agregado.', 201);
    }

    // PATCH /api/integrantes-ca/{integrante}/baja
    public function bajaIntegrante(Request $request, IntegranteCa $integrante): JsonResponse
    {
        $integrante->update(['fecha_baja' => now()->toDateString()]);

        return ApiResponse::success($integrante->fresh(), 'Integrante dado de baja del cuerpo académico.');
    }

    // GET /api/proyectos-investigacion
    public function proyectos(Request $request): JsonResponse
    {
        $proyectos = ProyectoInvestigacion::with(['cuerpoAcademico', 'responsable'])
            ->when($request->query('cuerpo_academico_id'), fn($q, $v) => $q->where('cuerpo_academico_id', $v))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('tipo'), fn($q, $v) => $q->where('tipo', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($proyectos);
    }

    // POST /api/proyectos-investigacion
    public function storeProyecto(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cuerpo_academico_id'   => ['nullable', 'uuid', 'exists:cuerpos_academicos,id'],
            'titulo'                => ['required', 'string', 'max:250'],
            'tipo'                  => ['nullable', 'in:interno,externo,financiado'],
            'fuente_financiamiento' => ['nullable', 'string', 'max:200'],
            'monto'                 => ['nullable', 'numeric', 'min:0'],
            'fecha_inicio'          => ['required', 'date'],
            'fecha_fin'             => ['nullable', 'date', 'after:fecha_inicio'],
            'descripcion'           => ['nullable', 'string'],
        ]);

        $proyecto = ProyectoInvestigacion::create(array_merge($data, [
            'tipo'           => $data['tipo'] ?? 'interno',
            'estatus'        => 'registrado',
            'responsable_id' => $request->user()->id,
        ]));

        return ApiResponse::success($proyecto->load(['cuerpoAcademico', 'responsable']), 'Proyecto de investigación registrado.', 201);
    }

    // PATCH /api/proyectos-investigacion/{proyecto}/estatus
    public function actualizarEstatusProyecto(Request $request, ProyectoInvestigacion $proyecto): JsonResponse
    {
        $data = $request->validate([
            'estatus'   => ['required', 'in:registrado,en_proceso,concluido,cancelado'],
            'fecha_fin' => ['nullable', 'date'],
        ]);

        $proyecto->update($data);

        return ApiResponse::success($proyecto->fresh(), 'Estatus del proyecto actualizado.');
    }

    // GET /api/producciones-academicas
    public function producciones(Request $request): JsonResponse
    {
        $producciones = ProduccionAcademica::with(['proyecto', 'cuerpoAcademico', 'autorPrincipal'])
            ->when($request->query('cuerpo_academico_id'), fn($q, $v) => $q->where('cuerpo_academico_id', $v))
            ->when($request->query('proyecto_id'), fn($q, $v) => $q->where('proyecto_id', $v))
            ->when($request->query('tipo'), fn($q, $v) => $q->where('tipo', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($producciones);
    }

    // POST /api/producciones-academicas
    public function storeProduccion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'proyecto_id'          => ['nullable', 'uuid', 'exists:proyectos_investigacion,id'],
            'cuerpo_academico_id'  => ['nullable', 'uuid', 'exists:cuerpos_academicos,id'],
            'tipo'                 => ['required', 'in:articulo,libro,capitulo,ponencia,patente,tesis_dirigida'],
            'titulo'               => ['required', 'string', 'max:300'],
            'coautores'            => ['nullable', 'string'],
            'medio_difusion'       => ['nullable', 'string', 'max:200'],
            'fecha_publicacion'    => ['required', 'date'],
            'doi_isbn'             => ['nullable', 'string', 'max:100'],
        ]);

        $produccion = ProduccionAcademica::create(array_merge($data, [
            'autor_principal_id' => $request->user()->id,
            'estatus'            => 'registrada',
        ]));

        return ApiResponse::success($produccion->load(['proyecto', 'cuerpoAcademico', 'autorPrincipal']), 'Producción académica registrada.', 201);
    }

    // PATCH /api/producciones-academicas/{produccion}/validar
    public function validarProduccion(Request $request, ProduccionAcademica $produccion): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesDireccion)) {
            abort(403, 'Sin permiso para validar producción académica.');
        }

        $produccion->update(['estatus' => 'validada']);

        return ApiResponse::success($produccion->fresh(), 'Producción académica validada.');
    }

    // GET /api/indicadores/investigacion
    public function indicadores(): JsonResponse
    {
        $cuerpos = CuerpoAcademico::where('activo', true)->get();
        $proyectos = ProyectoInvestigacion::all();
        $producciones = ProduccionAcademica::all();

        return ApiResponse::success([
            'total_cuerpos_academicos' => $cuerpos->count(),
            'por_grado_consolidacion'  => $cuerpos->groupBy('grado_consolidacion')->map->count(),
            'proyectos_en_proceso'     => $proyectos->where('estatus', 'en_proceso')->count(),
            'proyectos_concluidos'     => $proyectos->where('estatus', 'concluido')->count(),
            'producciones_por_tipo'    => $producciones->groupBy('tipo')->map->count(),
            'producciones_validadas'   => $producciones->where('estatus', 'validada')->count(),
        ]);
    }
}
