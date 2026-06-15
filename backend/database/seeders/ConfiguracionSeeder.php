<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('configuracion_institucional')->count() === 0) {
            DB::table('configuracion_institucional')->insert([
                'nombre_institucion' => 'Instituto Tecnológico Superior de Martínez de la Torre',
                'nombre_corto'       => 'ITSMT',
                'clave_tecnm'        => '30MSU0037C',
                'dependencia'        => 'Tecnológico Nacional de México',
                'subsistema'         => 'Subdirección Académica · Departamento de Servicios Escolares',
                'ciudad'             => 'Martínez de la Torre',
                'estado'             => 'Veracruz',
                'color_primario'     => '#1a3a5c',
                'color_secundario'   => '#2d6a9f',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
        }
    }
}
