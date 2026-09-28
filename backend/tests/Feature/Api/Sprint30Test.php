<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Permanencia\Models\Baja;
use App\Mail\BajaIniciadaDesdeAlertaMail;
use App\Mail\BajaResueltaMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Cobertura para las dos piezas nuevas del módulo de Permanencia: convertir una
 * alerta de riesgo/deserción en un trámite de baja (BajaController::iniciarDesdeRiesgo)
 * y el reporte agregado de altas/bajas por carrera (ReportePermanenciaController).
 */
class Sprint30Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $jefeCarrera;
    private User $docente;
    private Carrera $carreraPropia;
    private Carrera $carreraAjena;
    private Periodo $periodo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s30@test.com']);
        $this->admin->assignRole('admin');

        $this->carreraPropia = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC30',
            'codigo_it' => 'ITSM-ISC30', 'vigente' => true, 'duracion_semestres' => 9,
        ]);
        $this->carreraAjena = Carrera::create([
            'nombre' => 'Ingeniería Industrial', 'clave' => 'IND30',
            'codigo_it' => 'ITSM-IND30', 'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->jefeCarrera = User::factory()->create(['email' => 'jefe.s30@test.com', 'carrera_id' => $this->carreraPropia->id]);
        $this->jefeCarrera->assignRole('jefe_carrera');

        $this->docente = User::factory()->create(['email' => 'doc.s30@test.com']);
        $this->docente->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => now()->subWeeks(4)->toDateString(),
            'fecha_fin' => now()->addMonths(3)->toDateString(), 'activo' => true,
        ]);
    }

    private function crearAlumno(Carrera $carrera, ?Periodo $periodoIngreso = null): Alumno
    {
        $alumnoUser = User::factory()->create(['email' => 'alu' . uniqid() . '.s30@test.com']);
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

        return Alumno::create([
            'user_id' => $alumnoUser->id, 'inscripcion_id' => $inscripcion->id,
            'numero_control' => $inscripcion->numero_control, 'carrera_id' => $carrera->id,
            'periodo_ingreso_id' => ($periodoIngreso ?? $this->periodo)->id, 'semestre_actual' => 1,
        ]);
    }

    // ══════════════════════════ iniciarDesdeRiesgo ═══════════════════════════════

    public function test_docente_no_puede_iniciar_tramite_de_baja(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);

        $this->actingAs($this->docente)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'riesgo_academico',
        ])->assertStatus(403);
    }

    public function test_admin_inicia_tramite_de_baja_desde_alerta_queda_pendiente(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);

        $r = $this->actingAs($this->admin)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'desercion_temprana', 'contexto_alerta' => 'Score 80 (alto).',
        ]);
        $r->assertStatus(201);
        $r->assertJsonPath('data.estatus', 'pendiente');
        $r->assertJsonPath('data.tipo_baja', 'temporal');

        $this->assertDatabaseHas('bajas', ['alumno_id' => $alumno->id, 'estatus' => 'pendiente']);
        // No debe tocar el estatus del alumno todavía — falta aprobación.
        $this->assertSame('activo', $alumno->fresh()->estatus);
    }

    public function test_no_permite_dos_tramites_activos_para_el_mismo_alumno_y_periodo(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);
        $payload = ['alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id, 'tipo_alerta' => 'riesgo_academico'];

        $this->actingAs($this->admin)->postJson('/api/bajas/iniciar-desde-riesgo', $payload)->assertStatus(201);
        $this->actingAs($this->admin)->postJson('/api/bajas/iniciar-desde-riesgo', $payload)->assertStatus(422);
    }

    public function test_tramite_iniciado_puede_aprobarse_con_el_flujo_existente(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);

        $r = $this->actingAs($this->admin)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'riesgo_academico', 'tipo_baja' => 'temporal',
        ]);
        $bajaId = $r->json('data.id');

        $this->actingAs($this->admin)->patchJson("/api/bajas/{$bajaId}/estatus", ['estatus' => 'aprobada'])->assertOk();

        $this->assertSame('baja_temporal', $alumno->fresh()->estatus);
    }

    public function test_jefe_carrera_no_puede_iniciar_tramite_para_alumno_de_otra_carrera(): void
    {
        $alumnoAjeno = $this->crearAlumno($this->carreraAjena);

        $this->actingAs($this->jefeCarrera)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumnoAjeno->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'riesgo_academico',
        ])->assertStatus(403);
    }

    public function test_jefe_carrera_puede_iniciar_tramite_para_alumno_de_su_carrera(): void
    {
        $alumnoPropio = $this->crearAlumno($this->carreraPropia);

        $this->actingAs($this->jefeCarrera)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumnoPropio->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'riesgo_academico',
        ])->assertStatus(201);
    }

    public function test_iniciar_desde_riesgo_notifica_por_correo_al_alumno(): void
    {
        Mail::fake();
        $alumno = $this->crearAlumno($this->carreraPropia);

        $this->actingAs($this->admin)->postJson('/api/bajas/iniciar-desde-riesgo', [
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_alerta' => 'riesgo_academico',
        ])->assertStatus(201);

        Mail::assertQueued(BajaIniciadaDesdeAlertaMail::class, fn ($mail) => $mail->baja->alumno_id === $alumno->id);
    }

    public function test_aprobar_baja_notifica_por_correo_al_alumno(): void
    {
        Mail::fake();
        $alumno = $this->crearAlumno($this->carreraPropia);
        $baja = Baja::create([
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->patchJson("/api/bajas/{$baja->id}/estatus", ['estatus' => 'aprobada'])->assertOk();

        Mail::assertQueued(BajaResueltaMail::class, fn ($mail) => $mail->baja->id === $baja->id && $mail->baja->estatus === 'aprobada');
    }

    public function test_rechazar_baja_notifica_por_correo_con_motivo(): void
    {
        Mail::fake();
        $alumno = $this->crearAlumno($this->carreraPropia);
        $baja = Baja::create([
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->patchJson("/api/bajas/{$baja->id}/estatus", [
            'estatus' => 'rechazada', 'motivo_rechazo' => 'Documentación incompleta.',
        ])->assertOk();

        Mail::assertQueued(BajaResueltaMail::class, fn ($mail) => $mail->baja->estatus === 'rechazada' && $mail->baja->motivo_rechazo === 'Documentación incompleta.');
    }

    public function test_show_devuelve_detalle_y_otras_bajas_del_alumno(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);

        $bajaAnterior = Baja::create([
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'aprobada',
            'fecha_solicitud' => now()->subMonths(6)->toDateString(), 'registrada_por' => $this->admin->id,
        ]);
        $bajaActual = Baja::create([
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'definitiva', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/bajas/{$bajaActual->id}");
        $r->assertOk();
        $r->assertJsonPath('data.baja.id', $bajaActual->id);
        $r->assertJsonPath('data.baja.alumno.numero_control', $alumno->numero_control);

        $otrasIds = collect($r->json('data.otras_bajas_del_alumno'))->pluck('id');
        $this->assertTrue($otrasIds->contains($bajaAnterior->id));
        $this->assertFalse($otrasIds->contains($bajaActual->id));
    }

    public function test_jefe_carrera_no_puede_ver_detalle_de_baja_de_otra_carrera(): void
    {
        $alumnoAjeno = $this->crearAlumno($this->carreraAjena);
        $baja = Baja::create([
            'alumno_id' => $alumnoAjeno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $this->actingAs($this->jefeCarrera)->getJson("/api/bajas/{$baja->id}")->assertStatus(403);
    }

    public function test_index_de_bajas_filtra_por_estatus(): void
    {
        $alumnoPendiente = $this->crearAlumno($this->carreraPropia);
        $alumnoAprobado = $this->crearAlumno($this->carreraPropia);

        Baja::create([
            'alumno_id' => $alumnoPendiente->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);
        Baja::create([
            'alumno_id' => $alumnoAprobado->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'definitiva', 'estatus' => 'aprobada',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $r = $this->actingAs($this->admin)->getJson('/api/bajas?estatus=pendiente');
        $r->assertOk();
        $ids = collect($r->json('data.data'))->pluck('alumno_id');
        $this->assertTrue($ids->contains($alumnoPendiente->id));
        $this->assertFalse($ids->contains($alumnoAprobado->id));
    }

    // ══════════════════════════ Reporte altas/bajas ══════════════════════════════

    public function test_reporte_altas_bajas_requiere_periodo_id(): void
    {
        $this->actingAs($this->admin)->getJson('/api/reportes/altas-bajas')->assertStatus(422);
    }

    public function test_docente_no_puede_ver_reporte_altas_bajas(): void
    {
        $this->actingAs($this->docente)
            ->getJson("/api/reportes/altas-bajas?periodo_id={$this->periodo->id}")
            ->assertStatus(403);
    }

    public function test_reporte_cuenta_altas_de_nuevo_ingreso_y_bajas_por_tipo(): void
    {
        $this->crearAlumno($this->carreraPropia);
        $this->crearAlumno($this->carreraPropia);
        $alumnoBaja = $this->crearAlumno($this->carreraPropia);

        Baja::create([
            'alumno_id' => $alumnoBaja->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'definitiva', 'estatus' => 'aprobada',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);
        // Una baja rechazada no debe contar.
        $otroAlumno = $this->crearAlumno($this->carreraPropia);
        Baja::create([
            'alumno_id' => $otroAlumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'rechazada',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/reportes/altas-bajas?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $fila = collect($r->json('data.carreras'))->firstWhere('carrera_id', $this->carreraPropia->id);
        $this->assertNotNull($fila);
        $this->assertSame(4, $fila['altas']['nuevo_ingreso']); // 3 + el de la baja rechazada
        $this->assertSame(1, $fila['bajas']['definitiva']);
        $this->assertSame(0, $fila['bajas']['temporal']); // la rechazada no cuenta
        $this->assertSame(4 - 1, $fila['saldo_neto']);
    }

    public function test_reporte_cuenta_reingresos_dentro_de_la_ventana_del_periodo(): void
    {
        $alumno = $this->crearAlumno($this->carreraPropia);

        $baja = Baja::create([
            'alumno_id' => $alumno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'aprobada',
            'fecha_solicitud' => now()->subWeeks(3)->toDateString(),
            'registrada_por' => $this->admin->id, 'reingreso_posible' => true,
        ]);
        $alumno->update(['estatus' => 'baja_temporal']);

        $this->actingAs($this->admin)->patchJson("/api/bajas/{$baja->id}/reingreso")->assertOk();

        $r = $this->actingAs($this->admin)->getJson("/api/reportes/altas-bajas?periodo_id={$this->periodo->id}");
        $fila = collect($r->json('data.carreras'))->firstWhere('carrera_id', $this->carreraPropia->id);
        $this->assertSame(1, $fila['altas']['reingreso']);
    }

    public function test_reporte_pdf_se_genera_correctamente(): void
    {
        $r = $this->actingAs($this->admin)->get("/api/reportes/altas-bajas/pdf?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $r->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_contador_de_pendientes_cuenta_solo_estatus_pendiente(): void
    {
        $alumno1 = $this->crearAlumno($this->carreraPropia);
        $alumno2 = $this->crearAlumno($this->carreraPropia);

        Baja::create([
            'alumno_id' => $alumno1->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);
        Baja::create([
            'alumno_id' => $alumno2->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'definitiva', 'estatus' => 'aprobada',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $r = $this->actingAs($this->admin)->getJson('/api/bajas/contador-pendientes');
        $r->assertOk();
        $r->assertJsonPath('data.total', 1);
    }

    public function test_contador_de_pendientes_respeta_scoping_de_carrera(): void
    {
        $alumnoAjeno = $this->crearAlumno($this->carreraAjena);
        Baja::create([
            'alumno_id' => $alumnoAjeno->id, 'periodo_id' => $this->periodo->id,
            'tipo_baja' => 'temporal', 'estatus' => 'pendiente',
            'fecha_solicitud' => now()->toDateString(), 'registrada_por' => $this->admin->id,
        ]);

        $r = $this->actingAs($this->jefeCarrera)->getJson('/api/bajas/contador-pendientes');
        $r->assertOk();
        $r->assertJsonPath('data.total', 0);
    }

    public function test_jefe_carrera_solo_ve_su_propia_carrera_en_reporte_altas_bajas(): void
    {
        $this->crearAlumno($this->carreraPropia);
        $this->crearAlumno($this->carreraAjena);

        $r = $this->actingAs($this->jefeCarrera)->getJson("/api/reportes/altas-bajas?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $ids = collect($r->json('data.carreras'))->pluck('carrera_id');
        $this->assertTrue($ids->contains($this->carreraPropia->id));
        $this->assertFalse($ids->contains($this->carreraAjena->id));
    }
}
