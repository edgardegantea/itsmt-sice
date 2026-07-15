<?php

namespace Tests\Feature\Api;

use App\Domains\Reinscripcion\Models\CalendarioEscolar;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint21Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $subdireccion;
    private User $alumno;
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

        $this->admin = User::factory()->create(['email' => 'admin.s21@test.com']);
        $this->admin->assignRole('admin');

        $this->subdireccion = User::factory()->create(['email' => 'subdir.s21@test.com']);
        $this->subdireccion->assignRole('subdireccion_academica');

        $this->alumno = User::factory()->create(['email' => 'alumno.s21@test.com']);
        $this->alumno->assignRole('alumno');

        $this->periodo = Periodo::create([
            'nombre'       => 'Ene-Jun 2027',
            'fecha_inicio' => '2027-01-08',
            'fecha_fin'    => '2027-06-15',
            'activo'       => true,
        ]);
    }

    // S21-01: crear calendario escolar
    public function test_admin_puede_crear_calendario_escolar(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/calendario-escolar', [
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027',
            'actividades'     => [
                ['no' => 1, 'actividad' => 'Inicio de clases', 'fecha_inicio' => '2027-01-08', 'fecha_fin' => null],
                ['no' => 2, 'actividad' => 'Reinscripción',    'fecha_inicio' => '2027-01-15', 'fecha_fin' => '2027-01-20'],
            ],
            'elaboro_nombre' => 'Jefe de Planeación',
            'elaboro_fecha'  => '2026-12-01',
        ]);

        $res->assertStatus(201)->assertJsonPath('data.periodo_escolar', 'Ene-Jun 2027');
        $this->assertDatabaseHas('calendarios_escolar', ['periodo_id' => $this->periodo->id]);
    }

    // S21-02: consultar calendario
    public function test_puede_consultar_calendario_por_periodo(): void
    {
        CalendarioEscolar::create([
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027',
            'actividades'     => [['no' => 1, 'actividad' => 'Inicio clases', 'fecha_inicio' => '2027-01-08']],
        ]);

        $res = $this->actingAs($this->alumno)->getJson("/api/calendario-escolar/{$this->periodo->id}");
        $res->assertOk()->assertJsonPath('data.periodo_escolar', 'Ene-Jun 2027');
    }

    // S21-03: autorizar calendario
    public function test_subdireccion_puede_autorizar_calendario(): void
    {
        $calendario = CalendarioEscolar::create([
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027',
            'actividades'     => [],
        ]);

        $res = $this->actingAs($this->subdireccion)
            ->patchJson("/api/calendario-escolar/{$calendario->id}/autorizar");

        $res->assertOk()->assertJsonPath('data.autorizado', true);
        $this->assertDatabaseHas('calendarios_escolar', ['id' => $calendario->id, 'autorizado' => true]);
    }

    // S21-04: alumno no puede autorizar calendario
    public function test_alumno_no_puede_autorizar_calendario(): void
    {
        $calendario = CalendarioEscolar::create([
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027',
            'actividades'     => [],
        ]);

        $res = $this->actingAs($this->alumno)
            ->patchJson("/api/calendario-escolar/{$calendario->id}/autorizar");

        $res->assertStatus(403);
    }

    // S21-05: update-or-create — segunda petición actualiza el mismo calendario
    public function test_crear_calendario_existente_lo_actualiza(): void
    {
        $this->actingAs($this->admin)->postJson('/api/calendario-escolar', [
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027',
            'actividades'     => [],
        ]);

        $this->actingAs($this->admin)->postJson('/api/calendario-escolar', [
            'periodo_id'      => $this->periodo->id,
            'periodo_escolar' => 'Ene-Jun 2027 (v2)',
            'actividades'     => [['no' => 1, 'actividad' => 'Nueva actividad', 'fecha_inicio' => '2027-01-10']],
        ]);

        $this->assertEquals(1, CalendarioEscolar::where('periodo_id', $this->periodo->id)->count());
        $this->assertDatabaseHas('calendarios_escolar', ['periodo_escolar' => 'Ene-Jun 2027 (v2)']);
    }
}
