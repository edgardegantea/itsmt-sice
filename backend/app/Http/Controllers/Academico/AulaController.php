<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AulaController extends Controller
{
    // GET /api/aulas
    public function index(Request $request): JsonResponse
    {
        $aulas = Aula::query()
            ->when($request->query('tipo'),   fn($q, $v) => $q->where('tipo', $v))
            ->when($request->query('activa'), fn($q, $v) => $q->where('activa', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($aulas);
    }

    // POST /api/aulas
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['required', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['required', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula = Aula::create($data);

        return ApiResponse::success($aula, 'Aula registrada.', 201);
    }

    // PATCH /api/aulas/{aula}
    public function update(Request $request, Aula $aula): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['sometimes', 'string', 'max:50'],
            'capacidad' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'tipo'      => ['sometimes', 'in:salon,laboratorio,taller'],
            'activa'    => ['sometimes', 'boolean'],
        ]);

        $aula->update($data);

        return ApiResponse::success($aula, 'Aula actualizada.');
    }

    // DELETE /api/aulas/{aula}
    public function destroy(Aula $aula): JsonResponse
    {
        $aula->delete();
        return ApiResponse::success(null, 'Aula eliminada.');
    }

    // GET /api/aulas/disponibles?dia_semana=lunes&hora_inicio=08:00&hora_fin=09:00&periodo_id=...
    // S11-01: aulas sin conflicto en el bloque horario solicitado
    public function disponibles(Request $request): JsonResponse
    {
        $request->validate([
            'dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'periodo_id'  => ['nullable', 'uuid'],
        ]);

        // IDs de aulas ocupadas en ese bloque
        $ocupadas = CargaAcademica::whereNotNull('aula_id')
            ->when($request->periodo_id, fn($q, $v) => $q->where('periodo_id', $v))
            ->whereHas('horarios', function ($q) use ($request) {
                $q->where('dia_semana', $request->dia_semana)
                  ->where(function ($q2) use ($request) {
                      $q2->where(function ($q3) use ($request) {
                          // traslape: inicio del bloque cae dentro de un horario existente
                          $q3->where('hora_inicio', '<', $request->hora_fin)
                             ->where('hora_fin',    '>',  $request->hora_inicio);
                      });
                  });
            })
            ->pluck('aula_id');

        $disponibles = Aula::where('activa', true)
            ->whereNotIn('id', $ocupadas)
            ->when($request->tipo, fn($q, $v) => $q->where('tipo', $v))
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($disponibles);
    }

    // GET /api/aulas/{aula}/horario-actual?periodo_id=
    // Resuelve, a partir de la hora del servidor, qué carga académica debería estar
    // ocurriendo AHORA MISMO en esta aula — es el dato que alimenta el flujo de QR
    // fijo por salón: quien escanea el código pegado en la puerta ve de inmediato qué
    // clase le toca sin tener que buscarla manualmente.
    public function horarioActual(Request $request, Aula $aula): JsonResponse
    {
        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }

        $dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        $diaSemana = $dias[now()->dayOfWeek];
        $hora = now()->format('H:i');

        $carga = null;
        if ($diaSemana !== 'domingo') {
            $carga = CargaAcademica::with(['materia', 'docente', 'grupos'])
                ->where('periodo_id', $periodoId)
                ->where('aula_id', $aula->id)
                ->whereHas('horarios', function ($q) use ($diaSemana, $hora) {
                    $q->where('dia_semana', $diaSemana)
                      ->where('hora_inicio', '<=', $hora)
                      ->where('hora_fin', '>', $hora);
                })
                ->first();
        }

        return ApiResponse::success([
            'aula'        => $aula,
            'dia_semana'  => $diaSemana,
            'hora'        => $hora,
            'carga'       => $carga,
            'grupo'       => $carga?->grupos->first(),
        ]);
    }

    // GET /api/aulas/ocupacion?periodo_id=  — horas/semana ocupadas por aula y su
    // desglose de bloques (día+hora+grupo+materia), para mostrar qué tan saturado
    // está cada espacio y a qué hora está libre. El % se calcula contra una ventana
    // operativa institucional fija (lunes a sábado, 07:00–20:00 = 78 h/semana) ya que
    // no hay una tabla de horario institucional configurable.
    private const HORAS_OPERACION_SEMANA = 78;

    public function ocupacion(Request $request): JsonResponse
    {
        $periodoId = $request->query('periodo_id');

        $aulas = Aula::orderBy('nombre')->get();

        $cargas = CargaAcademica::with(['horarios', 'materia', 'grupos'])
            ->whereNotNull('aula_id')
            ->when($periodoId, fn($q, $v) => $q->where('periodo_id', $v))
            ->get()
            ->groupBy('aula_id');

        $resultado = $aulas->map(function (Aula $aula) use ($cargas) {
            $cargasAula = $cargas->get($aula->id, collect());

            $bloques = $cargasAula->flatMap(function (CargaAcademica $carga) {
                return $carga->horarios->map(fn($h) => [
                    'dia_semana'  => $h->dia_semana,
                    'hora_inicio' => substr($h->hora_inicio, 0, 5),
                    'hora_fin'    => substr($h->hora_fin, 0, 5),
                    'materia'     => $carga->materia?->nombre,
                    'grupo'       => $carga->grupos->pluck('clave')->join(', '),
                    'horas'       => $this->horas($h->hora_inicio, $h->hora_fin),
                ]);
            })->values();

            $horasOcupadas = round($bloques->sum('horas'), 2);
            $pctOcupacion = self::HORAS_OPERACION_SEMANA > 0
                ? round($horasOcupadas / self::HORAS_OPERACION_SEMANA * 100, 1)
                : 0.0;

            return [
                'aula_id'          => $aula->id,
                'nombre'           => $aula->nombre,
                'tipo'             => $aula->tipo,
                'capacidad'        => $aula->capacidad,
                'activa'           => $aula->activa,
                'horas_ocupadas'   => $horasOcupadas,
                'horas_disponibles'=> self::HORAS_OPERACION_SEMANA,
                'pct_ocupacion'    => min(100, $pctOcupacion),
                'total_bloques'    => $bloques->count(),
                'bloques'          => $bloques,
            ];
        })->sortByDesc('pct_ocupacion')->values();

        return ApiResponse::success($resultado);
    }

    private function horas(string $inicio, string $fin): float
    {
        [$h1, $m1] = array_map('intval', explode(':', substr($inicio, 0, 5)));
        [$h2, $m2] = array_map('intval', explode(':', substr($fin, 0, 5)));
        return max(0, (($h2 * 60 + $m2) - ($h1 * 60 + $m1)) / 60);
    }

    // GET /api/aulas/fantasma?periodo_id=
    // "Aula fantasma": el horario dice que ahí debería haber clase, pero prefectura ha
    // reportado 2+ veces que el aula está vacía o que el grupo no coincide — señal de
    // que el horario cargado no refleja lo que realmente pasa en ese salón, no un
    // hallazgo aislado de una sola ronda.
    public function fantasma(Request $request): JsonResponse
    {
        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }

        $incidencias = \App\Domains\Academico\Models\IncidenciaClase::with(['grupo.carrera', 'aula', 'cargaAcademica.materia', 'docente'])
            ->where('periodo_id', $periodoId)
            ->whereIn('estatus', ['aula_vacia', 'grupo_incorrecto'])
            ->orderByDesc('fecha')
            ->get();

        $agrupadas = $incidencias->groupBy(fn ($i) => ($i->carga_academica_id ?? 'sin-carga') . '|' . ($i->aula_id ?? 'sin-aula'));

        $resultado = $agrupadas
            ->filter(fn ($grupo) => $grupo->count() >= 2)
            ->map(function ($grupo) {
                $primero = $grupo->first();
                return [
                    'aula'                => $primero->aula?->nombre,
                    'grupo'               => $primero->grupo?->clave,
                    'carrera'             => $primero->grupo?->carrera?->nombre,
                    'materia'             => $primero->cargaAcademica?->materia?->nombre,
                    'docente_esperado'    => $primero->docente?->name,
                    'total_discrepancias' => $grupo->count(),
                    'ultima_fecha'        => $grupo->max('fecha')?->format('Y-m-d'),
                    'estatus_reportados'  => $grupo->pluck('estatus')->unique()->values(),
                ];
            })
            ->sortByDesc('total_discrepancias')
            ->values();

        return ApiResponse::success($resultado);
    }

    // GET /api/aulas/{aula}/sugerencias-reubicacion?periodo_id=
    // Al desactivar un aula (mantenimiento, daño), sugiere a qué otra aula libre del
    // mismo tipo mover cada clase afectada, en vez de que alguien lo resuelva a mano
    // grupo por grupo revisando horarios cruzados.
    public function sugerenciasReubicacion(Request $request, Aula $aula): JsonResponse
    {
        $periodoId = $request->query('periodo_id');
        if (! $periodoId) {
            return ApiResponse::error('periodo_id es requerido.', 422);
        }

        $cargasAfectadas = CargaAcademica::with(['materia', 'docente', 'grupos', 'horarios', 'aula'])
            ->where('periodo_id', $periodoId)
            ->where('aula_id', $aula->id)
            ->get();

        $todasLasAulas = Aula::where('activa', true)->where('id', '!=', $aula->id)->get();

        $sugerencias = $cargasAfectadas->map(function (CargaAcademica $carga) use ($todasLasAulas, $periodoId, $aula) {
            $candidatas = $todasLasAulas
                ->where('tipo', $aula->tipo)
                ->filter(function (Aula $candidata) use ($carga, $periodoId) {
                    // Libre en TODOS los bloques de horario de esta carga.
                    foreach ($carga->horarios as $h) {
                        $ocupada = CargaAcademica::where('periodo_id', $periodoId)
                            ->where('aula_id', $candidata->id)
                            ->whereHas('horarios', function ($q) use ($h) {
                                $q->where('dia_semana', $h->dia_semana)
                                  ->where('hora_inicio', '<', $h->hora_fin)
                                  ->where('hora_fin', '>', $h->hora_inicio);
                            })
                            ->exists();
                        if ($ocupada) return false;
                    }
                    return true;
                })
                ->sortByDesc('capacidad')
                ->take(3)
                ->values()
                ->map(fn (Aula $a) => ['id' => $a->id, 'nombre' => $a->nombre, 'capacidad' => $a->capacidad]);

            return [
                'carga_academica_id' => $carga->id,
                'materia'            => $carga->materia?->nombre,
                'docente'            => $carga->docente?->name,
                'grupo'              => $carga->grupos->pluck('clave')->join(', '),
                'horarios'           => $carga->horarios->map(fn ($h) => "{$h->dia_semana} {$h->hora_inicio}-{$h->hora_fin}"),
                'aulas_candidatas'   => $candidatas,
            ];
        });

        return ApiResponse::success($sugerencias);
    }
}
