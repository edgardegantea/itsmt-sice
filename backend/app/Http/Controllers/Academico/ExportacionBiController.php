<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Feed de datos en CSV para que Power BI / Looker Studio / Google Sheets lo consuman
 * directamente por URL (autenticado con X-Api-Key, ver EnsureApiKey) — sin depender
 * de que alguien exporte y suba manualmente un reporte cada vez que dirección quiera
 * un tablero actualizado.
 */
class ExportacionBiController extends Controller
{
    private function csv(string $filename, array $encabezado, iterable $filas): StreamedResponse
    {
        return response()->streamDownload(function () use ($encabezado, $filas) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 — Excel/Power BI detectan acentos bien con esto
            fputcsv($out, $encabezado);
            foreach ($filas as $fila) {
                fputcsv($out, $fila);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // GET /api/bi/indicadores-carrera.csv?periodo_id=
    public function indicadoresCarrera(Request $request): StreamedResponse
    {
        $periodoId = $request->query('periodo_id');

        $promedios = DB::table('calificaciones as c')
            ->join('grupos as g', 'c.grupo_id', '=', 'g.id')
            ->when($periodoId, fn ($q) => $q->where('g.periodo_id', $periodoId))
            ->whereNull('c.deleted_at')
            ->whereNotNull('c.calificacion_final')
            ->selectRaw('g.carrera_id, ROUND(AVG(c.calificacion_final), 2) as promedio, COUNT(c.id) as total, SUM(CASE WHEN c.acreditado = false THEN 1 ELSE 0 END) as reprobadas')
            ->groupBy('g.carrera_id')
            ->get()
            ->keyBy('carrera_id');

        $alumnos = Alumno::selectRaw('carrera_id, COUNT(*) as total')
            ->where('estatus', 'activo')
            ->groupBy('carrera_id')
            ->get()
            ->keyBy('carrera_id');

        $filas = Carrera::orderBy('nombre')->get()->map(function (Carrera $c) use ($promedios, $alumnos) {
            $p = $promedios->get($c->id);
            $pctReprobacion = ($p && $p->total > 0) ? round($p->reprobadas / $p->total * 100, 2) : '';
            return [
                $c->nombre,
                $alumnos->get($c->id)?->total ?? 0,
                $p->promedio ?? '',
                $pctReprobacion,
            ];
        });

        return $this->csv('indicadores_carrera.csv', ['carrera', 'matricula_activa', 'promedio_general', 'pct_reprobacion'], $filas);
    }

    // GET /api/bi/incidencias.csv?periodo_id=
    public function incidencias(Request $request): StreamedResponse
    {
        $periodoId = $request->query('periodo_id');

        $filas = IncidenciaClase::with(['grupo.carrera', 'docente', 'aula'])
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->orderByDesc('fecha')
            ->get()
            ->map(fn (IncidenciaClase $i) => [
                $i->fecha?->format('Y-m-d'),
                substr($i->hora_revision ?? '', 0, 5),
                $i->grupo?->carrera?->nombre,
                $i->grupo?->clave,
                $i->docente?->name,
                $i->aula?->nombre,
                $i->estatus,
                $i->coincide_horario ? 'si' : 'no',
            ]);

        return $this->csv('incidencias.csv', ['fecha', 'hora', 'carrera', 'grupo', 'docente', 'aula', 'estatus', 'coincide_horario'], $filas);
    }

    // GET /api/bi/asistencia.csv?periodo_id=
    public function asistencia(Request $request): StreamedResponse
    {
        $periodoId = $request->query('periodo_id');

        $filas = SesionClase::with(['grupo.carrera', 'cargaAcademica.materia', 'cargaAcademica.docente', 'asistencias'])
            ->when($periodoId, fn ($q) => $q->whereHas('grupo', fn ($g) => $g->where('periodo_id', $periodoId)))
            ->orderByDesc('fecha')
            ->get()
            ->map(function (SesionClase $s) {
                $total = $s->asistencias->count();
                $presentes = $s->asistencias->where('estatus', 'presente')->count();
                return [
                    $s->fecha?->format('Y-m-d'),
                    $s->grupo?->carrera?->nombre,
                    $s->grupo?->clave,
                    $s->cargaAcademica?->materia?->nombre,
                    $s->cargaAcademica?->docente?->name,
                    $total,
                    $presentes,
                    $total > 0 ? round($presentes / $total * 100, 1) : '',
                ];
            });

        return $this->csv('asistencia.csv', ['fecha', 'carrera', 'grupo', 'materia', 'docente', 'total_alumnos', 'presentes', 'pct_asistencia'], $filas);
    }

    // GET /api/bi/ocupacion-aulas.csv?periodo_id=
    public function ocupacionAulas(Request $request): StreamedResponse
    {
        $periodoId = $request->query('periodo_id');

        $cargas = CargaAcademica::with(['horarios'])
            ->whereNotNull('aula_id')
            ->when($periodoId, fn ($q) => $q->where('periodo_id', $periodoId))
            ->get()
            ->groupBy('aula_id');

        $filas = Aula::orderBy('nombre')->get()->map(function (Aula $a) use ($cargas) {
            $horas = $cargas->get($a->id, collect())->flatMap(fn ($c) => $c->horarios)->sum(function ($h) {
                [$h1, $m1] = array_map('intval', explode(':', substr($h->hora_inicio, 0, 5)));
                [$h2, $m2] = array_map('intval', explode(':', substr($h->hora_fin, 0, 5)));
                return max(0, (($h2 * 60 + $m2) - ($h1 * 60 + $m1)) / 60);
            });
            return [$a->nombre, $a->tipo, $a->capacidad, round($horas, 2)];
        });

        return $this->csv('ocupacion_aulas.csv', ['aula', 'tipo', 'capacidad', 'horas_ocupadas_semana'], $filas);
    }
}
