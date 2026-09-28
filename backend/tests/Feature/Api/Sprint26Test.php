<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Academico\Models\TicketMantenimiento;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Cubre las cuatro features de la sesión "agrega las cuatro" (aula fantasma,
 * reubicación automática, salud del semestre, modo día de examen) más las dos
 * de la ronda siguiente (deserción temprana, mantenimiento de aulas) — ninguna
 * tenía test automatizado, solo verificación manual vía tinker/navegador.
 */
class Sprint26Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docente;
    private Carrera $carrera;
    private Periodo $periodo;
    private Grupo $grupo;
    private Materia $materia;
    private Aula $aulaOrigen;
    private Aula $aulaLibre;
    private User $alumnoUser;
    private Alumno $alumno;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s26@test.com']);
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create(['email' => 'doc.s26@test.com']);
        $this->docente->assignRole('docente');

        $this->carrera = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC26',
            'codigo_it' => 'ITSM-ISC26', 'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => '2025-01-06', 'fecha_fin' => '2025-06-15', 'activo' => true,
        ]);

        $this->materia = Materia::create([
            'nombre' => 'Algoritmos', 'clave' => 'ALG26S', 'carrera_id' => $this->carrera->id,
            'semestre' => 1, 'creditos' => 5,
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'A', 'semestre' => 1, 'turno' => 'matutino',
        ]);

        $this->aulaOrigen = Aula::create(['nombre' => 'Lab 1', 'capacidad' => 25, 'tipo' => 'laboratorio', 'activa' => true]);
        $this->aulaLibre  = Aula::create(['nombre' => 'Lab 2', 'capacidad' => 30, 'tipo' => 'laboratorio', 'activa' => true]);

        $this->alumnoUser = User::factory()->create(['email' => 'alu.s26@test.com']);
        $this->alumnoUser->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres' => 'Ana', 'apellido_paterno' => 'Ruiz', 'apellido_materno' => 'Soto',
            'email' => 'ana.s26@test.com', 'telefono' => '1234567890', 'curp' => 'RUSA010101MVZZOA01',
            'fecha_nacimiento' => '2001-01-01', 'sexo' => 'femenino', 'municipio_procedencia' => 'MT',
            'escuela_bachillerato' => 'CBTIS', 'promedio_bachillerato' => 88.0, 'turno_preferido' => 'matutino',
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id, 'numero_ficha' => 'S26-0001',
        ]);
        $inscripcion = Inscripcion::create([
            'aspirante_id' => $aspirante->id, 'numero_control' => '25ISC26S01',
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id, 'fecha_inscripcion' => '2025-01-06',
        ]);
        $this->alumno = Alumno::create([
            'user_id' => $this->alumnoUser->id, 'inscripcion_id' => $inscripcion->id,
            'numero_control' => '25ISC26S01', 'carrera_id' => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id, 'semestre_actual' => 1, 'estatus' => 'activo',
        ]);
        \DB::table('alumno_grupo')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(), 'grupo_id' => $this->grupo->id,
            'alumno_id' => $this->alumno->id, 'fecha_asignacion' => '2025-01-06', 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function crearCargaConHorario(Aula $aula): CargaAcademica
    {
        $carga = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materia->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $aula->id, 'horas_semana' => 4,
        ]);
        $carga->grupos()->attach($this->grupo->id);
        Horario::create([
            'carga_academica_id' => $carga->id, 'dia_semana' => 'lunes',
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);

        return $carga;
    }

    // ── Aula fantasma ────────────────────────────────────────────────────────

    public function test_detecta_aula_fantasma_con_dos_o_mas_discrepancias(): void
    {
        $carga = $this->crearCargaConHorario($this->aulaOrigen);

        foreach (['aula_vacia', 'grupo_incorrecto'] as $estatus) {
            IncidenciaClase::create([
                'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
                'carga_academica_id' => $carga->id, 'docente_id' => $this->docente->id,
                'aula_id' => $this->aulaOrigen->id, 'registrado_por_id' => $this->admin->id,
                'fecha' => '2025-02-10', 'hora_revision' => '08:00', 'estatus' => $estatus,
            ]);
        }

        $r = $this->actingAs($this->admin)->getJson("/api/aulas/fantasma?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $data = $r->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('Lab 1', $data[0]['aula']);
        $this->assertSame(2, $data[0]['total_discrepancias']);
    }

    public function test_no_reporta_aula_fantasma_con_una_sola_discrepancia(): void
    {
        $carga = $this->crearCargaConHorario($this->aulaOrigen);
        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'carga_academica_id' => $carga->id, 'aula_id' => $this->aulaOrigen->id,
            'registrado_por_id' => $this->admin->id, 'fecha' => '2025-02-10',
            'hora_revision' => '08:00', 'estatus' => 'aula_vacia',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/aulas/fantasma?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertCount(0, $r->json('data'));
    }

    // ── Reubicación automática ───────────────────────────────────────────────

    public function test_sugiere_aula_libre_del_mismo_tipo_al_reubicar(): void
    {
        $this->crearCargaConHorario($this->aulaOrigen);

        $r = $this->actingAs($this->admin)
            ->getJson("/api/aulas/{$this->aulaOrigen->id}/sugerencias-reubicacion?periodo_id={$this->periodo->id}");

        $r->assertOk();
        $data = $r->json('data');
        $this->assertCount(1, $data);
        $candidatas = collect($data[0]['aulas_candidatas'])->pluck('nombre');
        $this->assertTrue($candidatas->contains('Lab 2'));
    }

    public function test_no_sugiere_aula_ocupada_en_el_mismo_bloque(): void
    {
        $this->crearCargaConHorario($this->aulaOrigen);

        // Otra carga ya usa Lab 2 el mismo día/hora — no debe aparecer como candidata.
        $cargaOcupante = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materia->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $this->aulaLibre->id, 'horas_semana' => 4,
        ]);
        Horario::create([
            'carga_academica_id' => $cargaOcupante->id, 'dia_semana' => 'lunes',
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);

        $r = $this->actingAs($this->admin)
            ->getJson("/api/aulas/{$this->aulaOrigen->id}/sugerencias-reubicacion?periodo_id={$this->periodo->id}");

        $r->assertOk();
        $candidatas = collect($r->json('data.0.aulas_candidatas'))->pluck('nombre');
        $this->assertFalse($candidatas->contains('Lab 2'));
    }

    // ── Salud del semestre ───────────────────────────────────────────────────

    public function test_salud_semestral_calcula_pct_sin_novedad_por_carrera(): void
    {
        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'registrado_por_id' => $this->admin->id, 'fecha' => '2025-02-01',
            'hora_revision' => '08:00', 'estatus' => 'sin_novedad',
        ]);
        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'registrado_por_id' => $this->admin->id, 'fecha' => '2025-02-02',
            'hora_revision' => '08:00', 'estatus' => 'docente_ausente',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/salud-semestral?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $fila = collect($r->json('data'))->firstWhere('carrera_id', $this->carrera->id);
        $this->assertNotNull($fila);
        $this->assertSame(50, $fila['pct_sin_novedad']);
    }

    // ── Modo día de examen ───────────────────────────────────────────────────

    public function test_admin_puede_activar_y_desactivar_modo_examen(): void
    {
        $r = $this->actingAs($this->admin)->postJson('/api/modos-examen', [
            'periodo_id' => $this->periodo->id, 'fecha' => '2025-03-10',
        ]);
        $r->assertStatus(201);
        $this->assertDatabaseHas('modos_examen', ['periodo_id' => $this->periodo->id, 'fecha' => '2025-03-10 00:00:00']);

        $modoId = $r->json('data.id');
        $this->actingAs($this->admin)->deleteJson("/api/modos-examen/{$modoId}")->assertOk();
        $this->assertDatabaseMissing('modos_examen', ['id' => $modoId]);
    }

    public function test_checkin_exige_foto_cuando_modo_examen_esta_activo(): void
    {
        $sesion = SesionClase::create([
            'grupo_id' => $this->grupo->id, 'docente_id' => $this->docente->id,
            'fecha' => '2025-03-10', 'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            'codigo_checkin' => 'ABC123', 'checkin_expira_en' => now()->addHour(),
        ]);

        $this->actingAs($this->admin)->postJson('/api/modos-examen', [
            'periodo_id' => $this->periodo->id, 'fecha' => '2025-03-10',
        ])->assertStatus(201);

        $sinFoto = $this->actingAs($this->alumnoUser)->postJson("/api/sesiones-clase/{$sesion->id}/checkin", [
            'codigo' => 'ABC123',
        ]);
        $sinFoto->assertStatus(422);

        $conFoto = $this->actingAs($this->alumnoUser)->postJson("/api/sesiones-clase/{$sesion->id}/checkin", [
            'codigo' => 'ABC123', 'foto_evidencia' => 'data:image/png;base64,AAAA',
        ]);
        $conFoto->assertOk();
        $this->assertDatabaseHas('asistencias', ['sesion_id' => $sesion->id, 'alumno_id' => $this->alumnoUser->id]);
    }

    public function test_checkin_no_exige_foto_sin_modo_examen_activo(): void
    {
        $sesion = SesionClase::create([
            'grupo_id' => $this->grupo->id, 'docente_id' => $this->docente->id,
            'fecha' => '2025-03-11', 'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            'codigo_checkin' => 'XYZ999', 'checkin_expira_en' => now()->addHour(),
        ]);

        $r = $this->actingAs($this->alumnoUser)->postJson("/api/sesiones-clase/{$sesion->id}/checkin", [
            'codigo' => 'XYZ999',
        ]);
        $r->assertOk();
    }

    // ── Deserción temprana ───────────────────────────────────────────────────

    public function test_detecta_alumno_con_inasistencia_alta_en_ventana_temprana(): void
    {
        $this->periodo->update(['fecha_inicio' => now()->subWeeks(2)->toDateString()]);

        // 4 sesiones en la ventana, el alumno solo asiste a 1 → 75% de inasistencia.
        foreach (range(0, 3) as $i) {
            $sesion = SesionClase::create([
                'grupo_id' => $this->grupo->id, 'docente_id' => $this->docente->id,
                'fecha' => now()->subWeeks(2)->addDays($i * 2)->toDateString(),
                'hora_inicio' => '08:00', 'hora_fin' => '10:00',
            ]);
            if ($i === 0) {
                Asistencia::create(['sesion_id' => $sesion->id, 'alumno_id' => $this->alumnoUser->id, 'estatus' => 'presente']);
            }
        }

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}&semanas=3");
        $r->assertOk();
        $fila = collect($r->json('data'))->firstWhere('alumno_id', $this->alumno->id);
        $this->assertNotNull($fila);
        $this->assertEquals(75.0, $fila['pct_inasistencia_temprana']);
        $this->assertFalse($fila['nunca_asistio']);
    }

    public function test_marca_nunca_asistio_cuando_no_hay_ninguna_presencia(): void
    {
        $this->periodo->update(['fecha_inicio' => now()->subWeeks(2)->toDateString()]);

        SesionClase::create([
            'grupo_id' => $this->grupo->id, 'docente_id' => $this->docente->id,
            'fecha' => now()->subWeeks(2)->toDateString(), 'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}&semanas=3");
        $r->assertOk();
        $fila = collect($r->json('data'))->firstWhere('alumno_id', $this->alumno->id);
        $this->assertNotNull($fila);
        $this->assertTrue($fila['nunca_asistio']);
        $this->assertEquals(100.0, $fila['pct_inasistencia_temprana']);
    }

    public function test_sin_ventana_observada_no_devuelve_alumnos(): void
    {
        // fecha_inicio en el futuro → todavía no hay ventana que evaluar.
        $this->periodo->update(['fecha_inicio' => now()->addMonth()->toDateString()]);

        $r = $this->actingAs($this->admin)->getJson("/api/alertas-desercion-temprana?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertCount(0, $r->json('data'));
    }

    // ── Mantenimiento de aulas ───────────────────────────────────────────────

    public function test_reportar_problema_infraestructura_genera_ticket_automaticamente(): void
    {
        $r = $this->actingAs($this->admin)->postJson('/api/incidencias-clase', [
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'aula_id' => $this->aulaOrigen->id, 'fecha' => '2025-02-10', 'hora_revision' => '09:00',
            'estatus' => 'problema_infraestructura', 'observaciones' => 'Proyector no enciende.',
        ]);
        $r->assertStatus(201);

        $this->assertDatabaseHas('tickets_mantenimiento', [
            'aula_id' => $this->aulaOrigen->id, 'estatus' => 'abierto',
            'descripcion' => 'Proyector no enciende.',
        ]);
    }

    public function test_otros_estatus_de_incidencia_no_generan_ticket(): void
    {
        $this->actingAs($this->admin)->postJson('/api/incidencias-clase', [
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'aula_id' => $this->aulaOrigen->id, 'fecha' => '2025-02-10', 'hora_revision' => '09:00',
            'estatus' => 'aula_vacia',
        ])->assertStatus(201);

        $this->assertDatabaseCount('tickets_mantenimiento', 0);
    }

    public function test_admin_puede_avanzar_y_resolver_un_ticket(): void
    {
        $ticket = TicketMantenimiento::create([
            'aula_id' => $this->aulaOrigen->id, 'reportado_por_id' => $this->admin->id,
            'descripcion' => 'Aire acondicionado descompuesto.', 'estatus' => 'abierto',
        ]);

        $this->actingAs($this->admin)->patchJson("/api/tickets-mantenimiento/{$ticket->id}", [
            'estatus' => 'en_progreso',
        ])->assertOk();
        $this->assertDatabaseHas('tickets_mantenimiento', ['id' => $ticket->id, 'estatus' => 'en_progreso']);

        $resuelto = $this->actingAs($this->admin)->patchJson("/api/tickets-mantenimiento/{$ticket->id}", [
            'estatus' => 'resuelto', 'notas_resolucion' => 'Se reemplazó el capacitor.',
        ]);
        $resuelto->assertOk();
        $resuelto->assertJsonPath('data.notas_resolucion', 'Se reemplazó el capacitor.');
        $this->assertNotNull($ticket->fresh()->resuelto_en);
    }

    public function test_docente_no_puede_gestionar_tickets_de_mantenimiento(): void
    {
        $this->actingAs($this->docente)->getJson('/api/tickets-mantenimiento')->assertStatus(403);
    }
}
