<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Egresado;
use App\Domains\Academico\Models\EncuestaSeguimientoEgresado;
use App\Domains\Academico\Models\HistorialLaboralEgresado;
use App\Domains\Academico\Models\PostulacionBolsaTrabajo;
use App\Domains\Academico\Models\VacanteBolsaTrabajo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalEgresadoController extends Controller
{
    private array $rolesGestion = ['superadmin', 'admin', 'control_escolar', 'direccion_academica'];

    // GET /api/egresados/{egresado}/historial-laboral
    public function historialLaboral(Egresado $egresado): JsonResponse
    {
        return ApiResponse::success($egresado->historialLaboral()->orderByDesc('fecha_inicio')->get());
    }

    // POST /api/egresados/{egresado}/historial-laboral
    public function storeHistorialLaboral(Request $request, Egresado $egresado): JsonResponse
    {
        $data = $request->validate([
            'empresa'        => ['required', 'string', 'max:200'],
            'puesto'         => ['required', 'string', 'max:200'],
            'sector'         => ['nullable', 'in:publico,privado,emprendimiento,otro'],
            'fecha_inicio'   => ['required', 'date'],
            'fecha_fin'      => ['nullable', 'date', 'after:fecha_inicio'],
            'rango_salarial' => ['nullable', 'string', 'max:100'],
        ]);

        if (empty($data['fecha_fin'])) {
            $egresado->historialLaboral()->where('activo', true)->update(['activo' => false]);
        }

        $historial = HistorialLaboralEgresado::create(array_merge($data, [
            'egresado_id' => $egresado->id,
            'activo'      => empty($data['fecha_fin']),
        ]));

        $egresado->update([
            'empresa_actual' => $data['empresa'],
            'puesto_actual'  => $data['puesto'],
            'sector'         => $data['sector'] ?? $egresado->sector,
        ]);

        return ApiResponse::success($historial, 'Historial laboral registrado.', 201);
    }

    // GET /api/egresados/{egresado}/encuestas
    public function encuestas(Egresado $egresado): JsonResponse
    {
        return ApiResponse::success($egresado->encuestas()->orderByDesc('created_at')->get());
    }

    // POST /api/egresados/{egresado}/encuestas
    public function storeEncuesta(Request $request, Egresado $egresado): JsonResponse
    {
        $data = $request->validate([
            'periodo_aplicacion' => ['required', 'string', 'max:50'],
        ]);

        $encuesta = EncuestaSeguimientoEgresado::create(array_merge($data, [
            'egresado_id' => $egresado->id,
            'estatus'     => 'pendiente',
        ]));

        return ApiResponse::success($encuesta, 'Encuesta de seguimiento generada.', 201);
    }

    // PATCH /api/encuestas-seguimiento/{encuesta}/responder
    public function responderEncuesta(Request $request, EncuestaSeguimientoEgresado $encuesta): JsonResponse
    {
        $data = $request->validate([
            'satisfaccion_formacion'    => ['required', 'integer', 'min:1', 'max:5'],
            'pertinencia_plan_estudios' => ['required', 'integer', 'min:1', 'max:5'],
            'empleabilidad_meses'       => ['nullable', 'integer', 'min:0'],
            'recomendaria'              => ['required', 'boolean'],
            'comentarios'               => ['nullable', 'string'],
        ]);

        $encuesta->update(array_merge($data, [
            'estatus'         => 'respondida',
            'fecha_respuesta' => now(),
        ]));

        return ApiResponse::success($encuesta->fresh(), 'Respuesta registrada. Gracias por tu retroalimentación.');
    }

    // GET /api/vacantes-bolsa-trabajo
    public function vacantes(Request $request): JsonResponse
    {
        $vacantes = VacanteBolsaTrabajo::with(['carrera', 'publicador'])
            ->when($request->query('carrera_id'), fn($q, $v) => $q->where('carrera_id', $v))
            ->when($request->boolean('solo_activas'), fn($q) => $q->where('activa', true))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($vacantes);
    }

    // POST /api/vacantes-bolsa-trabajo
    public function storeVacante(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para publicar vacantes.');
        }

        $data = $request->validate([
            'empresa'            => ['required', 'string', 'max:200'],
            'puesto'             => ['required', 'string', 'max:200'],
            'descripcion'        => ['nullable', 'string'],
            'carrera_id'         => ['nullable', 'uuid', 'exists:carreras,id'],
            'rango_salarial'     => ['nullable', 'string', 'max:100'],
            'modalidad'          => ['nullable', 'in:presencial,remoto,hibrido'],
            'contacto_email'     => ['required', 'email'],
            'fecha_publicacion'  => ['required', 'date'],
            'fecha_cierre'       => ['nullable', 'date', 'after:fecha_publicacion'],
        ]);

        $vacante = VacanteBolsaTrabajo::create(array_merge($data, [
            'modalidad'     => $data['modalidad'] ?? 'presencial',
            'activa'        => true,
            'publicado_por' => $request->user()->id,
        ]));

        return ApiResponse::success($vacante->load(['carrera', 'publicador']), 'Vacante publicada.', 201);
    }

    // POST /api/vacantes-bolsa-trabajo/{vacante}/postulaciones
    public function postular(Request $request, VacanteBolsaTrabajo $vacante): JsonResponse
    {
        $data = $request->validate([
            'egresado_id' => ['required', 'uuid', 'exists:egresados,id'],
            'notas'       => ['nullable', 'string'],
        ]);

        $postulacion = PostulacionBolsaTrabajo::create(array_merge($data, [
            'vacante_id'        => $vacante->id,
            'fecha_postulacion' => now()->toDateString(),
            'estatus'           => 'postulado',
        ]));

        return ApiResponse::success($postulacion->load(['vacante', 'egresado']), 'Postulación registrada.', 201);
    }

    // PATCH /api/postulaciones-bolsa-trabajo/{postulacion}/estatus
    public function actualizarEstatusPostulacion(Request $request, PostulacionBolsaTrabajo $postulacion): JsonResponse
    {
        if (! $request->user()->hasAnyRole($this->rolesGestion)) {
            abort(403, 'Sin permiso para actualizar postulaciones.');
        }

        $data = $request->validate([
            'estatus' => ['required', 'in:en_proceso,contratado,rechazado'],
            'notas'   => ['nullable', 'string'],
        ]);

        $postulacion->update($data);

        return ApiResponse::success($postulacion->fresh(), 'Postulación actualizada.');
    }

    // GET /api/indicadores/empleabilidad
    public function indicadoresEmpleabilidad(): JsonResponse
    {
        $egresados = Egresado::all();
        $encuestas = EncuestaSeguimientoEgresado::where('estatus', 'respondida')->get();
        $vacantes = VacanteBolsaTrabajo::all();
        $postulaciones = PostulacionBolsaTrabajo::all();

        return ApiResponse::success([
            'total_egresados'          => $egresados->count(),
            'egresados_titulados'      => $egresados->where('titulado', true)->count(),
            'por_sector'               => $egresados->whereNotNull('sector')->groupBy('sector')->map->count(),
            'encuestas_respondidas'    => $encuestas->count(),
            'satisfaccion_promedio'    => round($encuestas->avg('satisfaccion_formacion') ?? 0, 2),
            'pertinencia_promedio'     => round($encuestas->avg('pertinencia_plan_estudios') ?? 0, 2),
            'tasa_recomendacion'       => $encuestas->count() ? round($encuestas->where('recomendaria', true)->count() / $encuestas->count() * 100, 1) : 0,
            'vacantes_activas'         => $vacantes->where('activa', true)->count(),
            'postulaciones_contratado' => $postulaciones->where('estatus', 'contratado')->count(),
        ]);
    }
}
