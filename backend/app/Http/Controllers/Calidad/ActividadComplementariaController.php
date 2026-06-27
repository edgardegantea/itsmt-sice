<?php

namespace App\Http\Controllers\Calidad;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Domains\Calidad\Models\TipoActividad;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ActividadComplementariaController extends Controller
{
    // GET /api/actividades-complementarias
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ActividadComplementaria::class);

        $user = $request->user();

        // Alumno: solo ve las suyas
        if ($user->hasRole('alumno')) {
            $alumno = Alumno::where('user_id', $user->id)->firstOrFail();
            $query  = ActividadComplementaria::with('tipo')
                ->where('alumno_id', $alumno->id);
        } else {
            // Admin / directivos / jefe_carrera: listado general con filtros
            $carreraForzada = $user->carreraRestringida();
            $query = ActividadComplementaria::with(['tipo', 'alumno.user', 'alumno.carrera', 'validador'])
                ->when($carreraForzada, fn($q, $v) =>
                    $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
                )
                ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
                ->when($request->query('carrera_id'), fn($q, $v) =>
                    $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
                )
                ->when($request->query('tipo_id'), fn($q, $v) => $q->where('tipo_id', $v));
        }

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /api/actividades-complementarias
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ActividadComplementaria::class);

        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        // S5-01: solo en primeros 6 semestres
        if ($alumno->semestre_actual > 6) {
            return ApiResponse::error('Las actividades complementarias solo se registran en los primeros 6 semestres.', 422);
        }

        $data = $request->validate([
            'tipo_id'  => ['required', 'uuid', 'exists:tipos_actividad,id'],
            'horas'    => ['required', 'numeric', 'min:0.5', 'max:500'],
            'evidencia_url' => ['nullable', 'url', 'max:500'],
        ]);

        // S5-01: no superar 2 créditos (horas) por tipo por semestre — validamos vs horas_requeridas del tipo
        $tipo = TipoActividad::findOrFail($data['tipo_id']);
        $horasAcumuladas = ActividadComplementaria::where('alumno_id', $alumno->id)
            ->where('tipo_id', $data['tipo_id'])
            ->whereNotIn('estatus', ['rechazada'])
            ->sum('horas');

        // Cada tipo permite máximo 2× horas_requeridas en total
        $maxHoras = $tipo->horas_requeridas * 2;
        if (($horasAcumuladas + $data['horas']) > $maxHoras) {
            return ApiResponse::error(
                "No puedes superar {$maxHoras} horas acumuladas en el tipo '{$tipo->nombre}'.",
                422
            );
        }

        $actividad = ActividadComplementaria::create([
            ...$data,
            'alumno_id'                   => $alumno->id,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => $alumno->semestre_actual,
        ]);

        return ApiResponse::success($actividad->load('tipo'), 'Actividad complementaria registrada.', 201);
    }

    // POST /api/actividades-complementarias/{id}/evidencia  — subir archivo
    public function subirEvidencia(Request $request, ActividadComplementaria $actividad): JsonResponse
    {
        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();
        if ($actividad->alumno_id !== $alumno->id) {
            abort(403, 'No tienes acceso a esta actividad.');
        }
        if ($actividad->estatus !== 'registrada') {
            return ApiResponse::error('Solo se puede subir evidencia en actividades con estatus registrada.', 422);
        }

        $request->validate([
            'evidencia' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:10240'],
        ]);

        if ($actividad->evidencia_url && str_starts_with($actividad->evidencia_url, 'actividades/')) {
            Storage::disk('public')->delete($actividad->evidencia_url);
        }

        $path = $request->file('evidencia')->store('actividades/evidencias', 'public');
        $actividad->update(['evidencia_url' => Storage::disk('public')->url($path)]);

        return ApiResponse::success(['evidencia_url' => $actividad->evidencia_url], 'Evidencia subida.');
    }

    // PATCH /api/actividades-complementarias/{id}/validar
    public function validar(Request $request, ActividadComplementaria $actividad): JsonResponse
    {
        $this->authorize('validar', ActividadComplementaria::class);

        if ($actividad->estatus !== 'registrada') {
            return ApiResponse::error('Solo se pueden validar actividades en estatus registrada.', 422);
        }

        $data = $request->validate([
            'estatus'                => ['required', 'in:validada,rechazada'],
            'nivel_desempeno'        => ['required_if:estatus,validada', 'nullable',
                                         'in:excelente,notable,bueno,suficiente,insuficiente'],
            'observaciones_validacion' => ['nullable', 'string', 'max:500'],
        ]);

        $actividad->update([
            ...$data,
            'validado_por' => $request->user()->id,
        ]);

        return ApiResponse::success($actividad->fresh(['tipo', 'alumno.user', 'validador']), 'Actividad validada.');
    }

    // DELETE /api/actividades-complementarias/{id}
    public function destroy(Request $request, ActividadComplementaria $actividad): JsonResponse
    {
        $this->authorize('delete', $actividad);

        if ($actividad->estatus !== 'registrada') {
            return ApiResponse::error('Solo puedes eliminar actividades en estatus registrada.', 422);
        }

        $actividad->delete();

        return ApiResponse::success(null, 'Actividad eliminada.', 204);
    }
}
