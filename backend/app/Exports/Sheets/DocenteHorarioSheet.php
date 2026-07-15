<?php

namespace App\Exports\Sheets;

use App\Domains\Academico\Models\CargaAcademica;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;

class DocenteHorarioSheet implements FromView, WithTitle
{
    private const HORA_INICIO = 7;
    private const HORA_FIN    = 21;

    /** @param Collection<int, CargaAcademica> $cargas */
    public function __construct(
        private readonly string     $docenteNombre,
        private readonly Collection $cargas,
    ) {}

    public function view(): View
    {
        $slots = $this->generarSlots();

        return view('exports.horario-docente', [
            'docente' => $this->docenteNombre,
            'slots'   => $slots,
            'celda'   => fn(string $dia, string $hora) => $this->celda($dia, $hora),
        ]);
    }

    public function title(): string
    {
        return Str::limit($this->docenteNombre, 28, '');
    }

    private function celda(string $dia, string $hora): ?array
    {
        $inicioMin = $this->aMinutos($hora);
        $finMin    = $inicioMin + 60;

        $carga = $this->cargas->first(function (CargaAcademica $c) use ($dia, $inicioMin, $finMin) {
            foreach ($c->horarios as $h) {
                if ($h->dia_semana === $dia
                    && $this->aMinutos($h->hora_inicio) < $finMin
                    && $this->aMinutos($h->hora_fin) > $inicioMin) {
                    return true;
                }
            }
            return false;
        });

        if (!$carga) {
            return null;
        }

        return [
            'linea1' => $carga->materia?->nombre ?? '—',
            'linea2' => ($carga->grupo?->clave ?? '—').' · '.($carga->aula?->nombre ?? '—'),
        ];
    }

    private function generarSlots(): array
    {
        $slots = [];
        for ($h = self::HORA_INICIO; $h < self::HORA_FIN; $h++) {
            $slots[] = sprintf('%02d:00', $h);
        }
        return $slots;
    }

    private function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($hora, 0, 5)));
        return $h * 60 + $m;
    }
}
