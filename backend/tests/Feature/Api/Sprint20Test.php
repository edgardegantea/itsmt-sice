<?php

namespace Tests\Feature\Api;

use App\Domains\Convocatoria\Models\Convocatoria;
use App\Domains\Convocatoria\Models\Postulacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint20Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $director;
    private User $alumno;
    private User $alumno2;
    private User $docente;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s20@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'director.s20@test.com']);
        $this->director->assignRole('director_academico');

        $this->alumno = User::factory()->create(['email' => 'alumno.s20@test.com']);
        $this->alumno->assignRole('alumno');

        $this->alumno2 = User::factory()->create(['email' => 'alumno2.s20@test.com']);
        $this->alumno2->assignRole('alumno');

        $this->docente = User::factory()->create(['email' => 'docente.s20@test.com']);
        $this->docente->assignRole('docente');
    }

    // ── S20-01: Admin publica convocatoria ───────────────────────────────────────

    public function test_admin_crea_convocatoria_con_requisitos(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/convocatorias', [
            'titulo'         => 'Beca TECNM 2026-A',
            'descripcion'    => 'Convocatoria de becas para el semestre 2026-A',
            'tipo'           => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'   => now()->addDays(30)->toDateString(),
            'cupo_maximo'    => 20,
            'audiencia'      => ['roles' => ['alumno']],
            'requisitos'     => [
                ['descripcion' => 'Promedio mínimo 8.5', 'obligatorio' => true],
                ['descripcion' => 'Constancia de no adeudo', 'tipo_documento' => 'PDF', 'obligatorio' => true],
            ],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.titulo', 'Beca TECNM 2026-A')
                 ->assertJsonPath('data.tipo', 'beca');

        $this->assertDatabaseHas('convocatorias', ['titulo' => 'Beca TECNM 2026-A']);
        $this->assertDatabaseCount('requisitos_convocatoria', 2);
    }

    public function test_convocatoria_apertura_hoy_queda_activa(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/convocatorias', [
            'titulo'         => 'Concurso Académico',
            'descripcion'    => 'Concurso de matemáticas',
            'tipo'           => 'concurso',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'   => now()->addDays(15)->toDateString(),
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'activa');
    }

    public function test_convocatoria_apertura_futura_queda_borrador(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/convocatorias', [
            'titulo'         => 'Movilidad Futura',
            'descripcion'    => 'Programa de movilidad',
            'tipo'           => 'movilidad',
            'fecha_apertura' => now()->addDays(7)->toDateString(),
            'fecha_limite'   => now()->addDays(30)->toDateString(),
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'borrador');
    }

    public function test_alumno_no_puede_crear_convocatoria(): void
    {
        $response = $this->actingAs($this->alumno)->postJson('/api/convocatorias', [
            'titulo'         => 'Beca',
            'descripcion'    => 'Desc',
            'tipo'           => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'   => now()->addDays(10)->toDateString(),
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_cambia_estatus_convocatoria(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Test',
            'descripcion'   => 'Desc',
            'tipo'          => 'otro',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/convocatorias/{$conv->id}/estatus", [
            'estatus' => 'cerrada',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'cerrada');
    }

    // ── S20-02: Alumno se postula ────────────────────────────────────────────────

    public function test_alumno_se_postula_a_convocatoria_activa(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Beca Activa',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(20)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumno)->postJson("/api/convocatorias/{$conv->id}/postulaciones", [
            'documentos' => [],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'pendiente');

        $this->assertDatabaseHas('postulaciones', [
            'convocatoria_id' => $conv->id,
            'user_id'         => $this->alumno->id,
        ]);
    }

    public function test_no_puede_postular_a_convocatoria_cerrada(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Cerrada',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->subDays(30)->toDateString(),
            'fecha_limite'  => now()->subDays(5)->toDateString(),
            'estatus'       => 'cerrada',
            'publicada_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumno)->postJson("/api/convocatorias/{$conv->id}/postulaciones");

        $response->assertStatus(422);
    }

    public function test_no_puede_postular_si_cupo_lleno(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Cupo 1',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'cupo_maximo'   => 1,
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        // Primer alumno ocupa el cupo
        Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        // Segundo alumno no puede
        $response = $this->actingAs($this->alumno2)->postJson("/api/convocatorias/{$conv->id}/postulaciones");

        $response->assertStatus(422)
                 ->assertJsonFragment(['message' => 'El cupo de esta convocatoria está lleno. No se aceptan más postulaciones.']);
    }

    public function test_no_puede_postular_dos_veces(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Duplicado',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->alumno)->postJson("/api/convocatorias/{$conv->id}/postulaciones");

        $response->assertStatus(422)
                 ->assertJsonFragment(['message' => 'Ya tienes una postulación registrada para esta convocatoria.']);
    }

    // ── S20-03: Admin revisa postulaciones ──────────────────────────────────────

    public function test_admin_cambia_postulacion_a_admitido(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Revision',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $postulacion = Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/postulaciones/{$postulacion->id}/estatus", [
            'estatus'       => 'admitido',
            'observaciones' => 'Documentos completos y promedio suficiente.',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'admitido');

        $this->assertDatabaseHas('postulaciones', [
            'id'      => $postulacion->id,
            'estatus' => 'admitido',
        ]);
    }

    public function test_admin_cambia_postulacion_a_en_revision(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Rev2',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $postulacion = Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/postulaciones/{$postulacion->id}/estatus", [
            'estatus' => 'en_revision',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'en_revision');
    }

    public function test_alumno_no_puede_cambiar_estatus_postulacion(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Forbidden',
            'descripcion'   => 'Desc',
            'tipo'          => 'otro',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $postulacion = Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->alumno)->patchJson("/api/postulaciones/{$postulacion->id}/estatus", [
            'estatus' => 'admitido',
        ]);

        $response->assertStatus(403);
    }

    // ── S20-04: Director publica resultados ─────────────────────────────────────

    public function test_director_publica_resultados_y_cambia_estatus(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Beca Resultados',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->subDays(10)->toDateString(),
            'fecha_limite'  => now()->subDays(1)->toDateString(),
            'estatus'       => 'cerrada',
            'publicada_por' => $this->admin->id,
        ]);

        Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'admitido',
            'fecha_postulacion' => now()->subDays(5),
        ]);

        $response = $this->actingAs($this->director)->postJson("/api/convocatorias/{$conv->id}/publicar-resultados");

        $response->assertStatus(200)
                 ->assertJsonPath('data.convocatoria.estatus', 'resultados_publicados')
                 ->assertJsonPath('data.notificados', 1);
    }

    public function test_alumno_no_puede_publicar_resultados(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Pub',
            'descripcion'   => 'Desc',
            'tipo'          => 'otro',
            'fecha_apertura' => now()->subDays(5)->toDateString(),
            'fecha_limite'  => now()->subDays(1)->toDateString(),
            'estatus'       => 'cerrada',
            'publicada_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumno)->postJson("/api/convocatorias/{$conv->id}/publicar-resultados");

        $response->assertStatus(403);
    }

    // ── S20-05: Historial de postulaciones del alumno ────────────────────────────

    public function test_alumno_ve_sus_postulaciones(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Historial',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno->id,
            'estatus'           => 'admitido',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->alumno)->getJson("/api/users/{$this->alumno->id}/postulaciones");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('admitido', $data[0]['estatus']);
    }

    public function test_admin_ve_postulaciones_de_cualquier_usuario(): void
    {
        $conv = Convocatoria::create([
            'titulo'        => 'Conv Admin View',
            'descripcion'   => 'Desc',
            'tipo'          => 'concurso',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(10)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        Postulacion::create([
            'convocatoria_id'   => $conv->id,
            'user_id'           => $this->alumno2->id,
            'estatus'           => 'pendiente',
            'fecha_postulacion' => now(),
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/users/{$this->alumno2->id}/postulaciones");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_alumno_no_puede_ver_postulaciones_de_otro_alumno(): void
    {
        $response = $this->actingAs($this->alumno)->getJson("/api/users/{$this->alumno2->id}/postulaciones");

        $response->assertStatus(403);
    }

    // ── S20-01 bonus: GET detalle convocatoria y listado con filtro ──────────────

    public function test_alumno_ve_convocatorias_activas(): void
    {
        Convocatoria::create([
            'titulo'        => 'Beca Visible',
            'descripcion'   => 'Desc',
            'tipo'          => 'beca',
            'fecha_apertura' => now()->toDateString(),
            'fecha_limite'  => now()->addDays(20)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);
        Convocatoria::create([
            'titulo'        => 'Borrador Oculto',
            'descripcion'   => 'Desc',
            'tipo'          => 'otro',
            'fecha_apertura' => now()->addDays(5)->toDateString(),
            'fecha_limite'  => now()->addDays(15)->toDateString(),
            'estatus'       => 'borrador',
            'publicada_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumno)->getJson('/api/convocatorias');

        $response->assertStatus(200);
        // El alumno no debe ver borradores
        $titulos = collect($response->json('data'))->pluck('titulo')->toArray();
        $this->assertContains('Beca Visible', $titulos);
        $this->assertNotContains('Borrador Oculto', $titulos);
    }

    public function test_artisan_command_cierra_convocatorias_vencidas(): void
    {
        Convocatoria::create([
            'titulo'        => 'Conv Vencida',
            'descripcion'   => 'Desc',
            'tipo'          => 'otro',
            'fecha_apertura' => now()->subDays(10)->toDateString(),
            'fecha_limite'  => now()->subDays(1)->toDateString(),
            'estatus'       => 'activa',
            'publicada_por' => $this->admin->id,
        ]);

        $this->artisan('convocatorias:cerrar')->assertExitCode(0);

        $this->assertDatabaseHas('convocatorias', [
            'titulo'  => 'Conv Vencida',
            'estatus' => 'cerrada',
        ]);
    }
}
