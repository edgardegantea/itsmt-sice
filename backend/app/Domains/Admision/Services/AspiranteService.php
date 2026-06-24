<?php

namespace App\Domains\Admision\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AspiranteService
{
    public function listar(array $filtros, ?string $carreraForzada = null): LengthAwarePaginator
    {
        return Aspirante::with(['carrera', 'periodo', 'inscripcion:id,aspirante_id'])
            ->when($carreraForzada,                fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && ($filtros['carrera_id'] ?? null), fn($q) => $q->where('carrera_id', $filtros['carrera_id']))
            ->when($filtros['periodo_id'] ?? null, fn($q) => $q->where('periodo_id', $filtros['periodo_id']))
            ->when($filtros['puntaje_min'] ?? null, fn($q, $v) => $q->where('puntaje_exani', '>=', $v))
            ->when(
                isset($filtros['estatus']) && $filtros['estatus'] !== '',
                fn($q) => $q->where('estatus', $filtros['estatus']),
                fn($q) => $q->where('estatus', '!=', 'inscrito')
            )
            ->latest()
            ->paginate(20);
    }

    public function crear(array $datos): Aspirante
    {
        $aspirante = Aspirante::create(array_merge(['estatus' => 'pendiente'], $datos));
        $aspirante->load(['carrera', 'periodo']);

        return $aspirante;
    }

    public function actualizarEstatus(Aspirante $aspirante, string $estatus, ?string $observaciones, ?string $motivo_rechazo = null): Aspirante
    {
        $aspirante->update([
            'estatus'        => $estatus,
            'observaciones'  => $observaciones ?? $aspirante->observaciones,
            'motivo_rechazo' => $estatus === 'rechazado' ? $motivo_rechazo : null,
        ]);

        return $aspirante->fresh(['carrera', 'periodo']);
    }

    public function inscribir(Aspirante $aspirante, string $inscritoPorId, string $tipoIngreso = 'nuevo_ingreso'): Inscripcion
    {
        $numero_control = $this->generarNumeroControl($aspirante);

        // Mapeo TecNM-AC-PO-001: tipo_ingreso → tipo_ingreso_registro (catálogo oficial)
        $tipoRegistroMap = [
            'nuevo_ingreso' => 'Licenciatura',
            'reingreso'     => 'Licenciatura',
            'traslado'      => 'Traslado',
            'equivalencia'  => 'Equivalencia',
            'revalidacion'  => 'Revalidacion',
        ];
        $tipoIngresORegistro = $tipoRegistroMap[$tipoIngreso] ?? 'Licenciatura';

        $inscripcion = Inscripcion::create([
            'aspirante_id'          => $aspirante->id,
            'numero_control'        => $numero_control,
            'carrera_id'            => $aspirante->carrera_id,
            'periodo_id'            => $aspirante->periodo_id,
            'tipo_ingreso'          => $tipoIngreso,
            'tipo_ingreso_registro' => $tipoIngresORegistro,
            'semestre_ingreso'      => 1,
            'fecha_inscripcion'     => now()->toDateString(),
            'inscrito_por'          => $inscritoPorId,
        ]);

        $userAlumno = User::create([
            'name'     => "{$aspirante->nombres} {$aspirante->apellido_paterno} {$aspirante->apellido_materno}",
            'email'    => "{$numero_control}@alumnos.itsmt.edu.mx",
            'password' => Hash::make(strtoupper($aspirante->curp)),
        ]);
        $userAlumno->assignRole(Role::findByName('alumno', 'web'));

        $documentos = $aspirante->documentos ?? [];
        $pendienteCertificado = empty($documentos['certificado_bachillerato']);

        Alumno::create([
            'user_id'                          => $userAlumno->id,
            'inscripcion_id'                   => $inscripcion->id,
            'numero_control'                   => $numero_control,
            'carrera_id'                       => $aspirante->carrera_id,
            'periodo_ingreso_id'               => $aspirante->periodo_id,
            'semestre_actual'                  => 1,
            'estatus'                          => 'activo',
            'pendiente_certificado_bachillerato' => $pendienteCertificado,
        ]);

        $aspirante->update(['estatus' => 'inscrito']);

        return $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);
    }

    // Formato TecNM [AA][NNN][####]
    private function generarNumeroControl(Aspirante $aspirante): string
    {
        $anio     = now()->format('y');
        $anioFull = now()->year;
        $codigoIt = str_pad($aspirante->carrera->codigo_it, 3, '0', STR_PAD_LEFT);

        $secuencia = DB::transaction(function () use ($anioFull) {
            DB::table('inscripciones')->whereYear('created_at', $anioFull)->lockForUpdate()->count();
            return DB::table('inscripciones')->whereYear('created_at', $anioFull)->count() + 1;
        });

        return "{$anio}{$codigoIt}" . str_pad($secuencia, 4, '0', STR_PAD_LEFT);
    }
}
