<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ActaCalificaciones;
use App\Domains\Academico\Models\AlertaBajaDefinitiva;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\Grupo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CierreDeCursoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole([
            'superadmin', 'admin', 'jefe_carrera',
            ...\App\Models\User::ROLES_DIRECTIVOS,
        ])) {
            return ApiResponse::error('No tienes permiso para cerrar cursos.', 403);
        }

        $data = $request->validate([
            'grupo_id'  => ['required', 'uuid', 'exists:grupos,id'],
            'periodo_id'=> ['required', 'uuid', 'exists:periodos,id'],
        ]);

        // Jefe de carrera: solo sus grupos
        if ($user->hasRole('jefe_carrera')) {
            $grupo = Grupo::find($data['grupo_id']);
            if (! $grupo || $grupo->carrera_id !== $user->carrera_id) {
                return ApiResponse::error('No tienes acceso a grupos de otra carrera.', 403);
            }
        }

        // Verificar que no ya esté cerrado
        $existente = CierreDeCurso::where('grupo_id', $data['grupo_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->exists();

        if ($existente) {
            return ApiResponse::error('Este curso ya fue cerrado anteriormente.', 422);
        }

        // S4-04: no se puede cerrar el curso si aún faltan calificaciones por capturar
        $pendientes = $this->contarCalificacionesPendientes($data['grupo_id']);
        if ($pendientes > 0) {
            return ApiResponse::error(
                "No se puede cerrar el curso: faltan {$pendientes} calificación(es) final(es) por capturar.",
                422
            );
        }

        DB::transaction(function () use ($data, $request, &$cierre) {
            $cierre = CierreDeCurso::create([
                'grupo_id'    => $data['grupo_id'],
                'periodo_id'  => $data['periodo_id'],
                'cerrado_por' => $request->user()->id,
                'fecha_cierre'=> now(),
            ]);

            // S4-04: publicar las calificaciones (ya no editables por el docente)
            Calificacion::where('grupo_id', $data['grupo_id'])->update(['publicada' => true]);

            // S4-06: Clasificación automática tras cierre
            $this->clasificarYGenerarAlertas($data['grupo_id'], $data['periodo_id']);
        });

        return ApiResponse::success($cierre->load(['grupo', 'periodo', 'cerradoPor']), 'Curso cerrado exitosamente.', 201);
    }

    /**
     * Cuenta cuántas calificaciones finales faltan por capturar en el grupo,
     * considerando que cada alumno debe tener calificación en cada una de las
     * cargas académicas (materias) del grupo.
     */
    private function contarCalificacionesPendientes(string $grupoId): int
    {
        $grupo = Grupo::with(['alumnos', 'cargas'])->find($grupoId);

        if (! $grupo || $grupo->cargas->isEmpty() || $grupo->alumnos->isEmpty()) {
            return 0;
        }

        $alumnoIds = $grupo->alumnos->pluck('id');
        $totalEsperado = $alumnoIds->count() * $grupo->cargas->count();

        // Registros legacy sin carga_academica_id (previos a vincular esa columna)
        // no pueden asociarse a una materia específica; se cuentan como comodín
        // para cualquier carga del alumno, en vez de bloquear el cierre por algo
        // que ya fue capturado pero no se puede clasificar con precisión.
        $calificaciones = Calificacion::where('grupo_id', $grupoId)
            ->whereIn('alumno_id', $alumnoIds)
            ->whereNotNull('calificacion_final')
            ->get(['alumno_id', 'carga_academica_id']);

        $capturadas = 0;
        foreach ($grupo->alumnos as $alumno) {
            foreach ($grupo->cargas as $carga) {
                $existe = $calificaciones->contains(
                    fn ($c) => $c->alumno_id === $alumno->id
                        && ($c->carga_academica_id === $carga->id || $c->carga_academica_id === null)
                );
                if ($existe) {
                    $capturadas++;
                }
            }
        }

        return max(0, $totalEsperado - $capturadas);
    }

    /**
     * Reabre un curso previamente cerrado (deshace el cierre), para corregir un
     * cierre hecho por error. Solo posible mientras ninguna acta de esa
     * grupo/materia haya sido firmada (retención permanente ya activada).
     * Queda registrado en la bitácora de auditoría.
     */
    public function reabrir(Request $request, string $grupoId): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'director_academico'])) {
            return ApiResponse::error('No tienes permiso para reabrir cursos.', 403);
        }

        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'motivo'     => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $cierre = CierreDeCurso::where('grupo_id', $grupoId)
            ->where('periodo_id', $data['periodo_id'])
            ->first();

        if (! $cierre) {
            return ApiResponse::error('Este curso no está cerrado.', 422);
        }

        $huboActaFirmada = ActaCalificaciones::where('grupo_id', $grupoId)
            ->where('periodo_id', $data['periodo_id'])
            ->where('firmada', true)
            ->exists();

        if ($huboActaFirmada) {
            return ApiResponse::error('No se puede reabrir: ya hay al menos un acta de calificaciones firmada e integrada al libro de actas (retención permanente).', 422);
        }

        DB::transaction(function () use ($grupoId, $data, $cierre, $user) {
            Calificacion::where('grupo_id', $grupoId)->update(['publicada' => false]);

            AuditLogService::record(
                'reabrir_curso',
                'grupos',
                $grupoId,
                ['periodo_id' => $data['periodo_id'], 'motivo' => $data['motivo'], 'cierre_original_id' => $cierre->id],
            );

            $cierre->delete();
        });

        return ApiResponse::success(null, 'Curso reabierto. Las calificaciones vuelven a ser editables.');
    }

    private function clasificarYGenerarAlertas(string $grupoId, string $periodoId): void
    {
        // Obtener calificaciones no acreditadas de este grupo, cada una con su propia
        // carga académica/materia — un grupo puede agrupar varias materias.
        $noAcreditadas = Calificacion::with('cargaAcademica.materia')
            ->where('grupo_id', $grupoId)
            ->where('acreditado', false)
            ->whereNotNull('acreditado')
            ->get();

        foreach ($noAcreditadas as $cal) {
            $intentoActual = $cal->intento_numero;

            // Si falla un especial (3er intento), genera alerta de baja definitiva
            if ($intentoActual >= 3 || $cal->tipo_curso === 'especial') {
                if (! $cal->carga_academica_id) {
                    // Calificación histórica sin materia identificable de forma inequívoca
                    // (capturada antes de vincular carga_academica_id). No se puede clasificar
                    // automáticamente; se registra en la cola de revisión manual en lugar de
                    // solo un log, para que Control Escolar la atienda desde la UI.
                    AlertaBajaDefinitiva::firstOrCreate(
                        ['alumno_id' => $cal->alumno_id, 'calificacion_id' => $cal->id],
                        [
                            'grupo_id'                 => $grupoId,
                            'carga_academica_id'       => null,
                            'periodo_id'               => $periodoId,
                            'materia_nombre'           => '(materia no identificable — revisión manual)',
                            'intento_numero'           => $intentoActual,
                            'requiere_revision_manual' => true,
                        ]
                    );
                    continue;
                }

                // Verificar no duplicar alerta (por materia, no solo por grupo)
                $alertaExistente = AlertaBajaDefinitiva::where('alumno_id', $cal->alumno_id)
                    ->where('grupo_id', $grupoId)
                    ->where('carga_academica_id', $cal->carga_academica_id)
                    ->exists();

                if (! $alertaExistente) {
                    AlertaBajaDefinitiva::create([
                        'alumno_id'          => $cal->alumno_id,
                        'grupo_id'           => $grupoId,
                        'carga_academica_id' => $cal->carga_academica_id,
                        'calificacion_id'    => $cal->id,
                        'periodo_id'         => $periodoId,
                        'materia_nombre'     => $cal->cargaAcademica->materia->nombre ?? 'Materia',
                        'intento_numero'     => $intentoActual,
                    ]);
                }
            }
        }
    }
}
