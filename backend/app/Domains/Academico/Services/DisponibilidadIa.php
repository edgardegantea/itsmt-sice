<?php

namespace App\Domains\Academico\Services;

use App\Domains\Academico\Models\PlaneacionDocente;
use App\Domains\Academico\Models\ReglaIa;
use App\Models\User;

/**
 * Decide si el asistente de IA está permitido para un docente (y, si se conoce, para la
 * planeación concreta que está editando). Gana la regla más específica:
 *   grupo  >  docente  >  carrera  >  global  >  (sin reglas: activa)
 * Si una planeación abarca varios grupos o carreras y alguno la desactiva, queda desactivada.
 */
class DisponibilidadIa
{
    /** @return array{habilitada: bool, ambito: string, motivo: ?string} */
    public function evaluar(User $docente, ?PlaneacionDocente $planeacion = null): array
    {
        $grupos = collect();
        $carreras = collect([$docente->carrera_id])->filter();
        if ($planeacion) {
            $planeacion->loadMissing('cargaAcademica.grupos');
            $grupos = $planeacion->cargaAcademica?->grupos ?? collect();
            $carreras = $carreras->merge($grupos->pluck('carrera_id'))->filter()->unique();
        }

        $niveles = [
            'grupo'   => $grupos->pluck('id')->all(),
            'docente' => [$docente->id],
            'carrera' => $carreras->values()->all(),
        ];

        foreach ($niveles as $ambito => $ids) {
            if (! $ids) continue;
            $reglas = ReglaIa::where('ambito', $ambito)->whereIn('referencia_id', $ids)->get();
            if ($reglas->isNotEmpty()) {
                $desactiva = $reglas->firstWhere('habilitada', false);
                $regla = $desactiva ?? $reglas->first();
                return ['habilitada' => ! $desactiva, 'ambito' => $ambito, 'motivo' => $regla->nota];
            }
        }

        $global = ReglaIa::where('ambito', 'global')->whereNull('referencia_id')->first();
        return [
            'habilitada' => $global?->habilitada ?? true,
            'ambito'     => $global ? 'global' : 'predeterminado',
            'motivo'     => $global?->nota,
        ];
    }
}
