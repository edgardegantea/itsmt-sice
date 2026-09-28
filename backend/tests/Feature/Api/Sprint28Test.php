<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\ModoExamen;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Cobertura de las correcciones de scoping por carrera hechas sobre features que
 * llegaron sin tests (Torre de Control, Salud Semestral, Pasaporte Docente) y de
 * los guards de Modo Examen — que es una política institucional (afecta el
 * check-in de TODAS las carreras) y por eso jefe_carrera solo debe poder
 * consultarla, no activarla/desactivarla.
 */
class Sprint28Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $jefeCarrera;
    private User $docente;
    private Carrera $carreraPropia;
    private Carrera $carreraAjena;
    private Periodo $periodo;
    private Grupo $grupoPropio;
    private Grupo $grupoAjeno;
    private Materia $materiaPropia;
    private Materia $materiaAjena;
    private Aula $aulaPropia;
    private Aula $aulaAjena;
    private CargaAcademica $cargaPropia;
    private CargaAcademica $cargaAjena;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s28@test.com']);
        $this->admin->assignRole('admin');

        $this->carreraPropia = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC28',
            'codigo_it' => 'ITSM-ISC28', 'vigente' => true, 'duracion_semestres' => 9,
        ]);
        $this->carreraAjena = Carrera::create([
            'nombre' => 'Ingeniería Industrial', 'clave' => 'IND28',
            'codigo_it' => 'ITSM-IND28', 'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->jefeCarrera = User::factory()->create(['email' => 'jefe.s28@test.com', 'carrera_id' => $this->carreraPropia->id]);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->docente = User::factory()->create(['email' => 'doc.s28@test.com']);
        $this->docente->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => now()->subWeeks(4)->toDateString(),
            'fecha_fin' => now()->addMonths(3)->toDateString(), 'activo' => true,
        ]);

        $this->materiaPropia = Materia::create([
            'nombre' => 'Algoritmos', 'clave' => 'ALG28S', 'carrera_id' => $this->carreraPropia->id,
            'semestre' => 1, 'creditos' => 5,
        ]);
        $this->materiaAjena = Materia::create([
            'nombre' => 'Procesos Industriales', 'clave' => 'PRI28S', 'carrera_id' => $this->carreraAjena->id,
            'semestre' => 1, 'creditos' => 5,
        ]);

        $this->grupoPropio = Grupo::create([
            'carrera_id' => $this->carreraPropia->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'A', 'semestre' => 1, 'turno' => 'matutino',
        ]);
        $this->grupoAjeno = Grupo::create([
            'carrera_id' => $this->carreraAjena->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'A', 'semestre' => 1, 'turno' => 'matutino',
        ]);

        $this->aulaPropia = Aula::create(['nombre' => 'E101', 'capacidad' => 35, 'tipo' => 'salon', 'activa' => true]);
        $this->aulaAjena = Aula::create(['nombre' => 'E102', 'capacidad' => 35, 'tipo' => 'salon', 'activa' => true]);

        $this->cargaPropia = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materiaPropia->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $this->aulaPropia->id, 'horas_semana' => 4,
        ]);
        $this->cargaPropia->grupos()->attach($this->grupoPropio->id);

        $this->cargaAjena = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materiaAjena->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $this->aulaAjena->id, 'horas_semana' => 4,
        ]);
        $this->cargaAjena->grupos()->attach($this->grupoAjeno->id);
    }

    private function crearHorarioHoyAhora(CargaAcademica $carga): Horario
    {
        $dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return Horario::create([
            'carga_academica_id' => $carga->id,
            'dia_semana' => $dias[now()->dayOfWeek] === 'domingo' ? 'lunes' : $dias[now()->dayOfWeek],
            'hora_inicio' => now()->format('H:i'),
            'hora_fin' => now()->addHours(2)->format('H:i'),
        ]);
    }

    // ── Torre de Control: scoping por carrera de jefe_carrera ───────────────────

    public function test_jefe_carrera_no_ve_materia_ni_docente_de_otra_carrera_en_torre_control(): void
    {
        if (now()->dayOfWeek === 0) {
            $this->markTestSkipped('Requiere un día distinto a domingo para simular clase en curso.');
        }
        $this->crearHorarioHoyAhora($this->cargaPropia);
        $this->crearHorarioHoyAhora($this->cargaAjena);

        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/torre-control?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $aulas = collect($r->json('data.aulas'));
        $propia = $aulas->firstWhere('id', $this->aulaPropia->id);
        $ajena = $aulas->firstWhere('id', $this->aulaAjena->id);

        $this->assertTrue($propia['ocupada']);
        $this->assertSame('Algoritmos', $propia['materia']);

        // El aula sigue apareciendo (recurso físico compartido) pero sin exponer
        // qué se imparte ahí — eso pertenece a una carrera que no es la suya.
        $this->assertFalse($ajena['ocupada']);
        $this->assertNull($ajena['materia']);
    }

    public function test_jefe_carrera_no_ve_incidencias_de_otra_carrera_en_torre_control(): void
    {
        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupoAjeno->id,
            'aula_id' => $this->aulaAjena->id, 'registrado_por_id' => $this->admin->id,
            'fecha' => now()->toDateString(), 'hora_revision' => '08:00', 'estatus' => 'docente_ausente',
        ]);

        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/torre-control?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertSame(0, $r->json('data.incidencias_hoy.total'));

        // Un admin sí la debe ver.
        $rAdmin = $this->actingAs($this->admin)->getJson("/api/torre-control?periodo_id={$this->periodo->id}");
        $this->assertSame(1, $rAdmin->json('data.incidencias_hoy.total'));
    }

    // ── Salud Semestral: scoping por carrera de jefe_carrera ─────────────────────

    public function test_jefe_carrera_solo_ve_su_propia_carrera_en_salud_semestral(): void
    {
        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/salud-semestral?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $carreras = collect($r->json('data'))->pluck('carrera_id');
        $this->assertTrue($carreras->contains($this->carreraPropia->id));
        $this->assertFalse($carreras->contains($this->carreraAjena->id));
    }

    public function test_admin_ve_todas_las_carreras_en_salud_semestral(): void
    {
        $r = $this->actingAs($this->admin)->getJson("/api/salud-semestral?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $carreras = collect($r->json('data'))->pluck('carrera_id');
        $this->assertTrue($carreras->contains($this->carreraPropia->id));
        $this->assertTrue($carreras->contains($this->carreraAjena->id));
    }

    // ── Pasaporte Docente: jefe_carrera solo consulta docentes de su carrera ────

    public function test_jefe_carrera_no_puede_ver_pasaporte_de_docente_de_otra_carrera(): void
    {
        // El docente de prueba solo imparte en carreraAjena en este escenario.
        $soloAjeno = User::factory()->create(['email' => 'soloajeno.s28@test.com']);
        $soloAjeno->assignRole('docente');
        $cargaSoloAjena = CargaAcademica::create([
            'docente_id' => $soloAjeno->id, 'materia_id' => $this->materiaAjena->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $this->aulaAjena->id, 'horas_semana' => 4,
        ]);
        $cargaSoloAjena->grupos()->attach($this->grupoAjeno->id);

        $this->actingAs($this->jefeCarrera)
            ->getJson("/api/docentes/{$soloAjeno->id}/pasaporte?periodo_id={$this->periodo->id}")
            ->assertStatus(403);
    }

    public function test_jefe_carrera_puede_ver_pasaporte_de_docente_de_su_carrera(): void
    {
        $this->actingAs($this->jefeCarrera)
            ->getJson("/api/docentes/{$this->docente->id}/pasaporte?periodo_id={$this->periodo->id}")
            ->assertOk();
    }

    // ── Modo Examen: solo lectura para jefe_carrera, mutación solo admin/directivos ──

    public function test_jefe_carrera_puede_consultar_pero_no_activar_modo_examen(): void
    {
        $this->actingAs($this->jefeCarrera)
            ->getJson("/api/modos-examen?periodo_id={$this->periodo->id}")
            ->assertOk();

        $this->actingAs($this->jefeCarrera)
            ->postJson('/api/modos-examen', ['periodo_id' => $this->periodo->id, 'fecha' => now()->toDateString()])
            ->assertStatus(403);
    }

    public function test_jefe_carrera_no_puede_desactivar_modo_examen(): void
    {
        $modo = ModoExamen::create([
            'periodo_id' => $this->periodo->id, 'fecha' => now()->toDateString(),
            'activado_por_id' => $this->admin->id,
        ]);

        $this->actingAs($this->jefeCarrera)
            ->deleteJson("/api/modos-examen/{$modo->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('modos_examen', ['id' => $modo->id]);
    }

    public function test_admin_puede_activar_y_desactivar_modo_examen(): void
    {
        $r = $this->actingAs($this->admin)->postJson('/api/modos-examen', [
            'periodo_id' => $this->periodo->id, 'fecha' => now()->toDateString(),
        ]);
        $r->assertStatus(201);
        $modoId = $r->json('data.id');

        $this->actingAs($this->admin)->deleteJson("/api/modos-examen/{$modoId}")->assertOk();
        $this->assertDatabaseMissing('modos_examen', ['id' => $modoId]);
    }

    public function test_activar_modo_examen_no_duplica_para_la_misma_fecha(): void
    {
        $payload = ['periodo_id' => $this->periodo->id, 'fecha' => now()->toDateString()];
        $this->actingAs($this->admin)->postJson('/api/modos-examen', $payload)->assertStatus(201);
        $this->actingAs($this->admin)->postJson('/api/modos-examen', $payload)->assertStatus(201);

        $this->assertDatabaseCount('modos_examen', 1);
    }

    public function test_checkin_exige_foto_cuando_modo_examen_esta_activo_para_la_fecha(): void
    {
        ModoExamen::create([
            'periodo_id' => $this->periodo->id, 'fecha' => now()->toDateString(),
            'activado_por_id' => $this->admin->id,
        ]);

        [$alumnoUser, ] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        $sesion = SesionClase::create([
            'grupo_id' => $this->grupoPropio->id, 'carga_academica_id' => $this->cargaPropia->id,
            'docente_id' => $this->docente->id, 'fecha' => now()->toDateString(),
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            'codigo_checkin' => 'ABC123', 'checkin_expira_en' => now()->addMinutes(30),
        ]);

        $sinFoto = $this->actingAs($alumnoUser)->postJson("/api/sesiones-clase/{$sesion->id}/checkin", [
            'codigo' => 'ABC123',
        ]);
        $sinFoto->assertStatus(422);
        $sinFoto->assertJsonValidationErrors(['foto_evidencia']);
    }

    public function test_checkin_no_exige_foto_sin_modo_examen_activo(): void
    {
        [$alumnoUser, ] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        $sesion = SesionClase::create([
            'grupo_id' => $this->grupoPropio->id, 'carga_academica_id' => $this->cargaPropia->id,
            'docente_id' => $this->docente->id, 'fecha' => now()->toDateString(),
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            'codigo_checkin' => 'XYZ789', 'checkin_expira_en' => now()->addMinutes(30),
        ]);

        $this->actingAs($alumnoUser)->postJson("/api/sesiones-clase/{$sesion->id}/checkin", [
            'codigo' => 'XYZ789',
        ])->assertOk();
    }

    /** @return array{0: User, 1: \App\Domains\Academico\Models\Alumno} */
    private function crearAlumnoEnGrupo(Grupo $grupo, Carrera $carrera): array
    {
        $alumnoUser = User::factory()->create(['email' => 'alu' . uniqid() . '.s28@test.com']);
        $alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres' => 'Ana', 'apellido_paterno' => 'Pérez', 'apellido_materno' => 'Ruiz',
            'email' => 'ana' . uniqid() . '@test.com', 'telefono' => '1234567890',
            'curp' => 'PERA010101MVZRZN0' . rand(1, 9),
            'fecha_nacimiento' => '2001-01-01', 'sexo' => 'femenino',
            'municipio_procedencia' => 'Martínez de la Torre', 'escuela_bachillerato' => 'CBTIS 253',
            'promedio_bachillerato' => 90.0, 'turno_preferido' => 'matutino',
            'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id,
            'numero_ficha' => '2025-' . rand(1000, 9999),
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id' => $aspirante->id, 'numero_control' => '21' . strtoupper(uniqid()),
            'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id,
            'fecha_inscripcion' => '2025-01-20',
        ]);

        $alumno = \App\Domains\Academico\Models\Alumno::create([
            'user_id' => $alumnoUser->id, 'inscripcion_id' => $inscripcion->id,
            'numero_control' => $inscripcion->numero_control, 'carrera_id' => $carrera->id,
            'periodo_ingreso_id' => $this->periodo->id, 'semestre_actual' => 1,
        ]);

        // alumno_grupo requiere id propio (uuid), no lo genera un attach() plano.
        \Illuminate\Support\Facades\DB::table('alumno_grupo')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'grupo_id' => $grupo->id,
            'alumno_id' => $alumno->id,
            'fecha_asignacion' => now()->toDateString(),
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$alumnoUser, $alumno];
    }
}
