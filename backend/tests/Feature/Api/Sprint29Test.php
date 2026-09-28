<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\AlertaBajaDefinitiva;
use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Cobertura para AlertaRiesgoAcademicoController y AlertaDesercionTempranaController
 * — llegaron sin ningún test automatizado. Ambos son sumas ponderadas de reglas
 * (no ML), así que las pruebas fijan datos que producen un score conocido y
 * verifican el cálculo, el nivel resultante y el scoping por carrera de
 * jefe_carrera (que en ambos controladores ya estaba implementado antes de esta
 * ronda, a diferencia de Torre de Control / Salud Semestral / Pasaporte — ver
 * Sprint28Test).
 */
class Sprint29Test extends TestCase
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
    private CargaAcademica $cargaPropia;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s29@test.com']);
        $this->admin->assignRole('admin');

        $this->carreraPropia = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC29',
            'codigo_it' => 'ITSM-ISC29', 'vigente' => true, 'duracion_semestres' => 9,
        ]);
        $this->carreraAjena = Carrera::create([
            'nombre' => 'Ingeniería Industrial', 'clave' => 'IND29',
            'codigo_it' => 'ITSM-IND29', 'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->jefeCarrera = User::factory()->create(['email' => 'jefe.s29@test.com', 'carrera_id' => $this->carreraPropia->id]);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->docente = User::factory()->create(['email' => 'doc.s29@test.com']);
        $this->docente->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => now()->subWeeks(4)->toDateString(),
            'fecha_fin' => now()->addMonths(3)->toDateString(), 'activo' => true,
        ]);

        $this->materiaPropia = Materia::create([
            'nombre' => 'Algoritmos', 'clave' => 'ALG29S', 'carrera_id' => $this->carreraPropia->id,
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

        $this->cargaPropia = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materiaPropia->id,
            'periodo_id' => $this->periodo->id, 'horas_semana' => 4,
        ]);
        $this->cargaPropia->grupos()->attach($this->grupoPropio->id);
    }

    /** @return array{0: User, 1: Alumno} */
    private function crearAlumnoEnGrupo(Grupo $grupo, Carrera $carrera): array
    {
        $alumnoUser = User::factory()->create(['email' => 'alu' . uniqid() . '.s29@test.com']);
        $alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres' => 'Ana', 'apellido_paterno' => 'Pérez', 'apellido_materno' => 'Ruiz',
            'email' => 'ana' . uniqid() . '@test.com', 'telefono' => '1234567890',
            'curp' => 'PERA' . rand(100000, 999999) . 'MVZRZN0' . rand(1, 9),
            'fecha_nacimiento' => '2001-01-01', 'sexo' => 'femenino',
            'municipio_procedencia' => 'Martínez de la Torre', 'escuela_bachillerato' => 'CBTIS 253',
            'promedio_bachillerato' => 90.0, 'turno_preferido' => 'matutino',
            'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id,
            'numero_ficha' => '2025-' . rand(10000, 99999),
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id' => $aspirante->id, 'numero_control' => '21' . strtoupper(uniqid()),
            'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id,
            'fecha_inscripcion' => '2025-01-20',
        ]);

        $alumno = Alumno::create([
            'user_id' => $alumnoUser->id, 'inscripcion_id' => $inscripcion->id,
            'numero_control' => $inscripcion->numero_control, 'carrera_id' => $carrera->id,
            'periodo_ingreso_id' => $this->periodo->id, 'semestre_actual' => 1,
        ]);

        DB::table('alumno_grupo')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'grupo_id' => $grupo->id, 'alumno_id' => $alumno->id,
            'fecha_asignacion' => now()->toDateString(), 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return [$alumnoUser, $alumno];
    }

    // ══════════════════════════ AlertaRiesgoAcademicoController ══════════════════

    public function test_riesgo_academico_requiere_periodo_id(): void
    {
        $this->actingAs($this->admin)->getJson('/api/alertas-riesgo-academico')->assertStatus(422);
    }

    public function test_docente_no_puede_consultar_riesgo_academico(): void
    {
        $this->actingAs($this->docente)
            ->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}")
            ->assertStatus(403);
    }

    public function test_calcula_score_combinando_reprobacion_e_inasistencia(): void
    {
        [$alumnoUser, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        // 50% de reprobación (1 de 2 materias con calificacion_final capturada).
        Calificacion::create([
            'alumno_id' => $alumno->id, 'grupo_id' => $this->grupoPropio->id,
            'calificacion_final' => 60, 'acreditado' => false,
        ]);
        $otroGrupo = Grupo::create([
            'carrera_id' => $this->carreraPropia->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'B', 'semestre' => 1, 'turno' => 'matutino',
        ]);
        Calificacion::create([
            'alumno_id' => $alumno->id, 'grupo_id' => $otroGrupo->id,
            'calificacion_final' => 90, 'acreditado' => true,
        ]);

        // 50% de inasistencia registrada en alertas_inasistencia.
        AlertaInasistencia::create([
            'alumno_id' => $alumnoUser->id, 'grupo_id' => $this->grupoPropio->id,
            'porcentaje_inasistencia' => 50,
        ]);

        // score = 50*0.40 (reprobación) + 50*0.30 (inasistencia) = 35 → nivel medio.
        $r = $this->actingAs($this->admin)->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $fila = collect($r->json('data'))->firstWhere('alumno_id', $alumno->id);
        $this->assertNotNull($fila);
        $this->assertEquals(50.0, $fila['pct_reprobacion']);
        $this->assertEquals(50.0, $fila['pct_inasistencia']);
        $this->assertSame(35, $fila['score']);
        $this->assertSame('medio', $fila['nivel_riesgo']);
    }

    public function test_alerta_de_baja_sin_revisar_suma_20_puntos_pero_revisada_no(): void
    {
        [, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        AlertaBajaDefinitiva::create([
            'alumno_id' => $alumno->id, 'grupo_id' => $this->grupoPropio->id,
            'periodo_id' => $this->periodo->id, 'materia_nombre' => 'Algoritmos',
            'intento_numero' => 3, 'revisada' => false,
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}");
        $fila = collect($r->json('data'))->firstWhere('alumno_id', $alumno->id);
        $this->assertNotNull($fila);
        $this->assertTrue($fila['alerta_baja_definitiva']);
        $this->assertSame(20, $fila['score']);

        // Si ya fue revisada, no debe seguir sumando ni aparecer con score > 0.
        AlertaBajaDefinitiva::where('alumno_id', $alumno->id)->update(['revisada' => true]);
        $r2 = $this->actingAs($this->admin)->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}");
        $this->assertNull(collect($r2->json('data'))->firstWhere('alumno_id', $alumno->id));
    }

    public function test_incidencias_de_grupo_suman_puntos_con_tope_de_cinco(): void
    {
        [, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        for ($i = 0; $i < 8; $i++) {
            IncidenciaClase::create([
                'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupoPropio->id,
                'registrado_por_id' => $this->admin->id, 'fecha' => now()->toDateString(),
                'hora_revision' => sprintf('%02d:00', 7 + $i), 'estatus' => 'docente_ausente',
            ]);
        }

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}");
        $fila = collect($r->json('data'))->firstWhere('alumno_id', $alumno->id);
        $this->assertNotNull($fila);
        $this->assertSame(8, $fila['total_incidencias_grupo']);
        // tope de 5 incidencias × 4 puntos = 20.
        $this->assertSame(20, $fila['score']);
    }

    public function test_jefe_carrera_solo_ve_alumnos_de_su_propia_carrera_en_riesgo_academico(): void
    {
        [, $alumnoPropio] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);
        [, $alumnoAjeno] = $this->crearAlumnoEnGrupo($this->grupoAjeno, $this->carreraAjena);

        foreach ([$alumnoPropio, $alumnoAjeno] as $a) {
            Calificacion::create([
                'alumno_id' => $a->id, 'grupo_id' => $a->carrera_id === $this->carreraPropia->id ? $this->grupoPropio->id : $this->grupoAjeno->id,
                'calificacion_final' => 50, 'acreditado' => false,
            ]);
        }

        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $ids = collect($r->json('data'))->pluck('alumno_id');
        $this->assertTrue($ids->contains($alumnoPropio->id));
        $this->assertFalse($ids->contains($alumnoAjeno->id));
    }

    public function test_filtro_de_nivel_excluye_scores_de_otros_niveles(): void
    {
        [, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);
        AlertaBajaDefinitiva::create([
            'alumno_id' => $alumno->id, 'grupo_id' => $this->grupoPropio->id,
            'periodo_id' => $this->periodo->id, 'materia_nombre' => 'Algoritmos',
            'intento_numero' => 3, 'revisada' => false,
        ]); // score 20 → nivel bajo

        $r = $this->actingAs($this->admin)
            ->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}&nivel=alto");
        $this->assertNull(collect($r->json('data'))->firstWhere('alumno_id', $alumno->id));

        $r2 = $this->actingAs($this->admin)
            ->getJson("/api/alertas-riesgo-academico?periodo_id={$this->periodo->id}&nivel=bajo");
        $this->assertNotNull(collect($r2->json('data'))->firstWhere('alumno_id', $alumno->id));
    }

    // ══════════════════════════ AlertaDesercionTempranaController ════════════════

    public function test_desercion_temprana_requiere_periodo_id(): void
    {
        $this->actingAs($this->admin)->getJson('/api/alertas-desercion-temprana')->assertStatus(422);
    }

    public function test_desercion_temprana_rechaza_periodo_inexistente(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/alertas-desercion-temprana?periodo_id=' . \Illuminate\Support\Str::uuid())
            ->assertStatus(422);
    }

    public function test_desercion_temprana_vacia_si_la_ventana_aun_no_inicia(): void
    {
        $periodoFuturo = Periodo::create([
            'nombre' => '2026-A', 'fecha_inicio' => now()->addWeek()->toDateString(),
            'fecha_fin' => now()->addMonths(4)->toDateString(), 'activo' => true,
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$periodoFuturo->id}");
        $r->assertOk();
        $this->assertSame([], $r->json('data'));
    }

    public function test_alumno_que_nunca_asistio_obtiene_score_alto(): void
    {
        [, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        // Sesión celebrada dentro de la ventana (periodo empezó hace 4 semanas,
        // ventana por defecto son 3), sin registro de presencia del alumno.
        SesionClase::create([
            'grupo_id' => $this->grupoPropio->id, 'carga_academica_id' => $this->cargaPropia->id,
            'docente_id' => $this->docente->id,
            'fecha' => $this->periodo->fecha_inicio->copy()->addDays(2)->toDateString(),
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $fila = collect($r->json('data'))->firstWhere('alumno_id', $alumno->id);
        $this->assertNotNull($fila);
        $this->assertTrue($fila['nunca_asistio']);
        $this->assertEquals(100.0, $fila['pct_inasistencia_temprana']);
        // score = 100*0.7 + 25 (nunca asistió) = 95, tope 100 → alto.
        $this->assertSame(95, $fila['score']);
        $this->assertSame('alto', $fila['nivel_riesgo']);
    }

    public function test_alumno_con_asistencia_perfecta_no_aparece_en_desercion_temprana(): void
    {
        [$alumnoUser, $alumno] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);

        $sesion = SesionClase::create([
            'grupo_id' => $this->grupoPropio->id, 'carga_academica_id' => $this->cargaPropia->id,
            'docente_id' => $this->docente->id,
            'fecha' => $this->periodo->fecha_inicio->copy()->addDays(2)->toDateString(),
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);
        Asistencia::create([
            'sesion_id' => $sesion->id, 'alumno_id' => $alumnoUser->id, 'estatus' => 'presente',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertNull(collect($r->json('data'))->firstWhere('alumno_id', $alumno->id));
    }

    public function test_jefe_carrera_solo_ve_su_propia_carrera_en_desercion_temprana(): void
    {
        [, $alumnoPropio] = $this->crearAlumnoEnGrupo($this->grupoPropio, $this->carreraPropia);
        $cargaAjena = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materiaPropia->id,
            'periodo_id' => $this->periodo->id, 'horas_semana' => 4,
        ]);
        $cargaAjena->grupos()->attach($this->grupoAjeno->id);
        [, $alumnoAjeno] = $this->crearAlumnoEnGrupo($this->grupoAjeno, $this->carreraAjena);

        foreach ([[$this->grupoPropio, $this->cargaPropia], [$this->grupoAjeno, $cargaAjena]] as [$grupo, $carga]) {
            SesionClase::create([
                'grupo_id' => $grupo->id, 'carga_academica_id' => $carga->id,
                'docente_id' => $this->docente->id,
                'fecha' => $this->periodo->fecha_inicio->copy()->addDays(2)->toDateString(),
                'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            ]);
        }

        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $ids = collect($r->json('data'))->pluck('alumno_id');
        $this->assertTrue($ids->contains($alumnoPropio->id));
        $this->assertFalse($ids->contains($alumnoAjeno->id));
    }
}
