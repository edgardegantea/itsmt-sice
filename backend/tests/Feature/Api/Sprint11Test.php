<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\ExpedienteAlumnoExt;
use App\Domains\Academico\Models\FichaDocente;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint11Test extends TestCase
{
    use RefreshDatabase;

    private User   $admin;
    private User   $director;
    private User   $docente;
    private User   $alumnoUser;
    private Alumno $alumno;
    private Carrera $carrera;
    private Periodo $periodo;
    private Aula   $aula;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin   = User::factory()->create(['email' => 'admin.s11@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'dir.s11@test.com']);
        $this->director->assignRole('director_academico');

        $this->docente = User::factory()->create(['email' => 'doc.s11@test.com']);
        $this->docente->assignRole('docente');

        $this->carrera = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC',
            'codigo_it' => 'ITSM-ISC',
            'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => '2025-01-15',
            'fecha_fin' => '2025-06-15', 'activo' => true,
        ]);

        $this->aula = Aula::create([
            'nombre' => 'Aula 101', 'capacidad' => 35, 'tipo' => 'salon', 'activa' => true,
        ]);

        // Crear alumno con usuario
        $this->alumnoUser = User::factory()->create(['email' => 'alu.s11@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Juan',
            'apellido_paterno'      => 'Pérez',
            'apellido_materno'      => 'López',
            'email'                 => 'juan@test.com',
            'telefono'              => '1234567890',
            'curp'                  => 'PELJ010101HVZRPN01',
            'fecha_nacimiento'      => '2001-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTIS 253',
            'promedio_bachillerato' => 85.5,
            'turno_preferido'       => 'matutino',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
            'numero_ficha'          => '2025-0001',
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'numero_control'    => '21ISC0001',
            'carrera_id'        => $this->carrera->id,
            'periodo_id'        => $this->periodo->id,
            'fecha_inscripcion' => '2025-01-20',
        ]);

        $this->alumno = Alumno::create([
            'user_id'            => $this->alumnoUser->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => '21ISC001',
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 3,
            'estatus'            => 'activo',
        ]);
    }

    // ── S11-01: Aulas disponibles ─────────────────────────────────────────────

    public function test_admin_puede_ver_aulas_del_catalogo(): void
    {
        $r = $this->actingAs($this->admin)->getJson('/api/aulas');
        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    public function test_admin_puede_crear_aula(): void
    {
        $r = $this->actingAs($this->admin)->postJson('/api/aulas', [
            'nombre'    => 'Lab Redes',
            'capacidad' => 20,
            'tipo'      => 'laboratorio',
        ]);
        $r->assertStatus(201);
        $this->assertDatabaseHas('aulas', ['nombre' => 'Lab Redes', 'tipo' => 'laboratorio']);
    }

    public function test_aulas_disponibles_devuelve_aulas_sin_conflicto(): void
    {
        // Crear otra aula ocupada en ese bloque
        $aulaOcupada = Aula::create([
            'nombre' => 'Aula 202', 'capacidad' => 30, 'tipo' => 'salon', 'activa' => true,
        ]);

        $materia = Materia::create([
            'nombre' => 'Cálculo', 'clave' => 'MAT101',
            'carrera_id' => $this->carrera->id, 'semestre' => 1, 'creditos' => 5,
        ]);

        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'A', 'semestre' => 1, 'turno' => 'matutino',
        ]);

        $carga = CargaAcademica::create([
            'docente_id'  => $this->docente->id,
            'materia_id'  => $materia->id,
            'grupo_id'    => $grupo->id,
            'periodo_id'  => $this->periodo->id,
            'aula_id'     => $aulaOcupada->id,
            'horas_semana'=> 3,
        ]);

        Horario::create([
            'carga_academica_id' => $carga->id,
            'dia_semana'  => 'lunes',
            'hora_inicio' => '08:00',
            'hora_fin'    => '09:00',
        ]);

        $r = $this->actingAs($this->admin)->getJson(
            '/api/aulas/disponibles?dia_semana=lunes&hora_inicio=08:00&hora_fin=09:00'
        );

        $r->assertOk();
        $ids = collect($r->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->aula->id, $ids);
        $this->assertNotContains($aulaOcupada->id, $ids);
    }

    public function test_aulas_disponibles_requiere_parametros(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/aulas/disponibles')
            ->assertStatus(422);
    }

    public function test_admin_puede_actualizar_aula(): void
    {
        $r = $this->actingAs($this->admin)
            ->patchJson("/api/aulas/{$this->aula->id}", ['capacidad' => 40]);
        $r->assertOk();
        $this->assertEquals(40, $r->json('data.capacidad'));
    }

    public function test_admin_puede_eliminar_aula(): void
    {
        $this->actingAs($this->admin)
            ->deleteJson("/api/aulas/{$this->aula->id}")
            ->assertOk();
        $this->assertSoftDeleted('aulas', ['id' => $this->aula->id]);
    }

    // ── S11-03: Expediente académico completo ────────────────────────────────

    public function test_admin_puede_ver_expediente_completo(): void
    {
        // Crear expediente extendido
        ExpedienteAlumnoExt::create([
            'alumno_id'           => $this->alumno->id,
            'generacion'          => 2021,
            'estatus'             => 'activo',
            'promedio_general'    => 85.5,
            'creditos_acumulados' => 45,
        ]);

        $r = $this->actingAs($this->admin)
            ->getJson("/api/alumnos/{$this->alumno->id}/expediente");

        $r->assertOk();
        $this->assertArrayHasKey('alumno',         $r->json('data'));
        $this->assertArrayHasKey('expediente_ext', $r->json('data'));
        $this->assertArrayHasKey('reinscripciones',$r->json('data'));
        $this->assertArrayHasKey('bajas',          $r->json('data'));
        $this->assertArrayHasKey('constancias',    $r->json('data'));
        $this->assertEquals(85.5, $r->json('data.expediente_ext.promedio_general'));
    }

    public function test_expediente_sin_ext_devuelve_null(): void
    {
        $r = $this->actingAs($this->admin)
            ->getJson("/api/alumnos/{$this->alumno->id}/expediente");

        $r->assertOk();
        $this->assertNull($r->json('data.expediente_ext'));
    }

    public function test_director_puede_ver_expediente(): void
    {
        $r = $this->actingAs($this->director)
            ->getJson("/api/alumnos/{$this->alumno->id}/expediente");
        $r->assertOk();
    }

    public function test_docente_no_puede_ver_expediente(): void
    {
        $this->actingAs($this->docente)
            ->getJson("/api/alumnos/{$this->alumno->id}/expediente")
            ->assertStatus(403);
    }

    public function test_alumno_no_puede_ver_expediente_completo(): void
    {
        $this->actingAs($this->alumnoUser)
            ->getJson("/api/alumnos/{$this->alumno->id}/expediente")
            ->assertStatus(403);
    }

    // ── S11-04: Fichas docentes ───────────────────────────────────────────────

    public function test_admin_puede_crear_ficha_docente(): void
    {
        $r = $this->actingAs($this->admin)->postJson('/api/docentes/fichas', [
            'docente_id'     => $this->docente->id,
            'tipo_contrato'  => 'base',
            'categoria'      => 'Asociado C',
            'especialidades' => ['Redes', 'Seguridad Informática'],
            'fecha_ingreso'  => '2015-08-16',
            'titulos_academicos' => [
                ['nivel' => 'Licenciatura', 'nombre' => 'Ing. en Sistemas'],
                ['nivel' => 'Maestría', 'nombre' => 'Maestría en Redes'],
            ],
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('fichas_docentes', [
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'base',
        ]);
    }

    public function test_no_se_puede_crear_ficha_duplicada(): void
    {
        FichaDocente::create([
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'interino',
        ]);

        $this->actingAs($this->admin)->postJson('/api/docentes/fichas', [
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'base',
        ])->assertStatus(422);
    }

    public function test_director_puede_listar_fichas(): void
    {
        FichaDocente::create([
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'hora_clase',
        ]);

        $r = $this->actingAs($this->director)->getJson('/api/docentes/fichas');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.data'));
    }

    public function test_docente_no_puede_ver_fichas(): void
    {
        $this->actingAs($this->docente)
            ->getJson('/api/docentes/fichas')
            ->assertStatus(403);
    }

    public function test_admin_puede_actualizar_ficha_docente(): void
    {
        FichaDocente::create([
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'interino',
            'categoria'     => 'Técnico Docente A',
        ]);

        $r = $this->actingAs($this->admin)
            ->patchJson("/api/docentes/{$this->docente->id}/ficha", [
                'tipo_contrato' => 'base',
                'categoria'     => 'Asociado B',
            ]);

        $r->assertOk();
        $this->assertEquals('base', $r->json('data.tipo_contrato'));
        $this->assertEquals('Asociado B', $r->json('data.categoria'));
    }

    public function test_patch_ficha_crea_si_no_existe(): void
    {
        // Si no existe ficha, PATCH la crea (firstOrCreate)
        $r = $this->actingAs($this->admin)
            ->patchJson("/api/docentes/{$this->docente->id}/ficha", [
                'tipo_contrato' => 'medio_tiempo',
            ]);

        $r->assertOk();
        $this->assertDatabaseHas('fichas_docentes', [
            'docente_id'    => $this->docente->id,
            'tipo_contrato' => 'medio_tiempo',
        ]);
    }

    public function test_ficha_incluye_carga_historica_por_periodo(): void
    {
        $materia = Materia::create([
            'nombre' => 'POO', 'clave' => 'POO101',
            'carrera_id' => $this->carrera->id, 'semestre' => 2, 'creditos' => 5,
        ]);
        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'B', 'semestre' => 2, 'turno' => 'matutino',
        ]);
        CargaAcademica::create([
            'docente_id'   => $this->docente->id,
            'materia_id'   => $materia->id,
            'grupo_id'     => $grupo->id,
            'periodo_id'   => $this->periodo->id,
            'horas_semana' => 5,
        ]);

        $r = $this->actingAs($this->admin)
            ->patchJson("/api/docentes/{$this->docente->id}/ficha", [
                'tipo_contrato' => 'base',
            ]);

        $r->assertOk();
        $carga = $r->json('data.horas_frente_grupo_por_periodo');
        $this->assertNotEmpty($carga);
        $this->assertEquals(5, $carga[0]['horas_semana']);
    }

    public function test_alumno_no_puede_crear_ficha(): void
    {
        $this->actingAs($this->alumnoUser)
            ->postJson('/api/docentes/fichas', [
                'docente_id'    => $this->docente->id,
                'tipo_contrato' => 'base',
            ])->assertStatus(403);
    }

    // ── S11-02: Asignación masiva de alumnos a grupos ────────────────────────

    public function test_admin_puede_asignar_alumnos_a_grupo(): void
    {
        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'G1', 'semestre' => 3, 'turno' => 'matutino',
        ]);

        $r = $this->actingAs($this->admin)
            ->postJson("/api/grupos/{$grupo->id}/alumnos", [
                'alumno_ids' => [$this->alumno->id],
            ]);

        $r->assertOk();
        $this->assertDatabaseHas('alumno_grupo', [
            'grupo_id'  => $grupo->id,
            'alumno_id' => $this->alumno->id,
        ]);
    }

    public function test_admin_puede_quitar_alumno_de_grupo(): void
    {
        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'G2', 'semestre' => 3, 'turno' => 'matutino',
        ]);

        \Illuminate\Support\Facades\DB::table('alumno_grupo')->insert([
            'id'              => (string) \Illuminate\Support\Str::uuid(),
            'grupo_id'        => $grupo->id,
            'alumno_id'       => $this->alumno->id,
            'fecha_asignacion'=> now()->toDateString(),
        ]);

        $r = $this->actingAs($this->admin)
            ->deleteJson("/api/grupos/{$grupo->id}/alumnos/{$this->alumno->id}");

        $r->assertOk();
        $this->assertDatabaseMissing('alumno_grupo', [
            'grupo_id'  => $grupo->id,
            'alumno_id' => $this->alumno->id,
        ]);
    }

    public function test_docente_no_puede_asignar_alumnos_a_grupo(): void
    {
        $grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'G3', 'semestre' => 3, 'turno' => 'matutino',
        ]);

        $this->actingAs($this->docente)
            ->postJson("/api/grupos/{$grupo->id}/alumnos", [
                'alumno_ids' => [$this->alumno->id],
            ])->assertStatus(403);
    }
}
