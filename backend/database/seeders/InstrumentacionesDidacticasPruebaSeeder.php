<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PlaneacionDocente;
use Illuminate\Database\Seeder;

/**
 * Siembra 5 instrumentaciones didácticas (planeaciones docentes) completas sobre
 * cargas académicas reales del periodo activo, cada una con:
 *   - 2 unidades, con ≥5 temas (subtemas) por unidad
 *   - ≥3 actividades de enseñanza y ≥3 actividades de aprendizaje por unidad
 *   - ≥3 evidencias de aprendizaje (matriz de evaluación) por unidad
 *   - ≥1 práctica por unidad
 *   - fuentes de información (bibliografía) y apoyos didácticos (material de apoyo)
 *   - indicadores de alcance, niveles de desempeño y dosificación por semana
 *
 * Pensada para probar el editor de planeación, "Mis asignaturas" y el flujo de
 * revisión (Desarrollo Académico / Jefatura) con datos ya completos y listos
 * para "Enviar a revisión", sin tener que capturar todo a mano.
 */
class InstrumentacionesDidacticasPruebaSeeder extends Seeder
{
    public function run(): void
    {
        $periodo = Periodo::activo();
        if (! $periodo) {
            $this->command?->warn('No hay periodo activo — no se sembraron instrumentaciones de prueba.');
            return;
        }

        $cargasConPlaneacion = PlaneacionDocente::where('periodo_id', $periodo->id)->pluck('carga_academica_id');

        $cargas = CargaAcademica::where('periodo_id', $periodo->id)
            ->whereNotIn('id', $cargasConPlaneacion)
            ->inRandomOrder()
            ->limit(5)
            ->get();

        if ($cargas->count() < 5) {
            // Si no hay 5 cargas libres, reutiliza cualquier carga del periodo para poder
            // re-sembrar (updateOrCreate) sin fallar por falta de disponibles.
            $cargas = CargaAcademica::where('periodo_id', $periodo->id)->inRandomOrder()->limit(5)->get();
        }

        if ($cargas->isEmpty()) {
            $this->command?->warn('No hay cargas académicas en el periodo activo — no se sembraron instrumentaciones de prueba.');
            return;
        }

        foreach ($cargas as $i => $carga) {
            PlaneacionDocente::updateOrCreate(
                ['carga_academica_id' => $carga->id, 'periodo_id' => $periodo->id],
                [
                    'docente_id'             => $carga->docente_id,
                    'estatus'                => 'borrador',
                    'caracterizacion'        => 'Esta asignatura contribuye al perfil profesional del egresado al desarrollar el pensamiento analítico, la capacidad de resolver problemas propios de la disciplina y las bases metodológicas requeridas para asignaturas subsecuentes del plan de estudios.',
                    'intencion_didactica'    => 'Los contenidos se abordan partiendo de casos y problemas reales, fomentando el trabajo colaborativo, el uso de herramientas tecnológicas y una evaluación formativa continua a lo largo del curso, cerrando cada unidad con una evidencia integradora.',
                    'competencia_asignatura' => 'El estudiante analiza, interpreta y resuelve problemas de la disciplina aplicando los fundamentos teóricos y metodológicos revisados en el curso, comunicando sus resultados de forma clara, ordenada y fundamentada.',
                    'competencias'           => $this->competencias($i + 1),
                    'calendarizacion'        => $this->calendarizacion(),
                    'fuentes_informacion'    => $this->fuentesInformacion(),
                    'apoyos_didacticos'      => $this->apoyosDidacticos(),
                ]
            );

            $this->command?->info("Instrumentación didáctica de prueba #{$i} sembrada para carga {$carga->id}.");
        }
    }

    /**
     * Dos unidades por instrumentación, cada una con:
     *   - 5 subtemas (temas)
     *   - 3 actividades (cada una con su par enseñanza/aprendizaje)
     *   - 3 evidencias de aprendizaje en la matriz de evaluación
     *   - 1 práctica
     *   - indicadores de alcance, niveles de desempeño y dosificación
     */
    private function competencias(int $variante): array
    {
        return [
            $this->unidad(
                numero: 1,
                nombreUnidad: 'Fundamentos y conceptos básicos',
                descripcion: 'Identifica, describe y relaciona los conceptos fundamentales de la unidad, sentando las bases teóricas del curso.',
                temas: [
                    'Introducción y definiciones',
                    'Principios fundamentales',
                    'Marco teórico y antecedentes',
                    'Terminología y notación básica',
                    'Aplicaciones y casos introductorios',
                ],
                actividades: [
                    ['ens' => 'Exposición de conceptos mediante ejemplos guiados y discusión grupal.',              'apr' => 'Investigación previa de conceptos clave y elaboración de mapa conceptual.', 'ht' => 4, 'hp' => 1],
                    ['ens' => 'Resolución de casos prácticos en equipo con retroalimentación inmediata.',           'apr' => 'Resolución individual de ejercicios de aplicación básica.',                  'ht' => 3, 'hp' => 2],
                    ['ens' => 'Conferencia con especialista invitado y sesión de preguntas y respuestas.',          'apr' => 'Elaboración de resumen crítico y participación en foro de discusión.',        'ht' => 2, 'hp' => 1],
                ],
                evidencias: [
                    ['nombre' => 'Mapa conceptual',        'porcentaje' => 20],
                    ['nombre' => 'Ejercicios de práctica', 'porcentaje' => 30],
                    ['nombre' => 'Examen escrito parcial',  'porcentaje' => 50],
                ],
                practica: ['nombre' => 'Práctica introductoria de laboratorio', 'requisitos' => 'Bata y equipo de seguridad', 'semana' => '3', 'lugar' => 'Laboratorio 1'],
                dosificacionInicio: 1,
                variante: $variante,
            ),
            $this->unidad(
                numero: 2,
                nombreUnidad: 'Aplicación y análisis avanzado',
                descripcion: 'Aplica los fundamentos de la unidad anterior en la resolución de problemas de mayor complejidad e integra los resultados en un reporte técnico.',
                temas: [
                    'Modelado del problema',
                    'Métodos de solución',
                    'Herramientas y software especializado',
                    'Validación de resultados',
                    'Análisis de casos de estudio',
                ],
                actividades: [
                    ['ens' => 'Presentación de un caso integrador y guía para su modelado.',            'apr' => 'Planteamiento por equipos del modelo del problema asignado.',       'ht' => 3, 'hp' => 2],
                    ['ens' => 'Asesoría por equipos para la validación de resultados obtenidos.',       'apr' => 'Resolución del caso integrador y elaboración de reporte final.',    'ht' => 2, 'hp' => 4],
                    ['ens' => 'Taller de uso de software especializado para análisis de resultados.',   'apr' => 'Práctica guiada con el software y documentación de hallazgos.',       'ht' => 2, 'hp' => 3],
                ],
                evidencias: [
                    ['nombre' => 'Reporte del caso integrador', 'porcentaje' => 40],
                    ['nombre' => 'Exposición oral',              'porcentaje' => 25],
                    ['nombre' => 'Examen práctico de laboratorio', 'porcentaje' => 35],
                ],
                practica: ['nombre' => 'Caso integrador aplicado', 'requisitos' => 'Equipo de cómputo con software instalado', 'semana' => '10', 'lugar' => 'Laboratorio de cómputo'],
                dosificacionInicio: 9,
                variante: $variante,
            ),
        ];
    }

    private function unidad(
        int $numero,
        string $nombreUnidad,
        string $descripcion,
        array $temas,
        array $actividades,
        array $evidencias,
        array $practica,
        int $dosificacionInicio,
        int $variante,
    ): array {
        $subtemas = collect($temas)->map(fn ($texto, $idx) => [
            'texto' => $texto,
            'fila'  => intdiv($idx, 2) + 1,
        ])->values()->all();

        $actividadesNumeradas = collect($actividades)->map(fn ($a, $idx) => [
            'numero'                => $idx + 1,
            'actividad_ensenanza'   => $a['ens'],
            'actividad_aprendizaje' => $a['apr'],
            'horas_teoricas'        => $a['ht'],
            'horas_practicas'       => $a['hp'],
        ])->values()->all();

        $letras = ['A', 'B', 'C'];
        $indicadores = collect($evidencias)->map(fn ($e, $idx) => [
            'letra'     => $letras[$idx] ?? chr(65 + $idx),
            'indicador' => "Demuestra el dominio evaluado por «{$e['nombre']}».",
            'valor'     => $e['porcentaje'],
        ])->values()->all();

        $matrizEvaluacion = collect($evidencias)->map(fn ($e, $idx) => [
            'evidencia'            => $e['nombre'],
            'porcentaje'           => $e['porcentaje'],
            'indicadores'          => [$letras[$idx] ?? chr(65 + $idx)],
            'evaluacion_formativa' => 'Retroalimentación oportuna previa al cierre de la unidad.',
        ])->values()->all();

        $dosificacion = collect($subtemas)->map(fn ($s, $idx) => [
            'subtema'           => $s['texto'],
            'semana_inicio'     => $dosificacionInicio + $idx,
            'semana_fin'        => $dosificacionInicio + $idx + 1,
            'semana_realizado'  => $idx === 0 ? $dosificacionInicio + $idx + 1 : null,
        ])->values()->all();

        return [
            'numero'        => $numero,
            'nombre_unidad' => $nombreUnidad,
            'porcentaje'    => 50,
            'descripcion'   => $descripcion,
            'subtemas'      => $subtemas,
            'actividades'   => $actividadesNumeradas,
            'competencias_genericas' => ['Capacidad de análisis y síntesis', 'Solución de problemas', 'Trabajo en equipo'],
            'indicadores_alcance'    => $indicadores,
            'niveles_desempeno' => [
                ['nivel' => 'Excelente',    'indicadores' => 'Domina y aplica todos los contenidos de la unidad sin apoyo.'],
                ['nivel' => 'Notable',      'indicadores' => 'Domina los contenidos con mínimo apoyo.'],
                ['nivel' => 'Bueno',        'indicadores' => 'Domina los contenidos principales y requiere apoyo puntual.'],
                ['nivel' => 'Suficiente',   'indicadores' => 'Domina parcialmente los contenidos básicos.'],
                ['nivel' => 'Insuficiente', 'indicadores' => 'No logra dominar los contenidos de la unidad.'],
            ],
            'matriz_evaluacion' => $matrizEvaluacion,
            'fuentes_informacion' => [
                ['fuente' => "Libro de texto oficial de la asignatura, edición vigente (variante {$variante})", 'tipo' => 'Impresa'],
                ['fuente' => 'Repositorio institucional de apuntes y guías de la academia', 'tipo' => 'Electrónica'],
            ],
            'apoyos_didacticos' => ['Presentaciones digitales', 'Pizarrón', 'Guías de laboratorio', 'Software especializado'],
            'practicas' => [$practica],
            'dosificacion' => $dosificacion,
        ];
    }

    /** Bibliografía general de la asignatura (además de las fuentes por unidad). */
    private function fuentesInformacion(): string
    {
        return "1. Autor Apellido, A. (2023). Título representativo de la asignatura (3.ª ed.). Editorial Académica.\n"
             . "2. Autor Apellido, B. y Coautor, C. (2022). Fundamentos y aplicaciones de la disciplina. Editorial Universitaria.\n"
             . "3. Repositorio institucional TecNM — apuntes, guías de laboratorio y normas oficiales vigentes.\n"
             . "4. Artículos técnicos indexados seleccionados por la academia para el periodo vigente.";
    }

    /** Material de apoyo / apoyos didácticos generales de la asignatura. */
    private function apoyosDidacticos(): string
    {
        return "Presentaciones digitales por unidad, guías de prácticas de laboratorio, rúbricas y listas de cotejo para "
             . "las evidencias de aprendizaje, software especializado instalado en los laboratorios de cómputo, "
             . "plataforma institucional para material de apoyo y foros de discusión, y banco de reactivos para exámenes parciales.";
    }

    /**
     * 16 semanas fijas con evaluaciones distribuidas: diagnóstica al inicio, formativas a
     * mitad de cada unidad y sumativas al cierre de cada parcial.
     */
    private function calendarizacion(): array
    {
        $tipos = [
            1 => 'ED', 4 => 'EF', 8 => 'ES',
            10 => 'EF', 13 => 'EF', 16 => 'ES',
        ];

        return collect(range(1, 16))->map(fn ($semana) => [
            'semana'          => $semana,
            'tipo_evaluacion' => $tipos[$semana] ?? '',
            'tp' => in_array($semana, [1, 4, 8, 10, 13, 16]),
            'tr' => $semana <= 8,
            'sd' => in_array($semana, [8, 16]),
        ])->all();
    }
}
