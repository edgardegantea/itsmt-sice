<?php

namespace Database\Seeders;

use App\Domains\Institucional\Models\DirectorioArea;
use App\Domains\Institucional\Models\DirectorioPuesto;
use App\Domains\Institucional\Models\DirectorioPersonal;
use Illuminate\Database\Seeder;

class DirectorioAreasPuestosSeeder extends Seeder
{
    public function run(): void
    {
        // ── Áreas ────────────────────────────────────────────────────────────────
        $areas = [
            ['nombre' => 'Administración General',               'tipo' => 'administracion', 'orden' => 1],
            ['nombre' => 'Subdirección Académica',               'tipo' => 'administracion', 'orden' => 2],
            ['nombre' => 'Ingeniería en Sistemas Computacionales','tipo' => 'academico',      'orden' => 10],
            ['nombre' => 'Ingeniería Industrial',                 'tipo' => 'academico',      'orden' => 11],
            ['nombre' => 'Ingeniería en Gestión Empresarial',     'tipo' => 'academico',      'orden' => 12],
            ['nombre' => 'Ingeniería en Administración',          'tipo' => 'academico',      'orden' => 13],
            ['nombre' => 'Ingeniería Mecatrónica',                'tipo' => 'academico',      'orden' => 14],
            ['nombre' => 'Ingeniería Civil',                      'tipo' => 'academico',      'orden' => 15],
            ['nombre' => 'Licenciatura en Administración',        'tipo' => 'academico',      'orden' => 16],
            ['nombre' => 'Recursos Humanos',                      'tipo' => 'departamento',   'orden' => 20],
            ['nombre' => 'Contabilidad',                          'tipo' => 'departamento',   'orden' => 21],
            ['nombre' => 'Finanzas',                              'tipo' => 'departamento',   'orden' => 22],
            ['nombre' => 'Servicios Escolares',                   'tipo' => 'departamento',   'orden' => 23],
            ['nombre' => 'Desarrollo Académico',                  'tipo' => 'departamento',   'orden' => 24],
            ['nombre' => 'Comunicación y Difusión',               'tipo' => 'departamento',   'orden' => 25],
            ['nombre' => 'Actividades Extraescolares',            'tipo' => 'departamento',   'orden' => 26],
            ['nombre' => 'Tecnologías de la Información',         'tipo' => 'departamento',   'orden' => 27],
            ['nombre' => 'Vinculación',                           'tipo' => 'departamento',   'orden' => 28],
            ['nombre' => 'Biblioteca',                            'tipo' => 'departamento',   'orden' => 29],
            ['nombre' => 'Laboratorios',                          'tipo' => 'departamento',   'orden' => 30],
            ['nombre' => 'Tutorías',                              'tipo' => 'departamento',   'orden' => 31],
            ['nombre' => 'Posgrado e Investigación',              'tipo' => 'departamento',   'orden' => 32],
        ];

        foreach ($areas as $datos) {
            DirectorioArea::firstOrCreate(
                ['nombre' => $datos['nombre']],
                array_merge($datos, ['activo' => true])
            );
        }

        $areaMap = DirectorioArea::pluck('id', 'nombre');

        // ── Puestos ───────────────────────────────────────────────────────────────
        $puestos = [
            [
                'nombre'           => 'Director General',
                'area'             => 'Administración General',
                'firma_documentos' => true,
                'orden'            => 1,
                'descripcion'      => 'Responsable de la dirección estratégica del instituto.',
                'funciones'        => "- Representar legalmente al instituto.\n- Coordinar las actividades de las subdirecciones.\n- Emitir documentos oficiales con firma y sello.",
            ],
            [
                'nombre'           => 'Subdirector de Planeación y Vinculación',
                'area'             => 'Administración General',
                'firma_documentos' => true,
                'orden'            => 2,
                'descripcion'      => 'Responsable de la planeación institucional y vinculación con el sector productivo.',
                'funciones'        => "- Elaborar el plan de desarrollo institucional.\n- Gestionar convenios con empresas e instituciones.\n- Coordinar proyectos de vinculación.",
            ],
            [
                'nombre'           => 'Subdirector Administrativo',
                'area'             => 'Administración General',
                'firma_documentos' => true,
                'orden'            => 3,
                'descripcion'      => 'Responsable del área administrativa y financiera del instituto.',
                'funciones'        => "- Supervisar los recursos humanos, financieros y materiales.\n- Autorizar pagos y contratos administrativos.\n- Coordinar los departamentos administrativos.",
            ],
            [
                'nombre'           => 'Subdirector Académico',
                'area'             => 'Subdirección Académica',
                'firma_documentos' => true,
                'orden'            => 4,
                'descripcion'      => 'Responsable de coordinar y supervisar las actividades académicas del instituto.',
                'funciones'        => "- Coordinar los programas educativos.\n- Supervisar la labor docente.\n- Firmar documentos académicos oficiales como constancias y cargas académicas.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería en Sistemas Computacionales',
                'area'             => 'Ingeniería en Sistemas Computacionales',
                'firma_documentos' => false, 'orden' => 10,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de ISC.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería Industrial',
                'area'             => 'Ingeniería Industrial',
                'firma_documentos' => false, 'orden' => 11,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de II.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería en Gestión Empresarial',
                'area'             => 'Ingeniería en Gestión Empresarial',
                'firma_documentos' => false, 'orden' => 12,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de IGE.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería en Administración',
                'area'             => 'Ingeniería en Administración',
                'firma_documentos' => false, 'orden' => 13,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de IA.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería Mecatrónica',
                'area'             => 'Ingeniería Mecatrónica',
                'firma_documentos' => false, 'orden' => 14,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de IM.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Ingeniería Civil',
                'area'             => 'Ingeniería Civil',
                'firma_documentos' => false, 'orden' => 15,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de IC.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe de Carrera de Licenciatura en Administración',
                'area'             => 'Licenciatura en Administración',
                'firma_documentos' => false, 'orden' => 16,
                'descripcion'      => 'Responsable académico y administrativo de la carrera de LA.',
                'funciones'        => "- Coordinar al personal docente de la carrera.\n- Gestionar el desarrollo curricular.\n- Atender a los estudiantes de la carrera.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Recursos Humanos',
                'area'             => 'Recursos Humanos',
                'firma_documentos' => false, 'orden' => 20,
                'descripcion'      => 'Responsable de la administración del personal del instituto.',
                'funciones'        => "- Gestionar contrataciones y bajas de personal.\n- Administrar nómina y prestaciones.\n- Coordinar evaluaciones de desempeño.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Contabilidad',
                'area'             => 'Contabilidad',
                'firma_documentos' => false, 'orden' => 21,
                'descripcion'      => 'Responsable de la contabilidad y registros financieros.',
                'funciones'        => "- Llevar los registros contables del instituto.\n- Elaborar estados financieros.\n- Gestionar el presupuesto por área.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Finanzas',
                'area'             => 'Finanzas',
                'firma_documentos' => false, 'orden' => 22,
                'descripcion'      => 'Responsable de las finanzas y flujo de recursos económicos.',
                'funciones'        => "- Administrar los ingresos y egresos del instituto.\n- Elaborar reportes financieros.\n- Gestionar cuentas bancarias institucionales.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Servicios Escolares',
                'area'             => 'Servicios Escolares',
                'firma_documentos' => true,
                'orden'            => 23,
                'descripcion'      => 'Responsable del control escolar y la gestión de expedientes de alumnos.',
                'funciones'        => "- Gestionar inscripciones y reinscripciones.\n- Emitir constancias, credenciales y documentos escolares.\n- Administrar los expedientes de alumnos.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Desarrollo Académico',
                'area'             => 'Desarrollo Académico',
                'firma_documentos' => false, 'orden' => 24,
                'descripcion'      => 'Responsable de los programas de formación y desarrollo docente.',
                'funciones'        => "- Coordinar capacitaciones y cursos para docentes.\n- Gestionar programas de actualización académica.\n- Evaluar el desempeño académico institucional.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Comunicación y Difusión',
                'area'             => 'Comunicación y Difusión',
                'firma_documentos' => false, 'orden' => 25,
                'descripcion'      => 'Responsable de la comunicación institucional y difusión de actividades.',
                'funciones'        => "- Gestionar redes sociales y sitio web.\n- Difundir eventos y logros institucionales.\n- Coordinar imagen institucional.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Actividades Extraescolares',
                'area'             => 'Actividades Extraescolares',
                'firma_documentos' => false, 'orden' => 26,
                'descripcion'      => 'Responsable de actividades deportivas, culturales y recreativas.',
                'funciones'        => "- Organizar torneos y eventos deportivos.\n- Coordinar actividades culturales y artísticas.\n- Gestionar programas de bienestar estudiantil.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Tecnologías de la Información',
                'area'             => 'Tecnologías de la Información',
                'firma_documentos' => false, 'orden' => 27,
                'descripcion'      => 'Responsable de la infraestructura tecnológica del instituto.',
                'funciones'        => "- Administrar servidores y redes del instituto.\n- Gestionar sistemas de información.\n- Dar soporte técnico al personal y alumnos.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Vinculación',
                'area'             => 'Vinculación',
                'firma_documentos' => false, 'orden' => 28,
                'descripcion'      => 'Responsable de la vinculación con el sector productivo y social.',
                'funciones'        => "- Coordinar estadías y residencias profesionales.\n- Gestionar convenios con empresas.\n- Organizar ferias de empleo y bolsa de trabajo.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Biblioteca',
                'area'             => 'Biblioteca',
                'firma_documentos' => false, 'orden' => 29,
                'descripcion'      => 'Responsable del acervo bibliográfico y servicios de biblioteca.',
                'funciones'        => "- Administrar el acervo bibliográfico físico y digital.\n- Gestionar préstamos de materiales.\n- Coordinar servicios de información académica.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Laboratorios',
                'area'             => 'Laboratorios',
                'firma_documentos' => false, 'orden' => 30,
                'descripcion'      => 'Responsable de los laboratorios y talleres del instituto.',
                'funciones'        => "- Administrar equipos y materiales de laboratorio.\n- Coordinar el uso y mantenimiento de talleres.\n- Gestionar insumos y reactivos.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Tutorías',
                'area'             => 'Tutorías',
                'firma_documentos' => false, 'orden' => 31,
                'descripcion'      => 'Responsable del programa institucional de tutorías.',
                'funciones'        => "- Coordinar el programa de tutorías académicas.\n- Dar seguimiento a alumnos en riesgo de reprobación.\n- Gestionar la asignación de tutores.",
            ],
            [
                'nombre'           => 'Jefe del Departamento de Posgrado e Investigación',
                'area'             => 'Posgrado e Investigación',
                'firma_documentos' => false, 'orden' => 32,
                'descripcion'      => 'Responsable de los programas de posgrado e investigación científica.',
                'funciones'        => "- Coordinar los programas de maestría y especialidad.\n- Gestionar proyectos de investigación.\n- Administrar publicaciones y producción científica.",
            ],
        ];

        foreach ($puestos as $datos) {
            $area   = $datos['area'];
            $areaId = $areaMap[$area] ?? null;
            unset($datos['area']);

            DirectorioPuesto::firstOrCreate(
                ['nombre' => $datos['nombre']],
                array_merge($datos, ['area_id' => $areaId, 'activo' => true])
            );
        }

        // ── Enlazar directorio_personal existente con area_id y puesto_id ─────
        $puestoMap = DirectorioPuesto::pluck('id', 'nombre');

        DirectorioPersonal::all()->each(function ($p) use ($areaMap, $puestoMap) {
            $areaId   = $areaMap[$p->area]   ?? null;
            $puestoId = $puestoMap[$p->cargo] ?? null;
            $p->update(['area_id' => $areaId, 'puesto_id' => $puestoId]);
        });
    }
}
