<?php

namespace Database\Seeders;

use App\Domains\Institucional\Models\DirectorioArea;
use App\Domains\Institucional\Models\DirectorioPuesto;
use Illuminate\Database\Seeder;

class DirectorioAreasPuestosInstitucionalSeeder extends Seeder
{
    public function run(): void
    {
        // ── Áreas / Departamentos ────────────────────────────────────────────
        $areas = [
            ['nombre' => 'Dirección General',                         'tipo' => 'administracion', 'orden' => 1],
            ['nombre' => 'Dirección de Planeación y Vinculación',     'tipo' => 'administracion', 'orden' => 2],
            ['nombre' => 'Dirección Académica',                       'tipo' => 'academico',      'orden' => 3],
            ['nombre' => 'Subdirección de Servicios Administrativos', 'tipo' => 'administracion', 'orden' => 4],
            ['nombre' => 'Subdirección Académica',                    'tipo' => 'academico',      'orden' => 5],
            ['nombre' => 'Subdirección de Posgrado e Investigación',  'tipo' => 'academico',      'orden' => 6],
            ['nombre' => 'Subdirección de Planeación y Vinculación',  'tipo' => 'administracion', 'orden' => 7],
            ['nombre' => 'Subdirección de Vinculación',               'tipo' => 'administracion', 'orden' => 8],
            ['nombre' => 'Departamento de Desarrollo Académico',      'tipo' => 'departamento',   'orden' => 9],
            ['nombre' => 'División de Ingeniería en Sistemas Computacionales',               'tipo' => 'academico', 'orden' => 10],
            ['nombre' => 'División de Ingeniería en Gestión Empresarial',                    'tipo' => 'academico', 'orden' => 11],
            ['nombre' => 'División de Ingeniería en Industrias Alimentarias',                'tipo' => 'academico', 'orden' => 12],
            ['nombre' => 'División de Ingeniería en Innovación Agrícola Sustentable',        'tipo' => 'academico', 'orden' => 13],
            ['nombre' => 'División de Ingeniería Industrial',                                'tipo' => 'academico', 'orden' => 14],
            ['nombre' => 'División de Ingeniería Ambiental',                                 'tipo' => 'academico', 'orden' => 15],
            ['nombre' => 'División de Ciencias Básicas',                                     'tipo' => 'academico', 'orden' => 16],
            ['nombre' => 'División de Ingeniería en Mecatrónica',                            'tipo' => 'academico', 'orden' => 17],
            ['nombre' => 'Departamento de Personal',                  'tipo' => 'departamento',   'orden' => 18],
            ['nombre' => 'Departamento de Recursos Financieros',      'tipo' => 'departamento',   'orden' => 19],
            ['nombre' => 'Departamento de Recursos Materiales',       'tipo' => 'departamento',   'orden' => 20],
            ['nombre' => 'Departamento de Control Escolar',           'tipo' => 'departamento',   'orden' => 21],
            ['nombre' => 'Departamento de Gestión y Vinculación',     'tipo' => 'departamento',   'orden' => 22],
            ['nombre' => 'Departamento de Difusión y Concertación',   'tipo' => 'departamento',   'orden' => 23],
            ['nombre' => 'Departamento de Residencias Profesionales y Servicio Social', 'tipo' => 'departamento', 'orden' => 24],
            ['nombre' => 'Departamento de Tecnologías de Información','tipo' => 'departamento',   'orden' => 25],
            ['nombre' => 'Centro de Lenguas Extranjeras',             'tipo' => 'departamento',   'orden' => 26],
        ];

        foreach ($areas as $datos) {
            DirectorioArea::firstOrCreate(
                ['nombre' => $datos['nombre']],
                array_merge($datos, ['activo' => true])
            );
        }

        // ── Índice de áreas para asignar a puestos ───────────────────────────
        $a = DirectorioArea::pluck('id', 'nombre');

        // ── Puestos ──────────────────────────────────────────────────────────
        $puestos = [
            [
                'nombre'          => 'Director General',
                'area_id'         => $a['Dirección General'] ?? null,
                'firma_documentos'=> true,
                'orden'           => 1,
            ],
            [
                'nombre'          => 'Director de Planeación y Vinculación',
                'area_id'         => $a['Dirección de Planeación y Vinculación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 2,
            ],
            [
                'nombre'          => 'Encargado de la Dirección Académica',
                'area_id'         => $a['Dirección Académica'] ?? null,
                'firma_documentos'=> true,
                'orden'           => 3,
            ],
            [
                'nombre'          => 'Encargado de la Subdirección de Servicios Administrativos',
                'area_id'         => $a['Subdirección de Servicios Administrativos'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 4,
            ],
            [
                'nombre'          => 'Encargado de la Subdirección Académica',
                'area_id'         => $a['Subdirección Académica'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 5,
            ],
            [
                'nombre'          => 'Encargado de la Subdirección de Posgrado e Investigación',
                'area_id'         => $a['Subdirección de Posgrado e Investigación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 6,
            ],
            [
                'nombre'          => 'Subdirector de Planeación y Vinculación',
                'area_id'         => $a['Subdirección de Planeación y Vinculación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 7,
            ],
            [
                'nombre'          => 'Subdirector de Vinculación',
                'area_id'         => $a['Subdirección de Vinculación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 8,
            ],
            [
                'nombre'          => 'Jefe de Departamento de Desarrollo Académico',
                'area_id'         => $a['Departamento de Desarrollo Académico'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 9,
            ],
            [
                'nombre'          => 'Jefe de División de Ingeniería en Sistemas Computacionales',
                'area_id'         => $a['División de Ingeniería en Sistemas Computacionales'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 10,
            ],
            [
                'nombre'          => 'Jefe de División de Ingeniería en Gestión Empresarial',
                'area_id'         => $a['División de Ingeniería en Gestión Empresarial'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 11,
            ],
            [
                'nombre'          => 'Encargado de la Jefatura de Ingeniería en Industrias Alimentarias',
                'area_id'         => $a['División de Ingeniería en Industrias Alimentarias'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 12,
            ],
            [
                'nombre'          => 'Encargado de la Jefatura de Ingeniería en Innovación Agrícola Sustentable',
                'area_id'         => $a['División de Ingeniería en Innovación Agrícola Sustentable'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 13,
            ],
            [
                'nombre'          => 'Encargado de la Jefatura de Ingeniería Industrial',
                'area_id'         => $a['División de Ingeniería Industrial'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 14,
            ],
            [
                'nombre'          => 'Jefe de División de Ingeniería Ambiental',
                'area_id'         => $a['División de Ingeniería Ambiental'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 15,
            ],
            [
                'nombre'          => 'Docente de Ciencias Básicas',
                'area_id'         => $a['División de Ciencias Básicas'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 16,
            ],
            [
                'nombre'          => 'Jefe de División de Ingeniería en Mecatrónica',
                'area_id'         => $a['División de Ingeniería en Mecatrónica'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 17,
            ],
            [
                'nombre'          => 'Jefe de Departamento de Personal',
                'area_id'         => $a['Departamento de Personal'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 18,
            ],
            [
                'nombre'          => 'Encargado de Recursos Financieros',
                'area_id'         => $a['Departamento de Recursos Financieros'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 19,
            ],
            [
                'nombre'          => 'Jefe de Departamento de Recursos Materiales',
                'area_id'         => $a['Departamento de Recursos Materiales'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 20,
            ],
            [
                'nombre'          => 'Encargado de Control Escolar',
                'area_id'         => $a['Departamento de Control Escolar'] ?? null,
                'firma_documentos'=> true,
                'orden'           => 21,
            ],
            [
                'nombre'          => 'Encargado de Gestión y Vinculación',
                'area_id'         => $a['Departamento de Gestión y Vinculación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 22,
            ],
            [
                'nombre'          => 'Jefe de Departamento de Difusión y Concertación',
                'area_id'         => $a['Departamento de Difusión y Concertación'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 23,
            ],
            [
                'nombre'          => 'Jefe de Departamento de Residencias Profesionales y Servicio Social',
                'area_id'         => $a['Departamento de Residencias Profesionales y Servicio Social'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 24,
            ],
            [
                'nombre'          => 'Encargado de Tecnologías de Información',
                'area_id'         => $a['Departamento de Tecnologías de Información'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 25,
            ],
            [
                'nombre'          => 'Coordinador de Lenguas Extranjeras',
                'area_id'         => $a['Centro de Lenguas Extranjeras'] ?? null,
                'firma_documentos'=> false,
                'orden'           => 26,
            ],
        ];

        foreach ($puestos as $datos) {
            DirectorioPuesto::firstOrCreate(
                ['nombre' => $datos['nombre']],
                array_merge($datos, ['activo' => true])
            );
        }

        $this->command->info('26 áreas y 26 puestos registrados correctamente.');
    }
}
