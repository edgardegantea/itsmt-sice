<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Un usuario puede tener más de un rol a la vez (p. ej. personal_administrativo
 * que también da clases como docente) — UsuarioController pasó de manejar un
 * único `role` a un arreglo `roles` con assignRole()/syncRoles().
 */
class UsuarioRolesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'personal_administrativo', 'alumno'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->superadmin = User::factory()->create();
        $this->superadmin->assignRole('superadmin');
    }

    public function test_admin_crea_usuario_con_varios_roles(): void
    {
        $r = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/usuarios', [
            'name' => 'Rosa Pérez', 'email' => 'rosa.perez@test.com', 'password' => 'Password123',
            'roles' => ['personal_administrativo', 'docente'],
        ]);

        $r->assertStatus(201);
        $nombres = collect($r->json('data.roles'))->pluck('name');
        $this->assertEqualsCanonicalizing(['personal_administrativo', 'docente'], $nombres->all());
    }

    public function test_actualizar_roles_reemplaza_el_conjunto_anterior(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole(['docente']);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/usuarios/{$usuario->id}", [
                'roles' => ['docente', 'personal_administrativo'],
            ])
            ->assertStatus(200);

        $this->assertEqualsCanonicalizing(
            ['docente', 'personal_administrativo'],
            $usuario->fresh()->roles->pluck('name')->all()
        );
    }

    public function test_admin_no_puede_otorgar_superadmin_ni_combinado_con_otro_rol(): void
    {
        $r = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/usuarios', [
            'name' => 'Intento Escalada', 'email' => 'escala@test.com', 'password' => 'Password123',
            'roles' => ['docente', 'superadmin'],
        ]);

        $r->assertStatus(403);
    }

    public function test_superadmin_si_puede_otorgar_superadmin_combinado(): void
    {
        $r = $this->actingAs($this->superadmin, 'sanctum')->postJson('/api/admin/usuarios', [
            'name' => 'Doble Rol', 'email' => 'doble@test.com', 'password' => 'Password123',
            'roles' => ['admin', 'superadmin'],
        ]);

        $r->assertStatus(201);
    }

    public function test_roles_requiere_al_menos_uno(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/usuarios', [
            'name' => 'Sin Rol', 'email' => 'sinrol@test.com', 'password' => 'Password123',
            'roles' => [],
        ])->assertStatus(422);
    }
}
