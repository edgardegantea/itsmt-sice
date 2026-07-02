<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Egresado;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint13Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $director;
    private User $docente;
    private User $alumnoUser;
    private User $jefeCarrera;
    private Alumno $alumno;
    private Carrera $carrera;
    private Periodo $periodo;
    private Grupo $grupo;
    private Materia $materia;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s13@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'dir.s13@test.com']);
        $this->director->assignRole('director_academico');

        $this->docente = User::factory()->create(['email' => 'doc.s13@test.com']);
        $this->docente->assignRole('docente');

        $this->jefeCarrera = User::factory()->create(['email' => 'jefe.s13@test.com']);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->carrera = Carrera::create([
            'nombre'             => 'Ingeniería en Sistemas',
            'clave'              => 'ISC',
            'codigo_it'          => 'ITSM-ISC',
            'vigente'            => true,
            'duracion_semestres' => 9,
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => '2025-A',
            'fecha_inicio' => '2025-01-15',
            'fecha_fin'    => '2025-06-15',
            'activo'       => true,
        ]);

        $this->materia = Materia::create([
            'nombre'     => 'Cálculo Diferencial',
            'clave'      => 'CD-01',
            'carrera_id' => $this->carrera->id,
            'semestre'   => 1,
            'creditos'   => 5,
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
            'clave'      => 'A',
            'semestre'   => 1,
            'turno'      => 'matutino',
        ]);

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s13@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Ana',
            'apellido_paterno'      => 'López',
            'apellido_materno'      => 'Martínez',
            'email'                 => 'ana.aspirante13@test.com',
            'telefono'              => '2281000001',
            'curp'                  => 'LOMA010101HVZRPN01',
            'fecha_nacimiento'      => '2001-01-01',
            'sexo'                  => 'femenino',
            'municipio_procedencia' => 'Misantla',
            'escuela_bachillerato'  => 'CBTA 68',
            'promedio_bachillerato' => 88.0,
            'turno_preferido'       => 'matutino',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
            'numero_ficha'          => '2025-S13-001',
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => 'IS2300001',
            'carrera_id'       => $this->carrera->id,
            'periodo_id'       => $this->periodo->id,
            'fecha_inscripcion'=> now()->toDateString(),
        ]);

        $this->alumno = Alumno::create([
            'user_id'           => $this->alumnoUser->id,
            'inscripcion_id'    => $inscripcion->id,
            'numero_control'    => 'IS2300001',
            'carrera_id'        => $this->carrera->id,
            'periodo_ingreso_id'=> $this->periodo->id,
            'semestre_actual'   => 1,
            'estatus'           => 'activo',
        ]);
    }

    // ── S13-01: Registro y CRUD de egresados ─────────────────────────────────────

    public function test_admin_puede_registrar_egresado(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/egresados', [
            'alumno_id'   => $this->alumnoUser->id,
            'anio_egreso' => 2024,
            'titulado'    => false,
            'sector'      => 'privado',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.anio_egreso', 2024)
                 ->assertJsonPath('data.titulado', false);

        $this->assertDatabaseHas('egresados', [
            'alumno_id'  => $this->alumnoUser->id,
            'anio_egreso'=> 2024,
        ]);
    }

    public function test_admin_puede_listar_egresados(): void
    {
        Egresado::create([
            'alumno_id'   => $this->alumnoUser->id,
            'anio_egreso' => 2024,
            'titulado'    => 1,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/egresados');

        $response->assertStatus(200)
                 ->assertJsonPath('data.total', 1);
    }

    public function test_admin_puede_actualizar_egresado(): void
    {
        $egresado = Egresado::create([
            'alumno_id'   => $this->alumnoUser->id,
            'anio_egreso' => 2024,
            'titulado'    => 0,
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/egresados/{$egresado->id}", [
            'titulado'       => true,
            'fecha_titulacion'=> '2024-11-15',
            'empresa_actual' => 'TechCorp',
            'sector'         => 'privado',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.titulado', true);

        $this->assertDatabaseHas('egresados', [
            'id'         => $egresado->id,
            'titulado'   => 1,
            'empresa_actual' => 'TechCorp',
        ]);
    }

    public function test_docente_no_puede_registrar_egresado(): void
    {
        $response = $this->actingAs($this->docente)->postJson('/api/egresados', [
            'alumno_id'   => $this->alumnoUser->id,
            'anio_egreso' => 2024,
        ]);

        $response->assertStatus(403);
    }

    // ── S13-02: Reporte de matrícula en PDF ──────────────────────────────────────

    public function test_director_puede_descargar_reporte_matricula_pdf(): void
    {
        $response = $this->actingAs($this->director)->get('/api/reportes/matricula/pdf');

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type')));
    }

    public function test_admin_puede_descargar_reporte_matricula_pdf(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/reportes/matricula/pdf');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_descargar_reporte_matricula(): void
    {
        $response = $this->actingAs($this->docente)->get('/api/reportes/matricula/pdf');

        $response->assertStatus(403);
    }

    // ── S13-03: Reporte de calificaciones en PDF ─────────────────────────────────

    public function test_director_puede_descargar_reporte_calificaciones_pdf(): void
    {
        $response = $this->actingAs($this->director)->get('/api/reportes/calificaciones/pdf');

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type')));
    }

    public function test_jefe_carrera_puede_descargar_reporte_calificaciones_pdf(): void
    {
        $response = $this->actingAs($this->jefeCarrera)->get('/api/reportes/calificaciones/pdf');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_descargar_reporte_calificaciones(): void
    {
        $response = $this->actingAs($this->docente)->get('/api/reportes/calificaciones/pdf');

        $response->assertStatus(403);
    }

    // ── S13-04: Directorio PDF ───────────────────────────────────────────────────

    public function test_admin_puede_descargar_directorio_alumnos_pdf(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/reportes/directorio/alumnos/pdf');

        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type')));
    }

    public function test_admin_puede_descargar_directorio_docentes_pdf(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/reportes/directorio/docentes/pdf');

        $response->assertStatus(200);
    }

    public function test_admin_puede_descargar_directorio_egresados_pdf(): void
    {
        Egresado::create([
            'alumno_id'   => $this->alumnoUser->id,
            'anio_egreso' => 2024,
            'titulado'    => 0,
        ]);

        $response = $this->actingAs($this->admin)->get('/api/reportes/directorio/egresados/pdf');

        $response->assertStatus(200);
    }

    public function test_directorio_tipo_invalido_retorna_422(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/reportes/directorio/invalido/pdf');

        $response->assertStatus(422);
    }

    public function test_docente_no_puede_descargar_directorio(): void
    {
        $response = $this->actingAs($this->docente)->get('/api/reportes/directorio/alumnos/pdf');

        $response->assertStatus(403);
    }

    // ── S13-05: Dashboard de asistencia institucional ────────────────────────────

    public function test_director_puede_ver_dashboard_asistencia(): void
    {
        $response = $this->actingAs($this->director)->getJson('/api/indicadores/asistencia');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['por_carrera', 'total_alertas', 'periodo_id']]);
    }

    public function test_admin_puede_ver_dashboard_asistencia(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/indicadores/asistencia');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_ver_dashboard_institucional(): void
    {
        $response = $this->actingAs($this->docente)->getJson('/api/indicadores/asistencia');

        $response->assertStatus(403);
    }

    public function test_director_puede_ver_asistencia_por_carrera(): void
    {
        AlertaInasistencia::create([
            'alumno_id'               => $this->alumnoUser->id,
            'grupo_id'                => $this->grupo->id,
            'porcentaje_inasistencia' => 30.0,
        ]);

        $response = $this->actingAs($this->director)
                         ->getJson("/api/indicadores/asistencia/carrera/{$this->carrera->id}");

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['carrera', 'alertas', 'alumnos_en_riesgo']]);
    }

    public function test_jefe_no_puede_ver_dashboard_institucional(): void
    {
        $response = $this->actingAs($this->jefeCarrera)->getJson('/api/indicadores/asistencia');

        $response->assertStatus(403);
    }
}
