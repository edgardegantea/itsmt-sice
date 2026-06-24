<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Mail\PlaneacionDocenteEntregadaMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint3Test extends TestCase
{
    use RefreshDatabase;

    private User    $admin;
    private User    $docente;
    private User    $jefeCarrera;
    private Carrera $carrera;
    private Periodo $periodo;
    private Materia $materia;
    private Aula    $aula;
    private Grupo   $grupo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera', 'docente', 'director_academico', 'alumno'] as $role) {
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
            'fecha_inicio'               => now()->addDays(30)->toDateString(),
            'fecha_fin'                  => now()->addDays(120)->toDateString(),
            'activo'                     => true,
            'tipo'                       => 'ordinario',
            'fecha_limite_baja_parcial'  => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create();
        $this->docente->assignRole('docente');

        $this->jefeCarrera = User::factory()->create(['carrera_id' => $this->carrera->id]);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->materia = Materia::create([
            'carrera_id'          => $this->carrera->id,
            'clave'               => 'SC001',
            'clave_oficial_tecnm' => 'AEC-1021',
            'nombre'              => 'Fundamentos de Programación',
            'semestre'            => 1,
            'creditos'            => 5,
            'horas_teoria'        => 2,
            'horas_practica'      => 3,
            'tipo'                => 'obligatoria',
        ]);

        $this->aula = Aula::create([
            'nombre'    => 'Aula 101',
            'capacidad' => 30,
            'tipo'      => 'salon',
            'activa'    => true,
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
            'clave'      => '1A',
            'semestre'   => 1,
            'turno'      => 'matutino',
            'capacidad'  => 30,
            'activo'     => true,
        ]);
    }

    // ── S3-01: Malla curricular ────────────────────────────────────────────────

    public function test_admin_crea_materia(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/materias', [
                'carrera_id'          => $this->carrera->id,
                'clave'               => 'SC002',
                'clave_oficial_tecnm' => 'AEC-1022',
                'nombre'              => 'Cálculo Diferencial',
                'semestre'            => 1,
                'creditos'            => 5,
                'horas_teoria'        => 3,
                'horas_practica'      => 2,
                'tipo'                => 'obligatoria',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.clave_oficial_tecnm', 'AEC-1022');
    }

    public function test_materia_tipo_invalido_retorna_422(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/materias', [
                'carrera_id'   => $this->carrera->id,
                'clave'        => 'SC003',
                'nombre'       => 'Taller X',
                'semestre'     => 1,
                'creditos'     => 2,
                'horas_teoria' => 1,
                'horas_practica' => 1,
                'tipo'         => 'taller', // no permitido en spec
            ])
            ->assertStatus(422);
    }

    public function test_admin_crea_malla_curricular(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/mallas-curriculares', [
                'carrera_id'    => $this->carrera->id,
                'materia_id'    => $this->materia->id,
                'semestre'      => 1,
                'es_especialidad' => false,
            ])
            ->assertStatus(201);
    }

    public function test_malla_curricular_es_idempotente_en_duplicados(): void
    {
        // La operación es firstOrCreate — crear duplicado devuelve el existente (201), no falla
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/mallas-curriculares', [
                'carrera_id'      => $this->carrera->id,
                'materia_id'      => $this->materia->id,
                'semestre'        => 1,
                'es_especialidad' => false,
            ])
            ->assertStatus(201);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/mallas-curriculares', [
                'carrera_id'      => $this->carrera->id,
                'materia_id'      => $this->materia->id,
                'semestre'        => 1,
                'es_especialidad' => false,
            ])
            ->assertStatus(201); // idempotente — retorna el registro existente

        $this->assertDatabaseCount('mallas_curriculares', 1);
    }

    // ── S3-02: Horarios con detección de conflictos ────────────────────────────

    private function crearCargaAcademica(): CargaAcademica
    {
        return CargaAcademica::create([
            'docente_id'  => $this->docente->id,
            'materia_id'  => $this->materia->id,
            'grupo_id'    => $this->grupo->id,
            'periodo_id'  => $this->periodo->id,
            'aula_id'     => $this->aula->id,
            'horas_semana' => 5,
        ]);
    }

    public function test_admin_guarda_horarios(): void
    {
        $carga = $this->crearCargaAcademica();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga->id,
                'bloques' => [
                    ['dia_semana' => 'lunes',    'hora_inicio' => '08:00', 'hora_fin' => '10:00'],
                    ['dia_semana' => 'miercoles', 'hora_inicio' => '08:00', 'hora_fin' => '10:00'],
                ],
            ])
            ->assertStatus(201);
    }

    public function test_conflicto_docente_retorna_422(): void
    {
        $carga1 = $this->crearCargaAcademica();

        // Primer bloque: lunes 08-10 para el docente
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga1->id,
                'bloques' => [['dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '10:00']],
            ])
            ->assertStatus(201);

        // Segunda materia para el mismo docente — mismo bloque
        $materia2 = Materia::create([
            'carrera_id' => $this->carrera->id, 'clave' => 'SC099',
            'nombre' => 'Álgebra', 'semestre' => 1, 'creditos' => 4,
            'horas_teoria' => 2, 'horas_practica' => 2, 'tipo' => 'obligatoria',
        ]);
        $grupo2 = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => '1B', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true,
        ]);
        $carga2 = CargaAcademica::create([
            'docente_id'  => $this->docente->id, // mismo docente
            'materia_id'  => $materia2->id,
            'grupo_id'    => $grupo2->id,
            'periodo_id'  => $this->periodo->id,
            'aula_id'     => $this->aula->id,
            'horas_semana' => 4,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga2->id,
                'bloques' => [['dia_semana' => 'lunes', 'hora_inicio' => '09:00', 'hora_fin' => '11:00']],
            ])
            ->assertStatus(422);
    }

    public function test_conflicto_aula_retorna_422(): void
    {
        $carga1 = $this->crearCargaAcademica();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga1->id,
                'bloques' => [['dia_semana' => 'martes', 'hora_inicio' => '10:00', 'hora_fin' => '12:00']],
            ])
            ->assertStatus(201);

        // Otro docente, misma aula, mismo bloque
        $docente2 = User::factory()->create();
        $docente2->assignRole('docente');
        $materia2 = Materia::create([
            'carrera_id' => $this->carrera->id, 'clave' => 'SC098',
            'nombre' => 'Física', 'semestre' => 1, 'creditos' => 4,
            'horas_teoria' => 2, 'horas_practica' => 2, 'tipo' => 'obligatoria',
        ]);
        $grupo2 = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => '1C', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true,
        ]);
        $carga2 = CargaAcademica::create([
            'docente_id'  => $docente2->id,
            'materia_id'  => $materia2->id,
            'grupo_id'    => $grupo2->id,
            'periodo_id'  => $this->periodo->id,
            'aula_id'     => $this->aula->id, // misma aula
            'horas_semana' => 4,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga2->id,
                'bloques' => [['dia_semana' => 'martes', 'hora_inicio' => '11:00', 'hora_fin' => '13:00']],
            ])
            ->assertStatus(422);
    }

    // ── S3-04: Planeación didáctica ────────────────────────────────────────────

    public function test_docente_crea_planeacion_borrador(): void
    {
        $carga = $this->crearCargaAcademica();

        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/planeaciones-docentes', [
                'carga_academica_id' => $carga->id,
                'periodo_id'         => $this->periodo->id,
                'caracterizacion'    => 'Descripción del grupo.',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.estatus', 'borrador');
    }

    public function test_docente_entrega_planeacion_notifica_jefe_carrera(): void
    {
        Mail::fake();

        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'borrador',
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->postJson("/api/planeaciones-docentes/{$planeacion->id}/entregar")
            ->assertStatus(200)
            ->assertJsonPath('data.estatus', 'entregada');

        Mail::assertQueued(PlaneacionDocenteEntregadaMail::class, fn ($m) =>
            $m->hasTo($this->jefeCarrera->email)
        );
    }

    public function test_jefe_carrera_aprueba_planeacion(): void
    {
        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'entregada',
        ]);

        $this->actingAs($this->jefeCarrera, 'sanctum')
            ->patchJson("/api/planeaciones-docentes/{$planeacion->id}/estatus", [
                'estatus' => 'liberada',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.estatus', 'liberada');
    }

    public function test_docente_no_puede_aprobar_planeacion(): void
    {
        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'entregada',
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->patchJson("/api/planeaciones-docentes/{$planeacion->id}/estatus", [
                'estatus' => 'liberada',
            ])
            ->assertStatus(403);
    }

    public function test_fecha_entrega_minimo_3_dias_habiles_antes_del_periodo(): void
    {
        $carga = $this->crearCargaAcademica();

        // fecha_entrega = mañana; periodo.fecha_inicio = +30 días — debe PASAR (≥3 días hábiles)
        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/planeaciones-docentes', [
                'carga_academica_id' => $carga->id,
                'periodo_id'         => $this->periodo->id,
                'fecha_entrega'      => now()->addDay()->toDateString(),
            ])
            ->assertStatus(201);
    }

    public function test_fecha_entrega_demasiado_tarde_retorna_422(): void
    {
        // Periodo que empieza en 2 días (solo 1 día hábil de margen)
        $periodoProximo = Periodo::create([
            'nombre'                     => 'Ene-Jun 2027',
            'fecha_inicio'               => now()->addDays(2)->toDateString(),
            'fecha_fin'                  => now()->addDays(90)->toDateString(),
            'activo'                     => false,
            'tipo'                       => 'ordinario',
            'fecha_limite_baja_parcial'  => now()->addDays(15)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(20)->toDateString(),
        ]);

        $grupoPeriodo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $periodoProximo->id,
            'clave' => '2A', 'semestre' => 2, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true,
        ]);
        $carga = CargaAcademica::create([
            'docente_id'  => $this->docente->id,
            'materia_id'  => $this->materia->id,
            'grupo_id'    => $grupoPeriodo->id,
            'periodo_id'  => $periodoProximo->id,
            'horas_semana' => 5,
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/planeaciones-docentes', [
                'carga_academica_id' => $carga->id,
                'periodo_id'         => $periodoProximo->id,
                'fecha_entrega'      => now()->toDateString(), // hoy; periodo empieza en 2 días — insuficiente
            ])
            ->assertStatus(422);
    }

    // ── Tests adicionales S3-02 ───────────────────────────────────────────────

    public function test_horario_conflicto_dentro_del_mismo_lote_retorna_422(): void
    {
        $carga = $this->crearCargaAcademica();

        // Dos bloques que se solapan entre sí dentro del mismo POST
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga->id,
                'bloques'            => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '10:00'],
                    ['dia_semana' => 'lunes', 'hora_inicio' => '09:00', 'hora_fin' => '11:00'], // solapa
                ],
            ])
            ->assertStatus(422);
    }

    public function test_dos_bloques_mismo_dia_sin_solaparse_se_guardan(): void
    {
        $carga = $this->crearCargaAcademica();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios', [
                'carga_academica_id' => $carga->id,
                'bloques'            => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '07:00', 'hora_fin' => '09:00'],
                    ['dia_semana' => 'lunes', 'hora_inicio' => '09:00', 'hora_fin' => '11:00'], // consecutivos, no solapan
                ],
            ])
            ->assertStatus(201);
    }

    // ── Tests adicionales S3-04 ───────────────────────────────────────────────

    public function test_jefe_no_puede_aprobar_planeacion_en_borrador(): void
    {
        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'borrador', // nunca fue entregada
        ]);

        $this->actingAs($this->jefeCarrera, 'sanctum')
            ->patchJson("/api/planeaciones-docentes/{$planeacion->id}/estatus", [
                'estatus' => 'liberada',
            ])
            ->assertStatus(422); // transición no permitida: borrador → liberada
    }

    public function test_cambiar_estatus_guarda_observaciones_revision(): void
    {
        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'entregada',
        ]);

        $this->actingAs($this->jefeCarrera, 'sanctum')
            ->patchJson("/api/planeaciones-docentes/{$planeacion->id}/estatus", [
                'estatus'                => 'devuelta',
                'observaciones_revision' => 'Falta bibliografía actualizada.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.estatus', 'devuelta');

        $this->assertDatabaseHas('planeaciones_docentes', [
            'id'                     => $planeacion->id,
            'observaciones_revision' => 'Falta bibliografía actualizada.',
        ]);
    }

    public function test_entregar_planeacion_registra_entregada_en(): void
    {
        $carga      = $this->crearCargaAcademica();
        $planeacion = PlaneacionDocente::create([
            'carga_academica_id' => $carga->id,
            'docente_id'         => $this->docente->id,
            'periodo_id'         => $this->periodo->id,
            'estatus'            => 'borrador',
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->postJson("/api/planeaciones-docentes/{$planeacion->id}/entregar")
            ->assertStatus(200);

        $this->assertNotNull($planeacion->fresh()->entregada_en);
    }

    public function test_materia_no_se_elimina_si_tiene_cargas_academicas(): void
    {
        $this->crearCargaAcademica(); // crea carga con $this->materia

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/materias/{$this->materia->id}")
            ->assertStatus(422);
    }

    public function test_materia_clave_oficial_tecnm_requerida(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/materias', [
                'carrera_id'    => $this->carrera->id,
                'clave'         => 'SC003',
                // sin clave_oficial_tecnm
                'nombre'        => 'Álgebra',
                'semestre'      => 1,
                'creditos'      => 4,
                'horas_teoria'  => 3,
                'horas_practica'=> 1,
                'tipo'          => 'obligatoria',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clave_oficial_tecnm']);
    }
}
