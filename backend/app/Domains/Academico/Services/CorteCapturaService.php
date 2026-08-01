<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Actions\EvaluarCumplimientoCorteAction;
use App\Domains\Academico\Models\CorteCaptura;
use App\Domains\Academico\Models\Periodo;

class CorteCapturaService
{
    public function __construct(private EvaluarCumplimientoCorteAction $evaluarCumplimientoCorteAction)
    {
    }

    public function listarPorPeriodo(string $periodoId)
    {
        return CorteCaptura::where('periodo_id', $periodoId)->orderBy('numero')->get();
    }

    public function guardar(Periodo $periodo, array $datos): CorteCaptura
    {
        return CorteCaptura::updateOrCreate(
            ['periodo_id' => $periodo->id, 'numero' => $datos['numero']],
            [
                'nombre'               => $datos['nombre'] ?? null,
                'fecha_corte'          => $datos['fecha_corte'],
                'fecha_limite_captura' => $datos['fecha_limite_captura'],
            ]
        );
    }

    public function evaluar(CorteCaptura $corte): array
    {
        return $this->evaluarCumplimientoCorteAction->ejecutar($corte);
    }
}
