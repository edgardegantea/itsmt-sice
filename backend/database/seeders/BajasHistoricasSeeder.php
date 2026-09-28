<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Baja;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * HistoricoAlumnosSeeder fija Alumno.estatus en 'baja_temporal'/'baja_definitiva'
 * directamente, sin crear la fila Baja correspondiente — así que BajasAdminPage,
 * el reporte de altas/bajas y el historial por alumno no tienen nada que mostrar
 * para esos ~800 alumnos aunque su estatus ya lo diga. Este seeder rellena esa
 * relación con datos consistentes con lo que ya existe (mismo estatus, mismo
 * semestre cursado), y agrega un puñado de solicitudes "pendiente" recientes de
 * alumnos activos para poder probar el flujo de aprobación/rechazo.
 */
class BajasHistoricasSeeder extends Seeder
{
    private array $motivosEnum = ['economico', 'salud', 'trabajo', 'familiar', 'cambio_carrera', 'cambio_institucion', 'otro'];

    public function run(): void
    {
        $admin = User::role('admin')->first() ?? User::role('superadmin')->first();
        if (! $admin) {
            $this->command->error('No hay usuario admin/superadmin para registrar las bajas.');
            return;
        }

        $periodos = Periodo::orderBy('fecha_inicio')->get();
        if ($periodos->isEmpty()) {
            $this->command->error('No hay periodos en la BD.');
            return;
        }

        $this->backfillBajasHistoricas($admin, $periodos);
        $this->sembrarSolicitudesPendientes($admin, $periodos);
    }

    private function backfillBajasHistoricas(User $admin, $periodos): void
    {
        $yaTienenBaja = Baja::pluck('alumno_id')->all();

        $alumnos = Alumno::whereIn('estatus', ['baja_temporal', 'baja_definitiva'])
            ->whereNotIn('id', $yaTienenBaja)
            ->with('inscripcion')
            ->get();

        if ($alumnos->isEmpty()) {
            $this->command->info('Sin alumnos baja_temporal/baja_definitiva pendientes de respaldo con Baja.');
            return;
        }

        $creadas = 0;

        foreach ($alumnos as $alumno) {
            $periodo = $this->elegirPeriodoDeBaja($alumno, $periodos);
            if (! $periodo) {
                continue;
            }

            $tipoBaja = $alumno->estatus === 'baja_temporal' ? 'temporal' : 'definitiva';
            $fechaSolicitud = fake()->dateTimeBetween($periodo->fecha_inicio, min($periodo->fecha_fin, now()))->format('Y-m-d');

            Baja::create([
                'alumno_id'                 => $alumno->id,
                'periodo_id'                => $periodo->id,
                'tipo_baja'                 => $tipoBaja,
                'estatus'                   => 'aprobada', // ya refleja el estatus actual del alumno
                'motivo_enum'               => fake()->randomElement($this->motivosEnum),
                'fecha_solicitud'           => $fechaSolicitud,
                'fecha_efectiva'            => $fechaSolicitud,
                'registrada_por'            => $admin->id,
                'revisada_por'              => $admin->id,
                'revisada_en'               => $fechaSolicitud,
                'numero_semestres_cursados' => $alumno->semestre_actual,
                // El alumno sigue en baja_temporal hoy — no se le registra reingreso.
                'reingreso_posible'         => $tipoBaja === 'temporal',
            ]);

            $creadas++;
        }

        $this->command->info("✓ {$creadas} bajas históricas creadas (respaldo de alumnos ya marcados baja_temporal/baja_definitiva).");
    }

    /**
     * Elige un periodo posterior al de ingreso del alumno, proporcional a los
     * semestres que alcanzó a cursar — no siempre justo el siguiente, para que la
     * distribución de "cuándo se dieron de baja" no sea idéntica para todos.
     */
    private function elegirPeriodoDeBaja(Alumno $alumno, $periodos): ?Periodo
    {
        $idxIngreso = $periodos->search(fn (Periodo $p) => $p->id === $alumno->periodo_ingreso_id);
        if ($idxIngreso === false) {
            return $periodos->last();
        }

        // Cada periodo avanza ~1 semestre; nos movemos entre 1 y el número de
        // semestres cursados (tope al último periodo disponible).
        $maxAvance = max(1, (int) $alumno->semestre_actual);
        $avance = fake()->numberBetween(1, $maxAvance);
        $idxBaja = min($idxIngreso + $avance, $periodos->count() - 1);

        return $periodos[$idxBaja];
    }

    private function sembrarSolicitudesPendientes(User $admin, $periodos): void
    {
        $periodoActivo = $periodos->firstWhere('activo', true) ?? $periodos->last();

        $yaConTramiteActivo = Baja::where('periodo_id', $periodoActivo->id)
            ->whereIn('estatus', ['pendiente', 'aprobada'])
            ->pluck('alumno_id');

        $candidatos = Alumno::where('estatus', 'activo')
            ->whereNotIn('id', $yaConTramiteActivo)
            ->inRandomOrder()
            ->limit(6)
            ->get();

        $creadas = 0;
        foreach ($candidatos as $alumno) {
            Baja::create([
                'alumno_id'                 => $alumno->id,
                'periodo_id'                => $periodoActivo->id,
                'tipo_baja'                 => 'temporal',
                'estatus'                   => 'pendiente',
                'motivo_enum'               => fake()->randomElement($this->motivosEnum),
                'motivo_texto'              => fake()->optional(0.5)->sentence(),
                'fecha_solicitud'           => now()->subDays(fake()->numberBetween(0, 10))->toDateString(),
                'registrada_por'            => $alumno->user_id ?? $admin->id,
                'numero_semestres_cursados' => $alumno->semestre_actual,
                'reingreso_posible'         => true,
            ]);
            $creadas++;
        }

        $this->command->info("✓ {$creadas} solicitudes de baja temporal 'pendiente' sembradas en {$periodoActivo->nombre} para probar el flujo de aprobación.");
    }
}
