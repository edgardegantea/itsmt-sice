<?php

namespace App\Console\Commands;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CrearUsuarioAlumno extends Command
{
    protected $signature = 'alumno:crear-usuario
                            {numero_control : Número de control del alumno}
                            {--password=Password123! : Contraseña para la cuenta}
                            {--email= : Correo electrónico (si no se proporciona se genera automáticamente)}';

    protected $description = 'Crea una cuenta de usuario para un alumno y la asocia por número de control';

    public function handle(): int
    {
        $numeroControl = strtoupper($this->argument('numero_control'));
        $password      = $this->option('password');

        $alumno = Alumno::where('numero_control', $numeroControl)->first();

        if (! $alumno) {
            $this->error("No se encontró el alumno con número de control: {$numeroControl}");
            return self::FAILURE;
        }

        if ($alumno->user_id) {
            $user = $alumno->user;
            $this->warn("El alumno ya tiene usuario asociado: {$user->email}");
            $this->resetPassword($user, $password);
            $this->table(['Campo', 'Valor'], [
                ['Número de control', $alumno->numero_control],
                ['Correo', $user->email],
                ['Contraseña', $password],
            ]);
            return self::SUCCESS;
        }

        $nombre = collect([
            $alumno->inscripcion?->aspirante?->nombres,
            $alumno->inscripcion?->aspirante?->apellido_paterno,
            $alumno->inscripcion?->aspirante?->apellido_materno,
        ])->filter()->implode(' ') ?: 'Alumno';

        $email = $this->option('email')
            ?: strtolower($numeroControl) . '@itsmt.edu.mx';

        if (User::where('email', $email)->exists()) {
            $email = strtolower($numeroControl) . '.alumno@itsmt.edu.mx';
        }

        $user = User::create([
            'name'     => $nombre,
            'email'    => $email,
            'password' => Hash::make($password),
        ]);

        $user->assignRole('alumno');
        $alumno->update(['user_id' => $user->id]);

        $this->info('✓ Usuario creado y asociado correctamente.');
        $this->table(['Campo', 'Valor'], [
            ['Número de control', $alumno->numero_control],
            ['Nombre',            $nombre],
            ['Correo',            $email],
            ['Contraseña',        $password],
        ]);

        return self::SUCCESS;
    }

    private function resetPassword(User $user, string $password): void
    {
        $user->update(['password' => Hash::make($password)]);
        $this->info('✓ Contraseña actualizada.');
    }
}
