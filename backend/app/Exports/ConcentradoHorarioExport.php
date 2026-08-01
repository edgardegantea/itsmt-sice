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
        private readonly ?string $turno = null,
    ) {}

    /** Una hoja Excel por docente con cargas en el periodo. */
    public function sheets(): array
    {
        $cargas = CargaAcademica::with(['docente:id,name', 'materia:id,nombre', 'grupos:id,clave', 'aula:id,nombre', 'horarios'])
            ->where('periodo_id', $this->periodoId)
            ->when($this->carreraId, fn($q) =>
                $q->whereHas('grupos', fn($gq) => $gq->where('carrera_id', $this->carreraId))
            )
            ->when($this->turno, fn($q) =>
                $q->whereHas('grupos', fn($gq) => $gq->where('turno', $this->turno))
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
