<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class CrearUsuariosAlumnos extends Command
{
    protected $signature   = 'alumnos:crear-usuarios {--dry-run : Solo muestra lo que haría sin guardar}';
    protected $description = 'Crea cuentas de usuario para alumnos que no tienen una (password = CURP en mayúsculas)';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $rol    = Role::findByName('alumno', 'web');

        $alumnos = Alumno::with(['inscripcion.aspirante'])
            ->whereNull('user_id')
            ->whereHas('inscripcion.aspirante')
            ->get();

        $total     = $alumnos->count();
        $creados   = 0;
        $omitidos  = 0;

        $this->info("Alumnos sin usuario con aspirante vinculado: {$total}");

        if ($dryRun) {
            $this->warn('Modo --dry-run: no se guardará nada.');
        }

        if ($total === 0) {
            $this->info('Nada que hacer.');
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        foreach ($alumnos as $alumno) {
            $aspirante = $alumno->inscripcion->aspirante;
            $email     = "{$alumno->numero_control}@alumnos.itsmt.edu.mx";

            // Evita duplicados de email
            if (User::where('email', $email)->exists()) {
                $omitidos++;
                $bar->advance();
                continue;
            }

            if (! $dryRun) {
                $user = User::create([
                    'name'     => trim("{$aspirante->nombres} {$aspirante->apellido_paterno} {$aspirante->apellido_materno}"),
                    'email'    => $email,
                    'password' => Hash::make(strtoupper($aspirante->curp)),
                ]);

                $user->assignRole($rol);
                $alumno->update(['user_id' => $user->id]);
            }

            $creados++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Creados : {$creados}");
        $this->warn("Omitidos (email ya existe): {$omitidos}");

        if ($dryRun) {
            $this->warn('Corre sin --dry-run para aplicar los cambios.');
        }

        return self::SUCCESS;
    }
}
