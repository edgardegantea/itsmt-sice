<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\FichaSindical;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PermisoSindical;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint19Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docenteUser;
    private User $director;
    private User $alumnoUser;
    private FichaSindical $fichaSindical;
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

        $this->admin = User::factory()->create(['email' => 'admin.s19@test.com']);
        $this->admin->assignRole('admin');

        $this->docenteUser = User::factory()->create(['email' => 'docente.s19@test.com', 'name' => 'Dra. Carmen Soto']);
        $this->docenteUser->assignRole('docente');

        $this->director = User::factory()->create(['email' => 'director.s19@test.com']);
        $this->director->assignRole('director_academico');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s19@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $this->periodo = Periodo::create([
            'nombre'       => '2026-A',
            'fecha_inicio' => '2026-01-12',
            'fecha_fin'    => '2026-06-12',
            'activo'       => true,
        ]);

        $this->fichaSindical = FichaSindical::create([
            'docente_id'        => $this->docenteUser->id,
            'clave_plaza'       => 'TECNM-S19-001',
            'tipo_nombramiento' => 'Base',
            'categoria_tbc'     => 'PA',
            'fecha_ingreso_sep' => '2010-08-16',
            'anios_servicio'    => 15,
        ]);
    }

    // ── S19-01: Registrar permisos sindicales ────────────────────────────────────

    public function test_admin_registra_permiso_sindical_y_calcula_dias(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/permisos-sindicales', [
            'docente_id'   => $this->docenteUser->id,
            'tipo_permiso' => 'comision_sindical',
            'fecha_inicio' => '2026-03-10',
            'fecha_fin'    => '2026-03-14',
            'motivo'       => 'Reunión ordinaria SNTE Sección 10',
            'periodo_id'   => $this->periodo->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.dias_totales', 5)
                 ->assertJsonPath('data.con_goce_sueldo', true);

        $this->assertDatabaseHas('permisos_sindicales', [
            'docente_id'    => $this->docenteUser->id,
            'tipo_permiso'  => 'comision_sindical',
            'dias_totales'  => 5,
        ]);
    }

    public function test_sin_goce_para_licencia_sin_goce(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/permisos-sindicales', [
            'docente_id'   => $this->docenteUser->id,
            'tipo_permiso' => 'licencia_sin_goce',
            'fecha_inicio' => '2026-04-01',
            'fecha_fin'    => '2026-04-03',
            'motivo'       => 'Asuntos personales sindicales',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.con_goce_sueldo', false);
    }

    public function test_error_si_docente_sin_ficha_sindical(): void
    {
        $docenteSinFicha = User::factory()->create(['email' => 'sin.ficha.s19@test.com']);
        $docenteSinFicha->assignRole('docente');

        $response = $this->actingAs($this->admin)->postJson('/api/permisos-sindicales', [
            'docente_id'   => $docenteSinFicha->id,
            'tipo_permiso' => 'comision_sindical',
            'fecha_inicio' => '2026-03-01',
            'fecha_fin'    => '2026-03-02',
            'motivo'       => 'Sin ficha',
        ]);

        $response->assertStatus(422);
    }

    public function test_alumno_no_puede_registrar_permiso_sindical(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/permisos-sindicales', [
            'docente_id'   => $this->docenteUser->id,
            'tipo_permiso' => 'comision_sindical',
            'fecha_inicio' => '2026-03-01',
            'fecha_fin'    => '2026-03-02',
            'motivo'       => 'Test',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_lista_permisos_sindicales(): void
    {
        PermisoSindical::create([
            'docente_id'     => $this->docenteUser->id,
            'tipo_permiso'   => 'licencia_con_goce',
            'fecha_inicio'   => '2026-02-01',
            'fecha_fin'      => '2026-02-07',
            'dias_totales'   => 7,
            'con_goce_sueldo' => true,
            'motivo'         => 'Capacitación sindical',
            'autorizado_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/permisos-sindicales');
        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['data']]);
    }

    // ── S19-02: Dashboard de ausentismo sindical ─────────────────────────────────

    public function test_director_ve_dashboard_ausentismo(): void
    {
        PermisoSindical::create([
            'docente_id'     => $this->docenteUser->id,
            'tipo_permiso'   => 'comision_sindical',
            'fecha_inicio'   => now()->toDateString(),
            'fecha_fin'      => now()->addDays(2)->toDateString(),
            'dias_totales'   => 3,
            'con_goce_sueldo' => true,
            'motivo'         => 'Reunión gremial',
            'autorizado_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->director)->getJson('/api/dashboard/ausentismo-sindical');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => [
                     'total_permisos_activos',
                     'permisos_activos',
                     'docentes_mas_de_5_dias',
                     'grupos_afectados',
                 ]]);
    }

    public function test_dashboard_cuenta_correctamente_permisos_activos(): void
    {
        // Usar rango amplio para garantizar que incluye hoy
        PermisoSindical::create([
            'docente_id'     => $this->docenteUser->id,
            'tipo_permiso'   => 'comision_sindical',
            'fecha_inicio'   => now()->subDay()->toDateString(),
            'fecha_fin'      => now()->addDays(2)->toDateString(),
            'dias_totales'   => 4,
            'con_goce_sueldo' => true,
            'motivo'         => 'Permiso activo hoy',
            'autorizado_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/dashboard/ausentismo-sindical');
        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $response->json('data.total_permisos_activos'));
    }

    public function test_alumno_no_puede_ver_dashboard_ausentismo(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/dashboard/ausentismo-sindical');
        $response->assertStatus(403);
    }

    // ── S19-03: Concurso de oposición con auto-movimiento plaza ─────────────────

    public function test_admin_crea_concurso_oposicion_con_participantes(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/concursos-oposicion', [
            'nombre'            => 'Concurso de Oposición 2026-I',
            'fecha_realizacion' => '2026-02-15',
            'descripcion'       => 'Primer concurso para categoría PB',
            'participantes'     => [
                [
                    'docente_id'       => $this->docenteUser->id,
                    'puntaje_obtenido' => 8.5,
                    'resultado'        => 'no_promovido',
                ],
            ],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.nombre', 'Concurso de Oposición 2026-I');

        $this->assertDatabaseHas('concursos_oposicion', ['nombre' => 'Concurso de Oposición 2026-I']);
        $this->assertDatabaseHas('participantes_concurso', [
            'docente_id' => $this->docenteUser->id,
            'resultado'  => 'no_promovido',
        ]);
    }

    public function test_participante_promovido_genera_movimiento_plaza_automatico(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/concursos-oposicion', [
            'nombre'            => 'Concurso Escalafón 2026',
            'fecha_realizacion' => '2026-03-01',
            'participantes'     => [
                [
                    'docente_id'       => $this->docenteUser->id,
                    'puntaje_obtenido' => 9.2,
                    'resultado'        => 'promovido',
                    'categoria_nueva'  => 'PB',
                ],
            ],
        ]);

        $response->assertStatus(201);

        // Debe existir un movimiento_plaza de cambio_categoria autogenerado
        $this->assertDatabaseHas('movimientos_plaza', [
            'ficha_sindical_id' => $this->fichaSindical->id,
            'tipo_movimiento'   => 'cambio_categoria',
            'categoria_nueva'   => 'PB',
        ]);

        // La ficha sindical debe tener la nueva categoría
        $this->assertDatabaseHas('fichas_sindicales', [
            'id'            => $this->fichaSindical->id,
            'categoria_tbc' => 'PB',
        ]);

        // El participante debe tener movimiento_plaza_id asignado
        $participante = \App\Domains\Academico\Models\ParticipanteConcurso::where('docente_id', $this->docenteUser->id)->first();
        $this->assertNotNull($participante->movimiento_plaza_id);
    }

    public function test_alumno_no_puede_crear_concurso_oposicion(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/concursos-oposicion', [
            'nombre'           => 'Concurso ilegal',
            'fecha_realizacion' => '2026-01-01',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_lista_concursos_oposicion(): void
    {
        \App\Domains\Academico\Models\ConcursoOposicion::create([
            'nombre'           => 'Concurso 2025-II',
            'fecha_realizacion' => '2025-11-01',
            'convocado_por'    => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/concursos-oposicion');
        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['data']]);
    }

    // ── S19-04: PDF Informe Semestral Permisos Sindicales ────────────────────────

    public function test_director_genera_informe_pdf_permisos_sindicales(): void
    {
        PermisoSindical::create([
            'docente_id'     => $this->docenteUser->id,
            'tipo_permiso'   => 'licencia_con_goce',
            'fecha_inicio'   => '2026-01-20',
            'fecha_fin'      => '2026-01-24',
            'dias_totales'   => 5,
            'con_goce_sueldo' => true,
            'motivo'         => 'Actividad gremial',
            'autorizado_por' => $this->admin->id,
            'periodo_id'     => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->director)->get("/api/reportes/permisos-sindicales/{$this->periodo->id}/pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type') ?? ''));
    }

    public function test_alumno_no_puede_generar_informe_pdf(): void
    {
        $response = $this->actingAs($this->alumnoUser)->get("/api/reportes/permisos-sindicales/{$this->periodo->id}/pdf");
        $response->assertStatus(403);
    }

    // ── S19-05: Historial escalafonario completo ─────────────────────────────────

    public function test_admin_consulta_historial_escalafon_docente(): void
    {
        \App\Domains\Academico\Models\MovimientoPlaza::create([
            'ficha_sindical_id' => $this->fichaSindical->id,
            'tipo_movimiento'   => 'alta',
            'fecha_efectiva'    => '2010-08-16',
            'registrado_por'    => $this->admin->id,
            'notas'             => 'Alta inicial',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/docentes/{$this->docenteUser->id}/historial-escalafon");

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['docente', 'ficha', 'historial']])
                 ->assertJsonPath('data.docente.id', $this->docenteUser->id);

        $historial = $response->json('data.historial');
        $this->assertGreaterThanOrEqual(1, count($historial));
    }

    public function test_director_puede_consultar_historial_escalafon(): void
    {
        $response = $this->actingAs($this->director)->getJson("/api/docentes/{$this->docenteUser->id}/historial-escalafon");
        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_consultar_historial_escalafon(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson("/api/docentes/{$this->docenteUser->id}/historial-escalafon");
        $response->assertStatus(403);
    }

    // ── S19-01 bonus: Oficio PDF ─────────────────────────────────────────────────

    public function test_admin_genera_oficio_pdf_de_permiso_sindical(): void
    {
        $permiso = PermisoSindical::create([
            'docente_id'     => $this->docenteUser->id,
            'tipo_permiso'   => 'comision_sindical',
            'fecha_inicio'   => '2026-05-05',
            'fecha_fin'      => '2026-05-07',
            'dias_totales'   => 3,
            'con_goce_sueldo' => true,
            'motivo'         => 'Congreso sindical nacional',
            'autorizado_por' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get("/api/permisos-sindicales/{$permiso->id}/oficio-pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type') ?? ''));

        // Debe marcar oficio_generado = true
        $this->assertDatabaseHas('permisos_sindicales', [
            'id'              => $permiso->id,
            'oficio_generado' => true,
        ]);
    }
}
