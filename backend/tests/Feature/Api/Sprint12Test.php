<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\FichaDocente;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint12Test extends TestCase
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
    private Aula $aula;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s12@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'dir.s12@test.com']);
        $this->director->assignRole('director_academico');

        $this->docente = User::factory()->create(['email' => 'doc.s12@test.com']);
        $this->docente->assignRole('docente');

        $this->jefeCarrera = User::factory()->create(['email' => 'jefe.s12@test.com']);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->carrera = Carrera::create([
            'nombre'              => 'Ingeniería en Sistemas',
            'clave'               => 'ISC',
            'codigo_it'           => 'ITSM-ISC',
            'vigente'             => true,
            'duracion_semestres'  => 9,
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => '2025-A',
            'fecha_inicio' => '2025-01-15',
            'fecha_fin'    => '2025-06-15',
            'activo'       => true,
        ]);

        $this->aula = Aula::create([
            'nombre'    => 'Aula 101',
            'capacidad' => 35,
            'tipo'      => 'salon',
            'activa'    => true,
        ]);

        $this->materia = Materia::create([
            'nombre'     => 'Algoritmos',
            'clave'      => 'ALG101',
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

        // Crear alumno con usuario
        $this->alumnoUser = User::factory()->create(['email' => 'alu.s12@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Carlos',
            'apellido_paterno'      => 'García',
            'apellido_materno'      => 'López',
            'email'                 => 'carlos@test.com',
            'telefono'              => '1234567890',
            'curp'                  => 'GALC010101HVZRPN01',
            'fecha_nacimiento'      => '2001-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTIS 253',
            'promedio_bachillerato' => 90.0,
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
            'semestre_actual'    => 1,
            'estatus'            => 'activo',
        ]);

        // Asignar alumno al grupo (alumno_grupo usa alumnos.id, no users.id)
        \DB::table('alumno_grupo')->insert([
            'id'              => (string) \Illuminate\Support\Str::uuid(),
            'grupo_id'        => $this->grupo->id,
            'alumno_id'       => $this->alumno->id,
            'fecha_asignacion'=> now()->toDateString(),
            'activo'          => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    // ── S12-01: Docente crea sesión de clase ─────────────────────────────────

    public function test_docente_puede_crear_sesion_de_clase(): void
    {
        $r = $this->actingAs($this->docente)->postJson('/api/sesiones-clase', [
            'grupo_id'    => $this->grupo->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
            'tema'        => 'Introducción a algoritmos',
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('sesiones_clase', [
            'grupo_id'   => $this->grupo->id,
            'docente_id' => $this->docente->id,
            'fecha'      => '2025-02-10',
            'tema'       => 'Introducción a algoritmos',
        ]);
    }

    public function test_docente_puede_crear_sesion_con_asistencias(): void
    {
        $r = $this->actingAs($this->docente)->postJson('/api/sesiones-clase', [
            'grupo_id'    => $this->grupo->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
            'asistencias' => [
                ['alumno_id' => $this->alumnoUser->id, 'estatus' => 'presente'],
            ],
        ]);

        $r->assertStatus(201);
        $sesionId = $r->json('data.id');
        $this->assertDatabaseHas('asistencias', [
            'sesion_id'  => $sesionId,
            'alumno_id'  => $this->alumnoUser->id,
            'estatus'    => 'presente',
        ]);
    }

    public function test_docente_puede_ver_sus_sesiones(): void
    {
        SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
        ]);

        $r = $this->actingAs($this->docente)->getJson('/api/sesiones-clase');
        $r->assertOk();
        $this->assertGreaterThan(0, count($r->json('data.data')));
    }

    public function test_docente_puede_actualizar_asistencia_de_sesion(): void
    {
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
        ]);

        $r = $this->actingAs($this->docente)->patchJson("/api/sesiones-clase/{$sesion->id}/asistencia", [
            'asistencias' => [
                ['alumno_id' => $this->alumnoUser->id, 'estatus' => 'ausente', 'observacion' => 'Sin aviso'],
            ],
        ]);

        $r->assertOk();
        $this->assertDatabaseHas('asistencias', [
            'sesion_id' => $sesion->id,
            'alumno_id' => $this->alumnoUser->id,
            'estatus'   => 'ausente',
        ]);
    }

    public function test_estatus_invalido_es_rechazado(): void
    {
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
        ]);

        $r = $this->actingAs($this->docente)->patchJson("/api/sesiones-clase/{$sesion->id}/asistencia", [
            'asistencias' => [
                ['alumno_id' => $this->alumnoUser->id, 'estatus' => 'invalido'],
            ],
        ]);

        $r->assertStatus(422);
    }

    // ── S12-02: Reporte de asistencia del grupo ───────────────────────────────

    public function test_admin_puede_ver_reporte_asistencia_grupo(): void
    {
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
        ]);
        Asistencia::create([
            'sesion_id' => $sesion->id,
            'alumno_id' => $this->alumnoUser->id,
            'estatus'   => 'presente',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/grupos/{$this->grupo->id}/reporte-asistencia");
        $r->assertOk();
        $r->assertJsonStructure(['data' => ['grupo', 'total_sesiones', 'sesiones', 'resumen_alumnos']]);
    }

    public function test_director_puede_ver_historial_asistencia_alumno(): void
    {
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-11',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
        ]);
        Asistencia::create([
            'sesion_id' => $sesion->id,
            'alumno_id' => $this->alumnoUser->id,
            'estatus'   => 'retardo',
        ]);

        $r = $this->actingAs($this->director)->getJson("/api/alumnos/{$this->alumnoUser->id}/asistencia");
        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    // ── S12-03: Alertas automáticas de inasistencia ───────────────────────────

    public function test_se_genera_alerta_al_superar_25_porciento_inasistencias(): void
    {
        // Crear 4 sesiones, alumno ausente en todas → 100% > 25%
        foreach (range(1, 4) as $i) {
            $sesion = SesionClase::create([
                'grupo_id'    => $this->grupo->id,
                'docente_id'  => $this->docente->id,
                'fecha'       => "2025-02-{$i}0",
                'hora_inicio' => '08:00',
                'hora_fin'    => '10:00',
            ]);
            Asistencia::create([
                'sesion_id' => $sesion->id,
                'alumno_id' => $this->alumnoUser->id,
                'estatus'   => 'ausente',
            ]);
        }

        // Trigger alerta via PATCH que llama checkAndGenerateAlertas
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-15',
            'hora_inicio' => '10:00',
            'hora_fin'    => '12:00',
        ]);
        $this->actingAs($this->docente)->patchJson("/api/sesiones-clase/{$sesion->id}/asistencia", [
            'asistencias' => [
                ['alumno_id' => $this->alumnoUser->id, 'estatus' => 'ausente'],
            ],
        ]);

        $this->assertDatabaseHas('alertas_inasistencia', [
            'alumno_id' => $this->alumnoUser->id,
            'grupo_id'  => $this->grupo->id,
        ]);
    }

    public function test_admin_puede_ver_alertas_de_inasistencia(): void
    {
        AlertaInasistencia::create([
            'alumno_id'               => $this->alumnoUser->id,
            'grupo_id'                => $this->grupo->id,
            'porcentaje_inasistencia' => 30.0,
        ]);

        $r = $this->actingAs($this->admin)->getJson('/api/alertas/inasistencias');
        $r->assertOk();
        $this->assertGreaterThan(0, count($r->json('data.data')));
    }

    public function test_jefe_carrera_puede_ver_alertas(): void
    {
        AlertaInasistencia::create([
            'alumno_id'               => $this->alumnoUser->id,
            'grupo_id'                => $this->grupo->id,
            'porcentaje_inasistencia' => 28.0,
        ]);

        $r = $this->actingAs($this->jefeCarrera)->getJson('/api/alertas/inasistencias');
        $r->assertOk();
    }

    public function test_director_puede_marcar_alerta_como_leida(): void
    {
        $alerta = AlertaInasistencia::create([
            'alumno_id'               => $this->alumnoUser->id,
            'grupo_id'                => $this->grupo->id,
            'porcentaje_inasistencia' => 35.0,
        ]);

        $r = $this->actingAs($this->director)->patchJson("/api/alertas/inasistencias/{$alerta->id}/leer");
        $r->assertOk();
        $this->assertDatabaseHas('alertas_inasistencia', [
            'id'             => $alerta->id,
            'leida_director' => true,
        ]);
    }

    // ── S12-04: Reporte de carga académica ───────────────────────────────────

    public function test_director_puede_ver_carga_academica_del_personal(): void
    {
        FichaDocente::create([
            'docente_id'     => $this->docente->id,
            'tipo_contrato'  => 'hora_clase',
            'activo'         => true,
        ]);

        CargaAcademica::create([
            'docente_id'  => $this->docente->id,
            'materia_id'  => $this->materia->id,
            'grupo_id'    => $this->grupo->id,
            'periodo_id'  => $this->periodo->id,
            'horas_semana'=> 3,
        ]);

        $r = $this->actingAs($this->director)->getJson('/api/reportes/carga-academica');
        $r->assertOk();
        $data = $r->json('data');
        $this->assertNotEmpty($data);
        $found = collect($data)->first(fn ($d) => $d['docente_id'] === $this->docente->id);
        $this->assertNotNull($found);
        $this->assertEquals(1, $found['total_grupos']);
        $this->assertEquals(3, $found['total_horas_semana']);
    }

    public function test_admin_puede_ver_carga_academica_filtrada_por_periodo(): void
    {
        $r = $this->actingAs($this->admin)->getJson("/api/reportes/carga-academica?periodo_id={$this->periodo->id}");
        $r->assertOk();
    }

    public function test_sesion_sin_hora_fin_es_rechazada(): void
    {
        $r = $this->actingAs($this->docente)->postJson('/api/sesiones-clase', [
            'grupo_id'    => $this->grupo->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
        ]);
        $r->assertStatus(422);
    }

    public function test_puede_ver_detalle_de_sesion(): void
    {
        $sesion = SesionClase::create([
            'grupo_id'    => $this->grupo->id,
            'docente_id'  => $this->docente->id,
            'fecha'       => '2025-02-10',
            'hora_inicio' => '08:00',
            'hora_fin'    => '10:00',
            'tema'        => 'Recursividad',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/sesiones-clase/{$sesion->id}");
        $r->assertOk();
        $r->assertJsonPath('data.tema', 'Recursividad');
    }
}
