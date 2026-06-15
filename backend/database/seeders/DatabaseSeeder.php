<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UsuariosPruebaSeeder::class,
            Sprint1Seeder::class,
            CatalogoSeeder::class,
            EscuelasSeeder::class,
            ConfiguracionSeeder::class,
        ]);
    }
}
