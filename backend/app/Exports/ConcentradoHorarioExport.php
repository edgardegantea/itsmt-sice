<?php

namespace App\Exports;

use App\Domains\Academico\Models\CargaAcademica;
use App\Exports\Sheets\DocenteHorarioSheet;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ConcentradoHorarioExport implements WithMultipleSheets
{
    public function __construct(
        private readonly string $periodoId,
        private readonly ?string $carreraId = null,
    ) {}

    /** Una hoja Excel por docente con cargas en el periodo. */
    public function sheets(): array
    {
        $cargas = CargaAcademica::with(['docente:id,name', 'materia:id,nombre', 'grupo:id,clave', 'aula:id,nombre', 'horarios'])
            ->where('periodo_id', $this->periodoId)
            ->when($this->carreraId, fn($q) =>
                $q->whereHas('grupo', fn($gq) => $gq->where('carrera_id', $this->carreraId))
            )
            ->get();

        $hojas = $cargas
            ->groupBy('docente_id')
            ->map(fn($cargasDocente) => new DocenteHorarioSheet(
                $cargasDocente->first()->docente?->name ?? '—',
                $cargasDocente,
            ))
            ->values()
            ->all();

        return $hojas ?: [new DocenteHorarioSheet('Sin cargas', collect())];
    }
}
