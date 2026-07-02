<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Convalidacion;
use App\Domains\Academico\Models\Equivalencia;
use App\Domains\Academico\Models\Traslado;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint15Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $alumnoUser;
    private User $docenteUser;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s15@test.com']);
        $this->admin->assignRole('admin');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s15@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $this->docenteUser = User::factory()->create(['email' => 'docente.s15@test.com']);
        $this->docenteUser->assignRole('docente');
    }

    // ── S15-01: Solicitar traslado al ITSMT ──────────────────────────────────────

    public function test_alumno_puede_solicitar_traslado_entrada(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/traslados', [
            'tipo'             => 'entrada',
            'instituto_origen' => 'TecNM Campus Veracruz',
            'fecha_solicitud'  => now()->toDateString(),
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.tipo', 'entrada')
                 ->assertJsonPath('data.estatus', 'solicitado');

        $this->assertDatabaseHas('traslados', [
            'alumno_id' => $this->alumnoUser->id,
            'tipo'      => 'entrada',
            'estatus'   => 'solicitado',
        ]);
    }

    public function test_alumno_no_puede_solicitar_traslado_salida(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/traslados', [
            'tipo'              => 'salida',
            'instituto_destino' => 'TecNM Campus Xalapa',
            'fecha_solicitud'   => now()->toDateString(),
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_puede_crear_traslado_salida(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/traslados', [
            'alumno_id'         => $this->alumnoUser->id,
            'tipo'              => 'salida',
            'instituto_destino' => 'TecNM Campus Xalapa',
            'fecha_solicitud'   => now()->toDateString(),
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.tipo', 'salida');
    }

    public function test_alumno_ve_solo_sus_traslados(): void
    {
        Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        // Traslado de otro alumno
        $otro = User::factory()->create();
        $otro->assignRole('alumno');
        Traslado::create([
            'alumno_id'       => $otro->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->alumnoUser)->getJson('/api/traslados');

        $response->assertStatus(200);
        $response->assertJsonPath('data.total', 1);
    }

    // ── S15-02: Admin gestiona solicitud de traslado ──────────────────────────────

    public function test_admin_puede_aceptar_traslado(): void
    {
        $traslado = Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/traslados/{$traslado->id}/gestionar", [
            'estatus' => 'aceptado',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'aceptado');
    }

    public function test_admin_puede_rechazar_traslado(): void
    {
        $traslado = Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/traslados/{$traslado->id}/gestionar", [
            'estatus'        => 'rechazado',
            'motivo_rechazo' => 'Documentación incompleta.',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'rechazado');
    }

    public function test_no_se_puede_gestionar_traslado_ya_gestionado(): void
    {
        $traslado = Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
            'estatus'         => 'aceptado',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/traslados/{$traslado->id}/gestionar", [
            'estatus' => 'rechazado',
        ]);

        $response->assertStatus(422);
    }

    public function test_alumno_no_puede_gestionar_traslado(): void
    {
        $traslado = Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'entrada',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->alumnoUser)->patchJson("/api/traslados/{$traslado->id}/gestionar", [
            'estatus' => 'aceptado',
        ]);

        $response->assertStatus(403);
    }

    // ── S15-03: Convalidación de materias ─────────────────────────────────────────

    public function test_admin_puede_registrar_convalidacion(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/convalidaciones', [
            'alumno_id'             => $this->alumnoUser->id,
            'materia_origen_nombre' => 'Cálculo Diferencial',
            'materia_origen_clave'  => 'MAT-101',
            'calificacion_obtenida' => 85,
            'institucion_origen'    => 'TecNM Campus Veracruz',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.materia_origen_clave', 'MAT-101');

        $this->assertDatabaseHas('convalidaciones', [
            'alumno_id'            => $this->alumnoUser->id,
            'materia_origen_clave' => 'MAT-101',
        ]);
    }

    public function test_admin_puede_listar_convalidaciones(): void
    {
        Convalidacion::create([
            'alumno_id'             => $this->alumnoUser->id,
            'materia_origen_nombre' => 'Álgebra Lineal',
            'materia_origen_clave'  => 'MAT-102',
            'calificacion_obtenida' => 90,
            'institucion_origen'    => 'TecNM Campus Veracruz',
            'registrado_por'        => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/convalidaciones');

        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_registrar_convalidacion(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/convalidaciones', [
            'alumno_id'             => $this->alumnoUser->id,
            'materia_origen_nombre' => 'Física',
            'materia_origen_clave'  => 'FIS-101',
            'calificacion_obtenida' => 78,
            'institucion_origen'    => 'TecNM Campus Veracruz',
        ]);

        $response->assertStatus(403);
    }

    public function test_alumno_puede_ver_sus_propias_convalidaciones(): void
    {
        Convalidacion::create([
            'alumno_id'             => $this->alumnoUser->id,
            'materia_origen_nombre' => 'Química',
            'materia_origen_clave'  => 'QUI-101',
            'calificacion_obtenida' => 75,
            'institucion_origen'    => 'UNAM',
            'registrado_por'        => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumnoUser)->getJson('/api/convalidaciones');

        $response->assertStatus(200);
    }

    // ── S15-04: Equivalencia de estudios IES externas ─────────────────────────────

    public function test_admin_puede_registrar_equivalencia(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/equivalencias', [
            'alumno_id'          => $this->alumnoUser->id,
            'institucion_origen' => 'Universidad Veracruzana',
            'materias_json'      => [
                [
                    'clave'       => 'UV-MAT-01',
                    'nombre'      => 'Matemáticas Discretas',
                    'calificacion' => 88,
                    'creditos'    => 5,
                    'materia_equivalente_id' => null,
                ],
            ],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.institucion_origen', 'Universidad Veracruzana');

        $this->assertDatabaseHas('equivalencias', [
            'alumno_id'          => $this->alumnoUser->id,
            'institucion_origen' => 'Universidad Veracruzana',
        ]);
    }

    public function test_alumno_no_puede_registrar_equivalencia(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/equivalencias', [
            'alumno_id'          => $this->alumnoUser->id,
            'institucion_origen' => 'IES Cualquiera',
            'materias_json'      => [['clave' => 'X', 'nombre' => 'X', 'calificacion' => 80, 'creditos' => 3]],
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_puede_listar_equivalencias(): void
    {
        Equivalencia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'institucion_origen' => 'IPN',
            'materias_json'      => [['clave' => 'IPN-CS-01', 'nombre' => 'Ciencias Sociales', 'calificacion' => 85, 'creditos' => 4]],
            'validado_por'       => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/equivalencias');

        $response->assertStatus(200);
    }

    public function test_alumno_puede_ver_sus_propias_equivalencias(): void
    {
        Equivalencia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'institucion_origen' => 'IPN',
            'materias_json'      => [['clave' => 'IPN-01', 'nombre' => 'Física', 'calificacion' => 82, 'creditos' => 4]],
            'validado_por'       => $this->admin->id,
        ]);

        $response = $this->actingAs($this->alumnoUser)->getJson('/api/equivalencias');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_listar_equivalencias(): void
    {
        $response = $this->actingAs($this->docenteUser)->getJson('/api/equivalencias');

        $response->assertStatus(403);
    }

    // ── S15-05: Kardex para traslado saliente ─────────────────────────────────────

    public function test_admin_puede_obtener_kardex_pdf_traslado(): void
    {
        $traslado = Traslado::create([
            'alumno_id'         => $this->alumnoUser->id,
            'tipo'              => 'salida',
            'instituto_destino' => 'TecNM Campus Xalapa',
            'fecha_solicitud'   => now()->toDateString(),
            'estatus'           => 'aceptado',
        ]);

        $response = $this->actingAs($this->admin)
                         ->get("/api/traslados/{$traslado->id}/kardex/pdf");

        $response->assertStatus(200)
                 ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_alumno_no_puede_obtener_kardex_pdf(): void
    {
        $traslado = Traslado::create([
            'alumno_id'       => $this->alumnoUser->id,
            'tipo'            => 'salida',
            'fecha_solicitud' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->alumnoUser)
                         ->get("/api/traslados/{$traslado->id}/kardex/pdf");

        $response->assertStatus(403);
    }
}
