<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Materia;
use Illuminate\Database\Seeder;

class MateriasSeeder extends Seeder
{
    public function run(): void
    {
        // ── Asegurar carreras nuevas (no están en Sprint1Seeder) ───────────────
        $carrerasNuevas = [
            [
                'nombre'     => 'Ingeniería Mecatrónica',
                'clave'      => 'IMT',
                'codigo_it'  => '000',
                'plan_clave' => 'IMCT-2010-229',
            ],
            [
                'nombre'     => 'Ingeniería en Innovación Agrícola Sustentable',
                'clave'      => 'IAS',
                'codigo_it'  => '000',
                'plan_clave' => 'IIAS-2010-221',
            ],
            [
                'nombre'     => 'Ingeniería en Industrias Alimentarias',
                'clave'      => 'IAL',
                'codigo_it'  => '000',
                'plan_clave' => 'IIAL-2010-219',
            ],
        ];

        foreach ($carrerasNuevas as $datos) {
            Carrera::firstOrCreate(['clave' => $datos['clave']], $datos);
        }

        // ── Retículas por carrera ──────────────────────────────────────────────
        // Formato: ['nombre', 'clave_oficial_tecnm', semestre, ht, hp, creditos]
        $reticulas = [

            // ────────────────────────────────────────────────────────────────────
            // ISC – Ingeniería en Sistemas Computacionales (ISIC-2010-224)
            // ────────────────────────────────────────────────────────────────────
            'ISC' => [
                // Semestre 1
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Fundamentos de Programación',                  'AED-1285', 1, 2, 3, 5],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Matemáticas Discretas',                        'AEF-1041', 1, 3, 2, 5],
                ['Fundamentos de Administración',                'SCH-1024', 1, 1, 3, 4],
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                // Semestre 2
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Programación Orientada a Objetos',             'AED-1286', 2, 2, 3, 5],
                ['Contabilidad Financiera',                      'AEC-1008', 2, 2, 2, 4],
                ['Química',                                      'AEC-1058', 2, 2, 2, 4],
                ['Álgebra Lineal',                               'ACF-0903', 2, 3, 2, 5],
                ['Probabilidad y Estadística',                   'AEF-1052', 2, 3, 2, 5],
                // Semestre 3
                ['Cálculo Vectorial',                            'ACF-0904', 3, 3, 2, 5],
                ['Estructura de Datos',                          'AED-1026', 3, 2, 3, 5],
                ['Cultura Empresarial',                          'SCC-1005', 3, 2, 2, 4],
                ['Investigación de Operaciones',                 'SCC-1013', 3, 2, 2, 4],
                ['Desarrollo Sustentable',                       'ACD-0908', 3, 2, 3, 5],
                ['Física General',                               'SCF-1006', 3, 3, 2, 5],
                // Semestre 4
                ['Ecuaciones Diferenciales',                     'ACF-0905', 4, 3, 2, 5],
                ['Métodos Numéricos',                            'SCC-1017', 4, 2, 2, 4],
                ['Tópicos Avanzados de Programación',            'SCD-1027', 4, 2, 3, 5],
                ['Fundamentos de Base de Datos',                 'AEF-1031', 4, 3, 2, 5],
                ['Simulación',                                   'SCD-1022', 4, 2, 3, 5],
                ['Principios Eléctricos y Aplicaciones Digitales','SCD-1018',4, 2, 3, 5],
                // Semestre 5
                ['Graficación',                                  'SCC-1010', 5, 2, 2, 4],
                ['Fundamentos de Telecomunicaciones',            'AEC-1034', 5, 2, 2, 4],
                ['Sistemas Operativos',                          'AEC-1061', 5, 2, 2, 4],
                ['Taller de Base de Datos',                      'SCA-1025', 5, 0, 4, 4],
                ['Fundamentos de Ingeniería de Software',        'SCC-1007', 5, 2, 2, 4],
                ['Arquitectura de Computadoras',                 'SCD-1003', 5, 2, 3, 5],
                // Semestre 6
                ['Lenguajes y Autómatas I',                      'SCD-1015', 6, 2, 3, 5],
                ['Redes de Computadoras',                        'SCD-1021', 6, 2, 3, 5],
                ['Taller de Sistemas Operativos',                'SCA-1026', 6, 0, 4, 4],
                ['Administración de Base de Datos',              'SCB-1001', 6, 1, 4, 5],
                ['Ingeniería de Software',                       'SCD-1011', 6, 2, 3, 5],
                ['Lenguajes de Interfaz',                        'SCC-1014', 6, 2, 2, 4],
                // Semestre 7
                ['Lenguajes y Autómatas II',                     'SCD-1016', 7, 2, 3, 5],
                ['Administración de Redes',                      'SCD-1004', 7, 2, 3, 5],
                ['Taller de Investigación I',                    'ACA-0909', 7, 0, 4, 4],
                ['Gestión de Proyectos de Software',             'SCG-1009', 7, 3, 3, 6],
                ['Sistemas Programables',                        'SCC-1023', 7, 2, 2, 4],
                // Semestre 8
                ['Programación Lógica y Funcional',              'SCC-1019', 8, 2, 2, 4],
                ['Conmutación y Enrutamiento en Redes de Datos', 'SCA-1002', 8, 0, 4, 4],
                ['Taller de Investigación II',                   'ACA-0910', 8, 0, 4, 4],
                ['Programación Web',                             'AEB-1055', 8, 1, 4, 5],
                // Semestre 9
                ['Inteligencia Artificial',                      'SCC-1012', 9, 2, 2, 4],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IIN – Ingeniería Industrial (IIND-2010-227)
            // ────────────────────────────────────────────────────────────────────
            'IIN' => [
                // Semestre 1
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Taller de Herramientas Intelectuales',         'INH-1029', 1, 1, 3, 4],
                ['Química',                                      'INC-1025', 1, 2, 2, 4],
                ['Dibujo Industrial',                            'INN-1008', 1, 0, 6, 6],
                // Semestre 2
                ['Electricidad y Electrónica Industrial',        'INC-1009', 2, 2, 2, 4],
                ['Propiedades de los Materiales',                'INC-1024', 2, 2, 2, 4],
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Probabilidad y Estadística',                   'AEC-1053', 2, 2, 2, 4],
                ['Análisis de la Realidad Nacional',             'INQ-1006', 2, 1, 2, 3],
                ['Taller de Liderazgo',                         'INC-1030', 2, 2, 2, 4],
                // Semestre 3
                ['Metrología y Normalización',                   'AEC-1048', 3, 2, 2, 4],
                ['Álgebra Lineal',                               'ACF-0903', 3, 3, 2, 5],
                ['Cálculo Vectorial',                            'ACF-0904', 3, 3, 2, 5],
                ['Economía',                                     'AEC-1018', 3, 2, 2, 4],
                ['Estadística Inferencial I',                    'AEF-1024', 3, 3, 2, 5],
                ['Estudio del Trabajo I',                        'INJ-1011', 3, 4, 2, 6],
                // Semestre 4
                ['Procesos de Fabricación',                      'INC-1023', 4, 2, 2, 4],
                ['Física',                                       'INC-1013', 4, 2, 2, 4],
                ['Algoritmos y Lenguajes de Programación',       'INC-1005', 4, 2, 2, 4],
                ['Investigación de Operaciones I',               'INC-1018', 4, 2, 2, 4],
                ['Estadística Inferencial II',                   'AEF-1025', 4, 3, 2, 5],
                ['Estudio del Trabajo II',                       'INJ-1012', 4, 4, 2, 6],
                ['Higiene y Seguridad Industrial',               'INF-1016', 4, 3, 2, 5],
                // Semestre 5
                ['Administración de Proyectos',                  'INR-1003', 5, 2, 1, 3],
                ['Gestión de Costos',                            'AEC-1392', 5, 2, 2, 4],
                ['Administración de las Operaciones I',          'INC-1001', 5, 2, 2, 4],
                ['Investigación de Operaciones II',              'INC-1019', 5, 2, 2, 4],
                ['Control Estadístico de la Calidad',            'INF-1007', 5, 3, 2, 5],
                ['Ergonomía',                                    'INF-1010', 5, 3, 2, 5],
                ['Desarrollo Sustentable',                       'ACD-0908', 5, 2, 3, 5],
                // Semestre 6
                ['Taller de Investigación I',                    'ACA-0909', 6, 0, 4, 4],
                ['Ingeniería Económica',                         'AEC-1037', 6, 2, 2, 4],
                ['Administración de las Operaciones II',         'INC-1002', 6, 2, 2, 4],
                ['Simulación',                                   'INC-1027', 6, 2, 2, 4],
                ['Administración del Mantenimiento',             'INC-1004', 6, 2, 2, 4],
                ['Mercadotecnia',                                'AED-1044', 6, 2, 3, 5],
                // Semestre 7
                ['Taller de Investigación II',                   'ACA-0910', 7, 0, 4, 4],
                ['Planeación Financiera',                        'INC-1021', 7, 2, 2, 4],
                ['Planeación y Diseño de Instalaciones',         'INC-1022', 7, 2, 2, 4],
                ['Sistemas de Manufactura',                      'INF-1028', 7, 3, 2, 5],
                ['Logística y Cadenas de Suministro',            'INH-1020', 7, 1, 3, 4],
                ['Gestión de los Sistemas de Calidad',           'INC-1015', 7, 2, 2, 4],
                ['Ingeniería de Sistemas',                       'INR-1017', 7, 2, 1, 3],
                // Semestre 8
                ['Formulación y Evaluación de Proyectos',        'AED-1030', 8, 2, 3, 5],
                ['Relaciones Industriales',                      'INC-1026', 8, 2, 2, 4],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IGE – Ingeniería en Gestión Empresarial (IGEM-2009-201)
            // ────────────────────────────────────────────────────────────────────
            'IGE' => [
                // Semestre 1
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Desarrollo Humano',                            'GEC-0905', 1, 2, 2, 4],
                ['Fundamentos de Gestión Empresarial',           'AEF-1074', 1, 3, 2, 5],
                ['Fundamentos de Física',                        'GEC-0909', 1, 2, 2, 4],
                ['Fundamentos de Química',                       'GEF-0910', 1, 3, 2, 5],
                // Semestre 2
                ['Software de Aplicación Ejecutivo',             'AEB-1082', 2, 1, 4, 5],
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Contabilidad Orientada a los Negocios',        'GED-0903', 2, 2, 3, 5],
                ['Dinámica Social',                              'AEC-1014', 2, 2, 2, 4],
                ['Taller de Ética',                              'ACA-0907', 2, 0, 4, 4],
                ['Legislación Laboral',                          'GEE-0918', 2, 3, 1, 4],
                // Semestre 3
                ['Marco Legal de las Organizaciones',            'AEC-1078', 3, 2, 2, 4],
                ['Probabilidad y Estadística Descriptiva',       'GED-0921', 3, 2, 3, 5],
                ['Costos Empresariales',                         'GED-0904', 3, 2, 3, 5],
                ['Habilidades Directivas I',                     'GEC-0913', 3, 2, 2, 4],
                ['Economía Empresarial',                         'AEF-1071', 3, 3, 2, 5],
                ['Álgebra Lineal',                               'ACF-0903', 3, 3, 2, 5],
                // Semestre 4
                ['Ingeniería Económica',                         'GEF-0916', 4, 3, 2, 5],
                ['Estadística Inferencial I',                    'GEG-0907', 4, 3, 3, 6],
                ['Instrumentos de Presupuestación Empresarial',  'GED-0917', 4, 2, 3, 5],
                ['Habilidades Directivas II',                    'GEC-0914', 4, 2, 2, 4],
                ['Entorno Macroeconómico',                       'GEF-0906', 4, 3, 2, 5],
                ['Investigación de Operaciones',                 'AEF-1076', 4, 3, 2, 5],
                // Semestre 5
                ['Finanzas en las Organizaciones',               'AEF-1073', 5, 3, 2, 5],
                ['Estadística Inferencial II',                   'GEG-0908', 5, 3, 3, 6],
                ['Ingeniería de Procesos',                       'GEF-0915', 5, 3, 2, 5],
                ['Gestión del Capital Humano',                   'AEG-1075', 5, 3, 3, 6],
                ['Taller de Investigación I',                    'ACA-0909', 5, 0, 4, 4],
                ['Mercadotecnia',                                'GEF-0919', 5, 3, 2, 5],
                // Semestre 6
                ['Administración de la Salud y Seguridad Ocupacional', 'GEF-0901', 6, 3, 2, 5],
                ['El Emprendedor y la Innovación',               'AED-1072', 6, 2, 3, 5],
                ['Gestión de la Producción I',                   'GEC-0911', 6, 2, 2, 4],
                ['Diseño Organizacional',                        'AED-1015', 6, 2, 3, 5],
                ['Taller de Investigación II',                   'ACA-0910', 6, 0, 4, 4],
                ['Sistemas de Información de Mercadotecnia',     'GED-0922', 6, 2, 3, 5],
                // Semestre 7
                ['Calidad Aplicada a la Gestión Empresarial',    'AED-1069', 7, 2, 3, 5],
                ['Plan de Negocios',                             'GED-0920', 7, 2, 3, 5],
                ['Gestión de la Producción II',                  'GEC-0912', 7, 2, 2, 4],
                ['Gestión Estratégica',                          'AED-1035', 7, 2, 3, 5],
                ['Desarrollo Sustentable',                       'ACD-0908', 7, 2, 3, 5],
                ['Mercadotecnia Electrónica',                    'AEB-1045', 7, 1, 4, 5],
                // Semestre 8
                ['Cadena de Suministros',                        'GEF-0902', 8, 3, 2, 5],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IAM – Ingeniería Ambiental (IAMB-2010-206)
            // ────────────────────────────────────────────────────────────────────
            'IAM' => [
                // Semestre 1
                ['Química Inorgánica',                           'AEF-1060', 1, 3, 2, 5],
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Dibujo Asistido por Computadora',              'AMA-1004', 1, 0, 4, 4],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                ['Biología',                                     'AEF-1005', 1, 3, 2, 5],
                // Semestre 2
                ['Fundamentos de Química Orgánica',              'AEF-1033', 2, 3, 2, 5],
                ['Álgebra Lineal',                               'ACF-0903', 2, 3, 2, 5],
                ['Física',                                       'AMF-1009', 2, 3, 2, 5],
                ['Probabilidad y Estadística Ambiental',         'AMF-1019', 2, 3, 2, 5],
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Ecología',                                     'AMF-1006', 2, 3, 2, 5],
                // Semestre 3
                ['Química Analítica',                            'AEG-1059', 3, 3, 3, 6],
                ['Cálculo Vectorial',                            'ACF-0904', 3, 3, 2, 5],
                ['Diseño de Experimentos Ambientales',           'AMC-1005', 3, 2, 2, 4],
                ['Termodinámica',                                'AEF-1065', 3, 3, 2, 5],
                ['Economía Ambiental',                           'AMP-1007', 3, 3, 0, 3],
                ['Bioquímica',                                   'AEJ-1007', 3, 4, 2, 6],
                // Semestre 4
                ['Análisis Instrumental',                        'AMF-1001', 4, 3, 2, 5],
                ['Ecuaciones Diferenciales',                     'ACF-0905', 4, 3, 2, 5],
                ['Balance de Materia y Energía',                 'AEF-1004', 4, 3, 2, 5],
                ['Desarrollo Sustentable',                       'ACD-0908', 4, 2, 3, 5],
                ['Fisicoquímica I',                              'AMF-1010', 4, 3, 2, 5],
                ['Microbiología',                                'AEM-1050', 4, 2, 4, 6],
                // Semestre 5
                ['Fenómenos de Transporte',                      'AEF-1027', 5, 3, 2, 5],
                ['Sistemas de Información Geográfica',           'AMC-1022', 5, 2, 2, 4],
                ['Gestión Ambiental I',                          'AMF-1013', 5, 3, 2, 5],
                ['Mecánica de Fluidos',                          'AMF-1017', 5, 3, 2, 5],
                ['Fisicoquímica II',                             'AMF-1011', 5, 3, 2, 5],
                ['Toxicología Ambiental',                        'AMF-1023', 5, 3, 2, 5],
                // Semestre 6
                ['Taller de Investigación I',                    'ACA-0909', 6, 0, 4, 4],
                ['Contaminación Atmosférica',                    'AMF-1003', 6, 3, 2, 5],
                ['Gestión Ambiental II',                         'AMC-1014', 6, 2, 2, 4],
                ['Ingeniería de Costos',                         'AMC-1016', 6, 2, 2, 4],
                ['Gestión de Residuos',                          'AMG-1015', 6, 3, 3, 6],
                ['Componentes de Equipo Industrial',             'AMF-1002', 6, 3, 2, 5],
                // Semestre 7
                ['Taller de Investigación II',                   'ACA-0910', 7, 0, 4, 4],
                ['Potabilización de Agua',                       'AMG-1018', 7, 3, 3, 6],
                ['Evaluación de Impacto Ambiental',              'AMD-1008', 7, 2, 3, 5],
                ['Remediación de Suelos',                        'AMG-1020', 7, 3, 3, 6],
                // Semestre 8
                ['Seguridad e Higiene Industrial',               'AMC-1021', 8, 2, 2, 4],
                ['Fundamentos de Aguas Residuales',              'AMG-1012', 8, 3, 3, 6],
                ['Formulación y Evaluación de Proyectos',        'AEF-1029', 8, 3, 2, 5],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IMT – Ingeniería Mecatrónica (IMCT-2010-229)
            // ────────────────────────────────────────────────────────────────────
            'IMT' => [
                // Semestre 1
                ['Química',                                      'AEC-1058', 1, 2, 2, 4],
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Dibujo Asistido por Computadora',              'AEA-1013', 1, 0, 4, 4],
                ['Metrología y Normalización',                   'AEC-1047', 1, 2, 2, 4],
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                // Semestre 2
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Álgebra Lineal',                               'ACF-0903', 2, 3, 2, 5],
                ['Ciencia e Ingeniería de Materiales',           'MTF-1004', 2, 3, 2, 5],
                ['Programación Básica',                          'MTD-1024', 2, 2, 3, 5],
                ['Estadística y Control de Calidad',             'MTC-1014', 2, 2, 2, 4],
                ['Administración y Contabilidad',                'MTC-1001', 2, 2, 2, 4],
                // Semestre 3
                ['Cálculo Vectorial',                            'ACF-0904', 3, 3, 2, 5],
                ['Procesos de Fabricación',                      'MTC-1022', 3, 2, 2, 4],
                ['Electromagnetismo',                            'AEF-1020', 3, 3, 2, 5],
                ['Estática',                                     'MTC-1015', 3, 2, 2, 4],
                ['Métodos Numéricos',                            'AEC-1046', 3, 2, 2, 4],
                ['Desarrollo Sustentable',                       'ACD-0908', 3, 2, 3, 5],
                // Semestre 4
                ['Ecuaciones Diferenciales',                     'ACF-0905', 4, 3, 2, 5],
                ['Fundamentos de Termodinámica',                 'MTC-1017', 4, 2, 2, 4],
                ['Mecánica de Materiales',                       'MTJ-1020', 4, 4, 2, 6],
                ['Dinámica',                                     'MTC-1008', 4, 2, 2, 4],
                ['Análisis de Circuitos Eléctricos',             'MTJ-1002', 4, 4, 2, 6],
                // Semestre 5
                ['Máquinas Eléctricas',                          'AEF-1040', 5, 3, 2, 5],
                ['Electrónica Analógica',                        'MTJ-1011', 5, 4, 2, 6],
                ['Mecanismos',                                   'AED-1043', 5, 2, 3, 5],
                ['Análisis de Fluidos',                          'MTC-1003', 5, 2, 2, 4],
                ['Taller de Investigación I',                    'ACA-0909', 5, 0, 4, 4],
                // Semestre 6
                ['Electrónica de Potencia Aplicada',             'MTJ-1012', 6, 4, 2, 6],
                ['Instrumentación',                              'AEF-1038', 6, 3, 2, 5],
                ['Diseño de Elementos Mecánicos',                'MTF-1010', 6, 3, 2, 5],
                ['Electrónica Digital',                          'MTF-1013', 6, 3, 2, 5],
                ['Vibraciones Mecánicas',                        'AED-1067', 6, 2, 3, 5],
                ['Taller de Investigación II',                   'ACA-0910', 6, 0, 4, 4],
                // Semestre 7
                ['Dinámica de Sistemas',                         'MTF-1009', 7, 3, 2, 5],
                ['Manufactura Avanzada',                         'MTD-1019', 7, 2, 3, 5],
                ['Circuitos Hidráulicos y Neumáticos',           'MTG-1005', 7, 3, 3, 6],
                ['Mantenimiento',                                'MTF-1018', 7, 3, 2, 5],
                ['Microcontroladores',                           'MTF-1021', 7, 3, 2, 5],
                ['Programación Avanzada',                        'MTG-1023', 7, 3, 3, 6],
                // Semestre 8
                ['Control',                                      'MTJ-1006', 8, 4, 2, 6],
                ['Formulación y Evaluación de Proyectos',        'MTO-1016', 8, 0, 3, 3],
                ['Controladores Lógicos Programables',           'MTD-1007', 8, 2, 3, 5],
                // Semestre 9
                ['Robótica',                                     'MTF-1025', 9, 3, 2, 5],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IAS – Ingeniería en Innovación Agrícola Sustentable (IIAS-2010-221)
            // ────────────────────────────────────────────────────────────────────
            'IAS' => [
                // Semestre 1
                ['Álgebra Lineal',                               'ACF-0903', 1, 3, 2, 5],
                ['Química',                                      'AEF-1056', 1, 3, 2, 5],
                ['Taller de Elementos de Mecánica de Sólidos',   'ASQ-1023', 1, 1, 2, 3],
                ['Biología',                                     'ASF-1004', 1, 3, 2, 5],
                ['Tecnologías de la Información y las Comunicaciones', 'AEQ-1064', 1, 1, 2, 3],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                // Semestre 2
                ['Cálculo Diferencial',                          'ACF-0901', 2, 3, 2, 5],
                ['Química Analítica',                            'ASF-1019', 2, 3, 2, 5],
                ['Edafología',                                   'AEF-1019', 2, 3, 2, 5],
                ['Elementos de Termodinámica',                   'ASF-1009', 2, 3, 2, 5],
                ['Botánica Aplicada',                            'ASF-1006', 2, 3, 2, 5],
                ['Estadística',                                  'ASF-1010', 2, 3, 2, 5],
                // Semestre 3
                ['Cálculo Integral',                             'ACF-0902', 3, 3, 2, 5],
                ['Ecología',                                     'AEF-1017', 3, 3, 2, 5],
                ['Diseño Agrícola Asistido por Computadora',     'ASQ-1008', 3, 1, 2, 3],
                ['Bioquímica',                                   'AED-1006', 3, 2, 3, 5],
                ['Principios de Electromecánica',                'ASF-1018', 3, 3, 2, 5],
                ['Topografía',                                   'AEM-1066', 3, 2, 4, 6],
                ['Métodos Estadísticos',                         'ASF-1015', 3, 3, 2, 5],
                // Semestre 4
                ['Hidráulica',                                   'AEF-1036', 4, 3, 2, 5],
                ['Agroclimatología',                             'AEF-1001', 4, 3, 2, 5],
                ['Diseños Experimentales',                       'AEF-1016', 4, 3, 2, 5],
                ['Fisiología Vegetal',                           'ASF-1012', 4, 3, 2, 5],
                ['Microbiología',                                'AEF-1049', 4, 3, 2, 5],
                ['Base de Datos y Sistemas de Información Geográfica', 'ASC-1003', 4, 2, 2, 4],
                // Semestre 5
                ['Biología Molecular',                           'ASF-1005', 5, 3, 2, 5],
                ['Nutrición Vegetal',                            'ASF-1016', 5, 3, 2, 5],
                ['Sistemas de Producción Agrícola',              'ASD-1020', 5, 2, 3, 5],
                ['Entomología',                                  'AED-1023', 5, 2, 3, 5],
                ['Fitopatología',                                'AEJ-1028', 5, 4, 2, 6],
                ['Sistemas de Riego Superficial',                'ASF-1022', 5, 3, 2, 5],
                ['Desarrollo Sustentable',                       'ACD-0908', 5, 2, 3, 5],
                // Semestre 6
                ['Desarrollo Comunitario',                       'ASD-1007', 6, 2, 3, 5],
                ['Sistemas de Riego Presurizado',                'ASF-1021', 6, 3, 2, 5],
                ['Agroecología',                                 'AED-1002', 6, 2, 3, 5],
                ['Olericultura',                                 'ASF-1017', 6, 3, 2, 5],
                ['Introducción a la Agricultura Protegida',      'ASF-1014', 6, 3, 2, 5],
                ['Taller de Investigación I',                    'ACA-0909', 6, 0, 4, 4],
                // Semestre 7
                ['Agronegocios I',                               'ASD-1001', 7, 2, 3, 5],
                ['Inocuidad Alimentaria y Bioseguridad',         'ASC-1013', 7, 2, 2, 4],
                ['Fertirrigación',                               'ASF-1011', 7, 3, 2, 5],
                ['Taller de Investigación II',                   'ACA-0910', 7, 0, 4, 4],
                // Semestre 8
                ['Agronegocios II',                              'ASD-1002', 8, 2, 3, 5],
            ],

            // ────────────────────────────────────────────────────────────────────
            // IAL – Ingeniería en Industrias Alimentarias (IIAL-2010-219)
            // ────────────────────────────────────────────────────────────────────
            'IAL' => [
                // Semestre 1
                ['Biología',                                     'AEF-1005', 1, 3, 2, 5],
                ['Química Inorgánica',                           'ALF-1021', 1, 3, 2, 5],
                ['Cálculo Diferencial',                          'ACF-0901', 1, 3, 2, 5],
                ['Taller de Ética',                              'ACA-0907', 1, 0, 4, 4],
                ['Fundamentos de Investigación',                 'ACC-0906', 1, 2, 2, 4],
                ['Introducción a la Industria Alimentaria',      'ALR-1014', 1, 2, 1, 3],
                // Semestre 2
                ['Laboratorio de Química Analítica',             'ALB-1015', 2, 1, 4, 5],
                ['Química Orgánica',                             'ALF-1022', 2, 3, 2, 5],
                ['Cálculo Integral',                             'ACF-0902', 2, 3, 2, 5],
                ['Álgebra Lineal',                               'ACF-0903', 2, 3, 2, 5],
                ['Probabilidad y Estadística',                   'AEC-1081', 2, 2, 2, 4],
                ['Fundamentos de Física',                        'ALC-1010', 2, 2, 2, 4],
                // Semestre 3
                ['Bioquímica de Alimentos I',                    'ALF-1002', 3, 3, 2, 5],
                ['Ecuaciones Diferenciales',                     'ACF-0905', 3, 3, 2, 5],
                ['Termodinámica',                                'ALJ-1028', 3, 4, 2, 6],
                ['Análisis de Alimentos',                        'ALM-1001', 3, 2, 4, 6],
                ['Diseños Experimentales',                       'ALD-1007', 3, 2, 3, 5],
                ['Desarrollo Sustentable',                       'ACD-0908', 3, 2, 3, 5],
                // Semestre 4
                ['Bioquímica de Alimentos II',                   'ALF-1003', 4, 3, 2, 5],
                ['Taller de Investigación I',                    'ACA-0909', 4, 0, 4, 4],
                ['Flujo de Fluidos',                             'ALM-1009', 4, 2, 4, 6],
                ['Microbiología',                                'AEM-1050', 4, 2, 4, 6],
                ['Programación',                                 'ALA-1020', 4, 0, 4, 4],
                ['Taller de Control Estadístico de Procesos',    'ALA-1023', 4, 0, 4, 4],
                // Semestre 5
                ['Evaluación Sensorial',                         'ALF-1008', 5, 3, 2, 5],
                ['Tecnología de Frutas, Hortalizas y Confitería','AEM-1083', 5, 2, 4, 6],
                ['Microbiología de Alimentos',                   'ALM-1016', 5, 2, 4, 6],
                ['Operaciones de Transferencia de Calor',        'ALM-1017', 5, 2, 4, 6],
                ['Taller de Investigación II',                   'ACA-0910', 5, 0, 4, 4],
                ['Tecnología de Conservación',                   'ALM-1026', 5, 2, 4, 6],
                // Semestre 6
                ['Biotecnología',                                'ALG-1004', 6, 3, 3, 6],
                ['Gestión de la Calidad e Inocuidad Alimentaria','ALC-1011', 6, 2, 2, 4],
                ['Tecnología de Cárnicos',                       'ALM-1024', 6, 2, 4, 6],
                ['Innovación y Desarrollo de Nuevos Productos',  'ALA-1013', 6, 0, 4, 4],
                ['Operaciones de Transferencia de Masa',         'ALM-1018', 6, 2, 4, 6],
                // Semestre 7
                ['Tecnología de Lácteos',                        'ALM-1027', 7, 2, 4, 6],
                ['Operaciones Mecánicas',                        'ALM-1019', 7, 2, 4, 6],
                ['Tecnología de Cereales y Oleaginosas',         'ALM-1025', 7, 2, 4, 6],
                ['Diseño de Plantas Alimentarias',               'ALD-1005', 7, 2, 3, 5],
                ['Inducción a la Administración y Economía',     'ALC-1012', 7, 2, 2, 4],
                // Semestre 8
                ['Formulación y Evaluación de Proyectos',        'AEF-1029', 8, 3, 2, 5],
                ['Diseño e Impartición de Cursos Presenciales',  'ALH-1006', 8, 1, 3, 4],
            ],
        ];

        foreach ($reticulas as $carreraClave => $materias) {
            $carrera = Carrera::where('clave', $carreraClave)->firstOrFail();

            foreach ($materias as [$nombre, $claveOficial, $semestre, $ht, $hp, $creditos]) {
                $claveInterna = "{$carreraClave}-{$claveOficial}";

                Materia::firstOrCreate(
                    ['clave' => $claveInterna],
                    [
                        'carrera_id'          => $carrera->id,
                        'clave_oficial_tecnm' => $claveOficial,
                        'nombre'              => $nombre,
                        'semestre'            => $semestre,
                        'creditos'            => $creditos,
                        'horas_teoria'        => $ht,
                        'horas_practica'      => $hp,
                        'tipo'                => 'obligatoria',
                        'activa'              => true,
                    ]
                );
            }
        }
    }
}
