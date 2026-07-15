<?php

namespace Tests\Feature\Api;

use App\Domains\Biblioteca\Models\Acervo;
use App\Domains\Biblioteca\Models\Ejemplar;
use App\Domains\Biblioteca\Models\Prestamo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint24Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $bibliotecario;
    private User $lector;
    private Acervo $libro;
    private Ejemplar $ejemplar;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s24@test.com']);
        $this->admin->assignRole('admin');

        $this->bibliotecario = User::factory()->create(['email' => 'biblio.s24@test.com']);
        $this->bibliotecario->assignRole('personal_administrativo');

        $this->lector = User::factory()->create(['email' => 'lector.s24@test.com']);
        $this->lector->assignRole('alumno');

        $this->libro = Acervo::create([
            'titulo'                 => 'Estructuras de Datos',
            'autor'                  => 'Heileman, Gregory L.',
            'editorial'              => 'McGraw-Hill',
            'anio_edicion'           => 2019,
            'total_ejemplares'       => 1,
            'ejemplares_disponibles' => 1,
            'activo'                 => true,
        ]);

        $this->ejemplar = Ejemplar::create([
            'acervo_id'     => $this->libro->id,
            'codigo_barras' => 'BIB-001-S24',
            'estatus'       => 'disponible',
        ]);
    }

    // S24-01: buscar en acervo
    public function test_puede_buscar_en_acervo(): void
    {
        $res = $this->actingAs($this->lector)->getJson('/api/acervo?q=Estructuras');
        $res->assertOk()->assertJsonCount(1, 'data.data');
    }

    // S24-02: admin agrega libro
    public function test_admin_puede_agregar_libro_al_acervo(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/acervo', [
            'titulo'    => 'Algoritmos y Complejidad',
            'autor'     => 'Cormen, Thomas H.',
            'editorial' => 'MIT Press',
        ]);

        $res->assertStatus(201)->assertJsonPath('data.titulo', 'Algoritmos y Complejidad');
    }

    // S24-03: ver ejemplares de un libro
    public function test_puede_ver_ejemplares_de_libro(): void
    {
        $res = $this->actingAs($this->lector)->getJson("/api/acervo/{$this->libro->id}/ejemplares");
        $res->assertOk()->assertJsonCount(1, 'data');
    }

    // S24-04: registrar préstamo
    public function test_bibliotecario_puede_crear_prestamo(): void
    {
        $res = $this->actingAs($this->bibliotecario)->postJson('/api/prestamos', [
            'ejemplar_id'               => $this->ejemplar->id,
            'user_id'                   => $this->lector->id,
            'fecha_devolucion_esperada' => now()->addDays(7)->toDateString(),
        ]);

        $res->assertStatus(201)->assertJsonPath('data.estatus', 'activo');
        $this->assertDatabaseHas('ejemplares', ['id' => $this->ejemplar->id, 'estatus' => 'prestado']);
    }

    // S24-05: no se puede prestar un ejemplar no disponible
    public function test_no_se_puede_prestar_ejemplar_no_disponible(): void
    {
        $this->ejemplar->update(['estatus' => 'prestado']);

        $res = $this->actingAs($this->bibliotecario)->postJson('/api/prestamos', [
            'ejemplar_id'               => $this->ejemplar->id,
            'user_id'                   => $this->lector->id,
            'fecha_devolucion_esperada' => now()->addDays(7)->toDateString(),
        ]);

        $res->assertStatus(422);
    }

    // S24-06: devolver préstamo
    public function test_puede_registrar_devolucion(): void
    {
        $prestamo = Prestamo::create([
            'ejemplar_id'               => $this->ejemplar->id,
            'user_id'                   => $this->lector->id,
            'fecha_prestamo'            => now()->subDays(3)->toDateString(),
            'fecha_devolucion_esperada' => now()->addDays(4)->toDateString(),
            'estatus'                   => 'activo',
            'atendido_por'              => $this->bibliotecario->id,
        ]);

        $this->ejemplar->update(['estatus' => 'prestado']);

        $res = $this->actingAs($this->bibliotecario)->patchJson("/api/prestamos/{$prestamo->id}/devolver");
        $res->assertOk()->assertJsonPath('data.estatus', 'devuelto');
        $this->assertDatabaseHas('ejemplares', ['id' => $this->ejemplar->id, 'estatus' => 'disponible']);
    }

    // S24-07: renovar préstamo
    public function test_puede_renovar_prestamo(): void
    {
        $prestamo = Prestamo::create([
            'ejemplar_id'               => $this->ejemplar->id,
            'user_id'                   => $this->lector->id,
            'fecha_prestamo'            => now()->toDateString(),
            'fecha_devolucion_esperada' => now()->addDays(7)->toDateString(),
            'estatus'                   => 'activo',
            'renovaciones'              => 0,
            'atendido_por'              => $this->bibliotecario->id,
        ]);

        $res = $this->actingAs($this->bibliotecario)->patchJson("/api/prestamos/{$prestamo->id}/renovar", [
            'nueva_fecha_devolucion' => now()->addDays(14)->toDateString(),
        ]);

        $res->assertOk()->assertJsonPath('data.renovaciones', 1);
    }

    // S24-08: límite de renovaciones (máx 2)
    public function test_no_se_puede_renovar_mas_de_dos_veces(): void
    {
        $prestamo = Prestamo::create([
            'ejemplar_id'               => $this->ejemplar->id,
            'user_id'                   => $this->lector->id,
            'fecha_prestamo'            => now()->toDateString(),
            'fecha_devolucion_esperada' => now()->addDays(7)->toDateString(),
            'estatus'                   => 'activo',
            'renovaciones'              => 2,
            'atendido_por'              => $this->bibliotecario->id,
        ]);

        $res = $this->actingAs($this->bibliotecario)->patchJson("/api/prestamos/{$prestamo->id}/renovar", [
            'nueva_fecha_devolucion' => now()->addDays(14)->toDateString(),
        ]);

        $res->assertStatus(422);
    }

    // S24-09: estadísticas de biblioteca
    public function test_puede_ver_estadisticas_biblioteca(): void
    {
        $res = $this->actingAs($this->admin)->getJson('/api/biblioteca/estadisticas');
        $res->assertOk()->assertJsonStructure(['data' => [
            'total_titulos', 'total_ejemplares', 'prestamos_activos',
            'prestamos_vencidos', 'reservas_activas',
        ]]);
    }
}
