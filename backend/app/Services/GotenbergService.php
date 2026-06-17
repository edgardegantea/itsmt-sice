<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GotenbergService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.gotenberg.url', 'http://localhost:3000'), '/');
    }

    /**
     * Convierte HTML a PDF usando Chromium headless vía Gotenberg.
     *
     * @param  string  $html      HTML completo del documento
     * @param  array   $options   Opciones de página: paperWidth, paperHeight, marginTop, etc.
     * @return string  Contenido binario del PDF
     */
    public function htmlToPdf(string $html, array $options = []): string
    {
        $defaults = [
            'paperWidth'   => '8.5in',
            'paperHeight'  => '11in',
            'marginTop'    => '2cm',
            'marginBottom' => '2cm',
            'marginLeft'   => '2cm',
            'marginRight'  => '2cm',
            'printBackground' => 'true',
            'preferCssPageSize' => 'false',
        ];

        $params = array_merge($defaults, $options);

        try {
            $response = Http::timeout(30)
                ->attach('index.html', $html, 'index.html')
                ->post("{$this->baseUrl}/forms/chromium/convert/html", $params);
        } catch (ConnectionException $e) {
            throw new RuntimeException('Gotenberg no disponible. Verifica que el contenedor esté corriendo.', 0, $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException("Gotenberg error {$response->status()}: {$response->body()}");
        }

        return $response->body();
    }

    /**
     * Convierte HTML a PDF en orientación horizontal (landscape).
     */
    public function htmlToPdfLandscape(string $html, array $options = []): string
    {
        return $this->htmlToPdf($html, array_merge(['landscape' => 'true'], $options));
    }
}
