<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

/** @var \App\Http\Controllers\Academico\AsistenteIaController $controller */
$controller = app(\App\Http\Controllers\Academico\AsistenteIaController::class);
$ollama = app(\App\Services\OllamaService::class);

$request = \Illuminate\Http\Request::create('/api/ia/mejorar-texto', 'POST', [
    'texto' => 'Programar interfaces para definir los comportamientos que una clase deberá de tener al implementarla.',
    'tipo' => 'actividad_aprendizaje',
    'contexto' => 'Programación Avanzada — Unidad 2: Interfaces y clases abstractas',
]);

echo "Testing AsistenteIaController::mejorarTexto via Ollama...\n";
$start = microtime(true);
$response = $controller->mejorarTexto($request, $ollama);
$data = json_decode($response->getContent(), true);

echo "TIME: " . round(microtime(true) - $start, 2) . "s\n";
echo "Fuente: " . ($data['data']['fuente'] ?? 'desconocida') . "\n";
echo "Sugerencia:\n" . ($data['data']['sugerencia'] ?? 'VACIO') . "\n";
