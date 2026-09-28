<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Titulacion\Models\Titulacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Consolida en un solo PDF los indicadores educativos que organismos acreditadores
 * (CACEI, ISO 9001) piden por carrera — reutiliza exactamente los mismos cálculos que
 * ya existen por separado en IndicadoresController (promedio, reprobación, deserción,
 * eficiencia terminal), para que el reporte de acreditación nunca se desalinee de lo
 * que las demás pantallas del sistema ya muestran.
 */
class ReporteAcreditacionController extends Controller
{
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo', ...User::ROLES_DIRECTIVOS];

    // GET /api/reportes/acreditacion/pdf?periodo_id=&generacion=
    public function pdf(Request $request): Response|JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_CONSULTA)) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'generacion' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $periodo = Periodo::findOrFail($data['periodo_id']);
        $generacion = $data['generacion'] ?? null;

        $carreras = Carrera::orderBy('nombre')->get();

        // Promedio general por carrera (mismo query que IndicadoresController::promedio).
        $promedios = DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->where('g.periodo_id', $periodo->id)
            ->whereNull('c.deleted_at')
            ->whereNotNull('c.calificacion_final')
            ->selectRaw('g.carrera_id, ROUND(AVG(c.calificacion_final), 2) as promedio_general, COUNT(c.id) as total_calificaciones')
            ->groupBy('g.carrera_id')
            ->get()
            ->keyBy('carrera_id');

        // Reprobación por carrera (mismo query que IndicadoresController::reprobacion).
        $reprobacion = DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->where('g.periodo_id', $periodo->id)
            ->whereNull('c.deleted_at')
            ->whereNotNull('c.calificacion_final')
            ->selectRaw('g.carrera_id, COUNT(c.id) as total, SUM(CASE WHEN c.acreditado = false THEN 1 ELSE 0 END) as reprobadas')
            ->groupBy('g.carrera_id')
            ->get()
            ->keyBy('carrera_id');

        // Matrícula activa e histórico de deserción por carrera (sin restringir a la
        // cohorte de ingreso de este periodo, para dar el panorama completo).
        $alumnosPorCarrera = Alumno::selectRaw('carrera_id, estatus, COUNT(*) as total')
            ->groupBy('carrera_id', 'estatus')
            ->get()
            ->groupBy('carrera_id');

        $bajasDefinitivasPorCarrera = DB::table('bajas as b')
            ->join('alumnos as a', 'a.id', '=', 'b.alumno_id')
            ->where('b.tipo_baja', 'definitiva')
            ->selectRaw('a.carrera_id, COUNT(*) as total')
            ->groupBy('a.carrera_id')
            ->get()
            ->keyBy('carrera_id');

        // Eficiencia terminal (solo si se pidió una generación — requiere cohorte fija).
        $eficienciaPorCarrera = collect();
        if ($generacion) {
            $alumnosGeneracion = Alumno::with('periodoIngreso')->get()
                ->filter(fn ($a) => $a->periodoIngreso?->fecha_inicio?->year === $generacion)
                ->groupBy('carrera_id');

            foreach ($alumnosGeneracion as $carreraId => $alumnos) {
                $ids = $alumnos->pluck('id');
                $titulados = Titulacion::whereIn('alumno_id', $ids)->whereIn('estatus', ['aprobado', 'exento'])->count();
                $eficienciaPorCarrera[$carreraId] = [
                    'ingreso'   => $alumnos->count(),
                    'titulados' => $titulados,
                    'pct'       => $alumnos->count() > 0 ? round($titulados / $alumnos->count() * 100, 2) : 0.0,
                ];
            }
        }

        $filas = $carreras->map(function (Carrera $carrera) use ($promedios, $reprobacion, $alumnosPorCarrera, $bajasDefinitivasPorCarrera, $eficienciaPorCarrera) {
            $prom = $promedios->get($carrera->id);
            $rep = $reprobacion->get($carrera->id);
            $pctReprobacion = ($rep && $rep->total > 0) ? round($rep->reprobadas / $rep->total * 100, 2) : null;

            $alumnosEstatus = $alumnosPorCarrera->get($carrera->id, collect());
            $matriculaActiva = $alumnosEstatus->firstWhere('estatus', 'activo')?->total ?? 0;
            $totalHistorico = $alumnosEstatus->sum('total');
            $bajasDef = $bajasDefinitivasPorCarrera->get($carrera->id)?->total ?? 0;
            $pctDesercion = $totalHistorico > 0 ? round($bajasDef / $totalHistorico * 100, 2) : null;

            $eficiencia = $eficienciaPorCarrera->get($carrera->id);

            return [
                'carrera'            => $carrera->nombre,
                'matricula_activa'   => $matriculaActiva,
                'promedio_general'   => $prom->promedio_general ?? null,
                'pct_aprobacion'     => $pctReprobacion !== null ? round(100 - $pctReprobacion, 2) : null,
                'pct_reprobacion'    => $pctReprobacion,
                'pct_desercion'      => $pctDesercion,
                'eficiencia_terminal'=> $eficiencia['pct'] ?? null,
            ];
        });

        $pdf = Pdf::loadView('pdfs.reporte_acreditacion', [
            'periodo'    => $periodo,
            'generacion' => $generacion,
            'filas'      => $filas,
        ])->setPaper('letter', 'landscape');

        return $pdf->download("indicadores_acreditacion_{$periodo->nombre}.pdf");
    }
}
