<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\OllamaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsistenteIaController extends Controller
{
    // Instrucción por tipo de campo — cada una le pide al modelo una sola oración/frase de
    // salida, sin explicaciones ni preámbulos, para que la respuesta se pueda pegar
    // directamente en el campo sin tener que recortar nada.
    private const INSTRUCCION_POR_TIPO = [
        'indicador' => 'Eres un especialista en evaluación educativa universitaria (TecNM). '
            . 'Reescribe el siguiente indicador de alcance para una rúbrica de evaluación de forma clara, técnica y medible, '
            . 'en 1 o 2 oraciones completas y profesionales. Responde ÚNICAMENTE con el indicador reescrito, sin comillas, sin explicaciones ni prefijos.',

        'actividad' => 'Eres un docente universitario y diseñador pedagógico experto del TecNM. '
            . 'Reescribe la siguiente actividad de ENSEÑANZA (que realiza el docente) para que sea amplia, fluida, profesional y estructurada en 2 a 3 oraciones completas. '
            . 'Integra de forma discreta, implícita, natural y continuada los momentos metodológicos didácticos (sin etiquetas ni subtítulos como "Apertura" o "Cierre"): '
            . '1) Inicio/Encuadre (presentar y contextualizar los temas o fundamentos teóricos), '
            . '2) Desarrollo/Acompañamiento (orientar la práctica, facilitar metodologías y resolver dudas activamente), y '
            . '3) Cierre/Evaluación (supervisar el avance, revisar las evidencias de aprendizaje generadas y retroalimentar el desempeño del estudiante). '
            . 'Inicia obligatoriamente la redacción con un verbo en infinitivo (por ejemplo: "Presentar...", "Explicar...", "Facilitar...", "Coordinar..."). '
            . 'Responde ÚNICAMENTE con la actividad de enseñanza reescrita, sin comillas, sin explicaciones ni prefijos.',

        'actividad_aprendizaje' => 'Eres un especialista en didáctica universitaria y redacción curricular por competencias (TecNM). '
            . 'REGLA OBLIGATORIA DE REDACCIÓN: NUNCA NUNCA redactes en primera persona del singular (PROHIBIDO TOTALMENTE usar "realicé", "investigué", "utilicé", "me basé", "logré", "mi", "me"). '
            . 'La redacción DEBE iniciar obligatoriamente con VERBOS EN INFINITIVO (por ejemplo: "Investigar...", "Demostrar...", "Desarrollar...", "Analizar...", "Elaborar...") expresando las acciones que realiza el estudiante. '
            . 'Redacta una versión amplia, natural, fluida y estructurada en 2 a 3 oraciones bien redactadas. '
            . 'Estructura la redacción abarcando: 1) Qué conceptos, técnicas o problemas investiga y resuelve el estudiante, 2) La metodología o herramientas utilizadas, '
            . 'y 3) La propuesta e integración armónica de la EVIDENCIA DE APRENDIZAJE o producto entregable calificable. '
            . 'Si el contexto especifica una evidencia de aprendizaje, intégrala de forma fluida dentro de la redacción. '
            . 'Responde ÚNICAMENTE con la actividad de aprendizaje reescrita en infinitivo, sin primera persona, sin comillas, sin explicaciones ni prefijos.',

        'evidencia' => 'Eres un docente universitario experto en evaluación por competencias (TecNM). '
            . 'Reescribe el siguiente nombre de evidencia de aprendizaje para que sea formal, técnico y específico. '
            . 'Responde ÚNICAMENTE con el nombre reescrito, en pocas palabras, sin comillas, sin explicaciones ni prefijos.',

        'general' => 'Eres un redactor académico universitario. '
            . 'Mejora la redacción del siguiente texto para una instrumentación didáctica formal, haciéndolo fluido, profesional y bien desarrollado sin alterar su significado original. '
            . 'Responde ÚNICAMENTE con el texto mejorado, sin comillas, sin explicaciones ni prefijos.',

        'sugerir_ensenanza' => 'Eres un docente universitario y diseñador pedagógico experto del TecNM. '
            . 'Se te da la actividad de APRENDIZAJE que realizará el estudiante en la planeación didáctica. '
            . 'Redacta la correspondiente estrategia de ENSEÑANZA que ejecutará el docente, estructurada en 2 a 3 oraciones amplias, fluidas y profesionales. '
            . 'Integra implícita y discretamente los momentos metodológicos didácticos: '
            . '1) Apertura (introducir el tema o encuadrar la dinámica de la actividad), '
            . '2) Desarrollo (orientar la práctica, brindar acompañamiento y solucionar dudas técnicas o teóricas), y '
            . '3) Cierre (revisar y retroalimentar el producto entregable o desempeño final para consolidar la competencia). '
            . 'NO incluyas etiquetas explícitas ni subtítulos. Inicia obligatoriamente con un verbo en infinitivo. '
            . 'Responde ÚNICAMENTE con la actividad de enseñanza sugerida, sin comillas, sin explicaciones ni prefijos.',

        'sugerir_evidencia' => 'Eres un docente universitario experto (TecNM). '
            . 'Dada una actividad de enseñanza-aprendizaje, propón el nombre de la EVIDENCIA DE APRENDIZAJE calificable más adecuada '
            . '(ej. "Reporte técnico de práctica", "Código fuente documentado y ejecutable", "Cuadro comparativo analítico", "Presentación ejecutiva"). '
            . 'Responde ÚNICAMENTE con el nombre formal de la evidencia, sin comillas, sin explicaciones ni prefijos.',

        'sugerir_instrumento' => 'Eres un especialista en evaluación por competencias (TecNM). '
            . 'Dada una evidencia de aprendizaje, propón el instrumento de evaluación formativa más adecuado (Rúbrica de evaluación, Lista de cotejo, Guía de observación, etc.) '
            . 'y describe en 1 a 2 oraciones concisas los criterios clave a evaluar. Responde ÚNICAMENTE con la propuesta, sin comillas ni prefijos.',

        'generar_instrumento' => 'Eres un pedagogo experto en evaluación universitaria por competencias (TecNM). '
            . 'Diseña un instrumento de evaluación formativa completo en formato Markdown estructurado para la evidencia dada.',
    ];

    // Etiquetas del texto de entrada/salida dentro del prompt — por defecto son las de
    // "reescribir un texto en sí mismo"; los tipos "sugerir_*" usan las suyas porque no son
    // una reescritura, son algo distinto derivado del texto de entrada.
    private const ETIQUETAS_PROMPT = [
        'sugerir_ensenanza'   => ['Actividad de aprendizaje:', 'Actividad de enseñanza:'],
        'sugerir_evidencia'   => ['Actividad:', 'Evidencia de aprendizaje:'],
        'sugerir_instrumento' => ['Evidencia de aprendizaje:', 'Instrumento de evaluación formativa sugerido:'],
        'generar_instrumento' => ['Evidencia de aprendizaje y contexto:', 'Instrumento de evaluación diseñado:'],
    ];
    private const ETIQUETAS_PROMPT_DEFAULT = ['Texto original:', 'Texto reescrito:'];

    // Temperatura por tipo — más alta en "actividad_aprendizaje" a propósito: el docente pidió
    // que "+ Ver otra alternativa" de verdad varíe entre sí (estructura, verbos, recurso
    // sugerido), no solo cambie una palabra suelta. El resto se queda en 0.4 (el valor que ya
    // se usaba) porque son reescrituras cortas donde más variación solo agrega ruido.
    private const TEMPERATURA_POR_TIPO = [
        'actividad_aprendizaje' => 0.8,
        'generar_instrumento'   => 0.5,
    ];
    private const TEMPERATURA_DEFAULT = 0.4;

    // POST /api/ia/mejorar-texto  (cualquier usuario autenticado con acceso a redactar
    // planeaciones — el propio middleware de la ruta ya exige sesión iniciada)
    public function mejorarTexto(Request $request, OllamaService $ollama): JsonResponse
    {
        $data = $request->validate([
            'texto'    => ['required', 'string', 'max:2000'],
            'tipo'     => ['required', 'in:indicador,actividad,actividad_aprendizaje,evidencia,general,sugerir_ensenanza,sugerir_evidencia,sugerir_instrumento,generar_instrumento'],
            // Contexto opcional (materia y/o competencia específica de la unidad, y para
            // actividad_aprendizaje también las evidencias esperadas) para que la sugerencia
            // no sea genérica — sin esto, dos materias completamente distintas con
            // actividades parecidas ("Investigar y exponer un tema") recibían la misma
            // sugerencia sin ningún indicio de a qué asignatura pertenece.
            'contexto' => ['nullable', 'string', 'max:500'],
            // Planeación que se está editando: permite aplicar las reglas por grupo/carrera.
            'planeacion_id' => ['nullable', 'uuid'],
        ]);

        // El superadministrador puede desactivar la IA por institución, carrera, docente o
        // grupo (ver ReglaIaController). Se valida aquí también, no solo ocultando botones.
        $planeacion = ! empty($data['planeacion_id']) ? \App\Domains\Academico\Models\PlaneacionDocente::find($data['planeacion_id']) : null;
        $disponible = app(\App\Domains\Academico\Services\DisponibilidadIa::class)
            ->evaluar($planeacion?->docente ?? $request->user(), $planeacion);
        if (! $disponible['habilitada']) {
            return ApiResponse::error('El asistente de IA está desactivado' . ($disponible['motivo'] ? ': ' . $disponible['motivo'] : '.'), 403);
        }

        $instruccion = self::INSTRUCCION_POR_TIPO[$data['tipo']];
        [$etiquetaEntrada, $etiquetaSalida] = self::ETIQUETAS_PROMPT[$data['tipo']] ?? self::ETIQUETAS_PROMPT_DEFAULT;
        $bloqueContexto = ! empty($data['contexto']) ? "Contexto (materia/competencia de la unidad): {$data['contexto']}\n\n" : '';
        $prompt = "{$instruccion}\n\n{$bloqueContexto}{$etiquetaEntrada}\n{$data['texto']}\n\n{$etiquetaSalida}";
        $temperatura = self::TEMPERATURA_POR_TIPO[$data['tipo']] ?? self::TEMPERATURA_DEFAULT;

        $fuente = 'ollama';
        try {
            $sugerencia = $ollama->generar($prompt, temperature: $temperatura);
        } catch (\RuntimeException $e) {
            \Illuminate\Support\Facades\Log::warning('Ollama no disponible en mejorarTexto: ' . $e->getMessage());
            $sugerencia = $this->generarFallback($data['tipo'], $data['texto'], $data['contexto'] ?? null);
            $fuente = 'fallback';
        }

        if ($sugerencia === '') {
            $sugerencia = $this->generarFallback($data['tipo'], $data['texto'], $data['contexto'] ?? null);
            $fuente = 'fallback';
        }

        $sugerencia = $this->limpiarPrimeraPersona($sugerencia);

        return ApiResponse::success([
            'sugerencia' => $sugerencia,
            'fuente'     => $fuente,
        ]);
    }

    private function limpiarPrimeraPersona(string $texto): string
    {
        $reemplazos = [
            '/\bRealicé\b/u'           => 'Realizar',
            '/\brealicé\b/u'           => 'realizar',
            '/\bInvestigué\b/u'        => 'Investigar',
            '/\binvestigué\b/u'        => 'investigar',
            '/\bUtilicé\b/u'           => 'Utilizar',
            '/\butilicé\b/u'           => 'utilizar',
            '/\bDesarrollé\b/u'        => 'Desarrollar',
            '/\bdesarrollé\b/u'        => 'desarrollar',
            '/\bElaboré\b/u'           => 'Elaborar',
            '/\belaboré\b/u'           => 'elaborar',
            '/\bAnalicé\b/u'           => 'Analizar',
            '/\banalicé\b/u'           => 'analizar',
            '/\bDemostré\b/u'          => 'Demostrar',
            '/\bdemostré\b/u'          => 'demostrar',
            '/\bLogré\b/u'             => 'Lograr',
            '/\blogré\b/u'             => 'lograr',
            '/\bComprendí\b/u'         => 'Comprender',
            '/\bcomprendí\b/u'         => 'comprender',
            '/\bPresenté\b/u'          => 'Presentar',
            '/\bpresenté\b/u'          => 'presentar',
            '/\bArgumenté\b/u'         => 'Argumentar',
            '/\bargumenté\b/u'         => 'argumentar',
            '/\bProporcioné\b/u'       => 'Proporcionar',
            '/\bproporcioné\b/u'       => 'proporcionar',
            '/\bme basé\b/ui'          => 'basándose',
            '/\bme permitió\b/ui'      => 'permite',
            '/\bme baso\b/ui'          => 'basándose',
            '/\blo que me\b/ui'        => 'lo que',
            '/\bque me\b/ui'           => 'que',
            '/\bpara mi\b/ui'          => 'para la',
            '/\bmi comprensión\b/ui'   => 'la comprensión',
            '/\bmis conclusiones\b/ui' => 'las conclusiones',
        ];

        return preg_replace(array_keys($reemplazos), array_values($reemplazos), $texto);
    }

    private function generarFallback(string $tipo, string $texto, ?string $contexto): string
    {
        $limpio = trim($texto);
        $seed = abs(crc32($texto));

        // Separar viñetas o líneas si existen en el texto de entrada
        $lineas = array_values(array_filter(
            array_map(fn($l) => trim(preg_replace('/^[\s•\-\*\d+\.\)]+/', '', $l)), explode("\n", $texto)),
            fn($l) => strlen($l) > 3
        ));

        switch ($tipo) {
            case 'sugerir_ensenanza':
            case 'actividad':
                $textoBase = !empty($lineas) ? implode(' ', $lineas) : $limpio;
                $textoBase = preg_replace('/[,.]?\s*(?:analizando|fundamentando|entregando|supervisando|evaluando|retroalimentando).*$/ui', '', $textoBase);
                $textoBase = rtrim(trim($textoBase), '.,;');

                $aperturas = [
                    "Presentar y encuadrar el marco teórico referente a " . lcfirst($textoBase) . ", contextualizando su relevancia técnica en la unidad.",
                    "Explicar y fundamentar los conceptos principales sobre " . lcfirst($textoBase) . ", introduciendo los aspectos metodológicos clave.",
                    "Introducir la temática y contextualizar los principios fundamentales de " . lcfirst($textoBase) . " para orientar el trabajo del grupo.",
                    "Facilitar la comprensión teórica inicial sobre " . lcfirst($textoBase) . ", encuadrando los objetivos didácticos esperados.",
                ];

                $desarrollos = [
                    "A continuación, orientar la práctica guiada y brindar acompañamiento continuo resolviendo dudas durante la ejecución.",
                    "Posteriormente, asesorar activamente la aplicación metodológica y monitorear el progreso del alumnado.",
                    "Durante el desarrollo, supervisar la dinámica de trabajo y solucionar inquietudes teóricas o técnicas en tiempo real.",
                    "Asimismo, acompañar el proceso de análisis y producción de los estudiantes, brindando soporte técnico oportuno.",
                ];

                $cierres = [
                    "Por último, evaluar las evidencias presentadas y retroalimentar el desempeño para consolidar la competencia esperada.",
                    "Finalmente, revisar los productos resultantes y aportar observaciones constructivas que fortalezcan el aprendizaje.",
                    "Para concluir, coordinar la socialización de hallazgos y brindar retroalimentación formativa al grupo.",
                    "Cerrar la actividad valorando los avances alcanzados y consolidando las conclusiones pedagógicas fundamentales.",
                ];

                $ap = $aperturas[$seed % count($aperturas)];
                $des = $desarrollos[($seed + 1) % count($desarrollos)];
                $cie = $cierres[($seed + 2) % count($cierres)];

                return "{$ap} {$des} {$cie}";

            case 'actividad_aprendizaje':
                $evidenciaExtraida = null;
                if ($contexto && preg_match('/(?:Producto entregable|Evidencias de aprendizaje esperadas|Evidencia)[^:]*:\s*([^|]+)/i', $contexto, $m)) {
                    $evidenciaExtraida = trim(explode(',', $m[1])[0]);
                }

                if (!$evidenciaExtraida) {
                    if (stripos($texto, 'investig') !== false) $evidenciaExtraida = 'un reporte de investigación documental';
                    elseif (stripos($texto, 'práct') !== false || stripos($texto, 'laborat') !== false) $evidenciaExtraida = 'un reporte de práctica';
                    elseif (stripos($texto, 'ejercic') !== false || stripos($texto, 'problem') !== false) $evidenciaExtraida = 'un problemario resuelto';
                    elseif (stripos($texto, 'program') !== false || stripos($texto, 'código') !== false || stripos($texto, 'softw') !== false) $evidenciaExtraida = 'un programa ejecutable con código fuente documentado';
                    else $evidenciaExtraida = 'el entregable técnico correspondiente';
                } else {
                    if (!preg_match('/^(?:un|una|el|la|los|las)\s+/i', $evidenciaExtraida)) {
                        $evidenciaExtraida = 'el entregable de ' . lcfirst($evidenciaExtraida);
                    }
                }

                $integracionesEvidencia = [
                    ", integrando los hallazgos en {$evidenciaExtraida}, donde se argumenten de forma rigurosa y fundamentada los resultados obtenidos.",
                    ", con el propósito de sistematizar el conocimiento adquirido mediante la elaboración y entrega de {$evidenciaExtraida}.",
                    ", consolidando las propuestas desarrolladas en {$evidenciaExtraida}, asegurando la correcta aplicación de los criterios técnicos exigidos.",
                    ", sustentando el trabajo realizado a través de {$evidenciaExtraida}, en el cual se detaille la metodología empleada y sus conclusiones.",
                    ", plasmando la solución metodológica en {$evidenciaExtraida}, fundamentando cada uno de los aspectos analizados durante la actividad.",
                    ", culminando con la presentación de {$evidenciaExtraida}, demostrando el dominio práctico y analítico de los temas abordados.",
                ];

                $tailEvidencia = $integracionesEvidencia[$seed % count($integracionesEvidencia)];

                if (count($lineas) > 1) {
                    $desarrolladas = [];
                    foreach ($lineas as $idx => $linea) {
                        $lineaLimpia = preg_replace('/[,.]?\s*(?:analizando|fundamentando|entregando).*$/ui', '', $linea);
                        $lineaLimpia = rtrim(trim($lineaLimpia), '.,;');
                        if ($idx === count($lineas) - 1 && stripos($lineaLimpia, 'evidencia') === false && stripos($lineaLimpia, 'entreg') === false) {
                            $desarrolladas[] = "• " . ucfirst($lineaLimpia) . rtrim($tailEvidencia, '.');
                        } else {
                            $desarrolladas[] = "• " . ucfirst($lineaLimpia) . ".";
                        }
                    }
                    return implode("\n", $desarrolladas);
                }

                $textoBase = preg_replace('/[,.]?\s*(?:analizando|fundamentando|entregando|supervisando).*$/ui', '', $limpio);
                $textoBase = rtrim(trim($textoBase), '.,;');

                if (stripos($textoBase, 'entregar') !== false || stripos($textoBase, 'evidencia') !== false) {
                    return ucfirst($textoBase) . ', profundizando en los aspectos teóricos y metodológicos para respaldar con calidad la propuesta presentada.';
                }

                return ucfirst($textoBase) . $tailEvidencia;

            case 'indicador':
                $opcionesInd = [
                    "Demuestra dominio integral en " . lcfirst($limpio) . ", aplicando con precisión los criterios técnicos y metodológicos requeridos.",
                    "Aplica de manera consistente y autónoma la competencia de " . lcfirst($limpio) . ", fundamentando sus decisiones técnicas.",
                    "Sustenta con oportunidad y exactitud " . lcfirst($limpio) . ", cumpliendo los estándares de calidad definidos en la rúbrica.",
                ];
                return $opcionesInd[$seed % count($opcionesInd)];

            case 'evidencia':
                return "Reporte técnico de " . lcfirst($limpio);

            case 'general':
            default:
                return ucfirst($limpio);
        }
    }
}
