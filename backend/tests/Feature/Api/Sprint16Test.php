<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\ConvenioMovilidad;
use App\Domains\Academico\Models\CursoVerano;
use App\Domains\Academico\Models\InscripcionVerano;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\MovilidadEstudiantil;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint16Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $alumnoUser;
    private User $docenteUser;
    private Periodo $periodo;
    private Materia $materia;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s16@test.com']);
        $this->admin->assignRole('admin');

        $this->alumnoUser = User::factory()->create(['email' => 'alumno.s16@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $this->docenteUser = User::factory()->create(['email' => 'docente.s16@test.com']);
        $this->docenteUser->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre'       => '2025-V',
            'fecha_inicio' => '2025-06-16',
            'fecha_fin'    => '2025-07-25',
            'activo'       => true,
        ]);

        $carrera = Carrera::create([
            'nombre'    => 'Ingeniería en Sistemas',
            'clave'     => 'ISC',
            'codigo_it' => '09',
        ]);

        $this->materia = Materia::create([
            'nombre'     => 'Cálculo Diferencial',
            'clave'      => 'ACA-0407',
            'carrera_id' => $carrera->id,
            'semestre'   => 1,
            'creditos'   => 5,
        ]);
    }

    // ── S16-01: Convenios de movilidad ───────────────────────────────────────────

    public function test_admin_puede_registrar_convenio_movilidad(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/convenios-movilidad', [
            'nombre_institucion' => 'TecNM Campus Xalapa',
            'tipo'               => 'tecnm',
            'vigente_desde'      => '2024-01-01',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.nombre_institucion', 'TecNM Campus Xalapa')
                 ->assertJsonPath('data.activo', true);

        $this->assertDatabaseHas('convenios_movilidad', [
            'nombre_institucion' => 'TecNM Campus Xalapa',
            'tipo'               => 'tecnm',
        ]);
    }

    public function test_cualquiera_puede_listar_convenios(): void
    {
        ConvenioMovilidad::create([
            'nombre_institucion' => 'UNAM',
            'tipo'               => 'nacional',
            'vigente_desde'      => '2023-01-01',
        ]);

        $response = $this->actingAs($this->alumnoUser)->getJson('/api/convenios-movilidad');

        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_crear_convenio(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/convenios-movilidad', [
            'nombre_institucion' => 'IES Test',
            'tipo'               => 'nacional',
            'vigente_desde'      => '2024-01-01',
        ]);

        $response->assertStatus(403);
    }

    // ── S16-02: Solicitar movilidad estudiantil ────────────────────────────────

    public function test_alumno_puede_solicitar_movilidad(): void
    {
        $response = $this->actingAs($this->alumnoUser)->postJson('/api/movilidad-estudiantil', [
            'ies_receptora' => 'TecNM Campus Xalapa',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'activa')
                 ->assertJsonPath('data.ies_receptora', 'TecNM Campus Xalapa');

        $this->assertDatabaseHas('movilidad_estudiantil', [
            'alumno_id'     => $this->alumnoUser->id,
            'ies_receptora' => 'TecNM Campus Xalapa',
        ]);
    }

    public function test_alumno_no_puede_superar_3_semestres_movilidad(): void
    {
        // Ya tiene 3 semestres acumulados
        MovilidadEstudiantil::create([
            'alumno_id'                     => $this->alumnoUser->id,
            'ies_receptora'                 => 'IES A',
            'fecha_inicio'                  => '2023-01-15',
            'semestres_acumulados_movilidad' => 3,
            'estatus'                       => 'concluida',
        ]);

        $response = $this->actingAs($this->alumnoUser)->postJson('/api/movilidad-estudiantil', [
            'ies_receptora' => 'IES B',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_puede_listar_todas_las_movilidades(): void
    {
        MovilidadEstudiantil::create([
            'alumno_id'     => $this->alumnoUser->id,
            'ies_receptora' => 'IES Test',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/movilidad-estudiantil');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_solicitar_movilidad(): void
    {
        $response = $this->actingAs($this->docenteUser)->postJson('/api/movilidad-estudiantil', [
            'ies_receptora' => 'IES Test',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response->assertStatus(403);
    }

    // ── S16-03: Registrar calificaciones de movilidad ─────────────────────────

    public function test_admin_puede_registrar_calificaciones_numericas(): void
    {
        $movilidad = MovilidadEstudiantil::create([
            'alumno_id'     => $this->alumnoUser->id,
            'ies_receptora' => 'TecNM Campus Xalapa',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/movilidad-estudiantil/{$movilidad->id}/calificaciones", [
            'materias_cursadas' => [
                ['nombre' => 'Sistemas Operativos', 'calificacion' => 88, 'tipo_acreditacion' => 'numerica'],
            ],
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'concluida');
    }

    public function test_admin_puede_registrar_calificaciones_ac_na(): void
    {
        $movilidad = MovilidadEstudiantil::create([
            'alumno_id'     => $this->alumnoUser->id,
            'ies_receptora' => 'Universidad de Granada',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/movilidad-estudiantil/{$movilidad->id}/calificaciones", [
            'materias_cursadas' => [
                ['nombre' => 'Inteligencia Artificial', 'tipo_acreditacion' => 'AC'],
                ['nombre' => 'Big Data', 'tipo_acreditacion' => 'NA'],
            ],
        ]);

        $response->assertStatus(200);
    }

    public function test_alumno_no_puede_registrar_calificaciones_movilidad(): void
    {
        $movilidad = MovilidadEstudiantil::create([
            'alumno_id'     => $this->alumnoUser->id,
            'ies_receptora' => 'IES Test',
            'fecha_inicio'  => '2025-01-15',
        ]);

        $response = $this->actingAs($this->alumnoUser)->patchJson("/api/movilidad-estudiantil/{$movilidad->id}/calificaciones", [
            'materias_cursadas' => [
                ['nombre' => 'Test', 'calificacion' => 100, 'tipo_acreditacion' => 'numerica'],
            ],
        ]);

        $response->assertStatus(403);
    }

    // ── S16-04: Programar cursos de verano ────────────────────────────────────

    public function test_admin_puede_programar_curso_verano(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/cursos-verano', [
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
            'fecha_fin'        => '2025-07-25',
            'max_alumnos'      => 25,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.estatus', 'programado');

        $this->assertDatabaseHas('cursos_verano', [
            'materia_id' => $this->materia->id,
            'docente_id' => $this->docenteUser->id,
            'estatus'    => 'programado',
        ]);
    }

    public function test_max_alumnos_no_puede_superar_30(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/cursos-verano', [
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
            'max_alumnos'      => 35,
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_puede_listar_cursos_verano(): void
    {
        CursoVerano::create([
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/cursos-verano');

        $response->assertStatus(200);
    }

    public function test_docente_no_puede_programar_curso_verano(): void
    {
        $response = $this->actingAs($this->docenteUser)->postJson('/api/cursos-verano', [
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
        ]);

        $response->assertStatus(403);
    }

    // ── S16-05: Inscripción y resultado en cursos de verano ───────────────────

    public function test_alumno_puede_inscribirse_a_curso_verano(): void
    {
        $curso = CursoVerano::create([
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
            'max_alumnos'      => 30,
        ]);

        $response = $this->actingAs($this->alumnoUser)
                         ->postJson("/api/cursos-verano/{$curso->id}/inscripciones");

        $response->assertStatus(201);

        $this->assertDatabaseHas('inscripciones_verano', [
            'alumno_id'      => $this->alumnoUser->id,
            'curso_verano_id' => $curso->id,
        ]);
    }

    public function test_alumno_no_puede_inscribirse_a_curso_lleno(): void
    {
        $curso = CursoVerano::create([
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
            'max_alumnos'      => 1,
        ]);

        // Inscribir al único cupo disponible con otro alumno
        $otro = User::factory()->create();
        $otro->assignRole('alumno');
        InscripcionVerano::create(['alumno_id' => $otro->id, 'curso_verano_id' => $curso->id]);

        $response = $this->actingAs($this->alumnoUser)
                         ->postJson("/api/cursos-verano/{$curso->id}/inscripciones");

        $response->assertStatus(422);
    }

    public function test_admin_puede_cerrar_curso_verano(): void
    {
        $curso = CursoVerano::create([
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
        ]);

        InscripcionVerano::create([
            'alumno_id'      => $this->alumnoUser->id,
            'curso_verano_id' => $curso->id,
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/cursos-verano/{$curso->id}/cerrar", [
            'calificaciones' => [
                ['alumno_id' => $this->alumnoUser->id, 'calificacion' => 90, 'acreditado' => true],
            ],
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.estatus', 'cerrado');
    }

    public function test_alumno_no_puede_cerrar_curso_verano(): void
    {
        $curso = CursoVerano::create([
            'periodo_padre_id' => $this->periodo->id,
            'materia_id'       => $this->materia->id,
            'docente_id'       => $this->docenteUser->id,
            'fecha_inicio'     => '2025-06-16',
        ]);

        $response = $this->actingAs($this->alumnoUser)
                         ->patchJson("/api/cursos-verano/{$curso->id}/cerrar");

        $response->assertStatus(403);
    }
}
