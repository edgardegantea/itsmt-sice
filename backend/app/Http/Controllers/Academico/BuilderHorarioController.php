<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Actions\VerificarDisponibilidadAction;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Materia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuilderHorarioController extends Controller
{
    private const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    private const HORA_INICIO = 7;
    private const HORA_FIN    = 21;

    /**
     * GET /horarios/builder-grid
     *
     * Devuelve el estado de cada franja horaria (disponible/fuera_disponibilidad/
     * reservado_actual/reservado_otro) para un docente en un periodo, con la
     * opción de superponer la ocupación de un grupo específico.
     */
    public function gridData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'docente_id' => ['required', 'uuid', 'exists:users,id'],
            'grupo_id'   => ['nullable', 'uuid', 'exists:grupos,id'],
        ]);

        $carreraForzada = $request->user()?->carreraRestringida();

        $disponibilidad = DisponibilidadDocente::where('docente_id', $data['docente_id'])
            ->where('periodo_id', $data['periodo_id'])
            ->get(['dia_semana', 'hora_inicio', 'hora_fin']);

        // Cargas del docente en el periodo (cualquier carrera) con sus horarios
        $cargasDocente = CargaAcademica::with(['materia:id,nombre,modulo_sabatino', 'grupo:id,clave', 'aula:id,nombre', 'horarios'])
            ->where('periodo_id', $data['periodo_id'])
            ->where('docente_id', $data['docente_id'])
            ->get();

        // Cargas del grupo seleccionado con cualquier docente
        $cargasGrupo = ($data['grupo_id'] ?? null)
            ? CargaAcademica::with(['materia:id,nombre', 'docente:id,name', 'horarios'])
                ->where('periodo_id', $data['periodo_id'])
                ->where('grupo_id', $data['grupo_id'])
                ->get()
            : collect();

        $slots = $this->generarSlots();
        $dias  = [];

        foreach (self::DIAS as $dia) {
            $bloquesDia     = $disponibilidad->where('dia_semana', $dia);
            $cargasDia      = $cargasDocente->filter(fn($c) => $c->horarios->where('dia_semana', $dia)->isNotEmpty());
            $cargasGrupoDia = $cargasGrupo->filter(fn($c) => $c->horarios->where('dia_semana', $dia)->isNotEmpty());

            $dias[] = [
                'dia_semana'    => $dia,
                'disponibilidad'=> $bloquesDia->map(fn($b) => [
                    'hora_inicio' => substr($b->hora_inicio, 0, 5),
                    'hora_fin'    => substr($b->hora_fin, 0, 5),
                ])->values(),
                'horas'         => $this->construirHoras($slots, $cargasDia, $cargasGrupoDia, $bloquesDia, $dia, $data['grupo_id'] ?? null, 1),
                'horas_modulo2' => $dia === 'sabado'
                    ? $this->construirHoras($slots, $cargasDia, $cargasGrupoDia, $bloquesDia, $dia, $data['grupo_id'] ?? null, 2)
                    : null,
            ];
        }

        return ApiResponse::success(['dias' => $dias]);
    }

    /**
     * POST /horarios/verificar-disponibilidad
     */
    public function verificar(Request $request, VerificarDisponibilidadAction $accion): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'       => ['required', 'uuid', 'exists:periodos,id'],
            'docente_id'       => ['required', 'uuid', 'exists:users,id'],
            'dia_semana'       => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio'      => ['required', 'date_format:H:i'],
            'hora_fin'         => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'aula_id'          => ['nullable', 'uuid', 'exists:aulas,id'],
            'grupo_id'         => ['nullable', 'uuid', 'exists:grupos,id'],
            'materia_id'       => ['nullable', 'uuid', 'exists:materias,id'],
            'ignorar_carga_id' => ['nullable', 'uuid', 'exists:cargas_academicas,id'],
        ]);

        $resultado = $accion->ejecutar(
            periodoId:       $data['periodo_id'],
            docenteId:       $data['docente_id'],
            diaSemana:       $data['dia_semana'],
            horaInicio:      $data['hora_inicio'],
            horaFin:         $data['hora_fin'],
            aulaId:          $data['aula_id'] ?? null,
            grupoId:         $data['grupo_id'] ?? null,
            ignorarCargaId:  $data['ignorar_carga_id'] ?? null,
            materiaId:       $data['materia_id'] ?? null,
        );

        $resumenHoras = ($data['materia_id'] ?? null) && ($data['grupo_id'] ?? null)
            ? $accion->resumenHoras($data['materia_id'], $data['grupo_id'], $data['periodo_id'], $data['ignorar_carga_id'] ?? null)
            : null;

        return ApiResponse::success([
            'resultado'    => $resultado,
            'horas'        => $resumenHoras,
        ]);
    }

    /**
     * POST /horarios/asignar
     *
     * Asigna una clase a un slot del grid: reutiliza (o crea) la carga académica
     * docente+materia+grupo+periodo y le agrega el bloque de horario día/hora,
     * validando conflictos dentro de un advisory lock de Postgres para evitar
     * condiciones de carrera si dos personas asignan al mismo tiempo.
     */
    public function asignar(Request $request, VerificarDisponibilidadAction $accion): JsonResponse
    {
        $data = $request->validate([
            'periodo_id'  => ['required', 'uuid', 'exists:periodos,id'],
            'docente_id'  => ['required', 'uuid', 'exists:users,id'],
            'materia_id'  => ['required', 'uuid', 'exists:materias,id'],
            'grupo_id'    => ['required', 'uuid', 'exists:grupos,id'],
            'aula_id'     => ['nullable', 'uuid', 'exists:aulas,id'],
            'dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada) {
            $grupo = Grupo::findOrFail($data['grupo_id']);
            if ($grupo->carrera_id !== $carreraForzada) {
                return ApiResponse::error('Solo puedes asignar cargas a grupos de tu carrera.', 403);
            }
        }

        return DB::transaction(function () use ($data, $accion) {
            // Advisory locks: serializa asignaciones concurrentes sobre el mismo
            // docente/aula para que la verificación de conflictos sea confiable.
            $llaves = array_filter([crc32('docente:' . $data['docente_id']), ($data['aula_id'] ?? null) ? crc32('aula:' . $data['aula_id']) : null]);
            sort($llaves);
            foreach ($llaves as $llave) {
                DB::statement('SELECT pg_advisory_xact_lock(?)', [$llave]);
            }

            $resultado = $accion->ejecutar(
                periodoId:  $data['periodo_id'],
                docenteId:  $data['docente_id'],
                diaSemana:  $data['dia_semana'],
                horaInicio: $data['hora_inicio'],
                horaFin:    $data['hora_fin'],
                aulaId:     $data['aula_id'] ?? null,
                grupoId:    $data['grupo_id'],
                materiaId:  $data['materia_id'],
            );

            if (! empty($resultado['conflictos']) || ! $resultado['dentro_disponibilidad']) {
                $mensajes = array_column($resultado['conflictos'], 'mensaje');
                if (! $resultado['dentro_disponibilidad'] && $resultado['mensaje_disponibilidad']) {
                    $mensajes[] = $resultado['mensaje_disponibilidad'];
                }
                return ApiResponse::error(implode(' ', $mensajes), 422);
            }

            $materia = Materia::findOrFail($data['materia_id']);

            $carga = CargaAcademica::firstOrCreate(
                [
                    'docente_id' => $data['docente_id'],
                    'materia_id' => $data['materia_id'],
                    'grupo_id'   => $data['grupo_id'],
                    'periodo_id' => $data['periodo_id'],
                ],
                [
                    'aula_id'      => $data['aula_id'] ?? null,
                    'horas_semana' => max(1, ($materia->horas_teoria ?? 0) + ($materia->horas_practica ?? 0)),
                    'estado'       => 'pendiente',
                ]
            );

            if (! $carga->wasRecentlyCreated && ! empty($data['aula_id']) && ! $carga->aula_id) {
                $carga->update(['aula_id' => $data['aula_id']]);
            }

            $yaExiste = $carga->horarios()
                ->where('dia_semana', $data['dia_semana'])
                ->where('hora_inicio', $data['hora_inicio'])
                ->where('hora_fin', $data['hora_fin'])
                ->exists();

            $horario = $yaExiste
                ? $carga->horarios()->where('dia_semana', $data['dia_semana'])->where('hora_inicio', $data['hora_inicio'])->first()
                : Horario::create([
                    'carga_academica_id' => $carga->id,
                    'dia_semana'         => $data['dia_semana'],
                    'hora_inicio'        => $data['hora_inicio'],
                    'hora_fin'           => $data['hora_fin'],
                ]);

            $resumenHoras = $accion->resumenHoras($data['materia_id'], $data['grupo_id'], $data['periodo_id']);

            return ApiResponse::success([
                'carga'   => $carga->fresh(['docente', 'materia', 'grupo', 'aula']),
                'horario' => $horario,
                'horas'   => $resumenHoras,
            ], 'Clase asignada.', 201);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function generarSlots(): array
    {
        $slots = [];
        for ($h = self::HORA_INICIO; $h < self::HORA_FIN; $h++) {
            $slots[] = sprintf('%02d:00', $h);
        }
        return $slots;
    }

    private function construirHoras(
        array $slots,
        $cargasDia,
        $cargasGrupoDia,
        $bloquesDia,
        string $dia,
        ?string $grupoId,
        int $modulo,
    ): array {
        $horas = [];

        foreach ($slots as $hora) {
            $inicioMin = $this->aMinutos($hora);
            $finMin    = $inicioMin + 60;

            // Filtrar por módulo sabatino si es sábado
            $cargasFiltradas = $dia === 'sabado'
                ? $cargasDia->filter(fn($c) => (int)($c->materia?->modulo_sabatino ?? 1) === $modulo
                    || (int)($c->materia?->modulo_sabatino ?? 0) === 0)
                : $cargasDia;

            $carga = $cargasFiltradas->first(function ($c) use ($inicioMin, $finMin, $dia) {
                return $c->horarios->where('dia_semana', $dia)->contains(function ($h) use ($inicioMin, $finMin) {
                    return $this->aMinutos($h->hora_inicio) < $finMin
                        && $this->aMinutos($h->hora_fin) > $inicioMin;
                });
            });

            if ($carga) {
                $bloqueDelDia = $carga->horarios->where('dia_semana', $dia)->first(function ($h) use ($inicioMin, $finMin) {
                    return $this->aMinutos($h->hora_inicio) < $finMin && $this->aMinutos($h->hora_fin) > $inicioMin;
                }) ?? $carga->horarios->where('dia_semana', $dia)->first();

                $horas[] = [
                    'hora'        => $hora,
                    'estado'      => 'reservado',
                    'carga_id'    => $carga->id,
                    'horario_id'  => $bloqueDelDia?->id,
                    'materia'     => $carga->materia?->nombre,
                    'materia_id'  => $carga->materia_id,
                    'grupo'       => $carga->grupo?->clave,
                    'grupo_id'    => $carga->grupo_id,
                    'aula'        => $carga->aula?->nombre,
                    'aula_id'     => $carga->aula_id,
                    'carga_estado'=> $carga->estado,
                    'hora_inicio' => $bloqueDelDia?->hora_inicio,
                    'hora_fin'    => $bloqueDelDia?->hora_fin,
                ];
                continue;
            }

            // El grupo tiene clase con otro docente
            $cargaGrupo = $grupoId ? $cargasGrupoDia->first(function ($c) use ($inicioMin, $finMin, $dia) {
                return $c->horarios->where('dia_semana', $dia)->contains(function ($h) use ($inicioMin, $finMin) {
                    return $this->aMinutos($h->hora_inicio) < $finMin
                        && $this->aMinutos($h->hora_fin) > $inicioMin;
                });
            }) : null;

            if ($cargaGrupo) {
                $horas[] = [
                    'hora'     => $hora,
                    'estado'   => 'grupo_ocupado',
                    'materia'  => $cargaGrupo->materia?->nombre,
                    'docente'  => $cargaGrupo->docente?->name,
                ];
                continue;
            }

            // Verificar si cae dentro de disponibilidad
            $dentro = $bloquesDia->contains(function ($b) use ($inicioMin, $finMin) {
                return $inicioMin >= $this->aMinutos($b->hora_inicio)
                    && $finMin <= $this->aMinutos($b->hora_fin);
            });

            $horas[] = ['hora' => $hora, 'estado' => $dentro ? 'disponible' : 'fuera_disponibilidad'];
        }

        return $horas;
    }

    private function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($hora, 0, 5)));
        return $h * 60 + $m;
    }
}
