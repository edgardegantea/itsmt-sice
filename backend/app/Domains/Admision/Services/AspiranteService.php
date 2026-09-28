<?php

namespace App\Domains\Admision\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\AspiranteEstatusHistorial;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Mail\AceptacionAspiranteMail;
use App\Mail\RechazoAspiranteMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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

    public function actualizarEstatus(Aspirante $aspirante, string $estatus, ?string $observaciones, ?string $motivo_rechazo = null, ?string $cambiadoPorId = null): Aspirante
    {
        // Un aspirante ya inscrito tiene Inscripcion/Alumno creados a partir de
        // su estatus 'aceptado' — regresarlo aquí a pendiente/rechazado dejaría
        // esos registros huérfanos de la razón por la que existen, sin revertir
        // nada de lo que ya se generó.
        if ($aspirante->estatus === 'inscrito') {
            throw new \DomainException('Este aspirante ya fue inscrito — su estatus ya no se puede modificar desde aquí.');
        }

        $estatusAnterior = $aspirante->estatus;

        // Sin cambio real: no reenviar el correo de aceptación/rechazo ni duplicar
        // el historial solo porque alguien reenvió el mismo PATCH (doble clic,
        // reintento de red, formulario reenviado).
        if ($estatusAnterior === $estatus) {
            $aspirante->update([
                'observaciones'  => $observaciones ?? $aspirante->observaciones,
                'motivo_rechazo' => $estatus === 'rechazado' ? ($motivo_rechazo ?? $aspirante->motivo_rechazo) : null,
            ]);

            return $aspirante->fresh(['carrera', 'periodo']);
        }

        $aspirante->update([
            'estatus'        => $estatus,
            'observaciones'  => $observaciones ?? $aspirante->observaciones,
            'motivo_rechazo' => $estatus === 'rechazado' ? $motivo_rechazo : null,
        ]);

        AspiranteEstatusHistorial::create([
            'aspirante_id'     => $aspirante->id,
            'estatus_anterior' => $estatusAnterior,
            'estatus_nuevo'    => $estatus,
            'motivo'           => $estatus === 'rechazado' ? $motivo_rechazo : $observaciones,
            'cambiado_por'     => $cambiadoPorId,
        ]);

        if ($estatus === 'aceptado') {
            Mail::to($aspirante->email)->queue(new AceptacionAspiranteMail($aspirante));
        } elseif ($estatus === 'rechazado') {
            Mail::to($aspirante->email)->queue(new RechazoAspiranteMail($aspirante));
        }

        return $aspirante->fresh(['carrera', 'periodo']);
    }

    public function inscribir(Aspirante $aspirante, string $inscritoPorId, string $tipoIngreso = 'nuevo_ingreso'): Inscripcion
    {
        try {
            return $this->inscribirEnTransaccion($aspirante, $inscritoPorId, $tipoIngreso);
        } catch (\Illuminate\Database\QueryException $e) {
            // Última línea de defensa: si dos solicitudes concurrentes lograron
            // pasar ambas comprobaciones (posible fuera de Postgres, donde el
            // advisory lock es no-op), la restricción única de BD en
            // inscripciones.aspirante_id rechaza el segundo insert.
            if ((string) $e->getCode() === '23505' || str_contains($e->getMessage(), 'inscripciones_aspirante_id_unique')) {
                throw new AspiranteYaInscritoException("El aspirante {$aspirante->id} ya fue inscrito.", 0, $e);
            }
            throw $e;
        }
    }

    private function inscribirEnTransaccion(Aspirante $aspirante, string $inscritoPorId, string $tipoIngreso): Inscripcion
    {
        return DB::transaction(function () use ($aspirante, $inscritoPorId, $tipoIngreso) {
            // Advisory lock: serializa la generación de número de control para
            // que dos inscripciones concurrentes en el mismo año no calculen
            // la misma secuencia (count-then-insert sin esto es una condición
            // de carrera). No-op fuera de Postgres (p.ej. SQLite en tests).
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('SELECT pg_advisory_xact_lock(?)', [crc32('numero_control:' . now()->year)]);
            }

            // Revalidar "ya inscrito" DENTRO del lock: la comprobación en el
            // controlador ocurre antes de adquirir el lock, así que una segunda
            // solicitud concurrente pudo pasarla también. Esta es la comprobación
            // que realmente previene el duplicado.
            if ($aspirante->inscripcion()->exists()) {
                throw new AspiranteYaInscritoException("El aspirante {$aspirante->id} ya fue inscrito.");
            }

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
                'plantel'                          => $aspirante->plantel ?? 'martinez_de_la_torre',
                'modalidad'                        => $aspirante->modalidad ?? 'escolarizado',
                'nivel'                            => $aspirante->nivel ?? 'licenciatura',
            ]);

            $aspirante->update(['estatus' => 'inscrito']);

            return $inscripcion->load(['aspirante', 'carrera', 'periodo', 'alumno']);
        });
    }

    // Formato TecNM [AA][NNN][####] — debe invocarse dentro del advisory lock de inscribir()
    private function generarNumeroControl(Aspirante $aspirante): string
    {
        $anio     = now()->format('y');
        $anioFull = now()->year;
        $codigoIt = str_pad($aspirante->carrera->codigo_it, 3, '0', STR_PAD_LEFT);

        $secuencia = DB::table('inscripciones')->whereYear('created_at', $anioFull)->count() + 1;

        return "{$anio}{$codigoIt}" . str_pad($secuencia, 4, '0', STR_PAD_LEFT);
    }
}
