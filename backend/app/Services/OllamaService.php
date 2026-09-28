<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/** Cliente mínimo para el LLM autoalojado en Docker (Ollama, ver docker-compose.yml) —
 * todo el contenido de las planeaciones se queda en la red local, nunca sale a un
 * proveedor externo. Se usa solo para la asistencia de redacción del editor. */
class OllamaService
{
    public function __construct(
        private readonly string $baseUrl = '',
        private readonly string $model = '',
    ) {
    }

    private function url(): string
    {
        return $this->baseUrl ?: config('services.ollama.base_url');
    }

    private function modeloDefault(): string
    {
        return $this->model ?: config('services.ollama.model');
    }

    /** Lanza \RuntimeException con un mensaje entendible por el docente si Ollama no
     * responde (contenedor caído) o si el modelo configurado no está descargado — ambos son
     * errores de operación/infraestructura, no del contenido que se mandó. */
    public function generar(string $prompt, ?string $modelo = null, float $temperature = 0.4): string
    {
        // 1. Intentar con Ollama local (Docker o host)
        try {
            $respuesta = Http::timeout(120)->post("{$this->url()}/api/generate", [
                'model'   => $modelo ?? $this->modeloDefault(),
                'prompt'  => $prompt,
                'stream'  => false,
                'options' => [
                    'temperature' => $temperature,
                    'num_predict' => 200,
                ],
            ]);

            if ($respuesta->successful()) {
                $res = trim((string) $respuesta->json('response', ''));
                if ($res !== '') {
                    return $res;
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::info('Ollama local no disponible: ' . $e->getMessage());
        }

        // 2. Intentar OpenAI API si existe OPENAI_API_KEY en .env
        $openAiKey = config('services.openai.key') ?? env('OPENAI_API_KEY');
        if ($openAiKey) {
            try {
                $resp = Http::withToken($openAiKey)
                    ->timeout(20)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => 'gpt-4o-mini',
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt]
                        ],
                        'temperature' => $temperature,
                    ]);
                if ($resp->successful()) {
                    $txt = trim((string) ($resp->json('choices.0.message.content') ?? ''));
                    if ($txt !== '') return $txt;
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::info('OpenAI fallback falló: ' . $e->getMessage());
            }
        }

        // 3. Intentar Anthropic API si existe ANTHROPIC_API_KEY en .env
        $anthropicKey = config('services.anthropic.api_key') ?? env('ANTHROPIC_API_KEY');
        if ($anthropicKey) {
            try {
                $resp = Http::withHeaders([
                    'x-api-key' => $anthropicKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])->timeout(20)->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-3-haiku-20240307',
                    'max_tokens' => 1000,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt]
                    ],
                ]);
                if ($resp->successful()) {
                    $txt = trim((string) ($resp->json('content.0.text') ?? ''));
                    if ($txt !== '') return $txt;
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::info('Anthropic fallback falló: ' . $e->getMessage());
            }
        }

        throw new \RuntimeException('Ningún proveedor de IA (Ollama local / OpenAI / Anthropic) respondió.');
    }
}
