<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Vista "torre de control": un solo endpoint que cruza, con la hora del servidor,
 * qué está pasando AHORA en cada aula (ocupada/libre, con qué materia), cuántas
 * incidencias de prefectura hubo hoy y qué tanto se ha registrado la asistencia del
 * día — para un dashboard en vivo, no un reporte histórico.
 */
class TorreControlController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/torre-control?periodo_id=
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }

        // jefe_carrera solo ve el detalle (materia/docente/incidencias) de su propia
        // carrera, aunque el mapa de aulas siga siendo campus-wide (recurso físico
        // compartido entre carreras).
        $esJefeCarreraRestringido = $user->hasRole('jefe_carrera')
            && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS]);

        $dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        $diaSemana = $dias[now()->dayOfWeek];
        $hora = now()->format('H:i');
        $hoy = now()->toDateString();

        $aulas = Aula::where('activa', true)->orderBy('nombre')->get();

        $cargasAhora = collect();
        if ($diaSemana !== 'domingo') {
            $cargasAhora = CargaAcademica::with(['materia', 'docente', 'grupos'])
                ->where('periodo_id', $periodoId)
                ->whereNotNull('aula_id')
                ->whereHas('horarios', function ($q) use ($diaSemana, $hora) {
                    $q->where('dia_semana', $diaSemana)
                      ->where('hora_inicio', '<=', $hora)
                      ->where('hora_fin', '>', $hora);
                })
                ->when($esJefeCarreraRestringido, fn ($q) => $q->whereHas(
                    'grupos', fn ($g) => $g->where('carrera_id', $user->carrera_id)
                ))
                ->get()
                ->keyBy('aula_id');
        }

        $incidenciasHoy = IncidenciaClase::where('periodo_id', $periodoId)
            ->whereDate('fecha', $hoy)
            ->with(['grupo.carrera', 'aula', 'docente', 'cargaAcademica.materia'])
            ->when($esJefeCarreraRestringido, fn ($q) => $q->whereHas(
                'grupo', fn ($g) => $g->where('carrera_id', $user->carrera_id)
            ))
            ->orderByDesc('hora_revision')
            ->get();
        $incidenciasPorAula = $incidenciasHoy->groupBy('aula_id');

        $aulasResumen = $aulas->map(function (Aula $a) use ($cargasAhora, $incidenciasPorAula) {
            $carga = $cargasAhora->get($a->id);
            $incidenciasAula = $incidenciasPorAula->get($a->id, collect());
            $ultima = $incidenciasAula->first();

            return [
                'id'                     => $a->id,
                'nombre'                 => $a->nombre,
                'tipo'                   => $a->tipo,
                'ocupada'                => (bool) $carga,
                'materia'                => $carga?->materia?->nombre,
                'docente'                => $carga?->docente?->name,
                'grupo'                  => $carga?->grupos->first()?->clave,
                'incidencias_hoy'        => $incidenciasAula->count(),
                'ultima_incidencia_estatus' => $ultima?->estatus,
            ];
        });

        // Asistencia esperada hoy: un bloque de horario por materia/grupo = una sesión
        // esperada; se compara contra las sesiones de clase realmente registradas hoy.
        $esperadasHoy = $diaSemana !== 'domingo'
            ? Horario::where('dia_semana', $diaSemana)
                ->whereHas('cargaAcademica', fn ($q) => $q->where('periodo_id', $periodoId)
                    ->when($esJefeCarreraRestringido, fn ($q2) => $q2->whereHas(
                        'grupos', fn ($g) => $g->where('carrera_id', $user->carrera_id)
                    )))
                ->count()
            : 0;

        $registradasHoy = SesionClase::whereDate('fecha', $hoy)
            ->whereHas('grupo', fn ($q) => $q->where('periodo_id', $periodoId)
                ->when($esJefeCarreraRestringido, fn ($q2) => $q2->where('carrera_id', $user->carrera_id)))
            ->count();

        $pctAsistenciaHoy = $esperadasHoy > 0 ? round(min(100, $registradasHoy / $esperadasHoy * 100)) : null;

        return ApiResponse::success([
            'dia_semana'   => $diaSemana,
            'hora'         => $hora,
            'aulas'        => $aulasResumen,
            'aulas_ocupadas' => $aulasResumen->where('ocupada', true)->count(),
            'aulas_total'    => $aulasResumen->count(),
            'incidencias_hoy' => [
                'total'       => $incidenciasHoy->count(),
                'con_novedad' => $incidenciasHoy->where('estatus', '!=', 'sin_novedad')->count(),
            ],
            'asistencia_hoy' => [
                'esperadas'   => $esperadasHoy,
                'registradas' => $registradasHoy,
                'pct'         => $pctAsistenciaHoy,
            ],
            'incidencias_recientes' => $incidenciasHoy->take(10)->values(),
        ]);
    }
}
