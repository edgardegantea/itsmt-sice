<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Matricula alumnos activos en los grupos del periodo activo que ya tienen carga
 * académica/horario (antes solo 8 filas de alumno_grupo existían en todo el
 * periodo) y siembra sesiones + asistencias de las últimas 3 semanas para poder
 * probar Alerta de Deserción Temprana con datos reales.
 *
 * Requiere que Periodo.fecha_inicio del periodo activo ya se haya adelantado a
 * ~3 semanas atrás (si sigue siendo "hoy", no hay ventana pasada que sembrar).
 * Cada alumno matriculado recibe un perfil de asistencia fijo (bueno/medio/malo/
 * nunca-asistió) para que la distribución de riesgo sea realista y estable.
 */
class MatriculaAsistenciaTempranaDemoSeeder extends Seeder
{
    private array $diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

    public function run(): void
    {
        $periodo = Periodo::where('activo', true)->first();
        if (! $periodo) {
            $this->command->error('No hay periodo activo.');
            return;
        }

        if ($periodo->fecha_inicio->isFuture() || $periodo->fecha_inicio->isToday()) {
            $this->command->error('El periodo activo empieza hoy o en el futuro — no hay ventana pasada que sembrar. Adelanta fecha_inicio primero.');
            return;
        }

        $grupos = Grupo::where('periodo_id', $periodo->id)->whereHas('cargas')->get();
        if ($grupos->isEmpty()) {
            $this->command->error('Ningún grupo del periodo activo tiene carga académica asignada.');
            return;
        }

        $totalMatriculados = 0;
        $totalSesiones = 0;
        $totalAsistencias = 0;

        foreach ($grupos as $grupo) {
            $alumnos = $this->matricular($grupo, $periodo);
            $totalMatriculados += $alumnos->count();

            $cargas = CargaAcademica::with('horarios')
                ->where('periodo_id', $periodo->id)
                ->whereHas('grupos', fn ($q) => $q->where('grupos.id', $grupo->id))
                ->get();

            // Perfil de asistencia fijo por alumno para todo el semestre: la mayoría
            // asiste bien, un puñado tiene asistencia media/baja, y 1 de cada ~12
            // nunca se presenta — para que la distribución de riesgo sea realista.
            $perfiles = $alumnos->mapWithKeys(fn (Alumno $a) => [$a->id => $this->elegirPerfil()]);

            foreach ($cargas as $carga) {
                foreach ($carga->horarios as $horario) {
                    [$sesiones, $asistencias] = $this->sembrarSesionesDeHorario(
                        $periodo, $grupo, $carga, $horario, $alumnos, $perfiles
                    );
                    $totalSesiones += $sesiones;
                    $totalAsistencias += $asistencias;
                }
            }
        }

        $this->command->info("✓ {$totalMatriculados} matrículas nuevas, {$totalSesiones} sesiones y {$totalAsistencias} asistencias sembradas en {$grupos->count()} grupos de {$periodo->nombre}.");
    }

    private function matricular(Grupo $grupo, Periodo $periodo)
    {
        $yaMatriculados = DB::table('alumno_grupo')->where('grupo_id', $grupo->id)->pluck('alumno_id');

        $candidatos = Alumno::where('carrera_id', $grupo->carrera_id)
            ->where('semestre_actual', $grupo->semestre)
            ->where('estatus', 'activo')
            ->whereNotIn('id', $yaMatriculados)
            ->whereNotNull('user_id')
            ->inRandomOrder()
            ->limit(28)
            ->get();

        foreach ($candidatos as $alumno) {
            DB::table('alumno_grupo')->insert([
                'id' => (string) Str::uuid(),
                'grupo_id' => $grupo->id,
                'alumno_id' => $alumno->id,
                'fecha_asignacion' => $periodo->fecha_inicio->toDateString(),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return Alumno::whereIn('id', DB::table('alumno_grupo')->where('grupo_id', $grupo->id)->pluck('alumno_id'))
            ->whereNotNull('user_id')
            ->get();
    }

    /**
     * @return array{0:int,1:int} [sesiones creadas, asistencias creadas]
     */
    private function sembrarSesionesDeHorario(Periodo $periodo, Grupo $grupo, CargaAcademica $carga, $horario, $alumnos, $perfiles): array
    {
        $sesionesCreadas = 0;
        $asistenciasCreadas = 0;

        $fecha = $periodo->fecha_inicio->copy();
        $hoy = now()->toDateString();

        while ($fecha->toDateString() <= $hoy && $fecha->toDateString() <= $periodo->fecha_fin->toDateString()) {
            if ($this->diasSemana[$fecha->dayOfWeek] === $horario->dia_semana) {
                $existe = SesionClase::where('grupo_id', $grupo->id)
                    ->where('carga_academica_id', $carga->id)
                    ->whereDate('fecha', $fecha->toDateString())
                    ->where('hora_inicio', $horario->hora_inicio)
                    ->exists();

                if (! $existe) {
                    $sesion = SesionClase::create([
                        'grupo_id' => $grupo->id,
                        'carga_academica_id' => $carga->id,
                        'docente_id' => $carga->docente_id,
                        'fecha' => $fecha->toDateString(),
                        'hora_inicio' => $horario->hora_inicio,
                        'hora_fin' => $horario->hora_fin,
                    ]);
                    $sesionesCreadas++;

                    foreach ($alumnos as $alumno) {
                        if (! $alumno->user_id) {
                            continue;
                        }
                        $estatus = $this->tirarAsistencia($perfiles[$alumno->id]);
                        if ($estatus === null) {
                            continue; // ausente: no se crea fila (igual que un check-in que nunca llegó)
                        }
                        Asistencia::create([
                            'sesion_id' => $sesion->id,
                            'alumno_id' => $alumno->user_id,
                            'estatus' => $estatus,
                        ]);
                        $asistenciasCreadas++;
                    }
                }
            }
            $fecha->addDay();
        }

        return [$sesionesCreadas, $asistenciasCreadas];
    }

    /** @return 'bueno'|'medio'|'malo'|'nunca' */
    private function elegirPerfil(): string
    {
        return fake()->randomElement([
            'bueno', 'bueno', 'bueno', 'bueno', 'bueno', 'bueno', 'bueno', // ~70%
            'medio', 'medio', // ~17%
            'malo', // ~8%
            'nunca', // ~4%
        ]);
    }

    private function tirarAsistencia(string $perfil): ?string
    {
        $probabilidadPresente = match ($perfil) {
            'bueno' => 0.95,
            'medio' => 0.70,
            'malo'  => 0.30,
            'nunca' => 0.0,
        };

        if (! fake()->boolean((int) round($probabilidadPresente * 100))) {
            return null; // ausente (sin fila)
        }

        return fake()->randomElement(['presente', 'presente', 'presente', 'presente', 'retardo']);
    }
}
