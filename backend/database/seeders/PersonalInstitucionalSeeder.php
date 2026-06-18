<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PersonalInstitucionalSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('Itsmt2026!');

        $personal = [
            [
                'name'  => 'Dr. Isidro Rodríguez Montoro',
                'email' => 'direcciongeneral@martineztorre.tecnm.mx',
                'puesto'=> 'Director General',
                'roles' => ['admin'],
            ],
            [
                'name'  => 'M.A.P. Alberto Gómez Parra',
                'email' => 'dirplaneacion@martineztorre.tecnm.mx',
                'puesto'=> 'Director de Planeación y Vinculación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Dr. Hugo Alberto Bravo Quintero',
                'email' => 'diracademica@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Dirección Académica',
                'roles' => ['director_academico'],
            ],
            [
                'name'  => 'L.C. Alberto Portilla Flores',
                'email' => 'subadministrativa@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Subdirección de Servicios Administrativos',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Mtro. Fernando Alberto Hernández Guevara',
                'email' => 'subacademica@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Subdirección Académica',
                'roles' => ['director_academico'],
            ],
            [
                'name'  => 'Mtro. Omar Romero Sandoval',
                'email' => 'subpostgradoinvestigacion@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Subdirección de Posgrado e Investigación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'L.C. Víctor Manuel Loyo González',
                'email' => 'subplaneacion@martineztorre.tecnm.mx',
                'puesto'=> 'Subdirector de Planeación y Vinculación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'M.C.A. Enrique Avendaño Rodríguez',
                'email' => 'subvinculacion@martineztorre.tecnm.mx',
                'puesto'=> 'Subdirector de Vinculación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'M.A. Olga Lilia García Pérez',
                'email' => 'desacademico@martineztorre.tecnm.mx',
                'puesto'=> 'Jefa de Departamento de Desarrollo Académico',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Ing. Eloy Marcos Domínguez',
                'email' => 'sistemas@martineztorre.tecnm.mx',
                'puesto'=> 'Jefe de División de Ingeniería en Sistemas Computacionales',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Lic. Carmen Eugenia Barragán Trejo',
                'email' => 'empresarial@martineztorre.tecnm.mx',
                'puesto'=> 'Jefa de División de Ingeniería en Gestión Empresarial',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Mtra. Magnolia Teresa Nakase Rodríguez',
                'email' => 'alimentarias@martineztorre.tecnm.mx',
                'puesto'=> 'Encargada de la Jefatura de Ingeniería en Industrias Alimentarias',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Mtro. Enrico Zoe Excelente Toledo',
                'email' => 'agricola@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Jefatura de Ingeniería en Innovación Agrícola Sustentable',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Ing. Eliseo Hernández Aggi',
                'email' => 'industrial@martineztorre.tecnm.mx',
                'puesto'=> 'Encargado de la Jefatura de Ingeniería Industrial',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Ambiental',
                'email' => 'ambiental@martineztorre.tecnm.mx',
                'puesto'=> 'División de Ingeniería Ambiental',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'Mtro. Arnoldo Ladrón de Guevara',
                'email' => 'cienciasbasicas@martineztorre.tecnm.mx',
                'puesto'=> 'Ciencias Básicas',
                'roles' => ['docente'],
            ],
            [
                'name'  => 'Mecatrónica',
                'email' => 'mecatronica@martineztorre.tecnm.mx',
                'puesto'=> 'División de Ingeniería en Mecatrónica',
                'roles' => ['jefe_carrera'],
            ],
            [
                'name'  => 'L.A.E. Celia Yasmín Andrade González',
                'email' => 'rechumanos@martineztorre.tecnm.mx',
                'puesto'=> 'Jefa del Departamento de Personal',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Lic. Karla Yamileth Cárdenas',
                'email' => 'recfinancieros@martineztorre.tecnm.mx',
                'puesto'=> 'Encargada del Departamento de Recursos Financieros',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Lic. César Francisco Vera Ventura',
                'email' => 'recmateriales@martineztorre.tecnm.mx',
                'puesto'=> 'Jefe del Departamento de Recursos Materiales',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Mtra. Sara Alicia González Bravo',
                'email' => 'servescolares@martineztorre.tecnm.mx',
                'puesto'=> 'Encargada del Departamento de Control Escolar',
                'roles' => ['admin'],
            ],
            [
                'name'  => 'Lic. Idalia Andrade Cardeña',
                'email' => 'gyv@martineztorre.tecnm.mx',
                'puesto'=> 'Encargada del Departamento de Gestión y Vinculación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Lic. Ulises Ramírez Seceña',
                'email' => 'difusion@martineztorre.tecnm.mx',
                'puesto'=> 'Jefe de Departamento de Difusión y Concertación',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Ing. Mónica Yaredi Juárez Pacheco',
                'email' => 'servicioyresidencia@martineztorre.tecnm.mx',
                'puesto'=> 'Jefa de Departamento de Residencias Profesionales y Servicio Social',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'Ing. Enrique Javier Guzmán de la Cruz',
                'email' => 'enrique.gc@martineztorre.tecnm.mx',
                'puesto'=> 'Departamento de Tecnologías',
                'roles' => ['personal_administrativo'],
            ],
            [
                'name'  => 'L.I.I. Guadalupe Castillo Cristen',
                'email' => 'administracioncle@martineztorre.tecnm.mx',
                'puesto'=> 'Coordinadora de Lenguas Extranjeras',
                'roles' => ['personal_administrativo'],
            ],
        ];

        foreach ($personal as $datos) {
            $user = User::firstOrCreate(
                ['email' => $datos['email']],
                [
                    'name'     => $datos['name'],
                    'password' => $password,
                ]
            );

            $user->syncRoles($datos['roles']);
        }

        $this->command->info('26 usuarios del personal institucional registrados correctamente.');
    }
}
