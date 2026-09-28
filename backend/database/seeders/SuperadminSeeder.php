<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperadminSeeder extends Seeder
{
    // Credenciales fijas de prueba. updateOrCreate garantiza que el password
    // quede en un estado conocido en cada `db:seed`.
    const EMAIL    = 'superadmin@itsmt.edu.mx';
    const PASSWORD = 'SuperAdmin123!';

    const EDGAR_EMAIL    = 'edgar.degante.a@gmail.com';
    const EDGAR_PASSWORD = 'deae880618';

    public function run(): void
    {
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        $superadmin = User::updateOrCreate(
            ['email' => self::EMAIL],
            ['name' => 'Super Administrador', 'password' => Hash::make(self::PASSWORD)]
        );
        $superadmin->syncRoles(['superadmin']);

        $edgar = User::updateOrCreate(
            ['email' => self::EDGAR_EMAIL],
            [
                'name' => 'Edgar Degante Aguilar',
                'password' => Hash::make(self::EDGAR_PASSWORD),
                'email_verified_at' => now(),
                'activo' => true,
            ]
        );
        $edgar->syncRoles(['superadmin']);

        $this->command->info('Superadmin listo → ' . self::EMAIL . ' / ' . self::PASSWORD);
        $this->command->info('Superadmin Edgar listo → ' . self::EDGAR_EMAIL . ' / ' . self::EDGAR_PASSWORD);
    }
}
