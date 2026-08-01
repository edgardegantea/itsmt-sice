<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Actions\VerificarDisponibilidadAction;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Services\HorarioService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HorarioController extends Controller
{
    public function __construct(private HorarioService $service) {}

    // GET /api/horarios?periodo_id=&grupo_id=&docente_id=
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $horarios = Horario::with(['cargaAcademica.docente', 'cargaAcademica.materia', 'cargaAcademica.grupos.carrera', 'cargaAcademica.aula'])
            ->when($request->query('periodo_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica', fn($cq) => $cq->where('periodo_id', $v))
            )
            ->when($request->query('grupo_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupos', fn($gq) => $gq->where('grupos.id', $v))
            )
            ->when($request->query('docente_id'), fn($q, $v) =>
                $q->whereHas('cargaAcademica', fn($cq) => $cq->where('docente_id', $v))
            )
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupos', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->get();

        return ApiResponse::success($horarios);
    }

    // GET /api/horarios/disponibilidad?docente_id=&periodo_id=&dia_semana=&hora_inicio=&hora_fin=[&aula_id=][&excluir_carga_id=]
    public function disponibilidad(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_id'       => ['required', 'uuid', 'exists:users,id'],
            'periodo_id'       => ['required', 'uuid', 'exists:periodos,id'],
            'dia_semana'       => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio'      => ['required', 'date_format:H:i,G:i'],
            'hora_fin'         => ['required', 'date_format:H:i,G:i'],
            'aula_id'          => ['nullable', 'uuid', 'exists:aulas,id'],
            'excluir_carga_id' => ['nullable', 'uuid'],
        ]);

        $conflictos = [];

        $baseQuery = Horario::query()
            ->where('dia_semana', $data['dia_semana'])
            ->where('hora_inicio', '<', $data['hora_fin'])
            ->where('hora_fin', '>', $data['hora_inicio']);

        $docenteOcupado = (clone $baseQuery)
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('docente_id', $data['docente_id'])
                  ->where('periodo_id', $data['periodo_id'])
                  ->when($data['excluir_carga_id'] ?? null, fn($q2, $v) => $q2->where('id', '!=', $v))
            )
            ->with(['cargaAcademica.materia', 'cargaAcademica.grupos'])
            ->get();

        foreach ($docenteOcupado as $h) {
            $ca = $h->cargaAcademica;
            $grupoLabel = $ca->grupos->pluck('clave')->implode(', ') ?: '—';
            $conflictos[] = [
                'tipo'    => 'docente',
                'mensaje' => "Docente ocupado: {$ca->materia?->nombre} / {$grupoLabel} ({$h->hora_inicio}–{$h->hora_fin})",
            ];
        }

        if (!empty($data['aula_id'])) {
            $aulaOcupada = (clone $baseQuery)
                ->whereHas('cargaAcademica', fn($q) =>
                    $q->where('aula_id', $data['aula_id'])
                      ->where('periodo_id', $data['periodo_id'])
                      ->when($data['excluir_carga_id'] ?? null, fn($q2, $v) => $q2->where('id', '!=', $v))
                )
                ->with(['cargaAcademica.materia', 'cargaAcademica.grupos'])
                ->get();

            foreach ($aulaOcupada as $h) {
                $ca = $h->cargaAcademica;
                $grupoLabel = $ca->grupos->pluck('clave')->implode(', ') ?: '—';
                $conflictos[] = [
                    'tipo'    => 'aula',
                    'mensaje' => "Aula ocupada: {$ca->materia?->nombre} / {$grupoLabel} ({$h->hora_inicio}–{$h->hora_fin})",
                ];
            }
        }

        $toMin    = fn(string $t): int => (int) explode(':', $t)[0] * 60 + (int) explode(':', $t)[1];
        $minToStr = fn(int $m): string => sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        $excluirCarga = $data['excluir_carga_id'] ?? null;
        $minBloque    = $toMin($data['hora_fin']) - $toMin($data['hora_inicio']);

        // ── Span diario ≤ 8 h (entrada más temprana → salida más tardía) ─────
        $existentesDia = Horario::query()
            ->where('dia_semana', $data['dia_semana'])
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('docente_id', $data['docente_id'])
                  ->where('periodo_id', $data['periodo_id'])
                  ->when($excluirCarga, fn($q2, $v) => $q2->where('id', '!=', $v))
            )
            ->get();

        $inicios = $existentesDia->map(fn($h) => $toMin($h->hora_inicio))->push($toMin($data['hora_inicio']));
        $fines   = $existentesDia->map(fn($h) => $toMin($h->hora_fin))->push($toMin($data['hora_fin']));
        $spanMin = $fines->max() - $inicios->min();

        if ($spanMin > 8 * 60) {
            $salidaMax = $minToStr($inicios->min() + 8 * 60);
            $conflictos[] = [
                'tipo'    => 'limite_diario',
                'mensaje' => sprintf(
                    'El %s, el docente entra a las %s — no se puede asignar nada después de las %s (propuesto hasta las %s).',
                    $data['dia_semana'], $minToStr($inicios->min()), $salidaMax, $minToStr($fines->max())
                ),
            ];
        }

        // ── Horas semanales frente a grupo ≤ 40 h ────────────────────────────
        $minSemanaDB = Horario::query()
            ->whereHas('cargaAcademica', fn($q) =>
                $q->where('docente_id', $data['docente_id'])
                  ->where('periodo_id', $data['periodo_id'])
                  ->when($excluirCarga, fn($q2, $v) => $q2->where('id', '!=', $v))
            )
            ->get()
            ->sum(fn($h) => $toMin($h->hora_fin) - $toMin($h->hora_inicio));

        $totalSemana = $minSemanaDB + $minBloque;
        if ($totalSemana > 40 * 60) {
            $conflictos[] = [
                'tipo'    => 'limite_semanal',
                'mensaje' => sprintf(
                    'El docente ya acumula %.1fh/sem frente a grupo; agregar %.1fh llegaría a %.1fh (límite: 40h/sem).',
                    $minSemanaDB / 60, $minBloque / 60, $totalSemana / 60
                ),
            ];
        }

        return ApiResponse::success(['conflictos' => $conflictos, 'tiene_conflictos' => !empty($conflictos)]);
    }

    // GET /api/horarios/conflictos?carga_academica_id=&dia_semana=&hora_inicio=&hora_fin=
    public function conflictos(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'dia_semana'         => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio'        => ['required', 'date_format:H:i,G:i'],
            'hora_fin'           => ['required', 'date_format:H:i,G:i'],
        ]);

        $conflictos = $this->service->detectarConflictos(
            $data['carga_academica_id'],
            $data['dia_semana'],
            $data['hora_inicio'],
            $data['hora_fin'],
        );

        return ApiResponse::success(['conflictos' => $conflictos, 'tiene_conflictos' => !empty($conflictos)]);
    }

    // POST /api/horarios  — guarda bloques para una carga (reemplaza los existentes)
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'bloques'            => ['required', 'array', 'min:1'],
            'bloques.*.dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'bloques.*.hora_inicio' => ['required', 'date_format:H:i,G:i'],
            'bloques.*.hora_fin'    => ['required', 'date_format:H:i,G:i'],
        ]);

        $carga = CargaAcademica::findOrFail($data['carga_academica_id']);

        // Validar carrera del jefe
        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada) {
            $carga->loadMissing('grupos');
            if ($carga->grupos->isNotEmpty() && $carga->grupos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
                return ApiResponse::error('No tienes permiso para modificar horarios de otra carrera.', 403);
            }
        }

        try {
            $horarios = $this->service->guardarHorarios($carga, $data['bloques']);
        } catch (\DomainException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($horarios, 'Horarios guardados.', 201);
    }

    // PATCH /api/horarios/{horario} — edita día/hora (y opcionalmente aula) de un bloque existente
    public function update(Request $request, Horario $horario, VerificarDisponibilidadAction $accion): JsonResponse
    {
        $horario->loadMissing('cargaAcademica.grupos');
        $carga = $horario->cargaAcademica;

        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada && $carga?->grupos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
            return ApiResponse::error('No tienes permiso para modificar horarios de otra carrera.', 403);
        }

        $data = $request->validate([
            'dia_semana'  => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'aula_id'     => ['nullable', 'uuid', 'exists:aulas,id'],
        ]);

        $aulaId = array_key_exists('aula_id', $data) ? $data['aula_id'] : $carga->aula_id;

        $resultado = $accion->ejecutar(
            periodoId:      $carga->periodo_id,
            docenteId:      $carga->docente_id,
            diaSemana:      $data['dia_semana'],
            horaInicio:     $data['hora_inicio'],
            horaFin:        $data['hora_fin'],
            aulaId:         $aulaId,
            grupoIds:       $carga->grupos->pluck('id')->all(),
            ignorarCargaId: $carga->id,
            materiaId:      $carga->materia_id,
        );

        if (! empty($resultado['conflictos']) || ! $resultado['dentro_disponibilidad']) {
            $mensajes = array_column($resultado['conflictos'], 'mensaje');
            if (! $resultado['dentro_disponibilidad'] && $resultado['mensaje_disponibilidad']) {
                $mensajes[] = $resultado['mensaje_disponibilidad'];
            }
            return ApiResponse::error(implode(' ', $mensajes), 422);
        }

        $horario->update([
            'dia_semana'  => $data['dia_semana'],
            'hora_inicio' => $data['hora_inicio'],
            'hora_fin'    => $data['hora_fin'],
        ]);

        if (array_key_exists('aula_id', $data) && $data['aula_id'] !== $carga->aula_id) {
            $carga->update(['aula_id' => $data['aula_id']]);
        }

        return ApiResponse::success($horario->fresh(), 'Bloque de horario actualizado.');
    }

    // PATCH /api/horarios/{horario}/grupos — agrega/quita grupos de un bloque ya asignado sin borrarlo
    public function updateGrupos(Request $request, Horario $horario, VerificarDisponibilidadAction $accion): JsonResponse
    {
        $horario->loadMissing('cargaAcademica.grupos');
        $carga = $horario->cargaAcademica;

        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada && $carga->grupos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
            return ApiResponse::error('No tienes permiso para modificar horarios de otra carrera.', 403);
        }

        $data = $request->validate([
            'grupo_ids'   => ['required', 'array', 'min:1'],
            'grupo_ids.*' => ['uuid', 'exists:grupos,id'],
        ]);

        if ($carreraForzada) {
            $gruposNuevos = Grupo::whereIn('id', $data['grupo_ids'])->get();
            if ($gruposNuevos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
                return ApiResponse::error('Solo puedes asignar grupos de tu carrera.', 403);
            }
        }

        $resultado = $accion->ejecutar(
            periodoId:      $carga->periodo_id,
            docenteId:      $carga->docente_id,
            diaSemana:      $horario->dia_semana,
            horaInicio:     $horario->hora_inicio,
            horaFin:        $horario->hora_fin,
            aulaId:         $carga->aula_id,
            grupoIds:       $data['grupo_ids'],
            ignorarCargaId: $carga->id,
            materiaId:      $carga->materia_id,
        );

        if (! empty($resultado['conflictos'])) {
            $mensajes = array_column($resultado['conflictos'], 'mensaje');
            return ApiResponse::error(implode(' ', $mensajes), 422);
        }

        $carga->grupos()->sync($data['grupo_ids']);

        return ApiResponse::success($carga->fresh(['grupos', 'materia', 'docente']), 'Grupos del bloque actualizados.');
    }

    // DELETE /api/horarios/{horario}
    public function destroy(Request $request, Horario $horario): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();
        if ($carreraForzada) {
            $horario->loadMissing('cargaAcademica.grupos');
            if ($horario->cargaAcademica?->grupos->contains(fn($g) => $g->carrera_id !== $carreraForzada)) {
                return ApiResponse::error('No tienes permiso para modificar horarios de otra carrera.', 403);
            }
        }

        $horario->delete();
        return ApiResponse::success(null, 'Bloque de horario eliminado.');
    }
}
