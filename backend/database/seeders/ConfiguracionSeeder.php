<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('configuracion_institucional')->updateOrInsert(
            ['clave_tecnm' => '30MSU0037C'],
            [
                'nombre_institucion' => 'Instituto Tecnológico Superior de Martínez de la Torre',
                'nombre_corto'       => 'ITSMT',
                'dependencia'        => 'Tecnológico Nacional de México',
                'subsistema'         => 'Subdirección Académica · Departamento de Servicios Escolares',
                'ciudad'             => 'Martínez de la Torre',
                'estado'             => 'Veracruz',
                'color_primario'     => '#1b396a',
                'color_secundario'   => '#8b1d41',
                'updated_at'         => now(),
            ]
        );
    }
}
