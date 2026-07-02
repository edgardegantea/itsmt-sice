<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\AsignacionDocente;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Especialidad;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\InstrumentacionDidactica;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint9Test extends TestCase
{
    use RefreshDatabase;

    private User    $director;
    private User    $jefe;
    private User    $docente;
    private User    $alumno;
    private Carrera $carrera;
    private Materia $materia;
    private Periodo $periodo;
    private Grupo   $grupo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->director = User::factory()->create(['email' => 'dir.s9@test.com', 'carrera_id' => null]);
        $this->director->assignRole('director_academico');

        $this->carrera = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC', 'codigo_it' => '06', 'activa' => true,
        ]);

        $this->jefe = User::factory()->create([
            'email' => 'jefe.s9@test.com', 'carrera_id' => $this->carrera->id,
        ]);
        $this->jefe->assignRole('jefe_carrera');

        $this->docente = User::factory()->create(['email' => 'doc.s9@test.com', 'carrera_id' => null]);
        $this->docente->assignRole('docente');

        $this->alumno = User::factory()->create(['email' => 'alu.s9@test.com']);
        $this->alumno->assignRole('alumno');

        $this->materia = Materia::create([
            'carrera_id' => $this->carrera->id, 'clave' => 'SC101', 'nombre' => 'Programación I',
            'creditos' => 5, 'horas_teoria' => 3, 'horas_practica' => 2,
        ]);

        $this->periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2024', 'fecha_inicio' => '2024-08-01',
            'fecha_fin' => '2024-12-31', 'activo' => true, 'tipo' => 'ordinario',
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private function crearAsignacion(array $override = []): AsignacionDocente
    {
        return AsignacionDocente::create(array_merge([
            'docente_id'   => $this->docente->id,
            'materia_id'   => $this->materia->id,
            'carrera_id'   => $this->carrera->id,
            'periodo_id'   => $this->periodo->id,
            'grupo_id'     => $this->grupo->id,
            'horas_semana' => 5,
            'asignado_por' => $this->director->id,
            'notificado'   => false,
        ], $override));
    }

    private function crearInstrumentacion(AsignacionDocente $asig, string $estatus = 'borrador'): InstrumentacionDidactica
    {
        return InstrumentacionDidactica::create([
            'asignacion_id'        => $asig->id,
            'periodo_id'           => $this->periodo->id,
            'objetivo_general'     => 'Desarrollar competencias de programación',
            'competencias'         => ['Programación estructurada'],
            'unidades'             => [['nombre' => 'U1', 'objetivo' => 'Obj1']],
            'metodologia'          => 'Aprendizaje basado en proyectos',
            'criterios_evaluacion' => ['parciales' => 60, 'final' => 40],
            'bibliografia'         => 'Deitel & Deitel',
            'estatus'              => $estatus,
        ]);
    }

    // ── S9-01: Asignaciones — autorización ───────────────────────────────────────

    public function test_alumno_no_puede_ver_asignaciones(): void
    {
        $this->actingAs($this->alumno)
            ->getJson('/api/asignaciones-docentes')
            ->assertStatus(403);
    }

    public function test_director_puede_listar_asignaciones(): void
    {
        $this->crearAsignacion();

        $r = $this->actingAs($this->director)->getJson('/api/asignaciones-docentes');

        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    // ── S9-01: Director crea asignaciones ────────────────────────────────────────

    public function test_director_puede_crear_asignacion(): void
    {
        $r = $this->actingAs($this->director)->postJson('/api/asignaciones-docentes', [
            'docente_id'   => $this->docente->id,
            'materia_id'   => $this->materia->id,
            'carrera_id'   => $this->carrera->id,
            'periodo_id'   => $this->periodo->id,
            'grupo_id'     => $this->grupo->id,
            'horas_semana' => 5,
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('asignaciones_docentes', [
            'docente_id'   => $this->docente->id,
            'materia_id'   => $this->materia->id,
            'asignado_por' => $this->director->id,
            'notificado'   => false,
        ]);
    }

    public function test_docente_no_puede_crear_asignacion(): void
    {
        $this->actingAs($this->docente)->postJson('/api/asignaciones-docentes', [
            'docente_id'   => $this->docente->id,
            'materia_id'   => $this->materia->id,
            'carrera_id'   => $this->carrera->id,
            'periodo_id'   => $this->periodo->id,
            'horas_semana' => 5,
        ])->assertStatus(403);
    }

    public function test_asignacion_requiere_campos_obligatorios(): void
    {
        $this->actingAs($this->director)
            ->postJson('/api/asignaciones-docentes', [])
            ->assertStatus(422);
    }

    // ── S9-02: Jefe ajusta asignaciones de su carrera ────────────────────────────

    public function test_jefe_puede_modificar_asignacion_de_su_carrera(): void
    {
        $asig = $this->crearAsignacion();

        $r = $this->actingAs($this->jefe)
            ->patchJson("/api/asignaciones-docentes/{$asig->id}", [
                'horas_semana' => 8,
            ]);

        $r->assertOk();
        $this->assertEquals(8, $r->json('data.horas_semana'));
    }

    public function test_jefe_no_puede_modificar_asignacion_de_otra_carrera(): void
    {
        $otraCarrera = Carrera::create([
            'nombre' => 'Ingeniería Civil', 'clave' => 'ICI', 'codigo_it' => '03', 'activa' => true,
        ]);
        $asig = $this->crearAsignacion(['carrera_id' => $otraCarrera->id]);

        $this->actingAs($this->jefe)
            ->patchJson("/api/asignaciones-docentes/{$asig->id}", ['horas_semana' => 8])
            ->assertStatus(403);
    }

    // ── Carga horaria (S9-02) ─────────────────────────────────────────────────────

    public function test_carga_horaria_suma_horas_del_docente(): void
    {
        $materia2 = Materia::create([
            'carrera_id' => $this->carrera->id, 'clave' => 'SC102', 'nombre' => 'POO',
            'creditos' => 4, 'horas_teoria' => 2, 'horas_practica' => 2,
        ]);

        $this->crearAsignacion(['horas_semana' => 5]);
        AsignacionDocente::create([
            'docente_id'   => $this->docente->id,
            'materia_id'   => $materia2->id,
            'carrera_id'   => $this->carrera->id,
            'periodo_id'   => $this->periodo->id,
            'horas_semana' => 4,
            'asignado_por' => $this->director->id,
            'notificado'   => false,
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/docentes/{$this->docente->id}/carga-horaria?periodo_id={$this->periodo->id}");

        $r->assertOk();
        $this->assertEquals(9, $r->json('data.total_horas'));
        $this->assertCount(2, $r->json('data.asignaciones'));
    }

    // ── S9-03: Docente crea instrumentación didáctica ────────────────────────────

    public function test_docente_puede_crear_instrumentacion(): void
    {
        $asig = $this->crearAsignacion();

        $r = $this->actingAs($this->docente)->postJson('/api/instrumentaciones-didacticas', [
            'asignacion_id'        => $asig->id,
            'objetivo_general'     => 'Desarrollar competencias de programación',
            'competencias'         => ['Algoritmos', 'Estructuras de datos'],
            'unidades'             => [['nombre' => 'Unidad 1', 'objetivo' => 'Entender variables']],
            'metodologia'          => 'ABP',
            'criterios_evaluacion' => ['parciales' => 60, 'final' => 40],
            'bibliografia'         => 'Deitel & Deitel',
        ]);

        $r->assertStatus(201);
        $this->assertEquals('borrador', $r->json('data.estatus'));
        $this->assertDatabaseHas('instrumentaciones_didacticas', [
            'asignacion_id' => $asig->id,
            'estatus'       => 'borrador',
        ]);
    }

    public function test_docente_no_puede_crear_instrumentacion_para_asignacion_ajena(): void
    {
        $otroDocente = User::factory()->create(['email' => 'otro.doc.s9@test.com']);
        $otroDocente->assignRole('docente');
        $asig = $this->crearAsignacion(['docente_id' => $otroDocente->id]);

        $this->actingAs($this->docente)
            ->postJson('/api/instrumentaciones-didacticas', ['asignacion_id' => $asig->id])
            ->assertStatus(403);
    }

    public function test_no_se_puede_crear_segunda_instrumentacion_para_misma_asignacion(): void
    {
        $asig = $this->crearAsignacion();
        $this->crearInstrumentacion($asig);

        $this->actingAs($this->docente)->postJson('/api/instrumentaciones-didacticas', [
            'asignacion_id' => $asig->id,
        ])->assertStatus(422);
    }

    public function test_docente_puede_editar_borrador(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig);

        $r = $this->actingAs($this->docente)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}", [
                'objetivo_general' => 'Objetivo actualizado',
            ]);

        $r->assertOk();
        $this->assertEquals('Objetivo actualizado', $r->json('data.objetivo_general'));
    }

    // ── S9-03: Enviar a revisión ──────────────────────────────────────────────────

    public function test_docente_puede_enviar_instrumentacion_a_revision(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'borrador');

        $r = $this->actingAs($this->docente)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/enviar");

        $r->assertOk();
        $this->assertEquals('enviada', $r->json('data.estatus'));
    }

    public function test_no_se_puede_enviar_instrumentacion_ya_liberada(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'liberada');

        $this->actingAs($this->docente)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/enviar")
            ->assertStatus(422);
    }

    public function test_docente_puede_editar_instrumentacion_con_observaciones(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'observaciones');

        $r = $this->actingAs($this->docente)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}", [
                'objetivo_general' => 'Corregido según observaciones',
            ]);

        $r->assertOk();
        $this->assertEquals('observaciones', $r->json('data.estatus'));
    }

    // ── S9-04: Jefe libera o devuelve ────────────────────────────────────────────

    public function test_jefe_puede_liberar_instrumentacion_enviada(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'enviada');

        $r = $this->actingAs($this->jefe)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/liberar", [
                'accion' => 'liberar',
            ]);

        $r->assertOk();
        $this->assertEquals('liberada', $r->json('data.estatus'));
        $this->assertNotNull($r->json('data.liberada_por'));
    }

    public function test_jefe_puede_devolver_instrumentacion_con_observaciones(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'enviada');

        $r = $this->actingAs($this->jefe)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/liberar", [
                'accion'        => 'devolver',
                'observaciones' => 'Falta detallar unidades 3 y 4.',
            ]);

        $r->assertOk();
        $this->assertEquals('observaciones', $r->json('data.estatus'));
        $this->assertEquals('Falta detallar unidades 3 y 4.', $r->json('data.observaciones_jefe'));
    }

    public function test_jefe_no_puede_liberar_instrumentacion_en_borrador(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'borrador');

        $this->actingAs($this->jefe)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/liberar", ['accion' => 'liberar'])
            ->assertStatus(422);
    }

    public function test_docente_no_puede_liberar_instrumentacion(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'enviada');

        $this->actingAs($this->docente)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/liberar", ['accion' => 'liberar'])
            ->assertStatus(403);
    }

    public function test_jefe_no_puede_liberar_instrumentacion_de_otra_carrera(): void
    {
        $otraCarrera = Carrera::create([
            'nombre' => 'Adm. Industrial', 'clave' => 'ADI', 'codigo_it' => '08', 'activa' => true,
        ]);
        $asig = $this->crearAsignacion(['carrera_id' => $otraCarrera->id]);
        $inst = $this->crearInstrumentacion($asig, 'enviada');

        $this->actingAs($this->jefe)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/liberar", ['accion' => 'liberar'])
            ->assertStatus(403);
    }

    // ── S9-05: Director da visto bueno ────────────────────────────────────────────

    public function test_director_puede_dar_visto_bueno_a_instrumentacion_liberada(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'liberada');

        $r = $this->actingAs($this->director)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/visto-bueno");

        $r->assertOk();
        $this->assertEquals('vigente', $r->json('data.estatus'));
        $this->assertNotNull($r->json('data.visto_bueno_por'));
    }

    public function test_director_no_puede_dar_visto_bueno_a_instrumentacion_no_liberada(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'enviada');

        $this->actingAs($this->director)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/visto-bueno")
            ->assertStatus(422);
    }

    public function test_jefe_no_puede_dar_visto_bueno(): void
    {
        $asig = $this->crearAsignacion();
        $inst = $this->crearInstrumentacion($asig, 'liberada');

        $this->actingAs($this->jefe)
            ->patchJson("/api/instrumentaciones-didacticas/{$inst->id}/visto-bueno")
            ->assertStatus(403);
    }

    // ── Flujo completo S9-03 → S9-04 → S9-05 ─────────────────────────────────────

    public function test_flujo_completo_instrumentacion(): void
    {
        $asig = $this->crearAsignacion();

        // Docente crea borrador
        $r1 = $this->actingAs($this->docente)->postJson('/api/instrumentaciones-didacticas', [
            'asignacion_id'    => $asig->id,
            'objetivo_general' => 'Programación orientada a objetos',
        ]);
        $r1->assertStatus(201);
        $instId = $r1->json('data.id');
        $this->assertEquals('borrador', $r1->json('data.estatus'));

        // Docente envía
        $r2 = $this->actingAs($this->docente)->patchJson("/api/instrumentaciones-didacticas/{$instId}/enviar");
        $r2->assertOk();
        $this->assertEquals('enviada', $r2->json('data.estatus'));

        // Jefe libera
        $r3 = $this->actingAs($this->jefe)->patchJson("/api/instrumentaciones-didacticas/{$instId}/liberar", [
            'accion' => 'liberar',
        ]);
        $r3->assertOk();
        $this->assertEquals('liberada', $r3->json('data.estatus'));

        // Director da visto bueno
        $r4 = $this->actingAs($this->director)->patchJson("/api/instrumentaciones-didacticas/{$instId}/visto-bueno");
        $r4->assertOk();
        $this->assertEquals('vigente', $r4->json('data.estatus'));
    }

    public function test_flujo_con_observaciones_y_reenvio(): void
    {
        $asig = $this->crearAsignacion();

        // Crea y envía
        $r1 = $this->actingAs($this->docente)->postJson('/api/instrumentaciones-didacticas', [
            'asignacion_id' => $asig->id,
        ]);
        $instId = $r1->json('data.id');
        $this->actingAs($this->docente)->patchJson("/api/instrumentaciones-didacticas/{$instId}/enviar");

        // Jefe devuelve con observaciones
        $r2 = $this->actingAs($this->jefe)->patchJson("/api/instrumentaciones-didacticas/{$instId}/liberar", [
            'accion'        => 'devolver',
            'observaciones' => 'Completar unidades.',
        ]);
        $this->assertEquals('observaciones', $r2->json('data.estatus'));

        // Docente edita y reenvía
        $this->actingAs($this->docente)->patchJson("/api/instrumentaciones-didacticas/{$instId}", [
            'objetivo_general' => 'Objetivo mejorado',
        ]);
        $r3 = $this->actingAs($this->docente)->patchJson("/api/instrumentaciones-didacticas/{$instId}/enviar");
        $this->assertEquals('enviada', $r3->json('data.estatus'));
    }

    // ── Listado instrumentaciones ──────────────────────────────────────────────────

    public function test_docente_solo_ve_sus_propias_instrumentaciones(): void
    {
        $otroDocente = User::factory()->create(['email' => 'otro2.doc.s9@test.com']);
        $otroDocente->assignRole('docente');

        $asig1 = $this->crearAsignacion();
        $asig2 = $this->crearAsignacion(['docente_id' => $otroDocente->id]);

        $this->crearInstrumentacion($asig1);
        $this->crearInstrumentacion($asig2);

        $r = $this->actingAs($this->docente)->getJson('/api/instrumentaciones-didacticas');
        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    public function test_director_ve_todas_las_instrumentaciones(): void
    {
        $asig = $this->crearAsignacion();
        $this->crearInstrumentacion($asig, 'vigente');

        $r = $this->actingAs($this->director)->getJson('/api/instrumentaciones-didacticas');
        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    // ── S9-06: Especialidades ─────────────────────────────────────────────────────

    private function crearAlumno(): Alumno
    {
        $alumnoUser = User::factory()->create(['email' => 'alu.esp.s9@test.com']);
        $alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Especialidad',
            'apellido_paterno'      => 'Test',
            'curp'                  => 'ESPT000101HVZRPX01',
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTis',
            'promedio_bachillerato' => 85.0,
            'turno_preferido'       => 'matutino',
            'email'                 => 'asp.esp@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'numero_control'    => '26ISC0098',
            'carrera_id'        => $this->carrera->id,
            'periodo_id'        => $this->periodo->id,
            'fecha_inscripcion' => now()->toDateString(),
        ]);

        return Alumno::create([
            'user_id'            => $alumnoUser->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => '26ISC0098',
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 7,
            'estatus'            => 'activo',
        ]);
    }

    public function test_director_puede_crear_especialidad(): void
    {
        $r = $this->actingAs($this->director)->postJson('/api/especialidades', [
            'carrera_id'              => $this->carrera->id,
            'nombre'                  => 'Sistemas Embebidos',
            'descripcion'             => 'Especialidad en sistemas embebidos y IoT',
            'porcentaje_creditos_min' => 80,
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('especialidades', [
            'carrera_id' => $this->carrera->id,
            'nombre'     => 'Sistemas Embebidos',
            'estatus'    => 'pendiente',
        ]);
    }

    public function test_alumno_no_puede_crear_especialidad(): void
    {
        $this->actingAs($this->alumno)->postJson('/api/especialidades', [
            'carrera_id' => $this->carrera->id,
            'nombre'     => 'Test',
        ])->assertStatus(403);
    }

    public function test_director_puede_autorizar_especialidad(): void
    {
        $esp = Especialidad::create([
            'carrera_id' => $this->carrera->id,
            'nombre'     => 'Inteligencia Artificial',
            'estatus'    => 'pendiente',
        ]);

        $r = $this->actingAs($this->director)
            ->patchJson("/api/especialidades/{$esp->id}/autorizar");

        $r->assertOk();
        $this->assertEquals('activa', $r->json('data.estatus'));
        $this->assertNotNull($r->json('data.autorizada_por'));
    }

    public function test_jefe_puede_solicitar_apertura_especialidad(): void
    {
        $r = $this->actingAs($this->jefe)->postJson('/api/solicitudes-apertura-especialidad', [
            'carrera_id'       => $this->carrera->id,
            'nombre_propuesto' => 'Seguridad Informática',
            'justificacion'    => 'Demanda del sector industrial en la región.',
        ]);

        $r->assertStatus(201);
        $this->assertEquals('pendiente', $r->json('data.estatus'));
        $this->assertDatabaseHas('solicitudes_apertura_especialidad', [
            'nombre_propuesto' => 'Seguridad Informática',
            'solicitante_id'   => $this->jefe->id,
        ]);
    }

    public function test_director_aprueba_solicitud_y_crea_especialidad(): void
    {
        $solicitud = \App\Domains\Academico\Models\SolicitudAperturaEspecialidad::create([
            'carrera_id'       => $this->carrera->id,
            'nombre_propuesto' => 'Redes y Telecomunicaciones',
            'justificacion'    => 'Necesidad del sector.',
            'solicitante_id'   => $this->jefe->id,
            'estatus'          => 'pendiente',
        ]);

        $r = $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-apertura-especialidad/{$solicitud->id}/dictaminar", [
                'estatus' => 'aprobada',
            ]);

        $r->assertOk();
        $this->assertEquals('aprobada', $r->json('data.estatus'));
        $this->assertDatabaseHas('especialidades', [
            'nombre'  => 'Redes y Telecomunicaciones',
            'estatus' => 'activa',
        ]);
    }

    public function test_director_rechaza_solicitud_sin_crear_especialidad(): void
    {
        $solicitud = \App\Domains\Academico\Models\SolicitudAperturaEspecialidad::create([
            'carrera_id'       => $this->carrera->id,
            'nombre_propuesto' => 'Biomedical',
            'justificacion'    => 'Prueba.',
            'solicitante_id'   => $this->jefe->id,
            'estatus'          => 'pendiente',
        ]);

        $r = $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-apertura-especialidad/{$solicitud->id}/dictaminar", [
                'estatus'       => 'rechazada',
                'observaciones' => 'No hay demanda suficiente.',
            ]);

        $r->assertOk();
        $this->assertEquals('rechazada', $r->json('data.estatus'));
        $this->assertDatabaseMissing('especialidades', ['nombre' => 'Biomedical']);
    }

    public function test_no_se_puede_dictaminar_solicitud_ya_dictaminada(): void
    {
        $solicitud = \App\Domains\Academico\Models\SolicitudAperturaEspecialidad::create([
            'carrera_id'       => $this->carrera->id,
            'nombre_propuesto' => 'Ya dictaminada',
            'justificacion'    => 'Test.',
            'solicitante_id'   => $this->jefe->id,
            'estatus'          => 'aprobada',
        ]);

        $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-apertura-especialidad/{$solicitud->id}/dictaminar", [
                'estatus' => 'rechazada',
            ])->assertStatus(422);
    }

    public function test_alumno_puede_seleccionar_especialidad_de_su_carrera(): void
    {
        $alumno = $this->crearAlumno();

        $esp = Especialidad::create([
            'carrera_id' => $this->carrera->id,
            'nombre'     => 'IoT',
            'estatus'    => 'activa',
        ]);

        $alumnoUser = $alumno->user;
        $r = $this->actingAs($alumnoUser)->postJson("/api/alumnos/{$alumno->id}/especialidad-seleccionada", [
            'especialidad_id' => $esp->id,
            'periodo_id'      => $this->periodo->id,
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('alumno_especialidad', [
            'alumno_id'       => $alumno->id,
            'especialidad_id' => $esp->id,
            'estatus'         => 'solicitada',
        ]);
    }

    public function test_alumno_no_puede_seleccionar_especialidad_de_otra_carrera(): void
    {
        $alumno = $this->crearAlumno();

        $otraCarrera = Carrera::create([
            'nombre' => 'Ingeniería Industrial', 'clave' => 'II', 'codigo_it' => '07', 'activa' => true,
        ]);
        $esp = Especialidad::create([
            'carrera_id' => $otraCarrera->id,
            'nombre'     => 'Manufactura',
            'estatus'    => 'activa',
        ]);

        $alumnoUser = $alumno->user;
        $this->actingAs($alumnoUser)->postJson("/api/alumnos/{$alumno->id}/especialidad-seleccionada", [
            'especialidad_id' => $esp->id,
            'periodo_id'      => $this->periodo->id,
        ])->assertStatus(422);
    }

    public function test_puede_listar_especialidades_por_carrera(): void
    {
        Especialidad::create([
            'carrera_id' => $this->carrera->id,
            'nombre'     => 'Ciberseguridad',
            'estatus'    => 'activa',
        ]);

        $r = $this->actingAs($this->director)
            ->getJson("/api/programas-educativos/{$this->carrera->id}/especialidades");

        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    public function test_oficio_especialidad_genera_pdf(): void
    {
        $esp = Especialidad::create([
            'carrera_id'  => $this->carrera->id,
            'nombre'      => 'Cloud Computing',
            'estatus'     => 'activa',
            'autorizada_por' => $this->director->id,
        ]);

        $r = $this->actingAs($this->director)
            ->get("/api/especialidades/{$esp->id}/oficio/pdf");

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }
}
