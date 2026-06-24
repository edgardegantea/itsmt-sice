<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Models\Constancia;
use App\Domains\Permanencia\Models\OrdenReinscripcion;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Mail\BajaSolicitadaMail;
use App\Mail\ConstanciaSolicitadaMail;
use App\Mail\OrdenReinscripcionPublicadaMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint2Test extends TestCase
{
    use RefreshDatabase;

    private User    $admin;
    private User    $userAlumno;
    private Alumno  $alumno;
    private Periodo $periodo;
    private Carrera $carrera;

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
            'nombre'                    => 'Ago-Dic 2026',
            'fecha_inicio'              => '2026-08-17',
            'fecha_fin'                 => '2026-12-19',
            'activo'                    => true,
            'tipo'                      => 'ordinario',
            'fecha_limite_baja_parcial' => '2026-09-05',
            'fecha_limite_baja_temporal'=> '2026-09-12',
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->userAlumno = User::factory()->create([
            'email' => '26006-0001@alumnos.itsmt.edu.mx',
        ]);
        $this->userAlumno->assignRole('alumno');

        $aspirante = Aspirante::create([
            'nombres'               => 'María',
            'apellido_paterno'      => 'López',
            'curp'                  => 'LOPM001010MVZRNA00',
            'fecha_nacimiento'      => '2000-10-10',
            'sexo'                  => 'femenino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTis 76',
            'promedio_bachillerato' => 9.2,
            'turno_preferido'       => 'matutino',
            'email'                 => 'maria.lopez@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'     => $aspirante->id,
            'numero_control'   => '26006-0001',
            'carrera_id'       => $this->carrera->id,
            'periodo_id'       => $this->periodo->id,
            'semestre_ingreso' => 1,
            'fecha_inscripcion'=> '2026-08-17',
        ]);

        $this->alumno = Alumno::create([
            'user_id'            => $this->userAlumno->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => '26006-0001',
            'carrera_id'         => $this->carrera->id,
            'periodo_ingreso_id' => $this->periodo->id,
            'semestre_actual'    => 1,
            'estatus'            => 'activo',
        ]);
    }

    // ── Reinscripciones ──────────────────────────────────────────────────────

    public function test_alumno_solicita_reinscripcion_sin_adeudos(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(201)
            ->assertJsonPath('data.estatus', 'pendiente')
            ->assertJsonPath('data.alumno_id', $this->alumno->id);
    }

    public function test_alumno_no_puede_reinscribirse_dos_veces_en_el_mismo_periodo(): void
    {
        Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'pendiente',
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(422);
    }

    public function test_admin_lista_reinscripciones(): void
    {
        Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'pendiente',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reinscripciones');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['data']]);
    }

    public function test_admin_aprueba_reinscripcion(): void
    {
        $reinscripcion = Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'pendiente',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/reinscripciones/{$reinscripcion->id}/estatus", [
                'estatus'       => 'aprobada',
                'observaciones' => 'Todo en orden.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.estatus', 'aprobada');
    }

    public function test_admin_rechaza_reinscripcion_con_observacion(): void
    {
        $reinscripcion = Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'pendiente',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/reinscripciones/{$reinscripcion->id}/estatus", [
                'estatus'       => 'rechazada',
                'observaciones' => 'Adeudo pendiente.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.estatus', 'rechazada');
    }

    public function test_admin_registra_resello_de_credencial(): void
    {
        $reinscripcion = Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'aprobada',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/reinscripciones/{$reinscripcion->id}/resello-credencial", []);

        $response->assertStatus(200)
            ->assertJsonPath('data.resello_registrado', true);
    }

    public function test_alumno_no_puede_aprobar_reinscripciones(): void
    {
        $reinscripcion = Reinscripcion::create([
            'alumno_id'  => $this->alumno->id,
            'periodo_id' => $this->periodo->id,
            'estatus'    => 'pendiente',
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->patchJson("/api/reinscripciones/{$reinscripcion->id}/estatus", [
                'estatus' => 'aprobada',
            ]);

        $response->assertStatus(403);
    }

    // ── Adeudos ──────────────────────────────────────────────────────────────

    public function test_admin_consulta_adeudos_de_alumno(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/alumnos/{$this->alumno->id}/adeudos");

        $response->assertStatus(200);
    }

    // ── Bajas ─────────────────────────────────────────────────────────────────

    public function test_alumno_solicita_baja_temporal_dentro_de_plazo(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/bajas/solicitar', [
                'periodo_id'      => $this->periodo->id,
                'fecha_solicitud' => '2026-09-01',
                'motivo_texto'    => 'Motivo personal.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.tipo_baja', 'temporal');
    }

    public function test_alumno_no_puede_solicitar_baja_fuera_de_plazo(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/bajas/solicitar', [
                'periodo_id'      => $this->periodo->id,
                'fecha_solicitud' => '2026-10-01', // después del límite (2026-09-12)
            ]);

        $response->assertStatus(422);
    }

    public function test_admin_registra_baja_definitiva(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/bajas', [
                'alumno_id'                 => $this->alumno->id,
                'periodo_id'                => $this->periodo->id,
                'tipo_baja'                 => 'definitiva',
                'motivo_texto'              => 'Abandono de estudios.',
                'fecha_solicitud'           => '2026-10-15',
                'numero_semestres_cursados' => 2,
                'reingreso_posible'         => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.tipo_baja', 'definitiva');

        $this->assertDatabaseHas('bajas', [
            'alumno_id' => $this->alumno->id,
            'tipo_baja' => 'definitiva',
        ]);

        $this->assertDatabaseHas('alumnos', [
            'id'     => $this->alumno->id,
            'estatus'=> 'baja_definitiva',
        ]);
    }

    public function test_admin_lista_bajas(): void
    {
        Baja::create([
            'alumno_id'       => $this->alumno->id,
            'periodo_id'      => $this->periodo->id,
            'tipo_baja'       => 'temporal',
            'fecha_solicitud' => '2026-09-01',
            'registrada_por'  => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/bajas');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['data']]);
    }

    public function test_alumno_no_puede_registrar_baja_de_otro_alumno(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/bajas', [
                'alumno_id'       => $this->alumno->id,
                'periodo_id'      => $this->periodo->id,
                'tipo_baja'       => 'temporal',
                'fecha_solicitud' => '2026-09-01',
            ]);

        $response->assertStatus(403);
    }

    // ── Constancias ───────────────────────────────────────────────────────────

    public function test_alumno_solicita_constancia_de_estudios(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/constancias', ['tipo' => 'estudios']);

        $response->assertStatus(201)
            ->assertJsonPath('data.tipo', 'estudios')
            ->assertJsonPath('data.estatus', 'solicitada')
            ->assertJsonStructure(['data' => ['folio_unico']]);
    }

    public function test_constancia_genera_folio_unico(): void
    {
        $r1 = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/constancias', ['tipo' => 'estudios']);
        $r2 = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/constancias', ['tipo' => 'inscripcion']);

        $this->assertNotEquals(
            $r1->json('data.folio_unico'),
            $r2->json('data.folio_unico')
        );
    }

    public function test_admin_emite_constancia(): void
    {
        $constancia = Constancia::create([
            'alumno_id'      => $this->alumno->id,
            'tipo'           => 'estudios',
            'folio_unico'    => 'CONST-2026-0001',
            'estatus'        => 'solicitada',
            'solicitada_por' => $this->userAlumno->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/constancias/{$constancia->id}/emitir", []);

        $response->assertStatus(200)
            ->assertJsonPath('data.estatus', 'emitida');
    }

    public function test_alumno_lista_sus_constancias(): void
    {
        Constancia::create([
            'alumno_id'      => $this->alumno->id,
            'tipo'           => 'calificaciones',
            'folio_unico'    => 'CONST-2026-0002',
            'estatus'        => 'solicitada',
            'solicitada_por' => $this->userAlumno->id,
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->getJson("/api/alumnos/{$this->alumno->id}/constancias");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_lista_todas_las_constancias(): void
    {
        Constancia::create([
            'alumno_id'      => $this->alumno->id,
            'tipo'           => 'inscripcion',
            'folio_unico'    => 'CONST-2026-0003',
            'estatus'        => 'emitida',
            'solicitada_por' => $this->userAlumno->id,
            'emitida_por'    => $this->admin->id,
            'emitida_en'     => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/constancias');

        $response->assertStatus(200);
    }

    // ── Orden de Reinscripción ─────────────────────────────────────────────────

    public function test_admin_publica_orden_de_reinscripcion(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/orden-reinscripcion', [
                'periodo_id'                  => $this->periodo->id,
                'carrera_id'                  => $this->carrera->id,
                'semestre'                    => 3,
                'fecha_inicio_reinscripcion'  => '2026-07-20',
                'fecha_fin_reinscripcion'     => '2026-08-05',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.semestre', 3)
            ->assertJsonPath('data.carrera_id', $this->carrera->id);
    }

    public function test_consultar_orden_de_reinscripcion_por_periodo(): void
    {
        \App\Domains\Permanencia\Models\OrdenReinscripcion::create([
            'periodo_id'                 => $this->periodo->id,
            'carrera_id'                 => $this->carrera->id,
            'semestre'                   => 1,
            'fecha_inicio_reinscripcion' => '2026-07-20',
            'fecha_fin_reinscripcion'    => '2026-08-05',
            'publicado'                  => true,
            'publicado_por'              => $this->admin->id,
            'publicado_en'               => now(),
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->getJson("/api/orden-reinscripcion/{$this->periodo->id}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_alumno_no_puede_publicar_orden_de_reinscripcion(): void
    {
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/orden-reinscripcion', [
                'periodo_id'                 => $this->periodo->id,
                'carrera_id'                 => $this->carrera->id,
                'semestre'                   => 1,
                'fecha_inicio_reinscripcion' => '2026-07-20',
                'fecha_fin_reinscripcion'    => '2026-08-05',
            ]);

        $response->assertStatus(403);
    }

    // ── Validación ventana Orden de Reinscripción (S2-07) ────────────────────

    public function test_alumno_no_puede_reinscribirse_antes_de_la_ventana_publicada(): void
    {
        OrdenReinscripcion::create([
            'periodo_id'                 => $this->periodo->id,
            'carrera_id'                 => $this->carrera->id,
            'semestre'                   => 1, // semestre_actual del alumno
            'fecha_inicio_reinscripcion' => now()->addDays(10)->toDateString(),
            'fecha_fin_reinscripcion'    => now()->addDays(20)->toDateString(),
            'publicado'                  => true,
            'publicado_por'              => $this->admin->id,
            'publicado_en'               => now(),
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(422)
            ->assertJsonFragment(['status' => 422]);
    }

    public function test_alumno_no_puede_reinscribirse_despues_de_la_ventana_publicada(): void
    {
        OrdenReinscripcion::create([
            'periodo_id'                 => $this->periodo->id,
            'carrera_id'                 => $this->carrera->id,
            'semestre'                   => 1,
            'fecha_inicio_reinscripcion' => now()->subDays(20)->toDateString(),
            'fecha_fin_reinscripcion'    => now()->subDays(5)->toDateString(),
            'publicado'                  => true,
            'publicado_por'              => $this->admin->id,
            'publicado_en'               => now()->subDays(25),
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(422);
    }

    public function test_alumno_puede_reinscribirse_dentro_de_la_ventana_publicada(): void
    {
        OrdenReinscripcion::create([
            'periodo_id'                 => $this->periodo->id,
            'carrera_id'                 => $this->carrera->id,
            'semestre'                   => 1,
            'fecha_inicio_reinscripcion' => now()->subDays(2)->toDateString(),
            'fecha_fin_reinscripcion'    => now()->addDays(10)->toDateString(),
            'publicado'                  => true,
            'publicado_por'              => $this->admin->id,
            'publicado_en'               => now()->subDays(7),
        ]);

        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(201);
    }

    public function test_alumno_puede_reinscribirse_sin_orden_publicado(): void
    {
        // Si no hay orden publicado, no se bloquea (orden opcional)
        $response = $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id]);

        $response->assertStatus(201);
    }

    // ── Correos (S2-03, S2-06, S2-07) ────────────────────────────────────────

    public function test_solicitar_constancia_envia_correo_a_control_escolar(): void
    {
        Mail::fake();

        $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/constancias', ['tipo' => 'estudios'])
            ->assertStatus(201);

        // Se encola el correo (queue) — verificamos que se intentó enviar
        Mail::assertQueued(ConstanciaSolicitadaMail::class);
    }

    public function test_baja_temporal_envia_correo_al_alumno(): void
    {
        Mail::fake();

        $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/bajas/solicitar', [
                'periodo_id'      => $this->periodo->id,
                'fecha_solicitud' => '2026-09-01',
            ])
            ->assertStatus(201);

        Mail::assertQueued(BajaSolicitadaMail::class, fn ($mail) =>
            $mail->hasTo($this->userAlumno->email)
        );
    }

    public function test_publicar_orden_encola_correos_a_alumnos_activos(): void
    {
        Mail::fake();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/orden-reinscripcion', [
                'periodo_id'                 => $this->periodo->id,
                'carrera_id'                 => $this->carrera->id,
                'semestre'                   => 1,
                'fecha_inicio_reinscripcion' => now()->addDays(8)->toDateString(),
                'fecha_fin_reinscripcion'    => now()->addDays(20)->toDateString(),
            ])
            ->assertStatus(201);

        // El alumno activo de semestre 1 debe recibir el correo
        Mail::assertQueued(OrdenReinscripcionPublicadaMail::class, fn ($mail) =>
            $mail->hasTo($this->userAlumno->email)
        );
    }

    public function test_alumno_con_baja_temporal_no_puede_reinscribirse(): void
    {
        $this->alumno->update(['estatus' => 'baja_temporal']);

        $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/reinscripciones', ['periodo_id' => $this->periodo->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Solo los alumnos con estatus activo pueden solicitar reinscripción.');
    }

    public function test_alumno_con_baja_no_puede_solicitar_constancia(): void
    {
        $this->alumno->update(['estatus' => 'baja_definitiva']);

        $this->actingAs($this->userAlumno, 'sanctum')
            ->postJson('/api/constancias', ['tipo' => 'estudios'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Solo los alumnos con estatus activo pueden solicitar constancias.');
    }
}
