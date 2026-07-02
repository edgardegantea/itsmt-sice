<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\InscripcionDistancia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\ProgramaDistancia;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint17Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $alumnoUser;
    private User $coordDistancia;
    private User $director;
    private Alumno $alumno;
    private Carrera $carrera;
    private Periodo $periodo;
    private ProgramaDistancia $programa;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s17@test.com']);
        $this->admin->assignRole('admin');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s17@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $this->coordDistancia = User::factory()->create(['email' => 'coord.dist.s17@test.com']);
        $this->coordDistancia->assignRole('coord_distancia');

        $this->director = User::factory()->create(['email' => 'director.s17@test.com']);
        $this->director->assignRole('director_academico');

        $this->carrera = Carrera::create([
            'nombre'    => 'Ingeniería en Sistemas Computacionales',
            'clave'     => 'ISC',
            'codigo_it' => '09',
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => '2025-A',
            'fecha_inicio' => '2025-01-15',
            'fecha_fin'    => '2025-06-15',
            'activo'       => true,
        ]);

        $aspirante = Aspirante::create([
            'nombres'               => 'Pedro',
            'apellido_paterno'      => 'Ramírez',
            'curp'                  => 'RAPP000101HVZRNN00',
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Martínez',
            'escuela_bachillerato'  => 'CETIS 1',
            'promedio_bachillerato' => 8.0,
            'turno_preferido'       => 'matutino',
            'email'                 => 'aspirante.s17@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcionAdmision = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'numero_control'    => 'ISC210099',
            'carrera_id'        => $this->carrera->id,
            'periodo_id'        => $this->periodo->id,
            'semestre_ingreso'  => 1,
            'fecha_inscripcion' => now()->toDateString(),
        ]);

        $this->alumno = Alumno::create([
            'user_id'            => $this->alumnoUser->id,
            'inscripcion_id'     => $inscripcionAdmision->id,
            'carrera_id'         => $this->carrera->id,
            'numero_control'     => 'ISC210099',
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 1,
            'estatus'            => 'activo',
        ]);

        $this->programa = ProgramaDistancia::create([
            'carrera_id'             => $this->carrera->id,
            'modalidad'              => 'mixta',
            'creditos_minimos_carga' => 12,
            'creditos_maximos_carga' => 36,
            'semestres_maximos'      => 16,
            'permite_trimestral'     => true,
        ]);
    }

    // ── S17-01: Configurar programa en modalidad a distancia ─────────────────────

    public function test_admin_puede_crear_programa_distancia(): void
    {
        $carrera2 = Carrera::create([
            'nombre'    => 'Ingeniería Industrial',
            'clave'     => 'II',
            'codigo_it' => '10',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/programas-distancia', [
            'carrera_id'             => $carrera2->id,
            'modalidad'              => 'no_escolarizada',
            'creditos_minimos_carga' => 12,
            'creditos_maximos_carga' => 36,
            'semestres_maximos'      => 16,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.modalidad', 'no_escolarizada')
                 ->assertJsonPath('data.activo', true)
                 ->assertJsonPath('data.semestres_maximos', 16);

        $this->assertDatabaseHas('programas_distancia', [
            'carrera_id' => $carrera2->id,
            'modalidad'  => 'no_escolarizada',
        ]);
    }

    public function test_alumno_no_puede_crear_programa_distancia(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/programas-distancia', [
            'carrera_id' => $this->carrera->id,
            'modalidad'  => 'mixta',
        ]);

        $response->assertStatus(403);
    }

    public function test_cualquiera_puede_listar_programas_distancia(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/programas-distancia');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    // ── S17-02: Inscribir aspirante a programa a distancia ──────────────────────

    public function test_admin_puede_inscribir_alumno_en_programa_distancia(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/inscripciones-distancia', [
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.modulo_competencias_acreditado', false);

        $this->assertDatabaseHas('inscripciones_distancia', [
            'alumno_id'  => $this->alumnoUser->id,
            'programa_id' => $this->programa->id,
        ]);
    }

    public function test_admin_puede_inscribir_con_modulo_acreditado(): void
    {
        $otroUser = User::factory()->create();
        $otroUser->assignRole('alumno');

        $response = $this->actingAs($this->admin)->postJson('/api/inscripciones-distancia', [
            'alumno_id'                      => $otroUser->id,
            'programa_id'                    => $this->programa->id,
            'periodo_ingreso_id'             => $this->periodo->id,
            'modulo_competencias_acreditado' => true,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.modulo_competencias_acreditado', true);
    }

    public function test_inscripcion_duplicada_retorna_error(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/inscripciones-distancia', [
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_alumno_no_puede_inscribirse_directamente(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/inscripciones-distancia', [
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response->assertStatus(403);
    }

    // ── S17-03: Avance académico con reglas a distancia ─────────────────────────

    public function test_alumno_puede_consultar_avance_distancia(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->alumnoUser)
                         ->getJson("/api/alumnos/{$this->alumno->id}/avance-distancia");

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => [
                     'alumno',
                     'inscripcion_distancia',
                     'semestres_cursados',
                     'semestres_maximos',
                     'alerta_riesgo',
                     'porcentaje_tiempo_cursado',
                 ]]);
    }

    public function test_avance_incluye_creditos_minimos_y_maximos(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->alumnoUser)
                         ->getJson("/api/alumnos/{$this->alumno->id}/avance-distancia");

        $response->assertStatus(200)
                 ->assertJsonPath('data.creditos_minimos_carga', 12)
                 ->assertJsonPath('data.creditos_maximos_carga', 36)
                 ->assertJsonPath('data.semestres_maximos', 16);
    }

    public function test_coord_distancia_puede_ver_avance_de_cualquier_alumno(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->coordDistancia)
                         ->getJson("/api/alumnos/{$this->alumno->id}/avance-distancia");

        $response->assertStatus(200);
    }

    public function test_alumno_ajeno_no_puede_ver_avance(): void
    {
        $otroAlumnoUser = User::factory()->create(['email' => 'otro.alumno.s17@test.com']);
        $otroAlumnoUser->assignRole('alumno');

        $asp2 = Aspirante::create([
            'nombres'               => 'Ana',
            'apellido_paterno'      => 'López',
            'curp'                  => 'LOAA000202HVZRNN00',
            'fecha_nacimiento'      => '2000-02-02',
            'sexo'                  => 'femenino',
            'municipio_procedencia' => 'Tuxpan',
            'escuela_bachillerato'  => 'CETIS 2',
            'promedio_bachillerato' => 9.0,
            'turno_preferido'       => 'matutino',
            'email'                 => 'asp2.s17@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);
        $insc2 = Inscripcion::create([
            'aspirante_id'      => $asp2->id,
            'numero_control'    => 'ISC210098',
            'carrera_id'        => $this->carrera->id,
            'periodo_id'        => $this->periodo->id,
            'semestre_ingreso'  => 1,
            'fecha_inscripcion' => now()->toDateString(),
        ]);
        $otroAlumno = Alumno::create([
            'user_id'            => $otroAlumnoUser->id,
            'inscripcion_id'     => $insc2->id,
            'carrera_id'         => $this->carrera->id,
            'numero_control'     => 'ISC210098',
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 1,
            'estatus'            => 'activo',
        ]);

        InscripcionDistancia::create([
            'alumno_id'          => $otroAlumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        // alumnoUser intenta ver avance de otroAlumno
        $response = $this->actingAs($this->alumnoUser)
                         ->getJson("/api/alumnos/{$otroAlumno->id}/avance-distancia");

        $response->assertStatus(403);
    }

    // ── S17-04: Seguimiento de alumnos a distancia con alertas ──────────────────

    public function test_coord_distancia_puede_ver_seguimiento(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->coordDistancia)->getJson('/api/seguimiento-distancia');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_seguimiento_incluye_alerta_riesgo(): void
    {
        InscripcionDistancia::create([
            'alumno_id'          => $this->alumnoUser->id,
            'programa_id'        => $this->programa->id,
            'periodo_ingreso_id' => $this->periodo->id,
        ]);

        $response = $this->actingAs($this->coordDistancia)->getJson('/api/seguimiento-distancia');

        $response->assertStatus(200);
        $this->assertArrayHasKey('alerta_riesgo', $response->json('data.0'));
    }

    public function test_alumno_no_puede_ver_seguimiento(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/seguimiento-distancia');

        $response->assertStatus(403);
    }

    // ── S17-05: Indicadores del programa a distancia ────────────────────────────

    public function test_director_puede_ver_indicadores_distancia(): void
    {
        $response = $this->actingAs($this->director)->getJson('/api/indicadores/distancia');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => [
                     'programas',
                     'total_inscritos',
                     'modulo_pendiente',
                     'modulo_acreditado',
                 ]]);
    }

    public function test_coord_distancia_puede_ver_indicadores(): void
    {
        $response = $this->actingAs($this->coordDistancia)->getJson('/api/indicadores/distancia');

        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_ver_indicadores_distancia(): void
    {
        $response = $this->actingAs($this->alumnoUser)->getJson('/api/indicadores/distancia');

        $response->assertStatus(403);
    }

    public function test_indicadores_cuentan_inscripciones_correctamente(): void
    {
        InscripcionDistancia::create([
            'alumno_id'                      => $this->alumnoUser->id,
            'programa_id'                    => $this->programa->id,
            'periodo_ingreso_id'             => $this->periodo->id,
            'modulo_competencias_acreditado' => true,
        ]);

        $response = $this->actingAs($this->director)->getJson('/api/indicadores/distancia');

        $response->assertStatus(200)
                 ->assertJsonPath('data.total_inscritos', 1)
                 ->assertJsonPath('data.modulo_acreditado', 1)
                 ->assertJsonPath('data.modulo_pendiente', 0);
    }
}
