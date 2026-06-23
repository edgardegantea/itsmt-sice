<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Materia;
use Illuminate\Database\Seeder;

/**
 * Retícula IGEM-2009-201 — Ingeniería en Gestión Empresarial
 * Formato clave: H-P-C (horas_teoria - horas_practica - creditos)
 */
class MateriasIGEMSeeder extends Seeder
{
    public function run(): void
    {
        $carrera = Carrera::where('plan_clave', 'IGEM-2009-201')->first();

        if (! $carrera) {
            $this->command->error('No se encontró la carrera con plan_clave IGEM-2009-201. Ejecuta primero CarrerasSeeder.');
            return;
        }

        // Elimina materias previas de esta carrera para evitar duplicados
        Materia::where('carrera_id', $carrera->id)->forceDelete();

        $materias = [
            // ── Semestre 1 ──────────────────────────────────────────────────
            ['semestre' => 1, 'clave_oficial_tecnm' => 'ACC-0906', 'nombre' => 'Fundamentos de Investigación',       'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 1, 'clave_oficial_tecnm' => 'ACF-0901', 'nombre' => 'Cálculo Diferencial',                'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 1, 'clave_oficial_tecnm' => 'GEC-0905', 'nombre' => 'Desarrollo Humano',                  'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 1, 'clave_oficial_tecnm' => 'AEF-1074', 'nombre' => 'Fundamentos de Gestión Empresarial', 'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 1, 'clave_oficial_tecnm' => 'GEC-0909', 'nombre' => 'Fundamentos de Física',              'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 1, 'clave_oficial_tecnm' => 'GEF-0910', 'nombre' => 'Fundamentos de Química',             'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],

            // ── Semestre 2 ──────────────────────────────────────────────────
            ['semestre' => 2, 'clave_oficial_tecnm' => 'AEB-1082', 'nombre' => 'Software de Aplicación Ejecutivo',   'horas_teoria' => 1, 'horas_practica' => 4, 'creditos' => 5],
            ['semestre' => 2, 'clave_oficial_tecnm' => 'ACF-0902', 'nombre' => 'Cálculo Integral',                   'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 2, 'clave_oficial_tecnm' => 'GED-0903', 'nombre' => 'Contabilidad Orientada a los Negocios', 'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 2, 'clave_oficial_tecnm' => 'AEC-1014', 'nombre' => 'Dinámica Social',                    'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 2, 'clave_oficial_tecnm' => 'ACA-0907', 'nombre' => 'Taller de Ética',                    'horas_teoria' => 0, 'horas_practica' => 4, 'creditos' => 4],
            ['semestre' => 2, 'clave_oficial_tecnm' => 'GEE-0918', 'nombre' => 'Legislación Laboral',                'horas_teoria' => 3, 'horas_practica' => 1, 'creditos' => 4],

            // ── Semestre 3 ──────────────────────────────────────────────────
            ['semestre' => 3, 'clave_oficial_tecnm' => 'AEC-1078', 'nombre' => 'Marco Legal de las Organizaciones',  'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 3, 'clave_oficial_tecnm' => 'GED-0921', 'nombre' => 'Probabilidad y Estadística Descriptiva', 'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 3, 'clave_oficial_tecnm' => 'GED-0904', 'nombre' => 'Costos Empresariales',               'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 3, 'clave_oficial_tecnm' => 'GEC-0913', 'nombre' => 'Habilidades Directivas I',           'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 3, 'clave_oficial_tecnm' => 'AEF-1071', 'nombre' => 'Economía Empresarial',               'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 3, 'clave_oficial_tecnm' => 'ACF-0903', 'nombre' => 'Álgebra Lineal',                     'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],

            // ── Semestre 4 ──────────────────────────────────────────────────
            ['semestre' => 4, 'clave_oficial_tecnm' => 'GEF-0916', 'nombre' => 'Ingeniería Económica',               'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 4, 'clave_oficial_tecnm' => 'GEG-0907', 'nombre' => 'Estadística Inferencial I',          'horas_teoria' => 3, 'horas_practica' => 3, 'creditos' => 6],
            ['semestre' => 4, 'clave_oficial_tecnm' => 'GED-0917', 'nombre' => 'Instrumentos de Presupuestación Empresarial', 'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 4, 'clave_oficial_tecnm' => 'GEC-0914', 'nombre' => 'Habilidades Directivas II',          'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 4, 'clave_oficial_tecnm' => 'GEF-0906', 'nombre' => 'Entorno Macroeconómico',             'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 4, 'clave_oficial_tecnm' => 'AEF-1076', 'nombre' => 'Investigación de Operaciones',       'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],

            // ── Semestre 5 ──────────────────────────────────────────────────
            ['semestre' => 5, 'clave_oficial_tecnm' => 'AEF-1073', 'nombre' => 'Finanzas en las Organizaciones',     'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 5, 'clave_oficial_tecnm' => 'GEG-0908', 'nombre' => 'Estadística Inferencial II',         'horas_teoria' => 3, 'horas_practica' => 3, 'creditos' => 6],
            ['semestre' => 5, 'clave_oficial_tecnm' => 'GEF-0915', 'nombre' => 'Ingeniería de Procesos',             'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 5, 'clave_oficial_tecnm' => 'AEG-1075', 'nombre' => 'Gestión del Capital Humano',         'horas_teoria' => 3, 'horas_practica' => 3, 'creditos' => 6],
            ['semestre' => 5, 'clave_oficial_tecnm' => 'ACA-0909', 'nombre' => 'Taller de Investigación I',          'horas_teoria' => 0, 'horas_practica' => 4, 'creditos' => 4],
            ['semestre' => 5, 'clave_oficial_tecnm' => 'GEF-0919', 'nombre' => 'Mercadotecnia',                      'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],

            // ── Semestre 6 ──────────────────────────────────────────────────
            ['semestre' => 6, 'clave_oficial_tecnm' => 'GEF-0901', 'nombre' => 'Administración de la Salud y Seguridad Ocupacional', 'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
            ['semestre' => 6, 'clave_oficial_tecnm' => 'AED-1072', 'nombre' => 'El Emprendedor y la Innovación',     'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 6, 'clave_oficial_tecnm' => 'GEC-0911', 'nombre' => 'Gestión de la Producción I',         'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 6, 'clave_oficial_tecnm' => 'AED-1015', 'nombre' => 'Diseño Organizacional',              'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 6, 'clave_oficial_tecnm' => 'ACA-0910', 'nombre' => 'Taller de Investigación II',         'horas_teoria' => 0, 'horas_practica' => 4, 'creditos' => 4],
            ['semestre' => 6, 'clave_oficial_tecnm' => 'GED-0922', 'nombre' => 'Sistemas de Información de Mercadotecnia', 'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],

            // ── Semestre 7 ──────────────────────────────────────────────────
            ['semestre' => 7, 'clave_oficial_tecnm' => 'AED-1069', 'nombre' => 'Calidad Aplicada a la Gestión Empresarial', 'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 7, 'clave_oficial_tecnm' => 'GED-0920', 'nombre' => 'Plan de Negocios',                   'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 7, 'clave_oficial_tecnm' => 'GEC-0912', 'nombre' => 'Gestión de la Producción II',        'horas_teoria' => 2, 'horas_practica' => 2, 'creditos' => 4],
            ['semestre' => 7, 'clave_oficial_tecnm' => 'AED-1035', 'nombre' => 'Gestión Estratégica',                'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 7, 'clave_oficial_tecnm' => 'ACD-0908', 'nombre' => 'Desarrollo Sustentable',             'horas_teoria' => 2, 'horas_practica' => 3, 'creditos' => 5],
            ['semestre' => 7, 'clave_oficial_tecnm' => 'AEB-1045', 'nombre' => 'Mercadotecnia Electrónica',          'horas_teoria' => 1, 'horas_practica' => 4, 'creditos' => 5],

            // ── Semestre 8 — Especialidad ────────────────────────────────────
            ['semestre' => 8, 'clave_oficial_tecnm' => 'GEF-0902', 'nombre' => 'Cadena de Suministros',              'horas_teoria' => 3, 'horas_practica' => 2, 'creditos' => 5],
        ];

        foreach ($materias as $datos) {
            Materia::create(array_merge($datos, [
                'carrera_id' => $carrera->id,
                'clave'      => $datos['clave_oficial_tecnm'],
                'tipo'       => 'obligatoria',
                'activa'     => true,
            ]));
        }

        $this->command->info("✓ " . count($materias) . " materias creadas para {$carrera->nombre} ({$carrera->plan_clave}).");
    }
}
