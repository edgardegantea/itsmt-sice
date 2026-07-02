<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Domains\Titulacion\Models\ModalidadTitulacion;
use App\Domains\Titulacion\Models\Titulacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint8Test extends TestCase
{
    use RefreshDatabase;

    private User    $director;
    private User    $alumnoUser;
    private Carrera $carrera;
    private Periodo $periodo1;
    private Periodo $periodo2;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'alumno', 'jefe_carrera', 'docente',
                  'director_academico', 'personal_administrativo',
                  'control_escolar', 'direccion_general', 'direccion_academica',
                  'subdireccion_academica'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->director = User::factory()->create(['email' => 'director.s8@test.com']);
        $this->director->assignRole('admin');

        $this->carrera = Carrera::create([
            'nombre'    => 'Ingeniería en Sistemas',
            'clave'     => 'ISC',
            'codigo_it' => '06',
            'activa'    => true,
        ]);

        $this->periodo1 = Periodo::create([
            'nombre'      => 'Ago-Dic 2023',
            'fecha_inicio'=> '2023-08-01',
            'fecha_fin'   => '2023-12-31',
            'activo'      => false,
            'tipo'        => 'ordinario',
        ]);

        $this->periodo2 = Periodo::create([
            'nombre'      => 'Ene-Jun 2024',
            'fecha_inicio'=> '2024-01-01',
            'fecha_fin'   => '2024-06-30',
            'activo'      => true,
            'tipo'        => 'ordinario',
        ]);
    }

    // ── Helper ──────────────────────────────────────────────────────────────────

    private function crearAlumno(string $nc, Periodo $periodo, string $estatus = 'activo'): Alumno
    {
        static $idx = 0;
        $idx++;
        $user = User::factory()->create(['email' => "alumno{$idx}.s8@test.com"]);
        $user->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => "Alumno{$idx}",
            'apellido_paterno'      => 'S8',
            'curp'                  => strtoupper("S8AL{$idx}000101HVRXXX0{$idx}"),
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Veracruz',
            'escuela_bachillerato'  => 'COBAEV',
            'promedio_bachillerato' => 8.0,
            'turno_preferido'       => 'matutino',
            'email'                 => "asp{$idx}.s8@test.com",
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $periodo->id,
            'numero_ficha'          => "S8-{$nc}",
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => $nc,
            'carrera_id'       => $this->carrera->id,
            'periodo_id'       => $periodo->id,
            'tipo_ingreso'     => 'nuevo_ingreso',
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> $periodo->fecha_inicio->toDateString(),
        ]);

        return Alumno::create([
            'user_id'            => $user->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => $nc,
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $periodo->id,
            'semestre_actual'    => 1,
            'estatus'            => $estatus,
        ]);
    }

    // ── Autorización ────────────────────────────────────────────────────────────

    public function test_alumno_no_puede_ver_indicadores(): void
    {
        $alumnoUser = User::factory()->create(['email' => 'alu.s8.noauth@test.com']);
        $alumnoUser->assignRole('alumno');

        $this->actingAs($alumnoUser)
            ->getJson('/api/indicadores/desercion')
            ->assertStatus(403);
    }

    // ── Deserción ───────────────────────────────────────────────────────────────

    public function test_desercion_calcula_porcentaje_correctamente(): void
    {
        // 4 alumnos inscritos en periodo1
        $a1 = $this->crearAlumno('23ISC001', $this->periodo1);
        $a2 = $this->crearAlumno('23ISC002', $this->periodo1);
        $a3 = $this->crearAlumno('23ISC003', $this->periodo1);
        $a4 = $this->crearAlumno('23ISC004', $this->periodo1);

        // 2 bajas definitivas en periodo1
        Baja::create([
            'alumno_id'    => $a1->id,
            'periodo_id'   => $this->periodo1->id,
            'tipo_baja'    => 'definitiva',
            'fecha_solicitud' => '2023-10-01',
            'registrada_por'  => $this->director->id,
        ]);
        Baja::create([
            'alumno_id'    => $a2->id,
            'periodo_id'   => $this->periodo1->id,
            'tipo_baja'    => 'definitiva',
            'fecha_solicitud' => '2023-10-01',
            'registrada_por'  => $this->director->id,
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/desercion?carrera_id={$this->carrera->id}&periodo_id={$this->periodo1->id}");

        $r->assertOk();
        $data = $r->json('data.0');
        $this->assertEquals(4, $data['total_inscritos']);
        $this->assertEquals(2, $data['total_desertores']);
        $this->assertEquals(50.0, $data['porcentaje_desercion']);
    }

    public function test_desercion_sin_bajas_devuelve_cero(): void
    {
        $this->crearAlumno('23ISC010', $this->periodo1);
        $this->crearAlumno('23ISC011', $this->periodo1);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/desercion?periodo_id={$this->periodo1->id}");

        $r->assertOk();
        $data = $r->json('data.0');
        $this->assertEquals(0, $data['total_desertores']);
        $this->assertEquals(0.0, $data['porcentaje_desercion']);
    }

    public function test_bajas_temporales_no_cuentan_como_desercion(): void
    {
        $alumno = $this->crearAlumno('23ISC020', $this->periodo1);

        Baja::create([
            'alumno_id'       => $alumno->id,
            'periodo_id'      => $this->periodo1->id,
            'tipo_baja'       => 'temporal', // NO es definitiva
            'fecha_solicitud' => '2023-09-01',
            'registrada_por'  => $this->director->id,
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/desercion?periodo_id={$this->periodo1->id}");

        $r->assertOk();
        $this->assertEquals(0, $r->json('data.0.total_desertores'));
    }

    public function test_desercion_agrupa_por_carrera_y_periodo(): void
    {
        $this->crearAlumno('23ISC030', $this->periodo1);
        $this->crearAlumno('24ISC031', $this->periodo2);

        $r = $this->actingAs($this->director)->getJson('/api/indicadores/desercion');

        $r->assertOk();
        // Debe devolver 2 filas (una por cada periodo)
        $this->assertCount(2, $r->json('data'));
    }

    // ── Retención ───────────────────────────────────────────────────────────────

    public function test_retencion_calcula_porcentaje_entre_periodos(): void
    {
        $a1 = $this->crearAlumno('23ISC040', $this->periodo1);
        $a2 = $this->crearAlumno('23ISC041', $this->periodo1);
        $a3 = $this->crearAlumno('23ISC042', $this->periodo1);

        // 2 de 3 se reinscriben en periodo2
        Reinscripcion::create([
            'alumno_id'  => $a1->id,
            'periodo_id' => $this->periodo2->id,
            'estatus'    => 'aprobada',
        ]);
        Reinscripcion::create([
            'alumno_id'  => $a2->id,
            'periodo_id' => $this->periodo2->id,
            'estatus'    => 'aprobada',
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/retencion?carrera_id={$this->carrera->id}");

        $r->assertOk();
        $data = $r->json('data.0');
        $this->assertEquals(3, $data['inscritos_periodo_ant']);
        $this->assertEquals(2, $data['inscritos_periodo_act']);
        $this->assertEquals(66.67, $data['porcentaje_retencion']);
    }

    public function test_reinscripcion_pendiente_no_cuenta_para_retencion(): void
    {
        $a1 = $this->crearAlumno('23ISC050', $this->periodo1);

        // Pendiente, no aprobada
        Reinscripcion::create([
            'alumno_id'  => $a1->id,
            'periodo_id' => $this->periodo2->id,
            'estatus'    => 'pendiente',
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/retencion?carrera_id={$this->carrera->id}");

        $r->assertOk();
        // Solo hay un periodo con datos (periodo1), no hay par de periodos → lista vacía
        $this->assertCount(0, $r->json('data'));
    }

    // ── Eficiencia Terminal ─────────────────────────────────────────────────────

    public function test_eficiencia_terminal_calcula_por_generacion(): void
    {
        // 4 alumnos de la generación 2023
        $a1 = $this->crearAlumno('23ISC060', $this->periodo1, 'egresado');
        $a2 = $this->crearAlumno('23ISC061', $this->periodo1, 'egresado');
        $a3 = $this->crearAlumno('23ISC062', $this->periodo1, 'activo');
        $a4 = $this->crearAlumno('23ISC063', $this->periodo1, 'activo');

        $modalidad = ModalidadTitulacion::create([
            'nombre'        => 'Titulación Integral',
            'opcion_numero' => 9,
            'requiere_examen' => false,
        ]);

        // 1 titulado
        Titulacion::create([
            'alumno_id'    => $a1->id,
            'modalidad_id' => $modalidad->id,
            'estatus'      => 'exento',
            'etapa_actual' => 'titulado',
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/eficiencia-terminal?carrera_id={$this->carrera->id}&generacion=2023");

        $r->assertOk();
        $data = $r->json('data.0');
        $this->assertEquals(4, $data['total_ingreso']);
        $this->assertEquals(2, $data['total_egresados']);
        $this->assertEquals(1, $data['total_titulados']);
        $this->assertEquals(25.0, $data['pct_eficiencia']);
    }

    public function test_eficiencia_terminal_sin_generacion_devuelve_todo(): void
    {
        $this->crearAlumno('23ISC070', $this->periodo1);
        $this->crearAlumno('24ISC071', $this->periodo2);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/eficiencia-terminal?carrera_id={$this->carrera->id}");

        $r->assertOk();
        // Dos generaciones distintas (2023 y 2024)
        $this->assertCount(2, $r->json('data'));
    }

    // ── Promedio ────────────────────────────────────────────────────────────────

    public function test_promedio_calcula_media_de_calificaciones(): void
    {
        $docente = User::factory()->create(['email' => 'doc.s8@test.com']);
        $docente->assignRole('docente');

        $materia = Materia::create([
            'carrera_id'     => $this->carrera->id,
            'clave'          => 'MAT101',
            'nombre'         => 'Matemáticas',
            'creditos'       => 5,
            'horas_teoria'   => 3,
            'horas_practica' => 2,
        ]);

        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo1->id,
            'clave'      => '1A',
            'semestre'   => 1,
            'turno'      => 'matutino',
            'capacidad'  => 30,
            'activo'     => true,
        ]);

        CargaAcademica::create([
            'docente_id'   => $docente->id,
            'materia_id'   => $materia->id,
            'grupo_id'     => $grupo->id,
            'periodo_id'   => $this->periodo1->id,
            'horas_semana' => 5,
        ]);

        $alumno1 = $this->crearAlumno('23ISC080', $this->periodo1);
        $alumno2 = $this->crearAlumno('23ISC081', $this->periodo1);
        $alumno3 = $this->crearAlumno('23ISC082', $this->periodo1);

        Calificacion::create(['alumno_id' => $alumno1->id, 'grupo_id' => $grupo->id,
            'calificacion_final' => 8.0, 'promedio' => 8.0, 'acreditado' => true]);
        Calificacion::create(['alumno_id' => $alumno2->id, 'grupo_id' => $grupo->id,
            'calificacion_final' => 9.0, 'promedio' => 9.0, 'acreditado' => true]);
        Calificacion::create(['alumno_id' => $alumno3->id, 'grupo_id' => $grupo->id,
            'calificacion_final' => 7.0, 'promedio' => 7.0, 'acreditado' => true]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/promedio?carrera_id={$this->carrera->id}&periodo_id={$this->periodo1->id}");

        $r->assertOk();
        $data = $r->json('data.0');
        $this->assertEquals(8.0, (float) $data['promedio_general']);
        $this->assertEquals(3, $data['total_calificaciones']);
    }

    public function test_promedio_sin_calificaciones_devuelve_lista_vacia(): void
    {
        $r = $this->actingAs($this->director)
            ->getJson('/api/indicadores/promedio');

        $r->assertOk();
        $this->assertCount(0, $r->json('data'));
    }

    // ── Filtros ─────────────────────────────────────────────────────────────────

    public function test_filtro_carrera_acota_resultados_de_desercion(): void
    {
        $carrera2 = Carrera::create([
            'nombre'    => 'Ingeniería Industrial',
            'clave'     => 'IIN',
            'codigo_it' => '12',
            'activa'    => true,
        ]);

        $this->crearAlumno('23ISC090', $this->periodo1);

        // Alumno de otra carrera
        $userB = User::factory()->create(['email' => 'alub.s8@test.com']);
        $userB->assignRole('alumno');
        $aspB = Aspirante::create([
            'nombres' => 'AlumnoB', 'apellido_paterno' => 'S8B',
            'curp' => 'S8B1000101HVBXXX09', 'fecha_nacimiento' => '2000-01-01',
            'sexo' => 'masculino', 'municipio_procedencia' => 'Veracruz',
            'escuela_bachillerato' => 'CBTis', 'promedio_bachillerato' => 8.0,
            'turno_preferido' => 'matutino', 'email' => 'aspb.s8@test.com',
            'carrera_id' => $carrera2->id, 'periodo_id' => $this->periodo1->id,
        ]);
        $inscB = Inscripcion::create([
            'aspirante_id' => $aspB->id, 'numero_control' => '23IIN091',
            'carrera_id' => $carrera2->id, 'periodo_id' => $this->periodo1->id,
            'tipo_ingreso' => 'nuevo_ingreso', 'semestre_ingreso' => 1,
            'fecha_inscripcion' => '2023-08-01',
        ]);
        Alumno::create([
            'user_id' => $userB->id, 'inscripcion_id' => $inscB->id,
            'numero_control' => '23IIN091', 'carrera_id' => $carrera2->id,
            'periodo_ingreso_id' => $this->periodo1->id, 'semestre_actual' => 1, 'estatus' => 'activo',
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/indicadores/desercion?carrera_id={$this->carrera->id}");

        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
        $this->assertEquals($this->carrera->id, $r->json('data.0.carrera_id'));
    }
}
