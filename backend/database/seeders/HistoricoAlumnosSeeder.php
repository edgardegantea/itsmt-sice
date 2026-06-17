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

class HistoricoAlumnosSeeder extends Seeder
{
    private array $nombres_h = [
        'Carlos', 'José', 'Miguel', 'Ángel', 'Alejandro', 'Juan', 'Diego', 'Luis',
        'Fernando', 'Ricardo', 'Eduardo', 'Roberto', 'Sergio', 'Andrés', 'Marco',
        'Víctor', 'Omar', 'Iván', 'Jesús', 'Emmanuel', 'Rodrigo', 'Daniel', 'Kevin',
        'Jonathan', 'Armando', 'Salvador', 'Arturo', 'Julio', 'Francisco', 'Rafael',
        'Héctor', 'Gustavo', 'Enrique', 'Mauricio', 'Pablo', 'Raúl', 'Gerardo',
    ];

    private array $nombres_m = [
        'María', 'Ana', 'Laura', 'Sofía', 'Valeria', 'Fernanda', 'Karla', 'Daniela',
        'Paola', 'Jessica', 'Verónica', 'Adriana', 'Claudia', 'Mariana', 'Lucía',
        'Gabriela', 'Alejandra', 'Brenda', 'Itzel', 'Mónica', 'Berenice', 'Nadia',
        'Ximena', 'Estefanía', 'Diana', 'Patricia', 'Yesenia', 'Alma', 'Rosa', 'Elena',
        'Samantha', 'Cynthia', 'Liliana', 'Norma', 'Erika', 'Vanessa', 'Miriam',
    ];

    private array $apellidos = [
        'García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez',
        'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Torres', 'Rivera', 'Díaz', 'Morales',
        'Jiménez', 'Reyes', 'Gutiérrez', 'Ortiz', 'Vargas', 'Mendoza', 'Castillo',
        'Ruiz', 'Aguilar', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Ramos', 'Luna',
        'Salinas', 'Velázquez', 'Mejía', 'Suárez', 'Fuentes', 'Ávila', 'Rojas', 'Vega',
        'Delgado', 'Domínguez', 'Guerrero', 'Medina', 'Núñez', 'Soto', 'Herrera',
        'Trejo', 'Peña', 'Lara', 'Cortés', 'Cervantes', 'Juárez', 'Ríos', 'Navarrete',
    ];

    private array $escuelas = [
        'CBTis 75', 'CBTis 166', 'COBAEV 07', 'COBAEV 15', 'COBAEV 31',
        'Prepa Veracruzana', 'CECyTE Veracruz', 'CETMAR 04', 'CONALEP Martínez',
        'Prepa Regional ITSMT', 'Centro de Bachillerato Tecnológico 48',
        'Colegio de Bachilleres Plantel 22', 'Bachillerato UNAM',
    ];

    private array $municipios = [
        'Martínez de la Torre', 'Papantla', 'Poza Rica', 'Tuxpan', 'Misantla',
        'Jalapa', 'Veracruz', 'Nautla', 'Vega de Alatorre', 'Tecolutla',
        'Gutiérrez Zamora', 'Cazones', 'Coatzintla', 'Tihuatlán',
    ];

    private array $medios = ['Redes sociales', 'Recomendación de familiar', 'Internet', 'Feria de universidades'];
    private array $estados_civiles = ['soltero', 'casado', 'union_libre'];
    private array $areas = ['ciencias_sociales', 'ciencias_naturales', 'economico_administrativo', 'stem'];
    private array $turnos = ['matutino', 'vespertino'];

    // Semestres que existen en ingeniería (9 semestres)
    // Por cohorte de ingreso, el semestre actual depende del año y período de ingreso
    private array $periodosDef = [
        // [nombre, tipo, año_inicio, año_fin, mes_inicio, mes_fin, semestre_activo_ahora]
        ['Agosto–Diciembre 2020', 'ordinario', '2020-08-01', '2020-12-15', 12],
        ['Enero–Junio 2021',      'ordinario', '2021-01-15', '2021-06-30', 11],
        ['Agosto–Diciembre 2021', 'ordinario', '2021-08-01', '2021-12-15', 10],
        ['Enero–Junio 2022',      'ordinario', '2022-01-15', '2022-06-30', 9],
        ['Agosto–Diciembre 2022', 'ordinario', '2022-08-01', '2022-12-15', 8],
        ['Enero–Junio 2023',      'ordinario', '2023-01-15', '2023-06-30', 7],
        ['Agosto–Diciembre 2023', 'ordinario', '2023-08-01', '2023-12-15', 6],
        ['Enero–Junio 2024',      'ordinario', '2024-01-15', '2024-06-30', 5],
        ['Agosto–Diciembre 2024', 'ordinario', '2024-08-01', '2024-12-15', 4],
        ['Enero–Junio 2025',      'ordinario', '2025-01-15', '2025-06-30', 3],
        ['Agosto–Diciembre 2025', 'ordinario', '2025-08-01', '2025-12-15', 2],
        ['Enero–Junio 2026',      'ordinario', '2026-01-15', '2026-06-30', 1],
    ];

    // Contador de secuencia por [año][carrera_codigo_it] para NCs únicos
    private array $seq = [];

    private function siguienteSeq(string $anio, string $codigo): int
    {
        $key = $anio . '_' . $codigo;
        if (!isset($this->seq[$key])) {
            // Parte desde el máximo existente en BD para ese prefijo
            $prefijo = $anio . str_pad($codigo, 3, '0', STR_PAD_LEFT);
            $max = Inscripcion::where('numero_control', 'like', $prefijo . '%')
                ->selectRaw("MAX(CAST(RIGHT(numero_control,4) AS INTEGER)) as max_seq")
                ->value('max_seq') ?? 0;
            $this->seq[$key] = $max;
        }
        return ++$this->seq[$key];
    }

    public function run(): void
    {
        $carreras = Carrera::all();
        $admin    = User::role('admin')->first();

        if ($carreras->isEmpty()) {
            $this->command->error('No hay carreras en la BD.');
            return;
        }

        $this->command->info('Creando periodos históricos…');
        $periodos = $this->crearPeriodos();

        $this->command->info('Generando alumnos históricos por cohorte…');

        $totalAlumnos = 0;

        foreach ($periodos as $def) {
            [$periodo, $semestreActual] = $def;

            // Cuántos alumnos ingresaron en ese periodo (más en años recientes)
            $cantidad = match(true) {
                $semestreActual >= 10 => fake()->numberBetween(8, 15),   // cohortes antiguas — más bajas
                $semestreActual >= 7  => fake()->numberBetween(12, 22),
                $semestreActual >= 4  => fake()->numberBetween(18, 30),
                default               => fake()->numberBetween(20, 35),  // más recientes — más llenas
            };

            for ($i = 0; $i < $cantidad; $i++) {
                $carrera = $carreras->random();
                $alumno  = $this->crearAlumno($periodo, $carrera, $admin, $semestreActual, $totalAlumnos);
                if ($alumno) $totalAlumnos++;
            }

            $this->command->line("  · {$periodo->nombre} — sem. {$semestreActual} — {$cantidad} alumnos");
        }

        $this->command->info("✓ {$totalAlumnos} alumnos históricos creados en " . count($periodos) . " periodos.");
    }

    private function crearPeriodos(): array
    {
        $resultado = [];

        foreach ($this->periodosDef as $def) {
            [$nombre, $tipo, $inicio, $fin, $semActual] = $def;

            $periodo = Periodo::firstOrCreate(
                ['nombre' => $nombre],
                [
                    'tipo'        => $tipo,
                    'fecha_inicio'=> $inicio,
                    'fecha_fin'   => $fin,
                    'activo'      => false,
                ]
            );

            $resultado[] = [$periodo, $semActual];
        }

        return $resultado;
    }

    private function crearAlumno($periodo, $carrera, $admin, int $semestreActual, int $idx): ?Alumno
    {
        $sexo      = fake()->randomElement(['masculino', 'femenino']);
        $nombres   = $sexo === 'masculino'
            ? fake()->randomElement($this->nombres_h)
            : fake()->randomElement($this->nombres_m);
        $apellidoP = fake()->randomElement($this->apellidos);
        $apellidoM = fake()->randomElement($this->apellidos);

        // Edad coherente con el semestre: si está en sem 9, tiene ~22-26 años
        $edadMin = 17 + (int)($semestreActual / 2);
        $edadMax = $edadMin + 5;
        $nacimiento = fake()->dateTimeBetween("-{$edadMax} years", "-{$edadMin} years");

        $curp = $this->generarCurp($nombres, $apellidoP, $apellidoM, $nacimiento, $sexo);

        // Evitar colisiones de CURP
        if (Aspirante::where('curp', $curp)->exists()) {
            $curp = substr($curp, 0, 16) . fake()->numerify('##');
        }

        $emailBase = strtolower(
            iconv('UTF-8', 'ASCII//TRANSLIT', "{$nombres}.{$apellidoP}") . ".{$idx}"
        );
        $email = preg_replace('/[^a-z0-9._@]/', '', $emailBase) . '@gmail.com';

        if (Aspirante::where('email', $email)->exists()) {
            $email = preg_replace('/\d+@/', fake()->numberBetween(100, 999) . '@', $email);
        }

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
            'turno_preferido'       => fake()->randomElement($this->turnos),
            'email'                 => $email,
            'telefono'              => '2' . fake()->numerify('#########'),
            'carrera_id'            => $carrera->id,
            'periodo_id'            => $periodo->id,
            'estatus'               => 'inscrito',
            'area_bachillerato'     => fake()->randomElement($this->areas),
            'estado_civil'          => fake()->randomElement($this->estados_civiles),
            'medio_enterado'        => fake()->randomElement($this->medios),
            'tiene_equipo_computo'  => fake()->boolean(70),
        ]);

        // Número de control histórico
        $anio   = substr($periodo->fecha_inicio, 2, 2);
        $codigo = str_pad($carrera->codigo_it ?? '000', 3, '0', STR_PAD_LEFT);
        $seq    = $this->siguienteSeq($anio, $codigo);
        $nc     = $anio . $codigo . sprintf('%04d', $seq);

        $inscripcion = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'carrera_id'        => $carrera->id,
            'periodo_id'        => $periodo->id,
            'numero_control'    => $nc,
            'tipo_ingreso'      => 'nuevo_ingreso',
            'fecha_inscripcion' => $periodo->fecha_inicio,
            'inscrito_por'      => $admin?->id,
        ]);

        // Estatus coherente con el semestre actual
        $estatus = $this->elegirEstatusAlumno($semestreActual);

        return Alumno::create([
            'inscripcion_id'                    => $inscripcion->id,
            'carrera_id'                        => $carrera->id,
            'periodo_ingreso_id'                => $periodo->id,
            'numero_control'                    => $nc,
            'semestre_actual'                   => $semestreActual > 9 ? 9 : $semestreActual,
            'estatus'                           => $estatus,
            'autorizacion_consulta_expediente'  => 'autorizado',
            'pendiente_certificado_bachillerato'=> fake()->boolean(20),
        ]);
    }

    private function elegirEstatusAlumno(int $semestre): string
    {
        if ($semestre >= 9) {
            // Cohortes muy antiguas: mayoría titulados o egresados
            return fake()->randomElement([
                'titulado', 'titulado', 'titulado',
                'egresado', 'egresado',
                'baja_definitiva',
            ]);
        }

        if ($semestre >= 7) {
            return fake()->randomElement([
                'activo', 'activo', 'activo',
                'egresado',
                'baja_temporal',
                'baja_definitiva',
            ]);
        }

        // Semestres intermedios y bajos: mayoría activos
        return fake()->randomElement([
            'activo', 'activo', 'activo', 'activo',
            'baja_temporal',
            'baja_definitiva',
        ]);
    }

    private function generarCurp(string $nombres, string $ap, string $am, \DateTime $nac, string $sexo): string
    {
        $letra = fn(string $s, int $i = 0) => strtoupper(
            iconv('UTF-8', 'ASCII//TRANSLIT', mb_substr(preg_replace('/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ]/u', '', $s), $i, 1)) ?: 'X'
        );

        $primerVocal = fn(string $s) => strtoupper(
            preg_match('/[aeiouáéíóúAEIOUÁÉÍÓÚ]/u', mb_substr($s, 1), $m)
                ? iconv('UTF-8', 'ASCII//TRANSLIT', $m[0])
                : 'X'
        );

        $sexoCurp = $sexo === 'masculino' ? 'H' : 'M';
        $fecha    = $nac->format('ymd');

        $parte1 = $letra($ap) . $primerVocal($ap) . $letra($am) . $letra($nombres);
        $parte2 = $fecha . $sexoCurp . 'VZ';
        $parte3 = $letra($ap, 1) . $letra($am, 1) . $letra($nombres, 1);
        $digito = fake()->randomElement(array_merge(range('A', 'Z'), range('0', '9')));

        return strtoupper(mb_substr($parte1 . $parte2 . $parte3 . $digito . fake()->numerify('#'), 0, 18));
    }
}
