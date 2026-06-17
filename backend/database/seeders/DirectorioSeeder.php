<?php

namespace Database\Seeders;

use App\Domains\Institucional\Models\DirectorioPersonal;
use Illuminate\Database\Seeder;

class DirectorioSeeder extends Seeder
{
    public function run(): void
    {
        DirectorioPersonal::truncate();

        $personas = [
            // Administración General
            ['nombre' => 'MC. ALEJANDRO HERNÁNDEZ LOZANO',          'cargo' => 'Director General',                                    'area' => 'Administración General',            'email' => 'direccion@itsmt.edu.mx',              'telefono' => '225 253 0108', 'extension' => '101', 'orden' => 1,  'firma_documentos' => true],
            ['nombre' => 'LCP. MIRIAM HERNÁNDEZ PATIÑO',            'cargo' => 'Subdirectora de Planeación y Vinculación',           'area' => 'Administración General',            'email' => 'planeacion@itsmt.edu.mx',             'telefono' => '225 253 0108', 'extension' => '102', 'orden' => 2,  'firma_documentos' => true],
            ['nombre' => 'MC. BERNARDO MÉNDEZ APARICIO',            'cargo' => 'Subdirector Administrativo',                         'area' => 'Administración General',            'email' => 'sadministrativa@itsmt.edu.mx',        'telefono' => '225 253 0108', 'extension' => '103', 'orden' => 3,  'firma_documentos' => true],

            // Subdirecciones Académicas
            ['nombre' => 'MC. CLAUDIA PATRICIA LARA HERNÁNDEZ',     'cargo' => 'Subdirectora Académica',                             'area' => 'Subdirección Académica',            'email' => 'sacademica@itsmt.edu.mx',             'telefono' => '225 253 0108', 'extension' => '104', 'orden' => 4,  'firma_documentos' => true],

            // Jefaturas de Carrera
            ['nombre' => 'MC. JUAN CARLOS REYES HERNÁNDEZ',         'cargo' => 'Jefe de Carrera de Ingeniería en Sistemas Computacionales', 'area' => 'Ingeniería en Sistemas Computacionales', 'email' => 'sistemas@itsmt.edu.mx',          'telefono' => '225 253 0108', 'extension' => '201', 'orden' => 10, 'firma_documentos' => false],
            ['nombre' => 'MC. ROSARIO BÁEZ ALTAMIRANO',             'cargo' => 'Jefa de Carrera de Ingeniería Industrial',            'area' => 'Ingeniería Industrial',             'email' => 'industrial@itsmt.edu.mx',             'telefono' => '225 253 0108', 'extension' => '202', 'orden' => 11, 'firma_documentos' => false],
            ['nombre' => 'MC. FERMÍN ALFREDO CASTILLO FLORES',      'cargo' => 'Jefe de Carrera de Ingeniería en Gestión Empresarial','area' => 'Ingeniería en Gestión Empresarial', 'email' => 'gestionempresarial@itsmt.edu.mx',    'telefono' => '225 253 0108', 'extension' => '203', 'orden' => 12, 'firma_documentos' => false],
            ['nombre' => 'MC. NOEMY BAHENA CORREA',                 'cargo' => 'Jefa de Carrera de Ingeniería en Administración',     'area' => 'Ingeniería en Administración',      'email' => 'administracion@itsmt.edu.mx',         'telefono' => '225 253 0108', 'extension' => '204', 'orden' => 13, 'firma_documentos' => false],
            ['nombre' => 'MC. MARIO ÁLVAREZ MORALES',               'cargo' => 'Jefe de Carrera de Ingeniería Mecatrónica',           'area' => 'Ingeniería Mecatrónica',            'email' => 'mecatronica@itsmt.edu.mx',            'telefono' => '225 253 0108', 'extension' => '205', 'orden' => 14, 'firma_documentos' => false],
            ['nombre' => 'MC. YANIRA KRISELY HERNÁNDEZ MONTERO',    'cargo' => 'Jefa de Carrera de Ingeniería Civil',                 'area' => 'Ingeniería Civil',                  'email' => 'civil@itsmt.edu.mx',                  'telefono' => '225 253 0108', 'extension' => '206', 'orden' => 15, 'firma_documentos' => false],
            ['nombre' => 'MC. JAVIER MENDOZA GUTIÉRREZ',            'cargo' => 'Jefe de Carrera de Licenciatura en Administración',   'area' => 'Licenciatura en Administración',    'email' => 'ladministracion@itsmt.edu.mx',        'telefono' => '225 253 0108', 'extension' => '207', 'orden' => 16, 'firma_documentos' => false],

            // Departamentos Administrativos
            ['nombre' => 'LAE. LILIANA MARTÍNEZ TLÁLOC',            'cargo' => 'Jefa del Departamento de Recursos Humanos',          'area' => 'Recursos Humanos',                  'email' => 'rhumanos@itsmt.edu.mx',               'telefono' => '225 253 0108', 'extension' => '301', 'orden' => 20, 'firma_documentos' => false],
            ['nombre' => 'LCP. PATRICIA HERNÁNDEZ PÉREZ',           'cargo' => 'Jefa del Departamento de Contabilidad',              'area' => 'Contabilidad',                      'email' => 'contabilidad@itsmt.edu.mx',           'telefono' => '225 253 0108', 'extension' => '302', 'orden' => 21, 'firma_documentos' => false],
            ['nombre' => 'LCP. ANA LAURA ESTRADA MENDOZA',          'cargo' => 'Jefa del Departamento de Finanzas',                  'area' => 'Finanzas',                          'email' => 'finanzas@itsmt.edu.mx',               'telefono' => '225 253 0108', 'extension' => '303', 'orden' => 22, 'firma_documentos' => false],
            ['nombre' => 'ING. JORGE ARTURO SORIANO FLORES',        'cargo' => 'Jefe del Departamento de Servicios Escolares',       'area' => 'Servicios Escolares',               'email' => 'controlescolar@itsmt.edu.mx',         'telefono' => '225 253 0108', 'extension' => '304', 'orden' => 23, 'firma_documentos' => true],
            ['nombre' => 'MTRA. CLAUDIA MONSERRAT LANDA HERNÁNDEZ', 'cargo' => 'Jefa del Departamento de Desarrollo Académico',      'area' => 'Desarrollo Académico',              'email' => 'dacademico@itsmt.edu.mx',             'telefono' => '225 253 0108', 'extension' => '305', 'orden' => 24, 'firma_documentos' => false],
            ['nombre' => 'LIC. YADIRA HERNÁNDEZ BERNAL',            'cargo' => 'Jefa del Departamento de Comunicación y Difusión',   'area' => 'Comunicación y Difusión',           'email' => 'comunicacion@itsmt.edu.mx',           'telefono' => '225 253 0108', 'extension' => '306', 'orden' => 25, 'firma_documentos' => false],
            ['nombre' => 'MC. ERNESTO HERNÁNDEZ FLORES',            'cargo' => 'Jefe del Departamento de Actividades Extraescolares','area' => 'Actividades Extraescolares',        'email' => 'extraescolares@itsmt.edu.mx',         'telefono' => '225 253 0108', 'extension' => '307', 'orden' => 26, 'firma_documentos' => false],
            ['nombre' => 'ING. MARCOS IVÁN MORALES PÉREZ',          'cargo' => 'Jefe del Departamento de Tecnologías de la Información', 'area' => 'Tecnologías de la Información', 'email' => 'ti@itsmt.edu.mx',                   'telefono' => '225 253 0108', 'extension' => '308', 'orden' => 27, 'firma_documentos' => false],
            ['nombre' => 'LIC. REINA VERÓNICA HERNÁNDEZ BAUTISTA',  'cargo' => 'Jefa del Departamento de Vinculación',               'area' => 'Vinculación',                       'email' => 'vinculacion@itsmt.edu.mx',            'telefono' => '225 253 0108', 'extension' => '309', 'orden' => 28, 'firma_documentos' => false],
            ['nombre' => 'ING. CITLALI HERNÁNDEZ HERNÁNDEZ',        'cargo' => 'Jefa del Departamento de Biblioteca',                'area' => 'Biblioteca',                        'email' => 'biblioteca@itsmt.edu.mx',             'telefono' => '225 253 0108', 'extension' => '310', 'orden' => 29, 'firma_documentos' => false],
            ['nombre' => 'ING. GRISELDA CITLALI MORALES ROJAS',     'cargo' => 'Jefa del Departamento de Laboratorios',              'area' => 'Laboratorios',                      'email' => 'laboratorios@itsmt.edu.mx',           'telefono' => '225 253 0108', 'extension' => '311', 'orden' => 30, 'firma_documentos' => false],
            ['nombre' => 'MC. GABRIEL HERNÁNDEZ REYES',             'cargo' => 'Jefe del Departamento de Tutorías',                  'area' => 'Tutorías',                          'email' => 'tutorias@itsmt.edu.mx',               'telefono' => '225 253 0108', 'extension' => '312', 'orden' => 31, 'firma_documentos' => false],
            ['nombre' => 'MC. BLANCA ESTHER HERNÁNDEZ PÉREZ',       'cargo' => 'Jefa del Departamento de Posgrado e Investigación',  'area' => 'Posgrado e Investigación',          'email' => 'investigacion@itsmt.edu.mx',          'telefono' => '225 253 0108', 'extension' => '313', 'orden' => 32, 'firma_documentos' => false],
        ];

        foreach ($personas as $datos) {
            DirectorioPersonal::create(array_merge(['activo' => true], $datos));
        }
    }
}
