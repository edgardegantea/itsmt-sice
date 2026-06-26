<?php

namespace App\Http\Controllers\Academico;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;

class ExtraerProgramaController extends Controller
{
    /**
     * POST /api/materias/extraer-programa
     *
     * Recibe un PDF de programa de asignatura TecNM, extrae el texto
     * y usa Claude para estructurar la información.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        // 1. Extraer texto del PDF
        $text = $this->extraerTexto($request->file('pdf')->getRealPath());

        if (empty(trim($text))) {
            return ApiResponse::error('No se pudo extraer texto del PDF. Verifica que no sea un PDF escaneado.', 422);
        }

        // 2. Llamar a Claude
        $structured = $this->llamarClaude($text);

        if (! $structured) {
            return ApiResponse::error('No se pudo procesar el documento con IA. Intenta de nuevo.', 500);
        }

        return ApiResponse::success($structured);
    }

    private function extraerTexto(string $path): string
    {
        try {
            $parser = new Parser();
            $pdf    = $parser->parseFile($path);
            return $pdf->getText();
        } catch (\Throwable $e) {
            Log::error('PDF parse error: ' . $e->getMessage());
            return '';
        }
    }

    private function llamarClaude(string $texto): ?array
    {
        $apiKey = config('services.anthropic.api_key');
        if (! $apiKey) {
            Log::error('ANTHROPIC_API_KEY no configurada.');
            return null;
        }

        $prompt = <<<PROMPT
Eres un extractor de información académica. A continuación se incluye el texto completo de un programa de asignatura del TecNM (Tecnológico Nacional de México).

Extrae la información y devuelve ÚNICAMENTE un JSON válido con la siguiente estructura (sin explicaciones, sin markdown, solo el JSON):

{
  "nombre": "string — nombre completo de la asignatura",
  "clave_oficial_tecnm": "string — clave de la asignatura (ej: SCA-1025). Elimina espacios y guiones largos, usa guión normal",
  "satca": "string — valor SATCA en formato H-H-C (ej: 0-4-4)",
  "semestre": null,
  "creditos": number — último número del SATCA,
  "horas_teoria": number — primer número del SATCA,
  "horas_practica": number — segundo número del SATCA,
  "caracterizacion": "string — texto completo de la caracterización de la asignatura",
  "intencion_didactica": "string — texto completo de la intención didáctica",
  "competencia_especifica": "string — competencia(s) específica(s) de la asignatura",
  "competencias_previas": "string — texto de competencias previas",
  "temario": [
    {
      "tema": "string — nombre del tema (sin número de tema al inicio)",
      "subtemas": ["string — subtema 1", "string — subtema 2"]
    }
  ],
  "fuentes_informacion": [
    "string — referencia bibliográfica completa"
  ]
}

Reglas:
- El campo semestre siempre es null (no aparece en el programa).
- Si un campo no aparece en el documento, usa null o [] según corresponda.
- Los subtemas deben ser strings individuales, no grupos.
- La bibliografía: cada entrada numerada es un elemento separado del array, sin incluir el número.
- El texto de caracterización e intención didáctica puede ser largo; inclúyelo completo.

TEXTO DEL PROGRAMA:
{$texto}
PROMPT;

        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key'         => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model'      => 'claude-haiku-4-5-20251001',
                    'max_tokens' => 4096,
                    'messages'   => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (! $response->successful()) {
                Log::error('Claude API error: ' . $response->body());
                return null;
            }

            $content = $response->json('content.0.text', '');

            // Limpiar posibles bloques markdown
            $content = preg_replace('/^```json\s*/m', '', $content);
            $content = preg_replace('/^```\s*/m', '', $content);
            $content = trim($content);

            $data = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON parse error from Claude: ' . $content);
                return null;
            }

            return $data;
        } catch (\Throwable $e) {
            Log::error('Claude HTTP error: ' . $e->getMessage());
            return null;
        }
    }
}
