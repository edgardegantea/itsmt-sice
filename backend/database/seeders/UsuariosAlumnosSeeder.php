<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Crea cuentas de usuario para todos los alumnos que aún no tienen una.
 * Seguro de correr múltiples veces (idempotente).
 *
 * Credenciales generadas:
 *   Email    : {numero_control}@itsmt.edu.mx
 *   Password : mismo numero_control  (el alumno la debe cambiar al primer ingreso)
 */
class UsuariosAlumnosSeeder extends Seeder
{
    public function run(): void
    {
        $sinUsuario = Alumno::whereNull('user_id')
            ->with('inscripcion.aspirante')
            ->get();

        if ($sinUsuario->isEmpty()) {
            $this->command->info('Todos los alumnos ya tienen usuario. No se realizaron cambios.');
            return;
        }

        $this->command->info("Creando usuarios para {$sinUsuario->count()} alumnos…");
        $this->command->getOutput()->progressStart($sinUsuario->count());

        $creados = 0;
        $omitidos = 0;

        foreach ($sinUsuario as $alumno) {
            $nc    = strtolower($alumno->numero_control);
            $email = $nc . '@itsmt.edu.mx';

            $asp    = $alumno->inscripcion?->aspirante;
            $nombre = $asp
                ? trim(implode(' ', array_filter([$asp->nombres, $asp->apellido_paterno, $asp->apellido_materno])))
                : 'Alumno ' . $alumno->numero_control;

            // Si el email ya existe lo reutilizamos; si no, lo creamos
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name'     => $nombre,
                    'password' => Hash::make($alumno->numero_control),
                ]
            );

            $user->syncRoles(['alumno']);

            $alumno->update(['user_id' => $user->id]);

            $wasCreated = $user->wasRecentlyCreated;
            $wasCreated ? $creados++ : $omitidos++;
            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();
        $this->command->info("✓ {$creados} usuarios creados.");

        if ($omitidos > 0) {
            $this->command->warn("{$omitidos} asociados a usuario existente (email ya estaba en uso).");
        }

        $this->command->info('');
        $this->command->info('Credenciales de acceso para los alumnos:');
        $this->command->info('  Usuario  : {numero_control}@itsmt.edu.mx');
        $this->command->info('  También pueden entrar con su número de control directamente.');
        $this->command->info('  Contraseña inicial: su número de control (ej. 210060001)');
    }
}
