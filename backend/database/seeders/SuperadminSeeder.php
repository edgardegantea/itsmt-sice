<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperadminSeeder extends Seeder
{
    // Credenciales fijas de prueba. updateOrCreate garantiza que el password
    // quede en un estado conocido en cada `db:seed`, a diferencia de RoleSeeder
    // (firstOrCreate), que deja intacta la contraseña si el usuario ya existe.
    const EMAIL    = 'superadmin@itsmt.edu.mx';
    const PASSWORD = 'SuperAdmin123!';

    public function run(): void
    {
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        $superadmin = User::updateOrCreate(
            ['email' => self::EMAIL],
            ['name' => 'Super Administrador', 'password' => Hash::make(self::PASSWORD)]
        );
        $superadmin->syncRoles(['superadmin']);

        $this->command->info('Superadmin listo → ' . self::EMAIL . ' / ' . self::PASSWORD);
    }
}
