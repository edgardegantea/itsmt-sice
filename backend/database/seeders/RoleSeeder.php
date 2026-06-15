<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // 6 roles TecNM según plan Scrum
        $roles = ['admin', 'director_academico', 'jefe_carrera', 'docente', 'alumno', 'personal_administrativo'];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@itsmt.edu.mx'],
            ['name' => 'Administrador ITSMT', 'password' => Hash::make('Admin123!')]
        );
        $admin->assignRole('admin');
    }
}
