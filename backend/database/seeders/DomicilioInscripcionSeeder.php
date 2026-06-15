<?php

namespace Database\Seeders;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Academico\Models\Periodo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DomicilioInscripcionSeeder extends Seeder
{
    // Colonias y calles típicas de Martínez de la Torre, Veracruz
    private array $calles = [
        'Av. 20 de Noviembre', 'Calle Hidalgo', 'Blvd. Adolfo López Mateos',
        'Calle Reforma', 'Av. Juárez', 'Calle Morelos', 'Calle Venustiano Carranza',
        'Av. 5 de Mayo', 'Calle Independencia', 'Av. Lázaro Cárdenas',
        'Calle Ignacio Zaragoza', 'Calle Miguel Alemán', 'Av. Vicente Guerrero',
        'Calle Emiliano Zapata', 'Calle Francisco I. Madero',
    ];

    private array $colonias = [
        'Col. Centro', 'Col. Primero de Mayo', 'Col. Las Brisas', 'Col. El Tesoro',
        'Col. Ampliación Ejidal', 'Col. Los Naranjos', 'Col. La Loma',
        'Col. Santa Fe', 'Col. Revolución', 'Col. Azteca', 'Col. Benito Juárez',
        'Col. El Palmar', 'Col. San Isidro', 'Col. Jardines del Sur',
    ];

    private array $ciudades = [
        'Martínez de la Torre' => ['93600', 'Veracruz'],
        'Vega de Alatorre'     => ['91960', 'Veracruz'],
        'Misantla'             => ['93820', 'Veracruz'],
        'Tlapacoyan'           => ['93950', 'Veracruz'],
        'Nautla'               => ['91970', 'Veracruz'],
        'Jalacingo'            => ['93220', 'Veracruz'],
        'Alto Lucero'          => ['94490', 'Veracruz'],
        'Papantla'             => ['93400', 'Veracruz'],
    ];

    public function run(): void
    {
        // 1. Rellenar domicilios vacíos en todos los aspirantes
        $aspirantes = Aspirante::whereNull('calle')->orWhere('calle', '')->get();
        $ciudadKeys = array_keys($this->ciudades);

        foreach ($aspirantes as $asp) {
            $ciudad = $ciudadKeys[array_rand($ciudadKeys)];
            [$cp, $estado] = $this->ciudades[$ciudad];

            $asp->updateQuietly([
                'calle'           => $this->calles[array_rand($this->calles)] . ' #' . rand(1, 999),
                'colonia'         => $this->colonias[array_rand($this->colonias)],
                'ciudad'          => $ciudad,
                'estado_domicilio'=> $estado,
                'codigo_postal'   => $cp,
            ]);
        }

        $this->command->info("Domicilios actualizados: {$aspirantes->count()} aspirantes.");

        // 2. Crear inscripciones para aspirantes aceptados/inscritos que no tienen ninguna
        $sinInscripcion = Aspirante::with(['carrera', 'periodo'])
            ->whereIn('estatus', ['aceptado', 'inscrito'])
            ->whereDoesntHave('inscripcion')
            ->get();

        $periodo = Periodo::where('activo', true)->first();

        foreach ($sinInscripcion as $asp) {
            $carrera = $asp->carrera;
            if (!$carrera) continue;

            // Número de control: [YY][codigo_it][####]
            $anio   = now()->format('y');
            $ultimo = Inscripcion::where('numero_control', 'like', $anio . $carrera->codigo_it . '%')
                ->max('numero_control');
            $seq    = $ultimo ? ((int) substr($ultimo, -4)) + 1 : 1;
            $nc     = $anio . $carrera->codigo_it . str_pad($seq, 4, '0', STR_PAD_LEFT);

            Inscripcion::create([
                'aspirante_id'     => $asp->id,
                'carrera_id'       => $asp->carrera_id,
                'periodo_id'       => $asp->periodo_id ?? $periodo?->id,
                'numero_control'   => $nc,
                'tipo_ingreso'     => 'nuevo_ingreso',
                'semestre_ingreso' => 1,
                'fecha_inscripcion'=> now()->toDateString(),
            ]);

            // Marcar como inscrito
            if ($asp->estatus === 'aceptado') {
                $asp->updateQuietly(['estatus' => 'inscrito']);
            }
        }

        $this->command->info("Inscripciones creadas: {$sinInscripcion->count()}.");
        $this->command->info("Total inscripciones: " . Inscripcion::count());
    }
}
