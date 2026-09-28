<?php

namespace App\Exports;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ActaCalificacionesExport implements FromArray, WithHeadings, WithTitle, ShouldAutoSize, WithStyles
{
    /** @param Collection<int, \App\Domains\Academico\Models\Alumno> $alumnos */
    public function __construct(
        private readonly Grupo $grupo,
        private readonly CargaAcademica $carga,
        private readonly Collection $alumnos,
        private readonly Collection $calificaciones,
    ) {
    }

    public function array(): array
    {
        return $this->alumnos->values()->map(function ($alumno, $i) {
            $cal = $this->calificaciones->get($alumno->id);
            return [
                $i + 1,
                $alumno->numero_control,
                $alumno->user?->name ?? '—',
                $cal?->calificacion_final ?? '',
                $cal?->calificacion_final === null ? '' : ($cal->acreditado ? 'APROBADO' : 'NO APROBADO'),
            ];
        })->all();
    }

    public function headings(): array
    {
        $materia = $this->carga->materia?->nombre ?? 'Materia';

        return [
            ["Acta de Calificaciones — {$materia} — Grupo {$this->grupo->clave}"],
            ["Periodo: " . ($this->grupo->periodo?->nombre ?? '—') . " · Docente: " . ($this->carga->docente?->name ?? '—')],
            [],
            ['#', 'No. Control', 'Alumno', 'Final', 'Estatus'],
        ];
    }

    public function title(): string
    {
        return 'Acta de calificaciones';
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->mergeCells('A1:E1');
        $sheet->mergeCells('A2:E2');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A2')->getFont()->setSize(10)->setItalic(true);
        $sheet->getStyle('A4:E4')->getFont()->setBold(true);
        $sheet->getStyle('A4:E4')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('1A3A5C');
        $sheet->getStyle('A4:E4')->getFont()->getColor()->setRGB('FFFFFF');

        return [];
    }
}
