<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use Illuminate\Database\Seeder;

class Sprint1Seeder extends Seeder
{
    public function run(): void
    {
        // codigo_it: código numérico TecNM para el segmento NNN del número de control [AA][NNN][####]
        // plan_clave: clave oficial del plan de estudios TecNM
        $carreras = [
            [
                'nombre'     => 'Ingeniería en Sistemas Computacionales',
                'clave'      => 'ISIC',
                'codigo_it'  => '006',
                'plan_clave' => 'ISIC-2010-227',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería Industrial',
                'clave'      => 'IIND',
                'codigo_it'  => '012',
                'plan_clave' => 'IIC-2010-230',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería en Gestión Empresarial',
                'clave'      => 'IGEM',
                'codigo_it'  => '011',
                'plan_clave' => 'IGEC-2009-203',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería Electromecánica',
                'clave'      => 'IEM',
                'codigo_it'  => '007',
                'plan_clave' => 'IEMC-2010-228',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería en Administración',
                'clave'      => 'IA',
                'codigo_it'  => '001',
                'plan_clave' => 'IAC-2009-201',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería en Tecnologías de la Información y Comunicaciones',
                'clave'      => 'ITIC',
                'codigo_it'  => '032',
                'plan_clave' => 'ITIC-2019-310',
                'activa'     => true,
            ],
            [
                'nombre'     => 'Ingeniería Ambiental',
                'clave'      => 'IAMB',
                'codigo_it'  => '002',
                'plan_clave' => 'IAMC-2010-225',
                'activa'     => true,
            ],
        ];

        foreach ($carreras as $datos) {
            Carrera::updateOrCreate(['clave' => $datos['clave']], $datos);
        }

        Periodo::firstOrCreate(
            ['nombre' => 'Agosto–Diciembre 2026'],
            [
                'fecha_inicio'               => '2026-08-17',
                'fecha_fin'                  => '2026-12-19',
                'activo'                     => true,
                'tipo'                       => 'ordinario',
                'fecha_limite_baja_parcial'  => '2026-09-11',
                'fecha_limite_baja_temporal' => '2026-09-25',
            ]
        );
    }
}
