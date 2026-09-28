<?php

namespace Tests\Feature\Api;

use App\Domains\Comunicacion\Models\Comunicado;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ComunicadoTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $docente;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin',   'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'docente', 'guard_name' => 'web']);

        $this->admin = User::factory()->create(['name' => 'Admin User']);
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create(['name' => 'Docente User']);
        $this->docente->assignRole('docente');
    }

    public function test_crear_comunicado_por_administrador(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/comunicados', [
                'titulo'    => 'Aviso Importante de Fin de Semestre',
                'contenido' => 'Favor de entregar evaluaciones antes del viernes.',
                'prioridad' => 'alta',
                'categoria' => 'academico',
                'fijado'    => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.titulo', 'Aviso Importante de Fin de Semestre')
            ->assertJsonPath('data.prioridad', 'alta');

        $this->assertDatabaseHas('comunicados', [
            'titulo'    => 'Aviso Importante de Fin de Semestre',
            'prioridad' => 'alta',
        ]);
    }

    public function test_docente_puede_listar_comunicados_vigentes(): void
    {
        Comunicado::create([
            'titulo'           => 'Circular General 001',
            'contenido'        => 'Contenido de la circular general.',
            'prioridad'        => 'normal',
            'categoria'        => 'general',
            'publicado_at'     => now(),
            'publicado_por_id' => $this->admin->id,
            'activo'           => true,
        ]);

        $response = $this->actingAs($this->docente, 'sanctum')
            ->getJson('/api/comunicados');

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.titulo', 'Circular General 001');
    }

    public function test_marcar_comunicado_como_leido(): void
    {
        $comunicado = Comunicado::create([
            'titulo'           => 'Capacitación Obligatoria',
            'contenido'        => 'Curso de seguridad informática.',
            'prioridad'        => 'urgente',
            'categoria'        => 'general',
            'publicado_at'     => now(),
            'publicado_por_id' => $this->admin->id,
            'activo'           => true,
        ]);

        $response = $this->actingAs($this->docente, 'sanctum')
            ->postJson("/api/comunicados/{$comunicado->id}/marcar-leido");

        $response->assertStatus(200);

        $this->assertDatabaseHas('comunicado_lecturas', [
            'comunicado_id' => $comunicado->id,
            'user_id'       => $this->docente->id,
        ]);
    }
}
