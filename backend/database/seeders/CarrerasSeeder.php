<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Carrera;
use Illuminate\Database\Seeder;

class CarrerasSeeder extends Seeder
{
    public function run(): void
    {
        $carreras = [
            ['clave' => 'IGE',     'nombre' => 'Ingeniería en Gestión Empresarial',                    'codigo_it' => '004', 'plan_clave' => 'IGEI-2010-215', 'especialidad' => 'Escolarizado'],
            ['clave' => 'IGE-SAB', 'nombre' => 'Ingeniería en Gestión Empresarial',                    'codigo_it' => '004', 'plan_clave' => 'IGEI-2010-215', 'especialidad' => 'Sabatino'],
            ['clave' => 'ISC',     'nombre' => 'Ingeniería en Sistemas Computacionales',               'codigo_it' => '006', 'plan_clave' => 'ISIC-2010-227', 'especialidad' => 'Escolarizado'],
            ['clave' => 'ISC-SAB', 'nombre' => 'Ingeniería en Sistemas Computacionales',               'codigo_it' => '006', 'plan_clave' => 'ISIC-2010-227', 'especialidad' => 'Sabatino'],
            ['clave' => 'ITIC',    'nombre' => 'Ingeniería en Mecatrónica',                            'codigo_it' => '077', 'plan_clave' => 'ITIC-2010-267', 'especialidad' => null],
            ['clave' => 'IIAS',    'nombre' => 'Ingeniería en Innovación Agrícola Sustentable',        'codigo_it' => '166', 'plan_clave' => 'IIAS-2017-301', 'especialidad' => 'Escolarizado'],
            ['clave' => 'IIAS-SAB','nombre' => 'Ingeniería en Innovación Agrícola Sustentable',        'codigo_it' => '166', 'plan_clave' => 'IIAS-2017-301', 'especialidad' => 'Sabatino'],
            ['clave' => 'IIA',     'nombre' => 'Ingeniería en Industrias Alimentarias',                'codigo_it' => '096', 'plan_clave' => 'IIAL-2010-247', 'especialidad' => null],
            ['clave' => 'IAM',     'nombre' => 'Ingeniería Ambiental',                                 'codigo_it' => '052', 'plan_clave' => 'IAM-2010-251',  'especialidad' => null],
            ['clave' => 'IIN',     'nombre' => 'Ingeniería Industrial',                                'codigo_it' => '005', 'plan_clave' => 'IIND-2010-214', 'especialidad' => 'Escolarizado'],
            ['clave' => 'IIN-SAB', 'nombre' => 'Ingeniería Industrial',                                'codigo_it' => '005', 'plan_clave' => 'IIND-2010-214', 'especialidad' => 'Sabatino'],
        ];

        // Elimina todas las carreras existentes y las reemplaza
        Carrera::truncate();

        foreach ($carreras as $datos) {
            Carrera::create(array_merge($datos, ['activa' => true]));
        }
    }
}
