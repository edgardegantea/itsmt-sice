<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    // ── Datos ficticios mexicanos ─────────────────────────────────────────────

    private array $nombres_h = [
        'Carlos', 'José', 'Miguel', 'Ángel', 'Alejandro', 'Juan', 'Diego', 'Luis',
        'Fernando', 'Ricardo', 'Eduardo', 'Roberto', 'Sergio', 'Andrés', 'Marco',
        'Víctor', 'Omar', 'Iván', 'Jesús', 'Emmanuel', 'Rodrigo', 'Daniel', 'Kevin',
        'Jonathan', 'Armando', 'Salvador', 'Arturo', 'Julio', 'Francisco', 'Rafael',
    ];

    private array $nombres_m = [
        'María', 'Ana', 'Laura', 'Sofía', 'Valeria', 'Fernanda', 'Karla', 'Daniela',
        'Paola', 'Jessica', 'Verónica', 'Adriana', 'Claudia', 'Mariana', 'Lucía',
        'Gabriela', 'Alejandra', 'Brenda', 'Itzel', 'Mónica', 'Berenice', 'Nadia',
        'Ximena', 'Estefanía', 'Diana', 'Patricia', 'Yesenia', 'Alma', 'Rosa', 'Elena',
    ];

    private array $apellidos = [
        'García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez',
        'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Torres', 'Rivera', 'Díaz', 'Morales',
        'Jiménez', 'Reyes', 'Gutiérrez', 'Ortiz', 'Vargas', 'Mendoza', 'Castillo',
        'Ruiz', 'Aguilar', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Ramos', 'Luna',
        'Salinas', 'Velázquez', 'Mejía', 'Suárez', 'Fuentes', 'Ávila', 'Rojas', 'Vega',
        'Delgado', 'Domínguez', 'Guerrero', 'Medina', 'Núñez', 'Soto', 'Herrera',
    ];

    private array $escuelas = [
        'CBTis 75', 'CBTis 166', 'COBAEV 07', 'COBAEV 15', 'COBAEV 31',
        'Prepa Veracruzana', 'CECyTE Veracruz', 'CETMAR 04', 'CONALEP Martínez',
        'Prepa Regional ITSMT', 'Centro de Bachillerato Tecnológico 48',
        'Colegio de Bachilleres Plantel 22', 'Bachillerato UNAM', 'PREPARATORIA PARTICULAR SAN JUAN',
    ];

    private array $municipios = [
        'Martínez de la Torre', 'Papantla', 'Poza Rica', 'Tuxpan', 'Misantla',
        'Jalapa', 'Veracruz', 'Nautla', 'Vega de Alatorre', 'Tecolutla',
        'Gutiérrez Zamora', 'Cazones', 'Coatzintla', 'Tihuatlán',
    ];

    private array $estados_curp = [
        'VZ' => 'H', // Veracruz hombre
        'VZ' => 'M', // placeholder — se asigna dinámicamente
    ];

    private array $medios = [
        'Redes sociales', 'Recomendación de familiar', 'Recomendación de amigo',
        'Visita a la institución', 'Feria de universidades', 'Internet',
        'Radio', 'Televisión', 'Otro',
    ];

    private array $estados_civiles = ['soltero', 'casado', 'union_libre', 'divorciado'];
    private array $areas = ['ciencias_sociales', 'ciencias_naturales', 'economico_administrativo', 'humanidades', 'stem'];
    private array $turnos = ['matutino', 'vespertino'];

    // ─────────────────────────────────────────────────────────────────────────

    public function run(): void
    {
        $carreras = Carrera::all();
        $periodo  = Periodo::where('activo', true)->first() ?? Periodo::first();
        $admin    = User::role('admin')->first();

        if (!$periodo || $carreras->isEmpty()) {
            $this->command->error('Necesitas al menos 1 periodo activo y carreras en la BD.');
            return;
        }

        $this->command->info('Generando aspirantes y alumnos de demostración…');

        $totalAspirantes = 80;
        $totalInscritos  = 45; // subconjunto que se vuelven alumnos

        $aspirantesInscritos = 0;

        for ($i = 0; $i < $totalAspirantes; $i++) {
            $sexo     = fake()->randomElement(['masculino', 'femenino']);
            $nombres  = $sexo === 'masculino'
                ? fake()->randomElement($this->nombres_h)
                : fake()->randomElement($this->nombres_m);
            $apellidoP = fake()->randomElement($this->apellidos);
            $apellidoM = fake()->randomElement($this->apellidos);
            $carrera   = $carreras->random();

            $nacimiento = fake()->dateTimeBetween('-26 years', '-17 years');
            $curp       = $this->generarCurp($nombres, $apellidoP, $apellidoM, $nacimiento, $sexo);

            $estatus = $this->elegirEstatus($i, $totalAspirantes, $totalInscritos, $aspirantesInscritos);

            $aspirante = Aspirante::create([
                'nombres'               => $nombres,
                'apellido_paterno'      => $apellidoP,
                'apellido_materno'      => $apellidoM,
                'curp'                  => $curp,
                'fecha_nacimiento'      => $nacimiento->format('Y-m-d'),
                'sexo'                  => $sexo,
                'municipio_procedencia' => fake()->randomElement($this->municipios),
                'escuela_bachillerato'  => fake()->randomElement($this->escuelas),
                'promedio_bachillerato' => fake()->randomFloat(1, 7.0, 10.0),
                'folio_exani'           => fake()->boolean(60) ? strtoupper(Str::random(8)) : null,
                'puntaje_exani'         => fake()->boolean(60) ? fake()->numberBetween(700, 1100) : null,
                'turno_preferido'       => fake()->randomElement($this->turnos),
                'email'                 => strtolower("{$nombres}.{$apellidoP}.{$i}@gmail.com"),
                'telefono'              => '2' . fake()->numerify('#########'),
                'carrera_id'            => $carrera->id,
                'periodo_id'            => $periodo->id,
                'estatus'               => $estatus,
                'area_bachillerato'     => fake()->randomElement($this->areas),
                'estado_civil'          => fake()->randomElement($this->estados_civiles),
                'medio_enterado'        => fake()->randomElement($this->medios),
                'tiene_equipo_computo'  => fake()->boolean(75),
            ]);

            if ($estatus === 'inscrito') {
                $aspirantesInscritos++;
                $this->inscribir($aspirante, $carrera, $periodo, $admin);
            }
        }

        $this->command->info("✓ {$totalAspirantes} aspirantes creados, {$aspirantesInscritos} inscritos como alumnos.");
    }

    private function elegirEstatus(int $i, int $total, int $targetInscritos, int $yaInscritos): string
    {
        $restantes          = $total - $i;
        $inscritosFaltantes = $targetInscritos - $yaInscritos;

        if ($inscritosFaltantes > 0 && $inscritosFaltantes >= $restantes) {
            return 'inscrito';
        }

        return fake()->randomElement([
            'pendiente', 'pendiente',
            'aceptado', 'aceptado',
            'rechazado',
            'inscrito', 'inscrito', 'inscrito',
        ]);
    }

    private function inscribir(Aspirante $aspirante, $carrera, $periodo, $admin): void
    {
        $año  = now()->format('y');
        $seq  = Inscripcion::whereHas('aspirante', fn ($q) => $q->where('carrera_id', $carrera->id))
                    ->whereYear('created_at', now()->year)
                    ->count() + 1;
        $nc   = sprintf('%s%s%04d', $año, str_pad($carrera->codigo_it ?? '000', 3, '0', STR_PAD_LEFT), $seq);

        $inscripcion = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'carrera_id'        => $carrera->id,
            'periodo_id'        => $periodo->id,
            'numero_control'    => $nc,
            'tipo_ingreso'      => 'nuevo_ingreso',
            'fecha_inscripcion' => now()->subDays(fake()->numberBetween(0, 60)),
            'inscrito_por'      => $admin?->id,
        ]);

        $semestre = fake()->randomElement([1, 1, 1, 2, 3]);
        $estatusAlu = $semestre === 1
            ? 'activo'
            : fake()->randomElement(['activo', 'activo', 'activo', 'baja_temporal', 'baja_definitiva']);

        Alumno::create([
            'inscripcion_id'                    => $inscripcion->id,
            'carrera_id'                        => $carrera->id,
            'periodo_ingreso_id'                => $periodo->id,
            'numero_control'                    => $nc,
            'semestre_actual'                   => $semestre,
            'estatus'                           => $estatusAlu,
            'autorizacion_consulta_expediente'  => 'autorizado',
            'pendiente_certificado_bachillerato'=> fake()->boolean(30),
        ]);
    }

    private function generarCurp(string $nombres, string $ap, string $am, \DateTime $nac, string $sexo): string
    {
        $letra = fn(string $s, int $i = 0) => strtoupper(
            iconv('UTF-8', 'ASCII//TRANSLIT', mb_substr(preg_replace('/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ]/u', '', $s), $i, 1)) ?: 'X'
        );

        $primerVocal = fn(string $s) => strtoupper(
            preg_match('/[aeiouáéíóúAEIOUÁÉÍÓÚ]/u', mb_substr($s, 1), $m) ? iconv('UTF-8', 'ASCII//TRANSLIT', $m[0]) : 'X'
        );

        $sexoCurp = $sexo === 'masculino' ? 'H' : 'M';
        $estado   = 'VZ';
        $fecha    = $nac->format('ymd');

        $parte1 = $letra($ap) . $primerVocal($ap) . $letra($am) . $letra($nombres);
        $parte2 = $fecha . $sexoCurp . $estado;
        $parte3 = $letra($ap, 1) . $letra($am, 1) . $letra($nombres, 1);
        $digito = fake()->randomElement(array_merge(range('A', 'Z'), range('0', '9')));

        $curp = strtoupper($parte1 . $parte2 . $parte3 . $digito . fake()->numerify('#'));

        // Garantiza unicidad en caso de colisión
        if (Aspirante::where('curp', $curp)->exists()) {
            $curp = substr($curp, 0, 17) . fake()->randomElement(range('0', '9'));
        }

        return substr($curp, 0, 18);
    }
}
