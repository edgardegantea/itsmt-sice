<?php

namespace App\Domains\Academico\Actions;

use App\Domains\Academico\Models\Horario;

/**
 * Auditoría batch (no interactiva): escanea todos los horarios de un periodo
 * y reporta cualquier traslape de docente, aula o grupo que se haya colado
 * (p.ej. datos importados fuera de la validación normal del builder). La
 * asignación interactiva ya bloquea estos casos; esto es una red de
 * seguridad de solo lectura.
 */
class DetectarEmpalmesAction
{
    /** @return array<int, array{tipo: string, mensaje: string, horario_a: string, horario_b: string}> */
    public function ejecutar(string $periodoId): array
    {
        $horarios = Horario::query()
            ->whereHas('cargaAcademica', fn ($q) => $q->where('periodo_id', $periodoId))
            ->with(['cargaAcademica.docente:id,name', 'cargaAcademica.aula:id,nombre', 'cargaAcademica.materia:id,nombre', 'cargaAcademica.grupos:id,clave'])
            ->get();

        $empalmes = [];

        foreach ($horarios as $i => $a) {
            foreach ($horarios as $j => $b) {
                if ($j <= $i) continue;
                if ($a->dia_semana !== $b->dia_semana) continue;
                if (! ($a->hora_inicio < $b->hora_fin && $a->hora_fin > $b->hora_inicio)) continue;

                $cargaA = $a->cargaAcademica;
                $cargaB = $b->cargaAcademica;
                if (! $cargaA || ! $cargaB || $cargaA->id === $cargaB->id) continue;

                if ($cargaA->docente_id === $cargaB->docente_id) {
                    $empalmes[] = $this->formatear('docente', "Docente {$cargaA->docente?->name} traslapado", $a, $b);
                }
                if ($cargaA->aula_id && $cargaA->aula_id === $cargaB->aula_id) {
                    $empalmes[] = $this->formatear('aula', "Aula {$cargaA->aula?->nombre} traslapada", $a, $b);
                }
                $gruposA = $cargaA->grupos->pluck('id');
                $gruposComunes = $cargaB->grupos->pluck('id')->intersect($gruposA);
                if ($gruposComunes->isNotEmpty()) {
                    $clave = $cargaA->grupos->firstWhere('id', $gruposComunes->first())?->clave;
                    $empalmes[] = $this->formatear('grupo', "Grupo {$clave} traslapado", $a, $b);
                }
            }
        }

        return $empalmes;
    }

    private function formatear(string $tipo, string $mensaje, Horario $a, Horario $b): array
    {
        $desc = fn (Horario $h) => sprintf(
            '%s %s-%s: %s (%s)',
            ucfirst($h->dia_semana), substr($h->hora_inicio, 0, 5), substr($h->hora_fin, 0, 5),
            $h->cargaAcademica?->materia?->nombre ?? '—',
            $h->cargaAcademica?->grupos->pluck('clave')->implode(', ') ?: '—'
        );

        return [
            'tipo'      => $tipo,
            'mensaje'   => $mensaje,
            'horario_a' => $desc($a),
            'horario_b' => $desc($b),
        ];
    }
}
