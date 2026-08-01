<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PlaneacionDocente;
use Illuminate\Database\Seeder;

/** Siembra 3 instrumentaciones didácticas completas (todas las fases con contenido, listas
 * para "Revisar y enviar") sobre cargas académicas reales del periodo activo, para poder
 * probar el editor, la vista de "Mis asignaturas" y la revisión sin capturar todo a mano. */
class PlaneacionDocenteDemoSeeder extends Seeder
{
    public function run(): void
    {
        $periodo = Periodo::activo();
        if (! $periodo) {
            $this->command?->warn('No hay periodo activo — no se sembraron planeaciones de demo.');
            return;
        }

        $cargasConPlaneacion = PlaneacionDocente::where('periodo_id', $periodo->id)->pluck('carga_academica_id');

        $cargas = CargaAcademica::where('periodo_id', $periodo->id)
            ->whereNotIn('id', $cargasConPlaneacion)
            ->inRandomOrder()
            ->limit(3)
            ->get();

        if ($cargas->count() < 3) {
            // Si ya no quedan cargas sin planeación, reutiliza cualquier carga del periodo
            // para poder re-sembrar (updateOrCreate) sin fallar por falta de disponibles.
            $cargas = CargaAcademica::where('periodo_id', $periodo->id)->inRandomOrder()->limit(3)->get();
        }

        foreach ($cargas as $i => $carga) {
            PlaneacionDocente::updateOrCreate(
                ['carga_academica_id' => $carga->id, 'periodo_id' => $periodo->id],
                [
                    'docente_id'             => $carga->docente_id,
                    'estatus'                => 'borrador',
                    'caracterizacion'        => 'Esta asignatura aporta al perfil profesional del egresado desarrollando el pensamiento analítico y la capacidad de resolver problemas propios de la disciplina, sirviendo de base para asignaturas subsecuentes del plan de estudios.',
                    'intencion_didactica'    => 'Se abordan los contenidos partiendo de casos y problemas reales, fomentando el trabajo colaborativo y el uso de herramientas tecnológicas, con evaluación formativa continua a lo largo del curso.',
                    'competencia_asignatura' => 'El estudiante analiza, interpreta y resuelve problemas de la disciplina aplicando los fundamentos teóricos y metodológicos revisados en el curso, comunicando sus resultados de forma clara y fundamentada.',
                    'competencias'           => $this->competencias(),
                    'calendarizacion'        => $this->calendarizacion(),
                ]
            );

            $this->command?->info("Planeación demo #{$i} sembrada para carga {$carga->id}.");
        }
    }

    /** Dos unidades completas: todas las subsecciones (indicadores, niveles de desempeño,
     * matriz de evaluación, fuentes, apoyos, prácticas, dosificación) llevan contenido para
     * que las 5 categorías del "análisis por competencias" y las 4 fases queden en verde. */
    private function competencias(): array
    {
        return [
            [
                'numero'        => 1,
                'nombre_unidad' => 'Fundamentos y conceptos básicos',
                'porcentaje'    => 50,
                'descripcion'   => 'Identifica y describe los conceptos fundamentales de la unidad, estableciendo relaciones entre ellos.',
                'subtemas' => [
                    ['texto' => 'Introducción y definiciones', 'fila' => 1],
                    ['texto' => 'Principios fundamentales', 'fila' => 1],
                    ['texto' => 'Aplicaciones básicas', 'fila' => 2],
                ],
                'actividades' => [
                    [
                        'numero' => 1,
                        'actividad_ensenanza'   => 'Exposición de conceptos mediante ejemplos guiados y discusión grupal.',
                        'actividad_aprendizaje' => 'Investigación previa de conceptos clave y elaboración de mapa conceptual.',
                        'horas_teoricas'  => 6,
                        'horas_practicas' => 2,
                    ],
                    [
                        'numero' => 2,
                        'actividad_ensenanza'   => 'Resolución de casos prácticos en equipo con retroalimentación inmediata.',
                        'actividad_aprendizaje' => 'Resolución individual de ejercicios de aplicación.',
                        'horas_teoricas'  => 2,
                        'horas_practicas' => 4,
                    ],
                ],
                'competencias_genericas' => ['Capacidad de análisis y síntesis', 'Solución de problemas'],
                'indicadores_alcance' => [
                    ['letra' => 'A', 'indicador' => 'Define correctamente los conceptos fundamentales', 'valor' => 40],
                    ['letra' => 'B', 'indicador' => 'Relaciona los conceptos con casos de aplicación', 'valor' => 60],
                ],
                'niveles_desempeno' => [
                    ['nivel' => 'Excelente',    'indicadores' => 'Define, relaciona y aplica todos los conceptos sin apoyo.'],
                    ['nivel' => 'Notable',      'indicadores' => 'Define y relaciona los conceptos con mínimo apoyo.'],
                    ['nivel' => 'Bueno',        'indicadores' => 'Define los conceptos y requiere apoyo para relacionarlos.'],
                    ['nivel' => 'Suficiente',   'indicadores' => 'Define parcialmente los conceptos básicos.'],
                    ['nivel' => 'Insuficiente', 'indicadores' => 'No logra definir los conceptos fundamentales.'],
                ],
                'matriz_evaluacion' => [
                    ['evidencia' => 'Mapa conceptual', 'porcentaje' => 30, 'indicadores' => ['A'], 'evaluacion_formativa' => 'Retroalimentación escrita antes del examen parcial.'],
                    ['evidencia' => 'Examen escrito',  'porcentaje' => 70, 'indicadores' => ['A', 'B'], 'evaluacion_formativa' => 'Revisión grupal de reactivos con mayor error.'],
                ],
                'fuentes_informacion' => [
                    ['fuente' => 'Libro de texto oficial de la asignatura, edición vigente', 'tipo' => 'Impresa'],
                    ['fuente' => 'Repositorio institucional de apuntes y guías', 'tipo' => 'Electrónica'],
                ],
                'apoyos_didacticos' => ['Presentaciones digitales', 'Pizarrón', 'Guías de laboratorio'],
                'practicas' => [
                    ['nombre' => 'Práctica introductoria de laboratorio', 'requisitos' => 'Bata y equipo de seguridad', 'semana' => '3', 'lugar' => 'Laboratorio 1'],
                ],
                'dosificacion' => [
                    ['subtema' => 'Introducción y definiciones', 'semana_inicio' => 1, 'semana_fin' => 2, 'semana_realizado' => 2],
                    ['subtema' => 'Principios fundamentales',    'semana_inicio' => 2, 'semana_fin' => 3, 'semana_realizado' => 3],
                    ['subtema' => 'Aplicaciones básicas',        'semana_inicio' => 3, 'semana_fin' => 4, 'semana_realizado' => null],
                ],
            ],
            [
                'numero'        => 2,
                'nombre_unidad' => 'Aplicación y análisis avanzado',
                'porcentaje'    => 50,
                'descripcion'   => 'Aplica los fundamentos de la unidad anterior en la resolución de problemas de mayor complejidad.',
                'subtemas' => [
                    ['texto' => 'Modelado del problema', 'fila' => 1],
                    ['texto' => 'Métodos de solución', 'fila' => 2],
                    ['texto' => 'Validación de resultados', 'fila' => 2],
                ],
                'actividades' => [
                    [
                        'numero' => 1,
                        'actividad_ensenanza'   => 'Presentación de un caso integrador y guía para su modelado.',
                        'actividad_aprendizaje' => 'Planteamiento por equipos del modelo del problema asignado.',
                        'horas_teoricas'  => 4,
                        'horas_practicas' => 2,
                    ],
                    [
                        'numero' => 2,
                        'actividad_ensenanza'   => 'Asesoría por equipos para la validación de resultados obtenidos.',
                        'actividad_aprendizaje' => 'Resolución del caso integrador y elaboración de reporte final.',
                        'horas_teoricas'  => 2,
                        'horas_practicas' => 6,
                    ],
                ],
                'competencias_genericas' => ['Capacidad de aplicar los conocimientos en la práctica', 'Trabajo en equipo'],
                'indicadores_alcance' => [
                    ['letra' => 'A', 'indicador' => 'Modela correctamente el problema planteado', 'valor' => 50],
                    ['letra' => 'B', 'indicador' => 'Valida los resultados obtenidos con criterios técnicos', 'valor' => 50],
                ],
                'niveles_desempeno' => [
                    ['nivel' => 'Excelente',    'indicadores' => 'Modela, resuelve y valida el problema de forma autónoma.'],
                    ['nivel' => 'Notable',      'indicadores' => 'Modela y resuelve el problema con mínima asesoría.'],
                    ['nivel' => 'Bueno',        'indicadores' => 'Modela el problema y requiere apoyo en la validación.'],
                    ['nivel' => 'Suficiente',   'indicadores' => 'Modela parcialmente el problema planteado.'],
                    ['nivel' => 'Insuficiente', 'indicadores' => 'No logra modelar el problema planteado.'],
                ],
                'matriz_evaluacion' => [
                    ['evidencia' => 'Reporte del caso integrador', 'porcentaje' => 60, 'indicadores' => ['A', 'B'], 'evaluacion_formativa' => 'Retroalimentación por equipo antes de la entrega final.'],
                    ['evidencia' => 'Exposición oral',             'porcentaje' => 40, 'indicadores' => ['B'], 'evaluacion_formativa' => 'Coevaluación entre equipos.'],
                ],
                'fuentes_informacion' => [
                    ['fuente' => 'Artículos técnicos seleccionados por el docente', 'tipo' => 'Electrónica'],
                ],
                'apoyos_didacticos' => ['Software especializado', 'Proyector / cañón', 'Rúbricas y listas de cotejo'],
                'practicas' => [
                    ['nombre' => 'Caso integrador aplicado', 'requisitos' => 'Equipo de cómputo con software instalado', 'semana' => '10', 'lugar' => 'Laboratorio de cómputo'],
                ],
                'dosificacion' => [
                    ['subtema' => 'Modelado del problema',    'semana_inicio' => 9,  'semana_fin' => 10, 'semana_realizado' => null],
                    ['subtema' => 'Métodos de solución',      'semana_inicio' => 10, 'semana_fin' => 12, 'semana_realizado' => null],
                    ['subtema' => 'Validación de resultados', 'semana_inicio' => 12, 'semana_fin' => 13, 'semana_realizado' => null],
                ],
            ],
        ];
    }

    /** 16 semanas fijas con evaluaciones distribuidas: diagnóstica al inicio, formativas a
     * mitad de cada unidad y sumativas al cierre de cada parcial. */
    private function calendarizacion(): array
    {
        $tipos = [
            1 => 'ED', 4 => 'EF', 8 => 'ES',
            10 => 'EF', 13 => 'EF', 16 => 'ES',
        ];

        return collect(range(1, 16))->map(fn ($semana) => [
            'semana'         => $semana,
            'tipo_evaluacion' => $tipos[$semana] ?? '',
            'tp' => in_array($semana, [1, 4, 8, 10, 13, 16]),
            'tr' => $semana <= 8,
            'sd' => in_array($semana, [8, 16]),
        ])->all();
    }
}
