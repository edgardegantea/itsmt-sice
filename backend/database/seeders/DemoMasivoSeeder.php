<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Permanencia\Models\EncuestaSocioeconomica;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoMasivoSeeder extends Seeder
{
    const TOTAL_ALUMNOS    = 10000;
    const TOTAL_ASPIRANTES = 469;
    const TOTAL_ENCUESTAS  = 3000;

    private array $nombres = [
        'María','José','Juan','Ana','Luis','Rosa','Carlos','Laura','Miguel','Patricia',
        'Jorge','Claudia','Roberto','Verónica','Alejandro','Sandra','Fernando','Adriana',
        'Ricardo','Mónica','Eduardo','Leticia','Sergio','Diana','Arturo','Silvia','Manuel',
        'Gabriela','Raúl','Norma','Jesús','Beatriz','Antonio','Elizabeth','Javier',
        'Alejandra','David','Brenda','Marco','Karla','Ángel','Nancy','Héctor','Dulce',
        'Gerardo','Fabiola','Víctor','Paola','Oscar','Cristina','Rodrigo','Sofía',
        'Emilio','Valeria','Andrés','Daniela','Felipe','Estefanía','Iván','Marcela',
    ];

    private array $apellidos = [
        'García','Martínez','López','González','Hernández','Pérez','Sánchez','Ramírez',
        'Torres','Flores','Rivera','Gómez','Díaz','Morales','Reyes','Cruz','Ortiz',
        'Gutiérrez','Chávez','Ramos','Vargas','Castillo','Jiménez','Moreno','Mendoza',
        'Álvarez','Ruiz','Aguilar','Medina','Herrera','Vega','Luna','Rojas','Núñez',
        'Acosta','Campos','Fuentes','Cabrera','Salinas','Miranda','Guerrero','Muñoz',
        'Espinoza','Ávila','Contreras','Santiago','Delgado','Ríos','Carrillo','Navarro',
        'Ibarra','Leal','Paredes','Trejo','Villalobos','Esquivel','Córdova','Tapia',
    ];

    private array $municipios = [
        'Monterrey','Guadalajara','Puebla','Toluca','Tijuana','León','Ciudad Juárez',
        'San Luis Potosí','Mérida','Querétaro','Aguascalientes','Morelia','Saltillo',
        'Veracruz','Tampico','Chihuahua','Culiacán','Hermosillo','Mexicali','Cancún',
        'Oaxaca','Tuxtla Gutiérrez','Villahermosa','Durango','Tepic','Colima',
        'Pachuca','Cuernavaca','Zacatecas','Mazatlán','Ciudad Obregón','Los Mochis',
        'Matamoros','Nuevo Laredo','Reynosa','Victoria','Altamira','Mante',
    ];

    private array $escuelas = [
        'CETIS 100','CBTIS 200','Preparatoria Federal','CONALEP','Preparatoria Estatal',
        'CBTa','CECYTE','Bachilleres','Preparatoria Particular','Prepa UNAM','CCH',
        'Colegio de Bachilleres','UANL Preparatoria','Instituto Tecnológico Regional',
        'Preparatoria Municipal','Centro de Bachillerato Tecnológico',
    ];

    private array $colonias = [
        'Centro','Del Valle','Las Flores','Los Pinos','La Paz','Reforma','Industrial',
        'Chapultepec','Jardines','Moderna','Insurgentes','Constitución','Libertad',
        'Independencia','Obrera','Lomas','Las Palmas','El Roble','Primavera',
    ];

    private array $ocupaciones = [
        'Empleado','Comerciante','Agricultor','Maestro','Enfermero','Mecánico',
        'Chofer','Albañil','Carpintero','Electricista','Plomero','Contador',
        'Ingeniero','Médico','Abogado','Secretaria','Ama de casa','Pensionado',
    ];

    private array $centrosTrabajo = [
        'Empresa Privada','Gobierno Municipal','Gobierno Estatal','Gobierno Federal',
        'Propia cuenta','IMSS','ISSSTE','SEP','CFE','PEMEX','Negocio familiar',
    ];

    public function run(): void
    {
        $carreras = Carrera::where('activa', true)->get();
        $periodo  = Periodo::where('activo', true)->first();

        if ($carreras->isEmpty() || ! $periodo) {
            $this->command->error('Se requiere al menos una carrera activa y un periodo activo.');
            return;
        }

        $periodosHistoricos = $this->generarPeriodosHistoricos($periodo);

        // Calcular índices iniciales para no colisionar con datos existentes
        $maxFicha = Aspirante::where('numero_ficha', 'like', 'DEMO-%')
            ->selectRaw("MAX(CAST(NULLIF(regexp_replace(numero_ficha, '[^0-9]', '', 'g'), '') AS INTEGER)) as m")
            ->value('m') ?? 0;
        $fichaStart = $maxFicha + 1;

        $maxEmail = Aspirante::where('email', 'like', 'demo%@test.sice.edu.mx')
            ->selectRaw("MAX(CAST(NULLIF(regexp_replace(email, '[^0-9]', '', 'g'), '') AS INTEGER)) as m")
            ->value('m') ?? 0;
        $emailIdx = $maxEmail + 1;

        // ── 1. Alumnos ────────────────────────────────────────────────────────
        $this->command->info('Generando ' . self::TOTAL_ALUMNOS . ' alumnos…');
        $this->command->getOutput()->progressStart(self::TOTAL_ALUMNOS);

        $alumnosIds = [];

        for ($i = 1; $i <= self::TOTAL_ALUMNOS; $i++) {
            $carrera  = $carreras->random();
            $semestre = random_int(1, 9);
            $periodoIngreso = $periodosHistoricos[$semestre] ?? $periodo;

            [$nombres, $apPaterno, $apMaterno, $sexo, $fechaNac] = $this->datosPersonales();
            $idx   = $fichaStart + $i - 1;
            $curp  = $this->generarCurp($nombres, $apPaterno, $apMaterno, $fechaNac, $sexo, $idx);
            $email = 'demo' . $emailIdx++ . '@test.sice.edu.mx';

            $aspirante = Aspirante::create([
                'numero_ficha'               => 'DEMO-' . str_pad($idx, 6, '0', STR_PAD_LEFT),
                'nombres'                    => $nombres,
                'apellido_paterno'           => $apPaterno,
                'apellido_materno'           => $apMaterno,
                'curp'                       => $curp,
                'fecha_nacimiento'           => $fechaNac,
                'sexo'                       => $sexo,
                'estado_civil'               => $sexo === 'masculino' ? 'soltero' : 'soltera',
                'municipio_procedencia'      => $this->municipios[array_rand($this->municipios)],
                'calle'                      => 'Calle ' . random_int(1, 300),
                'colonia'                    => $this->colonias[array_rand($this->colonias)],
                'ciudad'                     => $this->municipios[array_rand($this->municipios)],
                'estado_domicilio'           => 'Tamaulipas',
                'codigo_postal'              => str_pad(random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'escuela_bachillerato'       => $this->escuelas[array_rand($this->escuelas)],
                'area_bachillerato'          => ['Ciencias', 'Humanidades', 'Económico-Administrativo'][random_int(0, 2)],
                'promedio_bachillerato'      => round(random_int(700, 1000) / 100, 2),
                'turno_preferido'            => random_int(0, 1) ? 'matutino' : 'vespertino',
                'email'                      => $email,
                'telefono'                   => '89' . random_int(10000000, 99999999),
                'folio_preinscripcion_tecnm' => 'TECNM' . str_pad($idx, 8, '0', STR_PAD_LEFT),
                'puntaje_exani'              => round(random_int(800, 1300) / 10, 1),
                'carrera_id'                 => $carrera->id,
                'periodo_id'                 => $periodoIngreso->id,
                'estatus'                    => 'aceptado',
                'medio_enterado'             => ['redes sociales', 'recomendación', 'visita escolar', 'internet'][random_int(0, 3)],
                'tiene_equipo_computo'       => (bool) random_int(0, 1),
                'campus_preferido'           => 'principal',
                'modalidad_preferida'        => 'escolarizada',
            ]);

            $anioIngreso   = $periodoIngreso->fecha_inicio
                ? date('y', strtotime($periodoIngreso->fecha_inicio))
                : date('y');
            $numeroControl = $anioIngreso . $carrera->codigo_it . str_pad($idx, 4, '0', STR_PAD_LEFT);

            $inscripcion = Inscripcion::create([
                'aspirante_id'                   => $aspirante->id,
                'numero_control'                 => $numeroControl,
                'carrera_id'                     => $carrera->id,
                'periodo_id'                     => $periodoIngreso->id,
                'tipo_ingreso'                   => 'nuevo_ingreso',
                'semestre_ingreso'               => 1,
                'fecha_inscripcion'              => $periodoIngreso->fecha_inicio ?? now()->toDateString(),
                'carta_compromiso_generada'      => (bool) random_int(0, 1),
                'solicitud_inscripcion_generada' => (bool) random_int(0, 1),
                'contrato_generado'              => (bool) random_int(0, 1),
            ]);

            $alumno = Alumno::create([
                'inscripcion_id'                     => $inscripcion->id,
                'numero_control'                     => $numeroControl,
                'carrera_id'                         => $carrera->id,
                'periodo_ingreso_id'                 => $periodoIngreso->id,
                'semestre_actual'                    => $semestre,
                'estatus'                            => $this->estatusAleatorio(),
                'autorizacion_consulta_expediente'   => ['nadie', 'padre', 'madre', 'ambos'][random_int(0, 3)],
                'pendiente_certificado_bachillerato' => random_int(0, 10) === 0,
            ]);

            $alumnosIds[] = ['id' => $alumno->id, 'semestre' => $semestre, 'periodo_id' => $periodoIngreso->id];

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();

        // ── 2. Aspirantes sin inscribir ───────────────────────────────────────
        $this->command->info('Generando ' . self::TOTAL_ASPIRANTES . ' aspirantes…');
        $this->command->getOutput()->progressStart(self::TOTAL_ASPIRANTES);

        $aspStart = $fichaStart + self::TOTAL_ALUMNOS;

        for ($j = 1; $j <= self::TOTAL_ASPIRANTES; $j++) {
            $carrera = $carreras->random();
            $idx     = $aspStart + $j - 1;

            [$nombres, $apPaterno, $apMaterno, $sexo, $fechaNac] = $this->datosPersonales();
            $curp  = $this->generarCurp($nombres, $apPaterno, $apMaterno, $fechaNac, $sexo, $idx);
            $email = 'demo' . $emailIdx++ . '@test.sice.edu.mx';

            $estatusOpciones = ['pendiente', 'pendiente', 'pendiente', 'aceptado', 'rechazado'];

            Aspirante::create([
                'numero_ficha'               => 'DEMO-' . str_pad($idx, 6, '0', STR_PAD_LEFT),
                'nombres'                    => $nombres,
                'apellido_paterno'           => $apPaterno,
                'apellido_materno'           => $apMaterno,
                'curp'                       => $curp,
                'fecha_nacimiento'           => $fechaNac,
                'sexo'                       => $sexo,
                'estado_civil'               => $sexo === 'masculino' ? 'soltero' : 'soltera',
                'municipio_procedencia'      => $this->municipios[array_rand($this->municipios)],
                'calle'                      => 'Calle ' . random_int(1, 300),
                'colonia'                    => $this->colonias[array_rand($this->colonias)],
                'ciudad'                     => $this->municipios[array_rand($this->municipios)],
                'estado_domicilio'           => 'Tamaulipas',
                'codigo_postal'              => str_pad(random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'escuela_bachillerato'       => $this->escuelas[array_rand($this->escuelas)],
                'area_bachillerato'          => ['Ciencias', 'Humanidades', 'Económico-Administrativo'][random_int(0, 2)],
                'promedio_bachillerato'      => round(random_int(700, 1000) / 100, 2),
                'turno_preferido'            => random_int(0, 1) ? 'matutino' : 'vespertino',
                'email'                      => $email,
                'telefono'                   => '89' . random_int(10000000, 99999999),
                'folio_preinscripcion_tecnm' => 'TECNM' . str_pad($idx, 8, '0', STR_PAD_LEFT),
                'puntaje_exani'              => round(random_int(800, 1300) / 10, 1),
                'carrera_id'                 => $carrera->id,
                'periodo_id'                 => $periodo->id,
                'estatus'                    => $estatusOpciones[array_rand($estatusOpciones)],
                'medio_enterado'             => ['redes sociales', 'recomendación', 'visita escolar', 'internet'][random_int(0, 3)],
                'tiene_equipo_computo'       => (bool) random_int(0, 1),
                'campus_preferido'           => 'principal',
                'modalidad_preferida'        => 'escolarizada',
            ]);

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();

        // ── 3. Encuestas socioeconómicas ──────────────────────────────────────
        $this->command->info('Generando ' . self::TOTAL_ENCUESTAS . ' encuestas socioeconómicas…');
        $this->command->getOutput()->progressStart(self::TOTAL_ENCUESTAS);

        shuffle($alumnosIds);
        $seleccionados = array_slice($alumnosIds, 0, self::TOTAL_ENCUESTAS);

        $nivelEducativo   = ['primaria', 'secundaria', 'bachiller', 'superior', 'postgrado'];
        $situacionLaboral = ['empleado', 'jubilado', 'desempleado', 'incapacitado'];
        $tipoVivienda     = ['propia', 'alquilada', 'alquiler_venta', 'invasion', 'alquiler_familiar', 'otro'];
        $tipoProp         = ['casa_independiente', 'condominio', 'dpto_edificio', 'quinta', 'otro'];
        $traslados        = ['vehiculo_propio', 'bicicleta', 'motocicleta', 'a_pie', 'transporte_publico'];
        $salud            = ['buena', 'buena', 'buena', 'regular', 'deficiente'];

        foreach ($seleccionados as $a) {
            $padreIngreso  = round(random_int(400000, 2500000) / 100, 2);
            $madreIngreso  = random_int(0, 1) ? round(random_int(200000, 1500000) / 100, 2) : null;
            $totalIngresos = $padreIngreso + ($madreIngreso ?? 0);
            $totalEgresos  = round($totalIngresos * random_int(60, 95) / 100, 2);

            EncuestaSocioeconomica::create([
                'alumno_id'  => $a['id'],
                'periodo_id' => $a['periodo_id'],
                'semestre'   => $a['semestre'],

                'con_quien_vive' => ['padres', 'madre', 'padre', 'solo', 'familiares', 'pareja'][random_int(0, 5)],
                'tiene_beca'     => random_int(0, 4) === 0,
                'beca'           => random_int(0, 4) === 0 ? ['Pronabes', 'Manutención', 'Beca TecNM', 'Municipal'][random_int(0, 3)] : null,
                'ingreso_propio' => random_int(0, 5) === 0 ? 'Trabajo de medio tiempo' : null,

                'padre_nivel_educativo'   => $nivelEducativo[array_rand($nivelEducativo)],
                'padre_situacion_laboral' => $situacionLaboral[array_rand($situacionLaboral)],
                'padre_ocupacion'         => $this->ocupaciones[array_rand($this->ocupaciones)],
                'padre_centro_trabajo'    => $this->centrosTrabajo[array_rand($this->centrosTrabajo)],
                'padre_cargo'             => ['Operativo', 'Supervisor', 'Gerente', 'Director', 'Técnico'][random_int(0, 4)],
                'padre_tiempo_servicio'   => random_int(1, 30) . ' años',
                'padre_ingresos_mensuales' => $padreIngreso,
                'padre_otros_ingresos'    => null,

                'madre_nivel_educativo'   => $nivelEducativo[array_rand($nivelEducativo)],
                'madre_situacion_laboral' => $situacionLaboral[array_rand($situacionLaboral)],
                'madre_ocupacion'         => random_int(0, 1) ? $this->ocupaciones[array_rand($this->ocupaciones)] : 'Ama de casa',
                'madre_centro_trabajo'    => $madreIngreso ? $this->centrosTrabajo[array_rand($this->centrosTrabajo)] : null,
                'madre_cargo'             => $madreIngreso ? ['Operativo', 'Supervisor', 'Técnico'][random_int(0, 2)] : null,
                'madre_tiempo_servicio'   => $madreIngreso ? random_int(1, 20) . ' años' : null,
                'madre_ingresos_mensuales' => $madreIngreso,
                'madre_otros_ingresos'    => null,

                'familia_total_integrantes' => random_int(2, 8),
                'familia_num_hijos'         => random_int(1, 5),
                'familia_edades_hijos'      => implode(', ', array_map(fn() => random_int(5, 25), range(1, random_int(1, 3)))),
                'familia_num_estudiantes'   => random_int(1, 3),

                'vivienda_calle'           => 'Calle ' . random_int(1, 200),
                'vivienda_numero'          => (string) random_int(1, 500),
                'vivienda_colonia'         => $this->colonias[array_rand($this->colonias)],
                'vivienda_municipio'       => $this->municipios[array_rand($this->municipios)],
                'vivienda_tipo'            => $tipoVivienda[array_rand($tipoVivienda)],
                'vivienda_tipo_propiedad'  => $tipoProp[array_rand($tipoProp)],
                'vivienda_otras_propiedades' => null,

                'tiene_vehiculo'   => random_int(0, 3) > 0,
                'vehiculos'        => random_int(0, 1) ? json_encode([['tipo' => 'automóvil', 'marca' => ['Nissan','Toyota','Chevrolet','Honda'][random_int(0,3)], 'año' => random_int(2005, 2023)]]) : null,
                'traslado_escuela' => $traslados[array_rand($traslados)],

                'total_ingresos_familia' => $totalIngresos,
                'otros_ingresos_familia' => null,
                'gastos_mensuales'       => json_encode([
                    'luz'              => random_int(300, 800),
                    'agua'             => random_int(100, 400),
                    'tel_celular'      => random_int(200, 600),
                    'internet'         => random_int(300, 700),
                    'renta'            => random_int(0, 6000),
                    'transporte'       => random_int(500, 2000),
                    'material_escolar' => random_int(200, 1000),
                    'salud'            => random_int(0, 1500),
                    'alimentacion'     => random_int(2000, 6000),
                    'otros'            => random_int(200, 2000),
                ]),
                'total_egresos_familia' => $totalEgresos,

                'salud_estado'           => $salud[array_rand($salud)],
                'salud_problema_familiar' => random_int(0, 5) === 0,
                'salud_especifique'      => null,
                'informacion_adicional'  => null,
                'enviada_at'             => now()->subDays(random_int(1, 180)),
            ]);

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();

        $this->command->info('¡Listo! ' . self::TOTAL_ALUMNOS . ' alumnos, ' . self::TOTAL_ASPIRANTES . ' aspirantes y ' . self::TOTAL_ENCUESTAS . ' encuestas generadas.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function datosPersonales(): array
    {
        $sexo      = random_int(0, 1) ? 'masculino' : 'femenino';
        $nombres   = $this->nombres[array_rand($this->nombres)];
        $apPaterno = $this->apellidos[array_rand($this->apellidos)];
        $apMaterno = $this->apellidos[array_rand($this->apellidos)];
        $anio      = random_int(2000, 2007);
        $mes       = str_pad(random_int(1, 12), 2, '0', STR_PAD_LEFT);
        $dia       = str_pad(random_int(1, 28), 2, '0', STR_PAD_LEFT);
        $fechaNac  = "$anio-$mes-$dia";

        return [$nombres, $apPaterno, $apMaterno, $sexo, $fechaNac];
    }

    private function generarPeriodosHistoricos(Periodo $periodoActual): array
    {
        $map    = [1 => $periodoActual];
        $inicio = \Carbon\Carbon::parse($periodoActual->fecha_inicio ?? now());

        for ($s = 2; $s <= 9; $s++) {
            $fi   = $inicio->copy()->subMonths(($s - 1) * 6);
            $ff   = $fi->copy()->addMonths(4);
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

    private function generarCurp(string $nombres, string $apPaterno, string $apMaterno, string $fechaNac, string $sexo, int $idx): string
    {
        $p = $this->sinTildes($apPaterno);
        $m = $this->sinTildes($apMaterno);
        $n = $this->sinTildes($nombres);

        $parte  = mb_strtoupper($this->primerVocal($p) . mb_substr($p, 0, 1));
        $parte .= mb_strtoupper(mb_substr($m, 0, 1));
        $parte .= mb_strtoupper(mb_substr($n, 0, 1));

        $fecha  = str_replace('-', '', substr($fechaNac, 2));
        $s      = $sexo === 'masculino' ? 'H' : 'M';
        $sufijo = 'TM' . str_pad($idx, 4, '0', STR_PAD_LEFT);

        return substr($parte . $fecha . $s . $sufijo, 0, 18);
    }

    private function sinTildes(string $texto): string
    {
        return str_replace(
            ['á','é','í','ó','ú','ü','Á','É','Í','Ó','Ú','Ü','ñ','Ñ'],
            ['a','e','i','o','u','u','A','E','I','O','U','U','n','N'],
            $texto
        );
    }

    private function primerVocal(string $texto): string
    {
        for ($i = 1; $i < mb_strlen($texto); $i++) {
            $c = mb_strtolower(mb_substr($texto, $i, 1));
            if (in_array($c, ['a', 'e', 'i', 'o', 'u'])) return mb_substr($texto, $i, 1);
        }
        return 'X';
    }

    private function estatusAleatorio(): string
    {
        $r = random_int(1, 100);
        if ($r <= 84) return 'activo';
        if ($r <= 90) return 'baja_temporal';
        if ($r <= 94) return 'baja_definitiva';
        if ($r <= 99) return 'egresado';
        return 'titulado';
    }
}
