<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EstudiantesSeeder extends Seeder
{
    const TOTAL = 5000;

    // Nombres y apellidos mexicanos representativos
    private array $nombres = [
        'María', 'José', 'Juan', 'Ana', 'Luis', 'Rosa', 'Carlos', 'Laura',
        'Miguel', 'Patricia', 'Jorge', 'Claudia', 'Roberto', 'Verónica', 'Alejandro',
        'Sandra', 'Fernando', 'Adriana', 'Ricardo', 'Mónica', 'Eduardo', 'Leticia',
        'Sergio', 'Diana', 'Arturo', 'Silvia', 'Manuel', 'Gabriela', 'Raúl', 'Norma',
        'Jesús', 'Beatriz', 'Antonio', 'Elizabeth', 'Javier', 'Alejandra', 'David',
        'Brenda', 'Marco', 'Karla', 'Ángel', 'Nancy', 'Héctor', 'Dulce', 'Gerardo',
        'Fabiola', 'Víctor', 'Paola', 'Oscar', 'Cristina',
    ];

    private array $apellidos = [
        'García', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez',
        'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Morales', 'Reyes',
        'Cruz', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Vargas', 'Castillo',
        'Jiménez', 'Moreno', 'Mendoza', 'Álvarez', 'Ruiz', 'Aguilar', 'Medina',
        'Herrera', 'Vega', 'Luna', 'Rojas', 'Núñez', 'Acosta', 'Campos', 'Fuentes',
        'Cabrera', 'Salinas', 'Miranda', 'Guerrero', 'Muñoz', 'Espinoza', 'Ávila',
        'Contreras', 'Santiago', 'Delgado', 'Ríos', 'Carrillo', 'Navarro',
    ];

    private array $municipios = [
        'Monterrey', 'Guadalajara', 'Puebla', 'Toluca', 'Tijuana', 'León',
        'Ciudad Juárez', 'La Laguna', 'San Luis Potosí', 'Mérida', 'Querétaro',
        'Aguascalientes', 'Morelia', 'Saltillo', 'Veracruz', 'Tampico', 'Chihuahua',
        'Culiacán', 'Acapulco', 'Hermosillo', 'Mexicali', 'Cancún', 'Oaxaca',
        'Tuxtla Gutiérrez', 'Villahermosa', 'Durango', 'Tepic', 'Colima', 'Campeche',
        'La Paz', 'Chetumal', 'Tlaxcala', 'Pachuca', 'Cuernavaca', 'Chilpancingo',
        'Zacatecas', 'Guanajuato', 'Mazatlán', 'Ciudad Obregón', 'Los Mochis',
    ];

    private array $escuelas = [
        'CETIS 100', 'CBTIS 200', 'Preparatoria Federal', 'CONALEP',
        'Preparatoria Estatal', 'CBTa', 'CECYTE', 'Bachilleres',
        'Preparatoria Particular', 'Instituto Tecnológico', 'Preparatoria Municipal',
        'Colegio de Bachilleres', 'UANL Preparatoria', 'Prepa UNAM', 'CCH',
    ];

    private array $colonias = [
        'Centro', 'Del Valle', 'Las Flores', 'Los Pinos', 'La Paz', 'Reforma',
        'Industrial', 'Chapultepec', 'Jardines', 'Moderna', 'Insurgentes',
        'Constitución', 'Libertad', 'Independencia', 'Obrera',
    ];

    public function run(): void
    {
        $carreras = Carrera::where('activa', true)->get();
        $periodo  = Periodo::where('activo', true)->first();

        if ($carreras->isEmpty() || ! $periodo) {
            $this->command->error('Ejecuta primero Sprint1Seeder (carreras y periodo requeridos).');
            return;
        }

        // Periodos históricos simulados para distribuir semestres 1–9
        $periodosHistoricos = $this->generarPeriodosHistoricos($periodo);

        $this->command->getOutput()->progressStart(self::TOTAL);

        // Arrancar después del último índice ya existente para no colisionar en re-ejecuciones
        $maxEmail  = Aspirante::where('email', 'like', 'estudiante%@test.sice.edu.mx')
            ->selectRaw("MAX(CAST(NULLIF(regexp_replace(email, '[^0-9]', '', 'g'), '') AS INTEGER)) as max_idx")
            ->value('max_idx');
        $emailIdx  = ($maxEmail ?? 0) + 1;

        $maxFicha  = Aspirante::where('numero_ficha', 'like', 'SEED-%')
            ->selectRaw("MAX(CAST(NULLIF(regexp_replace(numero_ficha, '[^0-9]', '', 'g'), '') AS INTEGER)) as max_idx")
            ->value('max_idx');
        $fichaStart = ($maxFicha ?? 0) + 1;

        for ($i = 1; $i <= self::TOTAL; $i++) {
            $carrera  = $carreras->random();
            $semestre = random_int(1, 9);

            // El periodo de ingreso corresponde al semestre actual
            $periodoIngreso = $periodosHistoricos[$semestre] ?? $periodo;

            $nombres   = $this->nombres[array_rand($this->nombres)];
            $apPaterno = $this->apellidos[array_rand($this->apellidos)];
            $apMaterno = $this->apellidos[array_rand($this->apellidos)];
            $sexo      = $i % 2 === 0 ? 'masculino' : 'femenino';
            $fechaNac  = $this->fechaNacimientoAleatoria();
            $curp      = $this->generarCurp($nombres, $apPaterno, $apMaterno, $fechaNac, $sexo, $fichaStart + $i - 1);
            $email     = 'estudiante' . $emailIdx++ . '@test.sice.edu.mx';

            $municipio = $this->municipios[array_rand($this->municipios)];
            $escuela   = $this->escuelas[array_rand($this->escuelas)];
            $colonia   = $this->colonias[array_rand($this->colonias)];

            // numero_ficha globalmente único, continúa donde quedó la última ejecución
            $numeroFicha = 'SEED-' . str_pad($fichaStart + $i - 1, 5, '0', STR_PAD_LEFT);

            // ── Aspirante ────────────────────────────────────────────────────
            $aspirante = Aspirante::create([
                'numero_ficha'          => $numeroFicha,
                'nombres'               => $nombres,
                'apellido_paterno'      => $apPaterno,
                'apellido_materno'      => $apMaterno,
                'curp'                  => $curp,
                'fecha_nacimiento'      => $fechaNac,
                'sexo'                  => $sexo,
                'estado_civil'          => $sexo === 'masculino' ? 'soltero' : 'soltera',
                'municipio_procedencia' => $municipio,
                'calle'                 => 'Calle ' . random_int(1, 200),
                'colonia'               => $colonia,
                'ciudad'                => $municipio,
                'estado_domicilio'      => 'Tamaulipas',
                'codigo_postal'         => str_pad(random_int(1000, 99999), 5, '0', STR_PAD_LEFT),
                'escuela_bachillerato'  => $escuela,
                'area_bachillerato'     => ['Ciencias', 'Humanidades', 'Económico-Administrativo'][random_int(0, 2)],
                'promedio_bachillerato' => round(random_int(700, 1000) / 100, 2),
                'turno_preferido'       => random_int(0, 1) ? 'matutino' : 'vespertino',
                'email'                 => $email,
                'telefono'              => '89' . random_int(10000000, 99999999),
                'folio_preinscripcion_tecnm' => 'TECNM' . str_pad($fichaStart + $i - 1, 8, '0', STR_PAD_LEFT),
                'puntaje_exani'         => round(random_int(800, 1300) / 10, 1),
                'carrera_id'            => $carrera->id,
                'periodo_id'            => $periodoIngreso->id,
                'estatus'               => 'aceptado',
                'medio_enterado'        => ['redes sociales', 'recomendación', 'visita escolar', 'internet'][random_int(0, 3)],
                'tiene_equipo_computo'  => (bool) random_int(0, 1),
                'campus_preferido'      => 'principal',
                'modalidad_preferida'   => 'escolarizada',
            ]);

            // ── Número de control (formato TecNM: [AA][NNN][####]) ────────────
            $anioIngreso   = $periodoIngreso->fecha_inicio
                ? date('y', strtotime($periodoIngreso->fecha_inicio))
                : date('y');
            $numeroControl = $anioIngreso . $carrera->codigo_it . str_pad($fichaStart + $i - 1, 4, '0', STR_PAD_LEFT);

            // ── Inscripción ──────────────────────────────────────────────────
            $inscripcion = Inscripcion::create([
                'aspirante_id'    => $aspirante->id,
                'numero_control'  => $numeroControl,
                'carrera_id'      => $carrera->id,
                'periodo_id'      => $periodoIngreso->id,
                'tipo_ingreso'    => 'nuevo_ingreso',
                'semestre_ingreso' => 1,
                'fecha_inscripcion' => $periodoIngreso->fecha_inicio ?? now()->toDateString(),
                'carta_compromiso_generada'    => (bool) random_int(0, 1),
                'solicitud_inscripcion_generada' => (bool) random_int(0, 1),
                'contrato_generado'            => (bool) random_int(0, 1),
            ]);

            // ── Alumno ───────────────────────────────────────────────────────
            Alumno::create([
                'inscripcion_id'    => $inscripcion->id,
                'numero_control'    => $numeroControl,
                'carrera_id'        => $carrera->id,
                'periodo_ingreso_id' => $periodoIngreso->id,
                'semestre_actual'   => $semestre,
                'estatus'           => $this->estatusAleatorio(),
                'autorizacion_consulta_expediente' => ['nadie', 'padre', 'madre', 'ambos'][random_int(0, 3)],
                'pendiente_certificado_bachillerato' => random_int(0, 10) === 0, // 10% pendiente
            ]);

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();
        $this->command->info(self::TOTAL . ' estudiantes generados correctamente.');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function generarPeriodosHistoricos(Periodo $periodoActual): array
    {
        // Semestre 1 = periodo actual; semestres anteriores = ficticios hacia atrás
        $map    = [1 => $periodoActual];
        $inicio = \Carbon\Carbon::parse($periodoActual->fecha_inicio ?? now());

        for ($s = 2; $s <= 9; $s++) {
            $mesesAtras = ($s - 1) * 6;
            $fi = $inicio->copy()->subMonths($mesesAtras);
            $ff = $fi->copy()->addMonths(4);
            $tipo = $fi->month >= 8 ? 'Agosto–Diciembre' : 'Enero–Junio';

            $map[$s] = Periodo::firstOrCreate(
                ['nombre' => $tipo . ' ' . $fi->year],
                [
                    'fecha_inicio' => $fi->toDateString(),
                    'fecha_fin'    => $ff->toDateString(),
                    'activo'       => false,
                    'tipo'         => 'ordinario',
                ]
            );
        }

        return $map;
    }

    private function fechaNacimientoAleatoria(): string
    {
        $anio = random_int(2000, 2007);
        $mes  = str_pad(random_int(1, 12), 2, '0', STR_PAD_LEFT);
        $dia  = str_pad(random_int(1, 28), 2, '0', STR_PAD_LEFT);
        return "$anio-$mes-$dia";
    }

    private function generarCurp(
        string $nombres,
        string $apPaterno,
        string $apMaterno,
        string $fechaNac,
        string $sexo,
        int $idx
    ): string {
        $p  = $this->sinTildes($apPaterno);
        $m  = $this->sinTildes($apMaterno);
        $n  = $this->sinTildes($nombres);

        $parte  = mb_strtoupper($this->primerVocal($p) . mb_substr($p, 0, 1));
        $parte .= mb_strtoupper(mb_substr($m, 0, 1));
        $parte .= mb_strtoupper(mb_substr($n, 0, 1));

        $fecha  = str_replace('-', '', substr($fechaNac, 2));   // yymmdd — ASCII seguro
        $s      = $sexo === 'masculino' ? 'H' : 'M';
        $sufijo = 'TM' . str_pad($idx, 4, '0', STR_PAD_LEFT);

        return substr($parte . $fecha . $s . $sufijo, 0, 18);
    }

    private function sinTildes(string $texto): string
    {
        $from = ['á','é','í','ó','ú','ü','Á','É','Í','Ó','Ú','Ü','ñ','Ñ'];
        $to   = ['a','e','i','o','u','u','A','E','I','O','U','U','n','N'];
        return str_replace($from, $to, $texto);
    }

    private function primerVocal(string $texto): string
    {
        $len = mb_strlen($texto);
        for ($i = 1; $i < $len; $i++) {
            $c = mb_strtolower(mb_substr($texto, $i, 1));
            if (in_array($c, ['a', 'e', 'i', 'o', 'u'])) {
                return mb_substr($texto, $i, 1);
            }
        }
        return 'X';
    }

    private function estatusAleatorio(): string
    {
        $r = random_int(1, 100);
        if ($r <= 85) return 'activo';
        if ($r <= 91) return 'baja_temporal';
        if ($r <= 94) return 'baja_definitiva';
        return 'egresado';
    }
}
