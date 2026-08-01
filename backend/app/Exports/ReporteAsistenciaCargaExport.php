<?php

namespace App\Exports;

use App\Domains\Academico\Models\CargaAcademica;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReporteAsistenciaCargaExport implements FromArray, WithHeadings, WithTitle, ShouldAutoSize, WithStyles
{
    /** @param array<int, array{numero_control: string, nombre: string, presentes: int, ausentes: int, retardos: int, justificados: int, porcentaje_inasistencia: float}> $resumenAlumnos */
    public function __construct(
        private readonly CargaAcademica $carga,
        private readonly array $resumenAlumnos,
        private readonly int $totalSesiones,
        private readonly ?string $desde = null,
        private readonly ?string $hasta = null,
    ) {
    }

    public function array(): array
    {
        return array_map(fn (array $r) => [
            $r['numero_control'] ?? '',
            $r['nombre'],
            $r['presentes'],
            $r['ausentes'],
            $r['retardos'],
            $r['justificados'],
            $r['porcentaje_inasistencia'] . '%',
        ], $this->resumenAlumnos);
    }

    public function headings(): array
    {
        $materia = $this->carga->materia?->nombre ?? 'Materia';
        $grupos  = $this->carga->grupos->pluck('clave')->implode(', ');
        $rango   = ($this->desde || $this->hasta)
            ? ' · Rango: ' . ($this->desde ?? '…') . ' – ' . ($this->hasta ?? '…')
            : '';

        return [
            ["Reporte de asistencia — {$materia} — Grupo(s) {$grupos}"],
            ["Docente: " . ($this->carga->docente?->name ?? '—') . " · Sesiones registradas: {$this->totalSesiones}{$rango}"],
            [],
            ['N° Control', 'Nombre del alumno', 'Presentes', 'Ausentes', 'Retardos', 'Justificados', '% Inasistencia'],
        ];
    }

    public function title(): string
    {
        return 'Reporte de asistencia';
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->mergeCells('A1:G1');
        $sheet->mergeCells('A2:G2');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A2')->getFont()->setSize(10)->setItalic(true);
        $sheet->getStyle('A4:G4')->getFont()->setBold(true);
        $sheet->getStyle('A4:G4')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('1A3A5C');
        $sheet->getStyle('A4:G4')->getFont()->getColor()->setRGB('FFFFFF');

        return [];
    }
}
