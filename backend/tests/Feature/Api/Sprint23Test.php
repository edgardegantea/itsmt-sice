<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Becas\Models\BecaAsignada;
use App\Domains\Becas\Models\SolicitudBeca;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint23Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $alumnoUser;
    private Alumno $alumno;
    private Periodo $periodo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s23@test.com']);
        $this->admin->assignRole('admin');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s23@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $carrera = Carrera::create([
            'clave' => 'ISC-S23', 'nombre' => 'ISC S23', 'codigo_it' => '23', 'activa' => true,
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => '2027-1',
            'fecha_inicio' => '2027-01-08',
            'fecha_fin'    => '2027-06-15',
            'activo'       => true,
        ]);

        $aspirante = Aspirante::create([
            'nombres'               => 'Test',
            'apellido_paterno'      => 'S23',
            'curp'                  => 'TESS230101HVZTNA00',
            'fecha_nacimiento'      => '2003-01-01',
            'sexo'                  => 'femenino',
            'municipio_procedencia' => 'Tuxpan',
            'escuela_bachillerato'  => 'CBTis 1',
            'promedio_bachillerato' => 9.0,
            'turno_preferido'       => 'matutino',
            'email'                 => 'test.s23@test.com',
            'carrera_id'            => $carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => '27S230001',
            'carrera_id'       => $carrera->id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> '2027-01-08',
        ]);

        $this->alumno = Alumno::create([
            'user_id'           => $this->alumnoUser->id,
            'inscripcion_id'    => $inscripcion->id,
            'numero_control'    => '27S230001',
            'carrera_id'        => $carrera->id,
            'periodo_ingreso_id'=> $this->periodo->id,
            'semestre_actual'   => 4,
            'estatus'           => 'activo',
        ]);
    }

    // S23-01: alumno solicita beca
    public function test_alumno_puede_solicitar_beca(): void
    {
        $res = $this->actingAs($this->alumnoUser)->postJson('/api/solicitudes-beca', [
            'periodo_id'      => $this->periodo->id,
            'tipo_beca'       => 'excelencia',
            'promedio'        => 95.5,
            'ingreso_familiar'=> 4000.00,
        ]);

        $res->assertStatus(201)->assertJsonPath('data.tipo_beca', 'excelencia');
        $this->assertDatabaseHas('solicitudes_beca', [
            'alumno_id'  => $this->alumno->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'pendiente',
        ]);
    }

    // S23-02: admin lista solicitudes
    public function test_admin_lista_solicitudes_beca(): void
    {
        SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'pendiente',
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/solicitudes-beca');
        $res->assertOk()->assertJsonCount(1, 'data.data');
    }

    // S23-03: admin valida solicitud
    public function test_admin_puede_validar_solicitud_beca(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'pendiente',
        ]);

        $res = $this->actingAs($this->admin)->patchJson("/api/solicitudes-beca/{$solicitud->id}/validar", [
            'estatus' => 'validada',
        ]);

        $res->assertOk()->assertJsonPath('data.estatus', 'validada');
    }

    // S23-04: admin asigna beca
    public function test_admin_puede_asignar_beca(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'validada',
        ]);

        $res = $this->actingAs($this->admin)->postJson("/api/solicitudes-beca/{$solicitud->id}/asignar", [
            'monto_mensual'  => 1500.00,
            'duracion_meses' => 6,
            'fecha_inicio'   => '2027-01-08',
        ]);

        $res->assertStatus(201)->assertJsonPath('data.tipo_beca', 'excelencia');
        $this->assertDatabaseHas('becas_asignadas', ['alumno_id' => $this->alumno->id, 'estatus' => 'activa']);
    }

    // S23-05: no se puede asignar beca pendiente
    public function test_no_se_puede_asignar_beca_pendiente(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'transporte',
            'estatus'    => 'pendiente',
        ]);

        $res = $this->actingAs($this->admin)->postJson("/api/solicitudes-beca/{$solicitud->id}/asignar", []);
        $res->assertStatus(422);
    }

    // S23-06: padron de becas por periodo
    public function test_admin_ve_padron_becas(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'validada',
        ]);

        BecaAsignada::create([
            'solicitud_beca_id' => $solicitud->id,
            'alumno_id'         => $this->alumno->id,
            'periodo_id'        => $this->periodo->id,
            'tipo_beca'         => 'excelencia',
            'estatus'           => 'activa',
            'asignado_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/becas/padron/{$this->periodo->id}");
        $res->assertOk()->assertJsonCount(1, 'data');
    }

    // S23-07: cancelar beca
    public function test_admin_puede_cancelar_beca(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'asignada',
        ]);

        $beca = BecaAsignada::create([
            'solicitud_beca_id' => $solicitud->id,
            'alumno_id'         => $this->alumno->id,
            'periodo_id'        => $this->periodo->id,
            'tipo_beca'         => 'excelencia',
            'estatus'           => 'activa',
            'asignado_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->patchJson("/api/becas/{$beca->id}/cancelar", [
            'motivo_cancelacion' => 'Reprobó materias clave',
        ]);

        $res->assertOk()->assertJsonPath('data.estatus', 'cancelada');
    }

    // S23-08: alumno ve historial de becas
    public function test_alumno_ve_historial_de_becas(): void
    {
        $solicitud = SolicitudBeca::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'tipo_beca'  => 'excelencia',
            'estatus'    => 'asignada',
        ]);

        BecaAsignada::create([
            'solicitud_beca_id' => $solicitud->id,
            'alumno_id'         => $this->alumno->id,
            'periodo_id'        => $this->periodo->id,
            'tipo_beca'         => 'excelencia',
            'estatus'           => 'activa',
            'asignado_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->alumnoUser)->getJson("/api/alumnos/{$this->alumno->id}/historial-becas");
        $res->assertOk()->assertJsonCount(1, 'data');
    }
}
