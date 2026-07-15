<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Finanzas\Models\Pago;
use App\Domains\Permanencia\Models\Adeudo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint22Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $alumnoUser;
    private Alumno $alumno;
    private Periodo $periodo;
    private Adeudo $adeudo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s22@test.com']);
        $this->admin->assignRole('admin');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s22@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $carrera = Carrera::create([
            'clave' => 'ISC-S22', 'nombre' => 'ISC S22', 'codigo_it' => '22', 'activa' => true,
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => '2027-1',
            'fecha_inicio' => '2027-01-08',
            'fecha_fin'    => '2027-06-15',
            'activo'       => true,
        ]);

        $aspirante = Aspirante::create([
            'nombres'               => 'Test',
            'apellido_paterno'      => 'S22',
            'curp'                  => 'TESS220101HVZTNA00',
            'fecha_nacimiento'      => '2002-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Tuxpan',
            'escuela_bachillerato'  => 'CBTis 1',
            'promedio_bachillerato' => 8.5,
            'turno_preferido'       => 'matutino',
            'email'                 => 'test.s22@test.com',
            'carrera_id'            => $carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => '27S220001',
            'carrera_id'       => $carrera->id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> '2027-01-08',
        ]);

        $this->alumno = Alumno::create([
            'user_id'           => $this->alumnoUser->id,
            'inscripcion_id'    => $inscripcion->id,
            'numero_control'    => '27S220001',
            'carrera_id'        => $carrera->id,
            'periodo_ingreso_id'=> $this->periodo->id,
            'semestre_actual'   => 3,
            'estatus'           => 'activo',
        ]);

        $this->adeudo = Adeudo::create([
            'alumno_id' => $this->alumno->id,
            'concepto'  => 'Cuota de reinscripción',
            'monto'     => 500.00,
            'pagado'    => false,
        ]);
    }

    // S22-01: alumno ve su estado de cuenta
    public function test_alumno_puede_ver_su_estado_de_cuenta(): void
    {
        $res = $this->actingAs($this->alumnoUser)->getJson("/api/alumnos/{$this->alumno->id}/estado-cuenta");

        $res->assertOk()
            ->assertJsonStructure(['data' => ['alumno', 'adeudos', 'pagos', 'total_adeudado', 'total_pagado']]);
        $this->assertEquals(500, $res->json('data.total_adeudado'));
    }

    // S22-02: alumno no puede ver estado de cuenta de otro
    public function test_alumno_no_puede_ver_estado_de_cuenta_ajeno(): void
    {
        $otroUser = User::factory()->create();
        $otroUser->assignRole('alumno');

        $aspirante2 = Aspirante::create([
            'nombres'               => 'Otro',
            'apellido_paterno'      => 'S22B',
            'curp'                  => 'OTOS220202HVZTNA01',
            'fecha_nacimiento'      => '2002-02-02',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Tuxpan',
            'escuela_bachillerato'  => 'CBTis 2',
            'promedio_bachillerato' => 8.0,
            'turno_preferido'       => 'matutino',
            'email'                 => 'otro.s22@test.com',
            'carrera_id'            => $this->alumno->carrera_id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion2 = Inscripcion::create([
            'aspirante_id'     => $aspirante2->id,
            'numero_control'   => '27S220002',
            'carrera_id'       => $this->alumno->carrera_id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> '2027-01-08',
        ]);

        $otroAlumno = Alumno::create([
            'user_id'           => $otroUser->id,
            'inscripcion_id'    => $inscripcion2->id,
            'numero_control'    => '27S220002',
            'carrera_id'        => $this->alumno->carrera_id,
            'periodo_ingreso_id'=> $this->periodo->id,
            'semestre_actual'   => 3,
            'estatus'           => 'activo',
        ]);

        $res = $this->actingAs($this->alumnoUser)->getJson("/api/alumnos/{$otroAlumno->id}/estado-cuenta");
        $res->assertStatus(403);
    }

    // S22-03: admin registra pago de adeudo
    public function test_admin_puede_registrar_pago(): void
    {
        $res = $this->actingAs($this->admin)->postJson("/api/adeudos/{$this->adeudo->id}/pagar", [
            'periodo_id'  => $this->periodo->id,
            'metodo_pago' => 'efectivo',
        ]);

        $res->assertStatus(201)->assertJsonPath('data.monto', '500.00');
        $this->assertDatabaseHas('pagos', ['adeudo_id' => $this->adeudo->id]);
        $this->assertDatabaseHas('adeudos', ['id' => $this->adeudo->id, 'pagado' => true]);
    }

    // S22-04: no se puede pagar un adeudo ya pagado
    public function test_no_se_puede_pagar_adeudo_ya_pagado(): void
    {
        $this->adeudo->update(['pagado' => true]);

        $res = $this->actingAs($this->admin)->postJson("/api/adeudos/{$this->adeudo->id}/pagar", []);
        $res->assertStatus(422);
    }

    // S22-05: historial de pagos del alumno
    public function test_alumno_ve_historial_de_pagos(): void
    {
        Pago::create([
            'alumno_id'      => $this->alumno->id,
            'adeudo_id'      => $this->adeudo->id,
            'periodo_id'     => $this->periodo->id,
            'monto'          => 500.00,
            'concepto'       => 'Reinscripción',
            'fecha_pago'     => '2027-01-10',
            'metodo_pago'    => 'efectivo',
            'registrado_por' => $this->admin->id,
        ]);

        $res = $this->actingAs($this->alumnoUser)->getJson("/api/alumnos/{$this->alumno->id}/historial-pagos");
        $res->assertOk()->assertJsonCount(1, 'data.data');
    }

    // S22-06: admin genera reporte de ingresos por periodo
    public function test_admin_ve_reporte_ingresos_periodo(): void
    {
        Pago::create([
            'alumno_id'      => $this->alumno->id,
            'periodo_id'     => $this->periodo->id,
            'monto'          => 500.00,
            'concepto'       => 'Reinscripción',
            'fecha_pago'     => '2027-01-10',
            'metodo_pago'    => 'efectivo',
            'registrado_por' => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/reportes/ingresos/{$this->periodo->id}");
        $res->assertOk()->assertJsonPath('data.total_transacciones', 1);
        $this->assertEquals(500, $res->json('data.total_ingresos'));
    }
}
