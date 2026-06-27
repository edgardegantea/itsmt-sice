<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Domains\Calidad\Models\EvaluacionDocente;
use App\Domains\Calidad\Models\TipoActividad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint5Test extends TestCase
{
    use RefreshDatabase;

    private User    $admin;
    private User    $alumnoUser;
    private Alumno  $alumno;
    private Carrera $carrera;
    private Periodo $periodo;
    private Grupo   $grupo;
    private TipoActividad $tipo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'alumno', 'jefe_carrera', 'docente',
                  'director_academico', 'personal_administrativo',
                  'control_escolar', 'direccion_general', 'direccion_academica',
                  'subdireccion_academica'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->carrera = Carrera::create([
            'nombre'    => 'Ingeniería en Sistemas Computacionales',
            'clave'     => 'ISC',
            'codigo_it' => '06',
            'activa'    => true,
        ]);

        $this->periodo = Periodo::create([
            'nombre'                     => 'Ago-Dic 2026',
            'fecha_inicio'               => now()->subDays(10)->toDateString(),
            'fecha_fin'                  => now()->addDays(100)->toDateString(),
            'activo'                     => true,
            'tipo'                       => 'ordinario',
            'fecha_limite_baja_parcial'  => now()->addDays(20)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(30)->toDateString(),
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        // Alumno en semestre 3 (dentro del límite de 6 semestres para AC)
        $this->alumnoUser = User::factory()->create(['email' => 'alumno5@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Juan',
            'apellido_paterno'      => 'Pérez',
            'curp'                  => 'PEPJ900101HDFRRN01',
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Xalapa',
            'escuela_bachillerato'  => 'CBTis 1',
            'promedio_bachillerato' => 8.5,
            'turno_preferido'       => 'matutino',
            'email'                 => 'aspirante5@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => '26ISC0001',
            'carrera_id'       => $this->carrera->id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion' => now()->toDateString(),
        ]);

        $this->alumno = Alumno::create([
            'user_id'            => $this->alumnoUser->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => '26ISC0001',
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 3,
            'estatus'            => 'activo',
        ]);

        $docenteUser = User::factory()->create();
        $docenteUser->assignRole('docente');

        $materia = Materia::create([
            'carrera_id'          => $this->carrera->id,
            'clave'               => 'SC001',
            'clave_oficial_tecnm' => 'AEC-1021',
            'nombre'              => 'Programación',
            'semestre'            => 3,
            'creditos'            => 5,
            'horas_teoria'        => 2,
            'horas_practica'      => 3,
            'tipo'                => 'obligatoria',
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
            'clave'      => '3A',
            'semestre'   => 3,
            'turno'      => 'matutino',
            'capacidad'  => 30,
            'activo'     => true,
        ]);

        // Inscribir alumno al grupo
        $this->grupo->alumnos()->attach($this->alumno->id, [
            'id'               => \Illuminate\Support\Str::uuid()->toString(),
            'fecha_asignacion' => now()->toDateString(),
        ]);

        // Tipo de actividad de prueba
        $this->tipo = TipoActividad::create([
            'clave'            => 'TUTORIA',
            'nombre'           => 'Tutoría grupal',
            'horas_requeridas' => 20,
        ]);
    }

    // ── S5-01: Registro de actividades complementarias ──────────────────────

    public function test_alumno_registra_actividad_complementaria(): void
    {
        $res = $this->actingAs($this->alumnoUser)->postJson('/api/actividades-complementarias', [
            'tipo_id'      => $this->tipo->id,
            'horas'        => 15,
            'evidencia_url' => 'https://drive.google.com/evidencia123',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.estatus', 'registrada')
            ->assertJsonPath('data.semestre_alumno_al_registrar', 3);

        $this->assertDatabaseHas('actividades_complementarias', [
            'alumno_id' => $this->alumno->id,
            'tipo_id'   => $this->tipo->id,
            'estatus'   => 'registrada',
        ]);
    }

    public function test_alumno_no_puede_registrar_ac_despues_de_semestre_6(): void
    {
        $this->alumno->update(['semestre_actual' => 7]);

        $res = $this->actingAs($this->alumnoUser)->postJson('/api/actividades-complementarias', [
            'tipo_id' => $this->tipo->id,
            'horas'   => 10,
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', fn($msg) => str_contains($msg, 'primeros 6 semestres'));
    }

    public function test_alumno_no_puede_superar_maximo_horas_por_tipo(): void
    {
        // Ya tiene 35 horas en el mismo tipo (máximo es 2× 20 = 40)
        ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 35,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->alumnoUser)->postJson('/api/actividades-complementarias', [
            'tipo_id' => $this->tipo->id,
            'horas'   => 10, // 35 + 10 = 45 > 40
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', fn($msg) => str_contains($msg, 'superar'));
    }

    public function test_admin_ve_listado_de_actividades(): void
    {
        ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 10,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/actividades-complementarias');

        $res->assertOk()->assertJsonCount(1, 'data.data');
    }

    // ── S5-02: Validación de actividades complementarias ────────────────────

    public function test_admin_valida_actividad_con_nivel_desempeno(): void
    {
        $actividad = ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 20,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->admin)->patchJson(
            "/api/actividades-complementarias/{$actividad->id}/validar",
            [
                'estatus'          => 'validada',
                'nivel_desempeno'  => 'excelente',
            ]
        );

        $res->assertOk()
            ->assertJsonPath('data.estatus', 'validada')
            ->assertJsonPath('data.nivel_desempeno', 'excelente');

        $this->assertDatabaseHas('actividades_complementarias', [
            'id'              => $actividad->id,
            'estatus'         => 'validada',
            'nivel_desempeno' => 'excelente',
            'validado_por'    => $this->admin->id,
        ]);
    }

    public function test_admin_rechaza_actividad(): void
    {
        $actividad = ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 20,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->admin)->patchJson(
            "/api/actividades-complementarias/{$actividad->id}/validar",
            [
                'estatus'                   => 'rechazada',
                'observaciones_validacion'  => 'Evidencia insuficiente',
            ]
        );

        $res->assertOk()->assertJsonPath('data.estatus', 'rechazada');
    }

    public function test_validar_requiere_nivel_desempeno_si_validada(): void
    {
        $actividad = ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 20,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->admin)->patchJson(
            "/api/actividades-complementarias/{$actividad->id}/validar",
            ['estatus' => 'validada'] // falta nivel_desempeno
        );

        $res->assertStatus(422);
    }

    public function test_alumno_no_puede_validar_actividades(): void
    {
        $actividad = ActividadComplementaria::create([
            'alumno_id'                   => $this->alumno->id,
            'tipo_id'                     => $this->tipo->id,
            'horas'                       => 20,
            'estatus'                     => 'registrada',
            'semestre_alumno_al_registrar' => 3,
        ]);

        $res = $this->actingAs($this->alumnoUser)->patchJson(
            "/api/actividades-complementarias/{$actividad->id}/validar",
            ['estatus' => 'validada', 'nivel_desempeno' => 'bueno']
        );

        $res->assertForbidden();
    }

    // ── S5-03: Evaluación docente anónima ───────────────────────────────────

    public function test_alumno_ve_grupos_pendientes_de_evaluar(): void
    {
        $res = $this->actingAs($this->alumnoUser)->getJson('/api/evaluaciones-docentes');

        $res->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.grupo_id', $this->grupo->id)
            ->assertJsonPath('data.0.ya_evaluado', false)
            ->assertJsonPath('data.0.clave', '3A');
    }

    public function test_alumno_envia_evaluacion_anonima(): void
    {
        $respuestas = [
            'puntualidad'        => 5,
            'dominio_tema'       => 4,
            'claridad'           => 5,
            'disponibilidad'     => 4,
            'material_didactico' => 3,
        ];

        $res = $this->actingAs($this->alumnoUser)->postJson('/api/evaluaciones-docentes', [
            'grupo_id'   => $this->grupo->id,
            'respuestas' => $respuestas,
        ]);

        $res->assertStatus(201);

        // La evaluación no tiene alumno_id (anonimato garantizado)
        $this->assertDatabaseHas('evaluaciones_docentes', [
            'grupo_id'  => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
            'enviada'   => true,
        ]);
        $this->assertDatabaseMissing('evaluaciones_docentes', ['alumno_id' => $this->alumno->id]);

        // El tracking de "ya evaluó" sí registra al alumno
        $this->assertDatabaseHas('alumno_evaluaciones_periodo', [
            'alumno_id'  => $this->alumno->id,
            'grupo_id'   => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
        ]);
    }

    public function test_alumno_no_puede_evaluar_dos_veces_el_mismo_grupo(): void
    {
        DB::table('alumno_evaluaciones_periodo')->insert([
            'alumno_id'   => $this->alumno->id,
            'grupo_id'    => $this->grupo->id,
            'periodo_id'  => $this->periodo->id,
            'evaluado_en' => now(),
        ]);

        $res = $this->actingAs($this->alumnoUser)->postJson('/api/evaluaciones-docentes', [
            'grupo_id'   => $this->grupo->id,
            'respuestas' => ['puntualidad' => 5],
        ]);

        $res->assertStatus(409);
    }

    public function test_alumno_no_puede_evaluar_grupo_ajeno(): void
    {
        $otroGrupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
            'clave'      => '3B',
            'semestre'   => 3,
            'turno'      => 'vespertino',
            'capacidad'  => 30,
            'activo'     => true,
        ]);

        $res = $this->actingAs($this->alumnoUser)->postJson('/api/evaluaciones-docentes', [
            'grupo_id'   => $otroGrupo->id,
            'respuestas' => ['puntualidad' => 5],
        ]);

        $res->assertForbidden();
    }

    // ── S5-04: Resultados agregados para jefe de carrera ─────────────────────

    public function test_jefe_carrera_consulta_resultados_agregados(): void
    {
        // Crear una evaluación
        EvaluacionDocente::create([
            'grupo_id'   => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
            'respuestas' => ['puntualidad' => 5, 'dominio_tema' => 4],
            'enviada'    => true,
        ]);

        $jefe = User::factory()->create();
        $jefe->assignRole('jefe_carrera');
        $jefe->update(['carrera_id' => $this->carrera->id]);

        $res = $this->actingAs($jefe)->getJson(
            "/api/evaluaciones-docentes/resultados?periodo_id={$this->periodo->id}"
        );

        $res->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.total_respuestas', 1)
            ->assertJsonPath('data.0.grupo_id', $this->grupo->id);

        // Verificar que NO se exponen datos del alumno individual
        $responseData = $res->json('data.0');
        $this->assertArrayNotHasKey('alumno_id', $responseData);
    }

    // ── Catálogo de tipos de actividad ─────────────────────────────────────

    public function test_catalogo_tipos_actividad_disponible(): void
    {
        $res = $this->actingAs($this->alumnoUser)->getJson('/api/tipos-actividad');

        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));
    }
}
