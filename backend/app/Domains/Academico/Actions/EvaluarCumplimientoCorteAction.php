<?php

namespace App\Domains\Academico\Actions;

use App\Domains\Academico\Models\AlertaCorteCaptura;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\CorteCaptura;

/**
 * Evalúa, para un corte de captura dado, qué cargas académicas del periodo
 * tienen alumnos sin calificación registrada para el parcial correspondiente
 * a ese corte, y actualiza (upsert) la alerta de cumplimiento por carga.
 */
class EvaluarCumplimientoCorteAction
{
    /** @return array{cargas_evaluadas: int, cargas_pendientes: int, detalle: array} */
    public function ejecutar(CorteCaptura $corte): array
    {
        $cargas = CargaAcademica::with(['grupos.alumnos', 'docente', 'materia'])
            ->where('periodo_id', $corte->periodo_id)
            ->get();

        $detalle = [];

        foreach ($cargas as $carga) {
            $alumnoIds = $carga->grupos->flatMap(fn ($g) => $g->alumnos->pluck('id'))->unique()->values();
            $total = $alumnoIds->count();

            if ($total === 0) {
                continue;
            }

            $calificaciones = Calificacion::where('carga_academica_id', $carga->id)
                ->whereIn('alumno_id', $alumnoIds)
                ->get();

            $capturados = $calificaciones->filter(function (Calificacion $calificacion) use ($corte) {
                return collect($calificacion->parciales ?? [])
                    ->contains(fn ($p) => (int) ($p['parcial'] ?? 0) === $corte->numero);
            })->count();

            $porcentaje = round(($capturados / $total) * 100, 2);

            // Unidades esperadas a este corte: el temario de cada materia define
            // cuántas unidades tiene en total, y cada uno de los 3 cortes fijos
            // del periodo cubre una fracción proporcional de esas unidades.
            $totalUnidades = count($carga->materia?->temario ?? []);
            $unidadesEsperadas = $totalUnidades > 0
                ? (int) ceil($totalUnidades * $corte->numero / 3)
                : null;

            $pendiente = $porcentaje < 100;

            $alerta = AlertaCorteCaptura::firstOrNew([
                'corte_captura_id'   => $corte->id,
                'carga_academica_id' => $carga->id,
            ]);
            $alerta->docente_id = $carga->docente_id;
            $alerta->periodo_id = $corte->periodo_id;
            $alerta->porcentaje_capturado = $porcentaje;
            $alerta->total_unidades_temario = $totalUnidades ?: null;
            $alerta->unidades_esperadas = $unidadesEsperadas;
            $alerta->pendiente = $pendiente;
            if (! $alerta->exists) {
                $alerta->leida_docente = false;
                $alerta->leida_jefe = false;
                $alerta->leida_director = false;
            }
            $alerta->save();

            $detalle[] = [
                'carga_academica_id'      => $carga->id,
                'docente_id'              => $carga->docente_id,
                'docente_nombre'          => $carga->docente?->name,
                'materia_nombre'          => $carga->materia?->nombre,
                'porcentaje_capturado'    => $porcentaje,
                'total_unidades_temario'  => $totalUnidades ?: null,
                'unidades_esperadas'      => $unidadesEsperadas,
                'pendiente'               => $pendiente,
            ];
        }

        return [
            'cargas_evaluadas'  => count($detalle),
            'cargas_pendientes' => collect($detalle)->where('pendiente', true)->count(),
            'detalle'           => $detalle,
        ];
    }
}
