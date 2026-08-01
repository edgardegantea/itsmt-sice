<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            SuperadminSeeder::class,
            UsuariosPruebaSeeder::class,
            Sprint1Seeder::class,
            CatalogoSeeder::class,
            EscuelasSeeder::class,
            ConfiguracionSeeder::class,
            EstudiantesSeeder::class,
            MateriasSeeder::class,
            TipoActividadSeeder::class,
            Sprint26a31DemoSeeder::class,
        ]);
    }
}
