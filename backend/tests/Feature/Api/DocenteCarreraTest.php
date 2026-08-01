<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Carrera;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DocenteCarreraTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docente;
    private Carrera $carreraA;
    private Carrera $carreraB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'jefe_carrera', 'docente', 'director_academico'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create();
        $this->docente->assignRole('docente');

        $this->carreraA = Carrera::create(['nombre' => 'ISC', 'clave' => 'ISC', 'codigo_it' => '06', 'activa' => true]);
        $this->carreraB = Carrera::create(['nombre' => 'IIA', 'clave' => 'IIA', 'codigo_it' => '07', 'activa' => true]);
    }

    public function test_admin_asigna_varias_carreras_a_un_docente(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/usuarios/{$this->docente->id}", [
                'carreras' => [
                    ['id' => $this->carreraA->id, 'horas_asignadas' => 12],
                    ['id' => $this->carreraB->id, 'horas_asignadas' => 8],
                ],
            ]);

        $response->assertStatus(200);

        $this->assertCount(2, $this->docente->carreras()->get());
        $this->assertDatabaseHas('docente_carrera', ['docente_id' => $this->docente->id, 'carrera_id' => $this->carreraA->id, 'horas_asignadas' => 12]);
        $this->assertDatabaseHas('docente_carrera', ['docente_id' => $this->docente->id, 'carrera_id' => $this->carreraB->id, 'horas_asignadas' => 8]);
    }

    public function test_actualizar_carreras_reemplaza_las_anteriores(): void
    {
        $this->docente->carreras()->sync([$this->carreraA->id]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/usuarios/{$this->docente->id}", [
                'carreras' => [['id' => $this->carreraB->id, 'horas_asignadas' => 6]],
            ])
            ->assertStatus(200);

        $ids = $this->docente->carreras()->pluck('carreras.id')->all();
        $this->assertEqualsCanonicalizing([$this->carreraB->id], $ids);
    }

    public function test_listado_de_docentes_filtra_por_carrera(): void
    {
        $this->docente->carreras()->sync([$this->carreraA->id]);
        $otroDocente = User::factory()->create();
        $otroDocente->assignRole('docente');
        $otroDocente->carreras()->sync([$this->carreraB->id]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/docentes?carrera_id={$this->carreraA->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($this->docente->id, $ids);
        $this->assertNotContains($otroDocente->id, $ids);
    }

    public function test_jefe_carrera_solo_ve_docentes_de_su_carrera_en_el_listado(): void
    {
        $this->docente->carreras()->sync([$this->carreraA->id]);
        $otroDocente = User::factory()->create();
        $otroDocente->assignRole('docente');
        $otroDocente->carreras()->sync([$this->carreraB->id]);

        $jefe = User::factory()->create(['carrera_id' => $this->carreraA->id]);
        $jefe->assignRole('jefe_carrera');

        $response = $this->actingAs($jefe, 'sanctum')->getJson('/api/admin/docentes');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($this->docente->id, $ids);
        $this->assertNotContains($otroDocente->id, $ids);
    }

    public function test_docente_crea_y_actualiza_su_propio_cv(): void
    {
        $response = $this->actingAs($this->docente, 'sanctum')->getJson('/api/mi-ficha-docente');
        $response->assertStatus(200);
        $this->assertDatabaseHas('fichas_docentes', ['docente_id' => $this->docente->id]);

        $update = $this->actingAs($this->docente, 'sanctum')
            ->putJson('/api/mi-ficha-docente', [
                'semblanza' => 'Ingeniero con 10 años de experiencia.',
                'experiencia_laboral' => [
                    ['puesto' => 'Desarrollador', 'institucion' => 'ACME', 'fecha_inicio' => '2015', 'fecha_fin' => '2020'],
                ],
                'publicaciones' => [
                    ['titulo' => 'Sistemas distribuidos aplicados', 'anio' => 2021],
                ],
            ]);

        $update->assertStatus(200)
            ->assertJsonPath('data.semblanza', 'Ingeniero con 10 años de experiencia.');

        $ficha = $this->docente->fichaDocente()->first();
        $this->assertNotNull($ficha->cv_actualizado_en);
        $this->assertCount(1, $ficha->experiencia_laboral);
    }

    public function test_alumno_no_puede_editar_ficha_de_docente(): void
    {
        Role::firstOrCreate(['name' => 'alumno', 'guard_name' => 'web']);
        $alumnoUser = User::factory()->create();
        $alumnoUser->assignRole('alumno');

        $this->actingAs($alumnoUser, 'sanctum')
            ->getJson('/api/mi-ficha-docente')
            ->assertStatus(403);
    }

    public function test_docente_puede_estar_en_varias_carreras_simultaneamente(): void
    {
        $this->docente->carreras()->sync([$this->carreraA->id, $this->carreraB->id]);

        $resultadoA = User::deCarrera($this->carreraA->id)->pluck('id');
        $resultadoB = User::deCarrera($this->carreraB->id)->pluck('id');

        $this->assertTrue($resultadoA->contains($this->docente->id));
        $this->assertTrue($resultadoB->contains($this->docente->id));
    }
}
