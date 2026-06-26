<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DocentesCargasSeeder extends Seeder
{
    // ── Catálogo de docentes ──────────────────────────────────────────────────

    private array $nombresDocentes = [
        ['nombre' => 'Adriana López Martínez',       'clave' => 'E10001', 'huella' => '80101', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Bernardo Sánchez Ramírez',     'clave' => 'E10002', 'huella' => '80102', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Carolina Pérez Jiménez',       'clave' => 'E10003', 'huella' => '80103', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Daniel Torres García',          'clave' => 'E10004', 'huella' => '80104', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Elena Vázquez Morales',        'clave' => 'E10005', 'huella' => '80105', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Fernando Hernández Cruz',      'clave' => 'E10006', 'huella' => '80106', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Gabriela Mendoza Ríos',        'clave' => 'E10007', 'huella' => '80107', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Hugo Castillo Alvarado',       'clave' => 'E10008', 'huella' => '80108', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Isabel Flores Ortega',         'clave' => 'E10009', 'huella' => '80109', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Javier Reyes Medina',          'clave' => 'E10010', 'huella' => '80110', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Karen Romero Salinas',         'clave' => 'E10011', 'huella' => '80111', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Luis Alberto Nava Gutiérrez',  'clave' => 'E10012', 'huella' => '80112', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'María del Carmen Díaz Leal',   'clave' => 'E10013', 'huella' => '80113', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Nicolás Guerrero Espinoza',    'clave' => 'E10014', 'huella' => '80114', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Olivia Ramos Serrano',         'clave' => 'E10015', 'huella' => '80115', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Pablo Moreno Fuentes',         'clave' => 'E10016', 'huella' => '80116', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Quirina Aguilar Montoya',      'clave' => 'E10017', 'huella' => '80117', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Ricardo León Pacheco',         'clave' => 'E10018', 'huella' => '80118', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Sandra Trejo Villanueva',      'clave' => 'E10019', 'huella' => '80119', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Tomás Vargas Cisneros',        'clave' => 'E10020', 'huella' => '80120', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Ursula Molina Bravo',          'clave' => 'E10021', 'huella' => '80121', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Víctor Herrera Mejía',         'clave' => 'E10022', 'huella' => '80122', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Wendy Acosta Pedraza',         'clave' => 'E10023', 'huella' => '80123', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Xavier Delgado Olvera',        'clave' => 'E10024', 'huella' => '80124', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Yolanda Cervantes Ibáñez',     'clave' => 'E10025', 'huella' => '80125', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Zacarías Ponce Téllez',        'clave' => 'E10026', 'huella' => '80126', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Alejandra Ruiz Domínguez',     'clave' => 'E10027', 'huella' => '80127', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Benjamín Solano Aranda',       'clave' => 'E10028', 'huella' => '80128', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Claudia Estrada Benítez',      'clave' => 'E10029', 'huella' => '80129', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'David Cano Miranda',           'clave' => 'E10030', 'huella' => '80130', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Esther Guzmán Cabrera',        'clave' => 'E10031', 'huella' => '80131', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Felipe Tapia Gallegos',        'clave' => 'E10032', 'huella' => '80132', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Gloria Navarrete Orozco',      'clave' => 'E10033', 'huella' => '80133', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Héctor Ibarra Zamora',         'clave' => 'E10034', 'huella' => '80134', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Ingrid Palomino Vega',         'clave' => 'E10035', 'huella' => '80135', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Jorge Balderas Quintero',      'clave' => 'E10036', 'huella' => '80136', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Karina Espejo Lozano',         'clave' => 'E10037', 'huella' => '80137', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Leonardo Arce Peña',           'clave' => 'E10038', 'huella' => '80138', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Marcela Uribe Contreras',      'clave' => 'E10039', 'huella' => '80139', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Norberto Leiva Santana',       'clave' => 'E10040', 'huella' => '80140', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Patricia Ocampo Fuerte',       'clave' => 'E10041', 'huella' => '80141', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Raúl Mendívil Barrón',         'clave' => 'E10042', 'huella' => '80142', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Silvia Coronado Arias',        'clave' => 'E10043', 'huella' => '80143', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Tania Bautista Conde',         'clave' => 'E10044', 'huella' => '80144', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Ulises Montes Cuéllar',        'clave' => 'E10045', 'huella' => '80145', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Valentina Soria Briones',      'clave' => 'E10046', 'huella' => '80146', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Wilfredo Jasso Salazar',       'clave' => 'E10047', 'huella' => '80147', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Ximena Parra Galván',          'clave' => 'E10048', 'huella' => '80148', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Yesenia Campos Alejo',         'clave' => 'E10049', 'huella' => '80149', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
        ['nombre' => 'Zaira Muñoz Piñeda',           'clave' => 'E10050', 'huella' => '80150', 'nombramiento' => 'Profesor Asignatura "A"',          'tipo_horas' => 'A'],
        ['nombre' => 'Arturo Maldonado Vera',        'clave' => 'E10051', 'huella' => '80151', 'nombramiento' => 'Profesor de Tiempo Completo',      'tipo_horas' => 'TC'],
        ['nombre' => 'Beatriz Portillo Sánchez',     'clave' => 'E10052', 'huella' => '80152', 'nombramiento' => 'Profesor Asignatura "B"',          'tipo_horas' => 'B'],
    ];

    // ── Horarios posibles por turno ───────────────────────────────────────────

    private array $bloquesPorTurno = [
        'matutino'   => [
            [['lunes','miercoles','viernes'], '07:00', '08:00'],
            [['lunes','miercoles','viernes'], '08:00', '09:00'],
            [['lunes','miercoles','viernes'], '09:00', '10:00'],
            [['lunes','miercoles','viernes'], '10:00', '11:00'],
            [['lunes','miercoles','viernes'], '11:00', '12:00'],
            [['martes','jueves'],             '07:00', '09:00'],
            [['martes','jueves'],             '09:00', '11:00'],
            [['martes','jueves'],             '11:00', '13:00'],
        ],
        'vespertino' => [
            [['lunes','miercoles','viernes'], '14:00', '15:00'],
            [['lunes','miercoles','viernes'], '15:00', '16:00'],
            [['lunes','miercoles','viernes'], '16:00', '17:00'],
            [['lunes','miercoles','viernes'], '17:00', '18:00'],
            [['martes','jueves'],             '14:00', '16:00'],
            [['martes','jueves'],             '16:00', '18:00'],
            [['martes','jueves'],             '18:00', '20:00'],
        ],
        'sabatino'   => [
            [['sabado'], '07:00', '09:00'],
            [['sabado'], '09:00', '11:00'],
            [['sabado'], '11:00', '13:00'],
            [['sabado'], '13:00', '15:00'],
            [['sabado'], '15:00', '17:00'],
        ],
    ];

    public function run(): void
    {
        $periodo = Periodo::where('activo', true)->first() ?? Periodo::first();
        if (! $periodo) {
            $this->command->error('No existe ningún periodo. Crea al menos uno antes de ejecutar este seeder.');
            return;
        }

        $carreras = Carrera::where('activa', true)->get();
        if ($carreras->isEmpty()) {
            $this->command->error('No hay carreras activas. Ejecuta CarrerasSeeder primero.');
            return;
        }

        // ── 1. Crear / recuperar aulas ─────────────────────────────────────
        $this->command->info('Creando aulas…');
        $aulas = $this->crearAulas();

        // ── 2. Crear docentes ──────────────────────────────────────────────
        $this->command->info('Creando 52 docentes…');
        $docentes = $this->crearDocentes($carreras);

        // ── 3. Crear grupos por carrera ────────────────────────────────────
        $this->command->info('Creando grupos…');
        $grupos = $this->crearGrupos($carreras, $periodo);

        // ── 4. Asignar cargas académicas con horarios ─────────────────────
        $this->command->info('Generando cargas académicas y horarios…');
        $this->generarCargas($docentes, $grupos, $periodo, $aulas);

        $totalCargas = CargaAcademica::count();
        $this->command->info("✓ Seeder completado: {$docentes->count()} docentes, {$grupos->count()} grupos, {$totalCargas} cargas académicas.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function crearAulas(): \Illuminate\Database\Eloquent\Collection
    {
        $definicion = [
            ['nombre' => 'E101', 'tipo' => 'salon',       'capacidad' => 40],
            ['nombre' => 'E102', 'tipo' => 'salon',       'capacidad' => 40],
            ['nombre' => 'E103', 'tipo' => 'salon',       'capacidad' => 35],
            ['nombre' => 'E104', 'tipo' => 'salon',       'capacidad' => 35],
            ['nombre' => 'E105', 'tipo' => 'salon',       'capacidad' => 30],
            ['nombre' => 'E201', 'tipo' => 'salon',       'capacidad' => 40],
            ['nombre' => 'E202', 'tipo' => 'salon',       'capacidad' => 40],
            ['nombre' => 'E203', 'tipo' => 'salon',       'capacidad' => 35],
            ['nombre' => 'E204', 'tipo' => 'salon',       'capacidad' => 35],
            ['nombre' => 'L-INF-1', 'tipo' => 'laboratorio', 'capacidad' => 25],
            ['nombre' => 'L-INF-2', 'tipo' => 'laboratorio', 'capacidad' => 25],
            ['nombre' => 'L-QUIM',  'tipo' => 'laboratorio', 'capacidad' => 20],
            ['nombre' => 'L-BIOC',  'tipo' => 'laboratorio', 'capacidad' => 20],
            ['nombre' => 'T-MEC',   'tipo' => 'taller',      'capacidad' => 15],
            ['nombre' => 'T-IND',   'tipo' => 'taller',      'capacidad' => 15],
        ];

        foreach ($definicion as $a) {
            Aula::firstOrCreate(['nombre' => $a['nombre']], $a + ['activa' => true]);
        }

        return Aula::all();
    }

    private function crearDocentes(\Illuminate\Database\Eloquent\Collection $carreras): \Illuminate\Database\Eloquent\Collection
    {
        $carrerasArr = $carreras->values()->toArray();
        $idx = 0;

        foreach ($this->nombresDocentes as $d) {
            $email = Str::slug(str_replace(' ', '.', strtolower($d['nombre']))) . '@itsmt.edu.mx';

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name'          => $d['nombre'],
                    'password'      => Hash::make('Docente2024!'),
                    'clave_empleado'=> $d['clave'],
                    'no_huella'     => $d['huella'],
                    'nombramiento'  => $d['nombramiento'],
                    'tipo_horas'    => $d['tipo_horas'],
                    'carrera_id'    => $carrerasArr[$idx % count($carrerasArr)]['id'],
                ]
            );

            if (! $user->hasRole('docente')) {
                $user->assignRole('docente');
            }

            $idx++;
        }

        return User::role('docente')->get();
    }

    private function crearGrupos(\Illuminate\Database\Eloquent\Collection $carreras, Periodo $periodo): \Illuminate\Database\Eloquent\Collection
    {
        $turnos = ['matutino', 'vespertino'];
        $semestres = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        foreach ($carreras->take(6) as $carrera) {
            // Solo semestres 1–9 por carrera, turnos matutino/vespertino
            foreach ($semestres as $sem) {
                foreach ($turnos as $turno) {
                    // Clave del grupo: e.g. ISC3A (carrera + sem + turno inicial)
                    $turnoLetra = $turno === 'matutino' ? 'A' : 'B';
                    $clave = strtoupper($carrera->clave) . $sem . $turnoLetra;

                    Grupo::firstOrCreate(
                        ['clave' => $clave, 'periodo_id' => $periodo->id],
                        [
                            'carrera_id' => $carrera->id,
                            'semestre'   => $sem,
                            'turno'      => $turno,
                            'capacidad'  => 35,
                            'activo'     => true,
                        ]
                    );
                }
            }

            // Grupo sabatino solo semestres 1, 3, 5, 7
            foreach ([1, 3, 5, 7] as $sem) {
                $clave = strtoupper($carrera->clave) . $sem . 'S';
                Grupo::firstOrCreate(
                    ['clave' => $clave, 'periodo_id' => $periodo->id],
                    [
                        'carrera_id' => $carrera->id,
                        'semestre'   => $sem,
                        'turno'      => 'sabatino',
                        'capacidad'  => 30,
                        'activo'     => true,
                    ]
                );
            }
        }

        return Grupo::where('periodo_id', $periodo->id)->get();
    }

    private function generarCargas(
        \Illuminate\Database\Eloquent\Collection $docentes,
        \Illuminate\Database\Eloquent\Collection $grupos,
        Periodo $periodo,
        \Illuminate\Database\Eloquent\Collection $aulas
    ): void {
        $docentesArr = $docentes->shuffle()->values();
        $aulasArr    = $aulas->values();
        $docenteIdx  = 0;

        foreach ($grupos as $grupo) {
            // Materias disponibles para la carrera y semestre del grupo
            $materias = Materia::where('carrera_id', $grupo->carrera_id)
                ->where('semestre', $grupo->semestre)
                ->where('activa', true)
                ->get();

            if ($materias->isEmpty()) {
                // Fallback: cualquier materia de la carrera
                $materias = Materia::where('carrera_id', $grupo->carrera_id)
                    ->where('activa', true)
                    ->take(5)
                    ->get();
            }

            if ($materias->isEmpty()) {
                continue;
            }

            $bloquesDisponibles = $this->bloquesPorTurno[$grupo->turno] ?? $this->bloquesPorTurno['matutino'];
            shuffle($bloquesDisponibles);
            $bloqueIdx = 0;

            foreach ($materias as $materia) {
                $docente = $docentesArr[$docenteIdx % $docentesArr->count()];
                $aula    = $aulasArr[$docenteIdx % $aulasArr->count()];

                // Evitar duplicado exacto
                $yaExiste = CargaAcademica::where('docente_id', $docente->id)
                    ->where('materia_id', $materia->id)
                    ->where('grupo_id', $grupo->id)
                    ->where('periodo_id', $periodo->id)
                    ->exists();

                if ($yaExiste) {
                    $docenteIdx++;
                    continue;
                }

                $carga = CargaAcademica::create([
                    'docente_id'   => $docente->id,
                    'materia_id'   => $materia->id,
                    'grupo_id'     => $grupo->id,
                    'periodo_id'   => $periodo->id,
                    'aula_id'      => $aula->id,
                    'horas_semana' => $materia->horas_teoria + $materia->horas_practica ?: 5,
                ]);

                // Asignar bloque de horario
                if (isset($bloquesDisponibles[$bloqueIdx])) {
                    [$dias, $inicio, $fin] = $bloquesDisponibles[$bloqueIdx];
                    foreach ($dias as $dia) {
                        Horario::firstOrCreate([
                            'carga_academica_id' => $carga->id,
                            'dia_semana'         => $dia,
                        ], [
                            'hora_inicio' => $inicio . ':00',
                            'hora_fin'    => $fin    . ':00',
                        ]);
                    }
                    $bloqueIdx++;
                }

                $docenteIdx++;
            }
        }
    }
}
