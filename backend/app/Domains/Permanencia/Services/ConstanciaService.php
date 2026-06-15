<?php

namespace App\Domains\Permanencia\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Permanencia\Models\Constancia;
use App\Models\User;

class ConstanciaService
{
    public function solicitar(Alumno $alumno, string $tipo, User $solicitante): Constancia
    {
        return Constancia::create([
            'alumno_id'      => $alumno->id,
            'tipo'           => $tipo,
            'folio_unico'    => Constancia::generarFolio($tipo),
            'estatus'        => 'solicitada',
            'solicitada_por' => $solicitante->id,
        ]);
    }

    public function emitir(Constancia $constancia, User $emisor): Constancia
    {
        if ($constancia->estatus === 'emitida') {
            throw new \DomainException('Esta constancia ya fue emitida.');
        }

        $constancia->update([
            'estatus'    => 'emitida',
            'emitida_por'=> $emisor->id,
            'emitida_en' => now(),
        ]);

        return $constancia->fresh(['alumno.carrera', 'alumno.periodoIngreso', 'emitidaPor']);
    }

    public function listar(array $filtros = [])
    {
        $q = Constancia::with(['alumno.carrera', 'alumno.user', 'solicitadaPor', 'emitidaPor']);

        if (!empty($filtros['estatus'])) {
            $q->where('estatus', $filtros['estatus']);
        }
        if (!empty($filtros['tipo'])) {
            $q->where('tipo', $filtros['tipo']);
        }
        if (!empty($filtros['alumno_id'])) {
            $q->where('alumno_id', $filtros['alumno_id']);
        }

        return $q->latest()->paginate(20);
    }
}
