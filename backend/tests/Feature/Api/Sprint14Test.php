<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\AsignacionTutoria;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PlanAccionTutorial;
use App\Domains\Academico\Models\SesionTutoria;
use App\Domains\Academico\Models\Tutor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint14Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $director;
    private User $docenteUser;
    private User $alumnoUser;
    private Tutor $tutor;
    private Periodo $periodo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s14@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'dir.s14@test.com']);
        $this->director->assignRole('director_academico');

        $this->docenteUser = User::factory()->create(['email' => 'doc.s14@test.com']);
        $this->docenteUser->assignRole('docente');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s14@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $this->periodo = Periodo::create([
            'nombre'       => '2025-A',
            'fecha_inicio' => '2025-01-15',
            'fecha_fin'    => '2025-06-15',
            'activo'       => true,
        ]);

        $this->tutor = Tutor::create([
            'docente_id' => $this->docenteUser->id,
            'activo'     => true,
        ]);
    }

    // ── S14-01: Asignaciones tutor-tutorado ──────────────────────────────────────

    public function test_admin_puede_asignar_tutor_a_tutorado(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/asignaciones-tutoria', [
            'tutor_id'   => $this->tutor->id,
            'alumno_id'  => $this->alumnoUser->id,
            'periodo_id' => $this->periodo->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.activa', true);

        $this->assertDatabaseHas('asignaciones_tutoria', [
            'tutor_id'  => $this->tutor->id,
            'alumno_id' => $this->alumnoUser->id,
        ]);
    }

    public function test_admin_puede_listar_asignaciones(): void
    {
        AsignacionTutoria::create([
            'tutor_id'   => $this->tutor->id,
            'alumno_id'  => $this->alumnoUser->id,
            'periodo_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/asignaciones-tutoria');

        $response->assertStatus(200);
    }

    public function test_admin_puede_desactivar_asignacion(): void
    {
        $asignacion = AsignacionTutoria::create([
            'tutor_id'   => $this->tutor->id,
            'alumno_id'  => $this->alumnoUser->id,
            'periodo_id' => $this->periodo->id,
            'activa'     => true,
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/asignaciones-tutoria/{$asignacion->id}", [
            'activa' => false,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.activa', false);
    }

    public function test_alumno_no_puede_crear_asignacion(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/asignaciones-tutoria', [
            'tutor_id'   => $this->tutor->id,
            'alumno_id'  => $this->alumnoUser->id,
            'periodo_id' => $this->periodo->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_tutor_ve_sus_propias_asignaciones(): void
    {
        AsignacionTutoria::create([
            'tutor_id'   => $this->tutor->id,
            'alumno_id'  => $this->alumnoUser->id,
            'periodo_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->docenteUser)->getJson('/api/asignaciones-tutoria');

        $response->assertStatus(200);
    }

    // ── S14-02: Sesiones de tutoría ──────────────────────────────────────────────

    public function test_tutor_puede_registrar_sesion(): void
    {
        $response = $this->actingAs($this->docenteUser)->postJson('/api/sesiones-tutoria', [
            'tipo'                  => 'individual',
            'fecha'                 => '2025-03-10',
            'duracion_minutos'      => 60,
            'temas_tratados'        => 'Rendimiento académico, plan de estudios',
            'alumnos_atendidos_ids' => [$this->alumnoUser->id],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.tipo', 'individual');

        $this->assertDatabaseHas('sesiones_tutoria', [
            'tutor_id' => $this->tutor->id,
            'tipo'     => 'individual',
        ]);
    }

    public function test_tutor_puede_registrar_sesion_grupal(): void
    {
        $response = $this->actingAs($this->docenteUser)->postJson('/api/sesiones-tutoria', [
            'tipo'                  => 'grupal',
            'fecha'                 => '2025-03-15',
            'temas_tratados'        => 'Orientación de carrera y opciones de titulación',
            'alumnos_atendidos_ids' => [$this->alumnoUser->id],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.tipo', 'grupal');
    }

    public function test_tutor_puede_listar_sus_sesiones(): void
    {
        SesionTutoria::create([
            'tutor_id'              => $this->tutor->id,
            'tipo'                  => 'individual',
            'fecha'                 => '2025-03-10',
            'temas_tratados'        => 'Seguimiento académico',
            'alumnos_atendidos_ids' => [$this->alumnoUser->id],
        ]);

        $response = $this->actingAs($this->docenteUser)->getJson('/api/sesiones-tutoria');

        $response->assertStatus(200);
    }

    public function test_admin_puede_ver_sesiones_por_tutor(): void
    {
        $response = $this->actingAs($this->admin)
                         ->getJson("/api/sesiones-tutoria/{$this->tutor->id}");

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['tutor', 'sesiones', 'total']]);
    }

    public function test_alumno_no_puede_registrar_sesion(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/sesiones-tutoria', [
            'tipo'                  => 'individual',
            'fecha'                 => '2025-03-10',
            'temas_tratados'        => 'Test',
            'alumnos_atendidos_ids' => [$this->alumnoUser->id],
        ]);

        $response->assertStatus(403);
    }

    // ── S14-03: Plan de Acción Tutorial (PAT) ────────────────────────────────────

    public function test_tutor_puede_crear_pat(): void
    {
        $response = $this->actingAs($this->docenteUser)->postJson('/api/planes-accion-tutorial', [
            'periodo_id'       => $this->periodo->id,
            'objetivo_general' => 'Apoyar a alumnos en riesgo académico durante el semestre.',
            'actividades'      => [['descripcion' => 'Sesiones quincenales', 'frecuencia' => 'quincenal']],
            'metas'            => [['indicador' => 'Reducir reprobación', 'porcentaje' => 80]],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'borrador');

        $this->assertDatabaseHas('planes_accion_tutorial', [
            'tutor_id'   => $this->tutor->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'borrador',
        ]);
    }

    public function test_tutor_puede_enviar_pat_a_revision(): void
    {
        $plan = PlanAccionTutorial::create([
            'tutor_id'         => $this->tutor->id,
            'periodo_id'       => $this->periodo->id,
            'objetivo_general' => 'Apoyo académico integral.',
            'estatus'          => 'borrador',
        ]);

        $response = $this->actingAs($this->docenteUser)
                         ->patchJson("/api/planes-accion-tutorial/{$plan->id}/estatus", [
                             'estatus' => 'enviado',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'enviado');
    }

    public function test_admin_puede_aprobar_pat(): void
    {
        $plan = PlanAccionTutorial::create([
            'tutor_id'         => $this->tutor->id,
            'periodo_id'       => $this->periodo->id,
            'objetivo_general' => 'Apoyo académico integral.',
            'estatus'          => 'enviado',
        ]);

        $response = $this->actingAs($this->admin)
                         ->patchJson("/api/planes-accion-tutorial/{$plan->id}/estatus", [
                             'estatus' => 'aprobado',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'aprobado');
    }

    public function test_tutor_no_puede_aprobar_su_propio_pat(): void
    {
        $plan = PlanAccionTutorial::create([
            'tutor_id'         => $this->tutor->id,
            'periodo_id'       => $this->periodo->id,
            'objetivo_general' => 'Test.',
            'estatus'          => 'enviado',
        ]);

        $response = $this->actingAs($this->docenteUser)
                         ->patchJson("/api/planes-accion-tutorial/{$plan->id}/estatus", [
                             'estatus' => 'aprobado',
                         ]);

        $response->assertStatus(403);
    }

    public function test_admin_puede_listar_todos_los_pat(): void
    {
        PlanAccionTutorial::create([
            'tutor_id'         => $this->tutor->id,
            'periodo_id'       => $this->periodo->id,
            'objetivo_general' => 'Test objetivo.',
            'estatus'          => 'borrador',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/planes-accion-tutorial');

        $response->assertStatus(200);
    }

    // ── S14-04: Dashboard PIT institucional ──────────────────────────────────────

    public function test_director_puede_ver_indicadores_tutoria(): void
    {
        $response = $this->actingAs($this->director)->getJson('/api/indicadores/tutoria');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => [
                     'tutores_activos',
                     'tutorados_asignados',
                     'sesiones_registradas',
                     'pct_alumnos_atendidos',
                     'periodo_id',
                     'por_tutor',
                 ]]);
    }

    public function test_admin_puede_ver_indicadores_tutoria(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/indicadores/tutoria');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_ver_indicadores_pit(): void
    {
        $response = $this->actingAs($this->docenteUser)->getJson('/api/indicadores/tutoria');

        $response->assertStatus(403);
    }

    public function test_alumno_no_puede_ver_indicadores_pit(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/indicadores/tutoria');

        $response->assertStatus(403);
    }
}
