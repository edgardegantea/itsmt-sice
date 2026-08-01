<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Reemplaza los datos de aspirantes/alumnos (antes sembrados sin control de periodo,
 * ~5000 filas repartidas en 12 periodos distintos) por un conjunto acotado y explícito:
 * un lote de aspirantes (con su inscripción y alumno) por cada periodo Agosto–Diciembre
 * de 2021 a 2026, con cantidades aleatorias entre 300 y 650.
 */
class AspirantesSembradosSeeder extends Seeder
{
    private const CANTIDAD_MIN = 300;
    private const CANTIDAD_MAX = 650;

    /** [año, semestre_actual estimado hoy (2026) para ese cohorte de ingreso Agosto–Diciembre] */
    private array $periodosDef = [
        [2021, 11],
        [2022, 9],
        [2023, 7],
        [2024, 5],
        [2025, 3],
        [2026, 1],
    ];

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
    ];

    private array $escuelas = [
        'CBTis 75', 'CBTis 166', 'COBAEV 07', 'COBAEV 15', 'COBAEV 31',
        'Prepa Veracruzana', 'CECyTE Veracruz', 'CETMAR 04', 'CONALEP Martínez',
        'Prepa Regional ITSMT',
    ];

    private array $municipios = [
        'Martínez de la Torre', 'Papantla', 'Poza Rica', 'Tuxpan', 'Misantla',
        'Jalapa', 'Veracruz', 'Nautla', 'Vega de Alatorre', 'Tecolutla',
    ];

    private array $medios = ['Redes sociales', 'Recomendación de familiar', 'Internet', 'Feria de universidades'];
    private array $estados_civiles = ['soltero', 'casado', 'union_libre'];
    private array $areas = ['ciencias_sociales', 'ciencias_naturales', 'economico_administrativo', 'stem'];
    private array $turnos = ['matutino', 'vespertino'];

    private array $seq = [];
    private int $fichaSeq = 0;

    public function run(): void
    {
        $carreras = Carrera::all();
        if ($carreras->isEmpty()) {
            $this->command->error('No hay carreras en la BD.');
            return;
        }

        $this->command->info('Eliminando aspirantes/inscripciones/alumnos existentes (sin control de periodo)…');
        DB::table('alumnos')->delete();
        DB::table('inscripciones')->delete();
        DB::table('aspirantes')->delete();

        $admin = User::role('admin')->first();
        $totalGeneral = 0;

        foreach ($this->periodosDef as [$anio, $semestreActual]) {
            $periodo = Periodo::firstOrCreate(
                ['nombre' => "Agosto–Diciembre {$anio}"],
                [
                    'tipo'         => 'ordinario',
                    'fecha_inicio' => "{$anio}-08-17",
                    'fecha_fin'    => "{$anio}-12-19",
                    'activo'       => false,
                ]
            );

            $cantidad = random_int(self::CANTIDAD_MIN, self::CANTIDAD_MAX);

            for ($i = 0; $i < $cantidad; $i++) {
                $carrera = $carreras->random();
                $this->crearAlumno($periodo, $carrera, $admin, $semestreActual, $totalGeneral);
                $totalGeneral++;
            }

            $this->command->line("  · {$periodo->nombre} — {$cantidad} aspirantes");
        }

        $this->command->info("✓ {$totalGeneral} aspirantes (con inscripción y alumno) creados en " . count($this->periodosDef) . ' periodos Agosto–Diciembre (2021-2026).');
    }

    private function siguienteSeq(string $anio, string $codigo): int
    {
        $key = $anio . '_' . $codigo;
        if (! isset($this->seq[$key])) {
            $prefijo = $anio . str_pad($codigo, 3, '0', STR_PAD_LEFT);
            $max = Inscripcion::where('numero_control', 'like', $prefijo . '%')
                ->selectRaw("MAX(CAST(RIGHT(numero_control,4) AS INTEGER)) as max_seq")
                ->value('max_seq') ?? 0;
            $this->seq[$key] = $max;
        }
        return ++$this->seq[$key];
    }

    private function crearAlumno(Periodo $periodo, Carrera $carrera, ?User $admin, int $semestreActual, int $idx): ?Alumno
    {
        $sexo      = fake()->randomElement(['masculino', 'femenino']);
        $nombres   = $sexo === 'masculino'
            ? fake()->randomElement($this->nombres_h)
            : fake()->randomElement($this->nombres_m);
        $apellidoP = fake()->randomElement($this->apellidos);
        $apellidoM = fake()->randomElement($this->apellidos);

        $edadMin = 17 + (int) ($semestreActual / 2);
        $edadMax = $edadMin + 5;
        $nacimiento = fake()->dateTimeBetween("-{$edadMax} years", "-{$edadMin} years");

        $curp = $this->generarCurp($nombres, $apellidoP, $apellidoM, $nacimiento, $sexo);
        if (Aspirante::where('curp', $curp)->exists()) {
            $curp = substr($curp, 0, 16) . fake()->numerify('##');
        }

        $emailBase = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', "{$nombres}.{$apellidoP}") . ".{$idx}");
        $email = preg_replace('/[^a-z0-9._@]/', '', $emailBase) . '@gmail.com';
        if (Aspirante::where('email', $email)->exists()) {
            $email = preg_replace('/\d+@/', fake()->numberBetween(100, 999) . '@', $email);
        }

        // `Aspirante::generarFicha()` cuenta aspirantes por periodo pero `numero_ficha` es
        // único globalmente (ver migración add_numero_ficha_to_aspirantes) — con varios periodos
        // sembrados en la misma corrida, el primer aspirante de cada periodo colisionaría con
        // "2026-0001". Se genera aquí un folio único por periodo con un contador global.
        $numeroFicha = substr($periodo->fecha_inicio, 0, 4) . '-' . str_pad(++$this->fichaSeq, 5, '0', STR_PAD_LEFT);

        $aspirante = Aspirante::create([
            'numero_ficha'          => $numeroFicha,
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

        $estatus = $this->elegirEstatusAlumno($semestreActual);

        return Alumno::create([
            'inscripcion_id'                     => $inscripcion->id,
            'carrera_id'                          => $carrera->id,
            'periodo_ingreso_id'                  => $periodo->id,
            'numero_control'                      => $nc,
            'semestre_actual'                      => $semestreActual > 9 ? 9 : $semestreActual,
            'estatus'                             => $estatus,
            'autorizacion_consulta_expediente'    => 'autorizado',
            'pendiente_certificado_bachillerato'  => fake()->boolean(20),
        ]);
    }

    private function elegirEstatusAlumno(int $semestre): string
    {
        if ($semestre >= 9) {
            return fake()->randomElement(['titulado', 'titulado', 'titulado', 'egresado', 'egresado', 'baja_definitiva']);
        }
        if ($semestre >= 7) {
            return fake()->randomElement(['activo', 'activo', 'activo', 'egresado', 'baja_temporal', 'baja_definitiva']);
        }
        return fake()->randomElement(['activo', 'activo', 'activo', 'activo', 'baja_temporal', 'baja_definitiva']);
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
