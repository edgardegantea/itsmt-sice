<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\AlertaBajaDefinitiva;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint4Test extends TestCase
{
    use RefreshDatabase;

    private User    $admin;
    private User    $docente;
    private Carrera $carrera;
    private Periodo $periodo;
    private Materia $materia;
    private Grupo   $grupo;
    private Alumno  $alumno;
    private CargaAcademica $carga;

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
            'fecha_inicio'               => now()->subDays(30)->toDateString(), // periodo activo
            'fecha_fin'                  => now()->addDays(90)->toDateString(),
            'activo'                     => true,
            'tipo'                       => 'ordinario',
            'fecha_limite_baja_parcial'  => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create();
        $this->docente->assignRole('docente');

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

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
            'clave'      => '1A',
            'semestre'   => 1,
            'turno'      => 'matutino',
            'capacidad'  => 30,
            'activo'     => true,
        ]);

        $this->carga = CargaAcademica::create([
            'docente_id' => $this->docente->id,
            'materia_id' => $this->materia->id,
            'grupo_id'   => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
            'horas_semana'=> 5,
        ]);

        // Crear alumno con inscripción (requerido por NOT NULL constraint)
        $alumnoUser = User::factory()->create(['email' => 'alumno4@test.com']);
        $alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'Juan',
            'apellido_paterno'      => 'García',
            'curp'                  => 'GAJJ000101HVZRNN00',
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Xalapa',
            'escuela_bachillerato'  => 'CBTis 1',
            'promedio_bachillerato' => 8.5,
            'turno_preferido'       => 'matutino',
            'email'                 => 'aspirante4@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => 'ISC210001',
            'carrera_id'       => $this->carrera->id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> now()->toDateString(),
        ]);

        $this->alumno = Alumno::create([
            'user_id'            => $alumnoUser->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => 'ISC210001',
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 1,
            'estatus'            => 'activo',
        ]);
        $this->grupo->alumnos()->attach($this->alumno->id, [
            'id'              => \Illuminate\Support\Str::uuid()->toString(),
            'fecha_asignacion'=> now()->toDateString(),
        ]);
    }

    // ── S4-01/02: Configuración de evaluación ─────────────────────────────────

    public function test_admin_crea_configuracion_evaluacion(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/configuraciones-evaluacion', [
                'carrera_id'         => $this->carrera->id,
                'num_parciales'      => 3,
                'calificacion_minima'=> 70,
                'peso_parciales'     => [
                    ['parcial' => 1, 'peso' => 0.3],
                    ['parcial' => 2, 'peso' => 0.3],
                    ['parcial' => 3, 'peso' => 0.4],
                ],
                'creditos_carga_minima'      => 20,
                'creditos_carga_maxima'      => 36,
                'max_especiales_por_periodo' => 2,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.num_parciales', 3)
            ->assertJsonPath('data.calificacion_minima', '70.0');
    }

    public function test_configuracion_evaluacion_pesos_no_suman_1_retorna_422(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/configuraciones-evaluacion', [
                'carrera_id'         => $this->carrera->id,
                'num_parciales'      => 2,
                'calificacion_minima'=> 70,
                'peso_parciales'     => [
                    ['parcial' => 1, 'peso' => 0.3],
                    ['parcial' => 2, 'peso' => 0.5], // suma = 0.8, no 1.0
                ],
            ])
            ->assertStatus(422);
    }

    public function test_admin_puede_obtener_configuracion_por_carrera(): void
    {
        ConfiguracionEvaluacion::create([
            'carrera_id'         => $this->carrera->id,
            'num_parciales'      => 3,
            'calificacion_minima'=> 70,
            'peso_parciales'     => [
                ['parcial' => 1, 'peso' => 0.33],
                ['parcial' => 2, 'peso' => 0.33],
                ['parcial' => 3, 'peso' => 0.34],
            ],
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/configuraciones-evaluacion/{$this->carrera->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.carrera_id', $this->carrera->id);
    }

    // ── S4-01: Captura de calificaciones ────────────────────────────────────────

    public function test_docente_captura_calificaciones(): void
    {
        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/calificaciones', [
                'alumno_id'         => $this->alumno->id,
                'grupo_id'          => $this->grupo->id,
                'parciales'         => [
                    ['parcial' => 1, 'calificacion' => 85],
                    ['parcial' => 2, 'calificacion' => 90],
                    ['parcial' => 3, 'calificacion' => 78],
                ],
                'calificacion_final'=> 84,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.alumno_id', $this->alumno->id);

        $this->assertDatabaseHas('calificaciones', [
            'alumno_id' => $this->alumno->id,
            'grupo_id'  => $this->grupo->id,
        ]);
    }

    public function test_docente_ajeno_no_puede_capturar_calificaciones(): void
    {
        $otroDocente = User::factory()->create();
        $otroDocente->assignRole('docente');

        $this->actingAs($otroDocente, 'sanctum')
            ->postJson('/api/calificaciones', [
                'alumno_id'          => $this->alumno->id,
                'grupo_id'           => $this->grupo->id,
                'calificacion_final' => 75,
            ])
            ->assertStatus(403);
    }

    // ── S4-02: Cálculo de promedio y acreditación ─────────────────────────────

    public function test_promedio_y_acreditado_calculados_correctamente(): void
    {
        // Sin configuracion: promedio simple entre promedio parciales y cal final
        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/calificaciones', [
                'alumno_id'         => $this->alumno->id,
                'grupo_id'          => $this->grupo->id,
                'parciales'         => [
                    ['parcial' => 1, 'calificacion' => 90],
                    ['parcial' => 2, 'calificacion' => 80],
                    ['parcial' => 3, 'calificacion' => 70],
                ],
                'calificacion_final'=> 80,
            ])
            ->assertStatus(201);

        $cal = Calificacion::where('alumno_id', $this->alumno->id)->first();
        $this->assertNotNull($cal->promedio);
        $this->assertNotNull($cal->acreditado);
    }

    public function test_alumno_no_acreditado_con_promedio_bajo(): void
    {
        ConfiguracionEvaluacion::create([
            'carrera_id'         => $this->carrera->id,
            'num_parciales'      => 3,
            'calificacion_minima'=> 70,
            'peso_parciales'     => [
                ['parcial' => 1, 'peso' => 0.3],
                ['parcial' => 2, 'peso' => 0.3],
                ['parcial' => 3, 'peso' => 0.4],
            ],
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/calificaciones', [
                'alumno_id'         => $this->alumno->id,
                'grupo_id'          => $this->grupo->id,
                'parciales'         => [
                    ['parcial' => 1, 'calificacion' => 50],
                    ['parcial' => 2, 'calificacion' => 55],
                    ['parcial' => 3, 'calificacion' => 45],
                ],
                'calificacion_final'=> 40,
            ])
            ->assertStatus(201);

        $cal = Calificacion::where('alumno_id', $this->alumno->id)->first();
        $this->assertFalse($cal->acreditado);
    }

    // ── S4-04: Cierre de curso ──────────────────────────────────────────────────

    public function test_admin_cierra_curso(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/cierres-de-curso', [
                'grupo_id'  => $this->grupo->id,
                'periodo_id'=> $this->periodo->id,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.grupo_id', $this->grupo->id);

        $this->assertDatabaseHas('cierres_de_curso', [
            'grupo_id'   => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
        ]);
    }

    public function test_cierre_duplicado_retorna_422(): void
    {
        CierreDeCurso::create([
            'grupo_id'    => $this->grupo->id,
            'periodo_id'  => $this->periodo->id,
            'cerrado_por' => $this->admin->id,
            'fecha_cierre'=> now(),
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/cierres-de-curso', [
                'grupo_id'  => $this->grupo->id,
                'periodo_id'=> $this->periodo->id,
            ])
            ->assertStatus(422);
    }

    public function test_calificacion_bloqueada_tras_cierre(): void
    {
        CierreDeCurso::create([
            'grupo_id'    => $this->grupo->id,
            'periodo_id'  => $this->periodo->id,
            'cerrado_por' => $this->admin->id,
            'fecha_cierre'=> now(),
        ]);

        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/calificaciones', [
                'alumno_id'          => $this->alumno->id,
                'grupo_id'           => $this->grupo->id,
                'calificacion_final' => 90,
            ])
            ->assertStatus(422);
    }

    public function test_docente_no_puede_cerrar_curso(): void
    {
        $this->actingAs($this->docente, 'sanctum')
            ->postJson('/api/cierres-de-curso', [
                'grupo_id'  => $this->grupo->id,
                'periodo_id'=> $this->periodo->id,
            ])
            ->assertStatus(403);
    }

    // ── S4-06: Clasificación automática y alerta baja definitiva ──────────────

    public function test_cierre_genera_alerta_baja_definitiva_en_tercer_intento(): void
    {
        // Simular alumno que ya reprobó 2 veces (intento 3 = especial)
        // Registrar calificación con tipo_curso=especial y acreditado=false
        Calificacion::create([
            'alumno_id'          => $this->alumno->id,
            'grupo_id'           => $this->grupo->id,
            'parciales'          => [],
            'calificacion_final' => 40,
            'promedio'           => 40,
            'acreditado'         => false,
            'tipo_curso'         => 'especial',
            'intento_numero'     => 3,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/cierres-de-curso', [
                'grupo_id'  => $this->grupo->id,
                'periodo_id'=> $this->periodo->id,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('alertas_baja_definitiva', [
            'alumno_id' => $this->alumno->id,
            'grupo_id'  => $this->grupo->id,
        ]);
    }

    public function test_cierre_no_genera_alerta_si_alumno_acredita(): void
    {
        Calificacion::create([
            'alumno_id'          => $this->alumno->id,
            'grupo_id'           => $this->grupo->id,
            'parciales'          => [],
            'calificacion_final' => 85,
            'promedio'           => 85,
            'acreditado'         => true,
            'tipo_curso'         => 'ordinario',
            'intento_numero'     => 1,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/cierres-de-curso', [
                'grupo_id'  => $this->grupo->id,
                'periodo_id'=> $this->periodo->id,
            ])
            ->assertStatus(201);

        $this->assertDatabaseCount('alertas_baja_definitiva', 0);
    }

    // ── S4-07: Acta de calificaciones ────────────────────────────────────────────

    public function test_admin_obtiene_lista_calificaciones_del_grupo(): void
    {
        Calificacion::create([
            'alumno_id'          => $this->alumno->id,
            'grupo_id'           => $this->grupo->id,
            'calificacion_final' => 85,
            'promedio'           => 85,
            'acreditado'         => true,
            'tipo_curso'         => 'ordinario',
            'intento_numero'     => 1,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/grupos/{$this->grupo->id}/calificaciones")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_firma_acta_calificaciones(): void
    {
        // Crear el acta antes de firmar
        \App\Domains\Academico\Models\ActaCalificaciones::create([
            'grupo_id'   => $this->grupo->id,
            'periodo_id' => $this->periodo->id,
            'docente_id' => $this->docente->id,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/grupos/{$this->grupo->id}/acta-calificaciones/firmar")
            ->assertStatus(200)
            ->assertJsonPath('data.firmada', true)
            ->assertJsonPath('data.integrada_libro_actas', true);
    }

    public function test_firmar_acta_dos_veces_retorna_422(): void
    {
        \App\Domains\Academico\Models\ActaCalificaciones::create([
            'grupo_id'               => $this->grupo->id,
            'periodo_id'             => $this->periodo->id,
            'docente_id'             => $this->docente->id,
            'firmada'                => true,
            'fecha_firma'            => now()->toDateString(),
            'firmada_por'            => $this->admin->id,
            'integrada_libro_actas'  => true,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/grupos/{$this->grupo->id}/acta-calificaciones/firmar")
            ->assertStatus(422);
    }

    // ── S4-07: Alertas de baja definitiva ────────────────────────────────────

    public function test_admin_puede_ver_alertas_baja_definitiva(): void
    {
        AlertaBajaDefinitiva::create([
            'alumno_id'      => $this->alumno->id,
            'grupo_id'       => $this->grupo->id,
            'periodo_id'     => $this->periodo->id,
            'materia_nombre' => 'Fundamentos de Programación',
            'intento_numero' => 3,
            'revisada'       => false,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/alertas-baja-definitiva')
            ->assertStatus(200)
            ->assertJsonPath('data.data.0.alumno_id', $this->alumno->id);
    }

    public function test_alertas_filtrables_por_revisada(): void
    {
        AlertaBajaDefinitiva::create([
            'alumno_id'      => $this->alumno->id,
            'grupo_id'       => $this->grupo->id,
            'periodo_id'     => $this->periodo->id,
            'materia_nombre' => 'Fundamentos de Programación',
            'intento_numero' => 3,
            'revisada'       => false,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/alertas-baja-definitiva?revisada=0')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.data');

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/alertas-baja-definitiva?revisada=1')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data.data');
    }

    public function test_admin_puede_marcar_alerta_como_revisada(): void
    {
        $alerta = AlertaBajaDefinitiva::create([
            'alumno_id'      => $this->alumno->id,
            'grupo_id'       => $this->grupo->id,
            'periodo_id'     => $this->periodo->id,
            'materia_nombre' => 'Fundamentos de Programación',
            'intento_numero' => 3,
            'revisada'       => false,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/alertas-baja-definitiva/{$alerta->id}/revisar")
            ->assertStatus(200)
            ->assertJsonPath('data.revisada', true);

        $this->assertDatabaseHas('alertas_baja_definitiva', [
            'id'      => $alerta->id,
            'revisada'=> true,
        ]);
    }

    public function test_revisar_alerta_ya_revisada_retorna_422(): void
    {
        $alerta = AlertaBajaDefinitiva::create([
            'alumno_id'      => $this->alumno->id,
            'grupo_id'       => $this->grupo->id,
            'periodo_id'     => $this->periodo->id,
            'materia_nombre' => 'Fundamentos de Programación',
            'intento_numero' => 3,
            'revisada'       => true,
            'revisada_por'   => $this->admin->id,
            'revisada_en'    => now(),
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/alertas-baja-definitiva/{$alerta->id}/revisar")
            ->assertStatus(422);
    }

    public function test_alumno_no_puede_ver_alertas(): void
    {
        $alumnoUser = User::factory()->create();
        $alumnoUser->assignRole('alumno');

        $this->actingAs($alumnoUser, 'sanctum')
            ->getJson('/api/alertas-baja-definitiva')
            ->assertStatus(403);
    }
}
