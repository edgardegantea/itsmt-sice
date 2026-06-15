<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsuariosPruebaSeeder extends Seeder
{
    public function run(): void
    {
        $usuarios = [
            ['name' => 'Administrador ITSMT',        'email' => 'admin@itsmt.edu.mx',          'role' => 'admin'],
            ['name' => 'Dr. Roberto Sánchez Morales', 'email' => 'director@itsmt.edu.mx',       'role' => 'director_academico'],
            ['name' => 'María López Hernández',       'email' => 'jefe.carrera@itsmt.edu.mx',  'role' => 'jefe_carrera'],
            ['name' => 'Carlos Ramírez Vega',         'email' => 'docente@itsmt.edu.mx',        'role' => 'docente'],
            ['name' => 'Ana García Torres',            'email' => 'alumno@itsmt.edu.mx',         'role' => 'alumno'],
            ['name' => 'Fernanda Cruz Espinoza',       'email' => 'escolar@itsmt.edu.mx',        'role' => 'personal_administrativo'],
        ];

        foreach ($usuarios as $datos) {
            $user = User::updateOrCreate(
                ['email' => $datos['email']],
                [
                    'name'     => $datos['name'],
                    'password' => Hash::make('Password123!'),
                ]
            );
            $user->syncRoles([$datos['role']]);
        }
    }
}
