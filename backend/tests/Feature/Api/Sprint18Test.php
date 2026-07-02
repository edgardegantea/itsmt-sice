<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\FichaSindical;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint18Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docenteUser;
    private User $director;
    private User $alumnoUser;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s18@test.com']);
        $this->admin->assignRole('admin');

        $this->docenteUser = User::factory()->create(['email' => 'docente.s18@test.com', 'name' => 'Dr. Juan Pérez']);
        $this->docenteUser->assignRole('docente');

        $this->director = User::factory()->create(['email' => 'director.s18@test.com']);
        $this->director->assignRole('director_academico');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s18@test.com']);
        $this->alumnoUser->assignRole('alumno');
    }

    // ── S18-01: Registrar datos sindicales del docente ───────────────────────────

    public function test_admin_registra_ficha_sindical_de_docente(): void
    {
        $response = $this->actingAs($this->admin)->postJson(
            "/api/docentes/{$this->docenteUser->id}/ficha-sindical",
            [
                'clave_plaza'         => 'TECNM-001',
                'tipo_nombramiento'   => 'Base',
                'categoria_tbc'       => 'PA',
                'nivel_tbc'           => '3C',
                'numero_issste'       => 'ISSSTE-9999',
                'fecha_ingreso_sep'   => '2010-08-16',
                'fecha_ingreso_tecnm' => '2012-08-16',
            ]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.clave_plaza', 'TECNM-001')
                 ->assertJsonPath('data.tipo_nombramiento', 'Base');

        $this->assertDatabaseHas('fichas_sindicales', [
            'docente_id'   => $this->docenteUser->id,
            'clave_plaza'  => 'TECNM-001',
        ]);
    }

    public function test_clave_plaza_duplicada_retorna_422(): void
    {
        FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-001',
            'tipo_nombramiento' => 'Base',
            'fecha_ingreso_sep' => '2010-08-16',
            'anios_servicio'    => 14,
        ]);

        $otroDocente = User::factory()->create(['email' => 'docente2.s18@test.com']);
        $otroDocente->assignRole('docente');

        $response = $this->actingAs($this->admin)->postJson(
            "/api/docentes/{$otroDocente->id}/ficha-sindical",
            [
                'clave_plaza'       => 'TECNM-001',
                'tipo_nombramiento' => 'Interino',
                'fecha_ingreso_sep' => '2015-01-01',
            ]
        );

        $response->assertStatus(422);
    }

    public function test_admin_consulta_ficha_sindical_de_docente(): void
    {
        FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-002',
            'tipo_nombramiento' => 'Interino',
            'fecha_ingreso_sep' => '2018-01-15',
            'anios_servicio'    => 6,
        ]);

        $response = $this->actingAs($this->admin)->getJson(
            "/api/docentes/{$this->docenteUser->id}/ficha-sindical"
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.clave_plaza', 'TECNM-002');
    }

    public function test_alumno_no_puede_registrar_ficha_sindical(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson(
            "/api/docentes/{$this->docenteUser->id}/ficha-sindical",
            [
                'clave_plaza'       => 'TECNM-003',
                'tipo_nombramiento' => 'Base',
                'fecha_ingreso_sep' => '2010-08-16',
            ]
        );

        $response->assertStatus(403);
    }

    // ── S18-02: Antigüedad y cálculo de años de servicio ────────────────────────

    public function test_sistema_calcula_anios_servicio_automaticamente(): void
    {
        $response = $this->actingAs($this->admin)->postJson(
            "/api/docentes/{$this->docenteUser->id}/ficha-sindical",
            [
                'clave_plaza'       => 'TECNM-010',
                'tipo_nombramiento' => 'Base',
                'fecha_ingreso_sep' => '2005-08-16',
            ]
        );

        $response->assertStatus(201);
        $anios = $response->json('data.anios_servicio');
        $this->assertGreaterThan(0, $anios);
    }

    public function test_alerta_cuando_fecha_sep_posterior_a_tecnm(): void
    {
        $response = $this->actingAs($this->admin)->postJson(
            "/api/docentes/{$this->docenteUser->id}/ficha-sindical",
            [
                'clave_plaza'         => 'TECNM-011',
                'tipo_nombramiento'   => 'Interino',
                'fecha_ingreso_sep'   => '2020-01-01',  // posterior a tecnm
                'fecha_ingreso_tecnm' => '2018-01-01',  // ingresó antes
            ]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.alerta_fecha', true);
    }

    // ── S18-03: Catálogo de plazas con filtros ───────────────────────────────────

    public function test_director_puede_listar_plazas(): void
    {
        FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-020',
            'tipo_nombramiento' => 'Base',
            'fecha_ingreso_sep' => '2010-01-01',
            'anios_servicio'    => 14,
        ]);

        $response = $this->actingAs($this->director)->getJson('/api/plazas');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['data']]);
    }

    public function test_filtrar_plazas_por_tipo_nombramiento(): void
    {
        FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-021',
            'tipo_nombramiento' => 'Base',
            'fecha_ingreso_sep' => '2010-01-01',
            'anios_servicio'    => 14,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/plazas?tipo_nombramiento=Base');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals('Base', $data[0]['tipo_nombramiento']);
    }

    public function test_alumno_no_puede_listar_plazas(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/plazas');
        $response->assertStatus(403);
    }

    // ── S18-04: Movimientos de plaza (historial inmutable) ───────────────────────

    public function test_admin_registra_movimiento_tipo_alta(): void
    {
        $ficha = FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-030',
            'tipo_nombramiento' => 'Base',
            'fecha_ingreso_sep' => '2010-01-01',
            'anios_servicio'    => 14,
        ]);

        $response = $this->actingAs($this->admin)->postJson(
            "/api/plazas/{$ficha->id}/movimientos",
            [
                'tipo_movimiento' => 'alta',
                'fecha_efectiva'  => '2010-08-16',
                'notas'           => 'Primer alta en sistema',
            ]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.tipo_movimiento', 'alta');

        $this->assertDatabaseHas('movimientos_plaza', [
            'ficha_sindical_id' => $ficha->id,
            'tipo_movimiento'   => 'alta',
        ]);
    }

    public function test_admin_registra_cambio_categoria_y_actualiza_ficha(): void
    {
        $ficha = FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-031',
            'tipo_nombramiento' => 'Base',
            'categoria_tbc'     => 'PA',
            'fecha_ingreso_sep' => '2010-01-01',
            'anios_servicio'    => 14,
        ]);

        $response = $this->actingAs($this->admin)->postJson(
            "/api/plazas/{$ficha->id}/movimientos",
            [
                'tipo_movimiento'    => 'cambio_categoria',
                'categoria_anterior' => 'PA',
                'categoria_nueva'    => 'PB',
                'fecha_efectiva'     => '2020-01-01',
            ]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.categoria_nueva', 'PB');

        $this->assertDatabaseHas('fichas_sindicales', [
            'id'            => $ficha->id,
            'categoria_tbc' => 'PB',
        ]);
    }

    public function test_alumno_no_puede_registrar_movimiento_de_plaza(): void
    {
        $ficha = FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-032',
            'tipo_nombramiento' => 'Interino',
            'fecha_ingreso_sep' => '2019-01-01',
            'anios_servicio'    => 5,
        ]);

        $response = $this->actingAs($this->alumnoUser)->postJson(
            "/api/plazas/{$ficha->id}/movimientos",
            [
                'tipo_movimiento' => 'alta',
                'fecha_efectiva'  => '2019-08-16',
            ]
        );

        $response->assertStatus(403);
    }

    // ── S18-05: PDF Plantilla Docente Sindicalizada para TecNM ──────────────────

    public function test_director_genera_pdf_plantilla_sindical(): void
    {
        FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-040',
            'tipo_nombramiento' => 'Base',
            'fecha_ingreso_sep' => '2010-01-01',
            'anios_servicio'    => 14,
        ]);

        $response = $this->actingAs($this->director)->get('/api/reportes/plantilla-sindical/pdf');

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type') ?? ''));
    }

    public function test_admin_genera_pdf_plantilla_sindical(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/reportes/plantilla-sindical/pdf');
        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_generar_pdf_plantilla(): void
    {
        $response = $this->actingAs($this->alumnoUser)->get('/api/reportes/plantilla-sindical/pdf');
        $response->assertStatus(403);
    }
}
