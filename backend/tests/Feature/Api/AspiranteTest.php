<?php

namespace Tests\Feature\Api;

use App\Mail\ConfirmacionSolicitudMail;
use App\Models\Aspirante;
use Illuminate\Support\Facades\Mail;
use App\Models\Carrera;
use App\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AspiranteTest extends TestCase
{
    use RefreshDatabase;

    private Carrera $carrera;
    private Periodo $periodo;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'alumno', 'personal_administrativo'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->carrera = Carrera::create([
            'nombre'     => 'ISC',
            'clave'      => 'ISC',
            'codigo_it'  => '06',
            'activa'     => true,
        ]);

        $this->periodo = Periodo::create([
            'nombre'       => 'Ago-Dic 2026',
            'fecha_inicio' => '2026-08-17',
            'fecha_fin'    => '2026-12-19',
            'activo'       => true,
            'tipo'         => 'ordinario',
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    // Helper: datos completos para POST /api/aspirantes
    private function datosAspirante(array $override = []): array
    {
        return array_merge([
            'nombres'               => 'Laura',
            'apellido_paterno'      => 'Mendoza',
            'curp'                  => 'MELA990101MVZNDRA4',
            'fecha_nacimiento'      => '1999-01-01',
            'sexo'                  => 'femenino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTis 76',
            'promedio_bachillerato' => 8.5,
            'turno_preferido'       => 'matutino',
            'email'                 => 'laura@test.com',
            'carrera_id'            => $this->carrera->id,
            'periodo_id'            => $this->periodo->id,
        ], $override);
    }

    // Helper: campos extra para Aspirante::create() (que no vienen del request)
    private function extrasCamposModelo(array $override = []): array
    {
        return array_merge([
            'curp'                  => 'XAXX000101HXXXXXX0',
            'fecha_nacimiento'      => '2000-01-01',
            'sexo'                  => 'masculino',
            'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato'  => 'CBTis 76',
            'promedio_bachillerato' => 8.0,
            'turno_preferido'       => 'matutino',
        ], $override);
    }

    // S1-02 — correo de confirmación
    public function test_registro_envia_correo_de_confirmacion(): void
    {
        Mail::fake();

        $this->postJson('/api/aspirantes', $this->datosAspirante())->assertStatus(201);

        Mail::assertQueued(ConfirmacionSolicitudMail::class, function ($mail) {
            return $mail->hasTo('laura@test.com');
        });
    }

    // S1-01 — happy path
    public function test_aspirante_puede_registrarse(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/aspirantes', $this->datosAspirante([
            'nombres'          => 'Juan',
            'apellido_paterno' => 'Pérez',
            'curp'             => 'PEPJ990101HVZRRA09',
            'email'            => 'juan@test.com',
        ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.estatus', 'pendiente')
            ->assertJsonPath('data.email', 'juan@test.com')
            ->assertJsonStructure(['data' => ['id', 'email', 'estatus', 'carrera', 'periodo']]);
    }

    // S1-01 — validación
    public function test_registro_aspirante_falla_sin_email(): void
    {
        Mail::fake();

        $datos = $this->datosAspirante();
        unset($datos['email']);

        $response = $this->postJson('/api/aspirantes', $datos);
        $response->assertStatus(422);
    }

    // S1-03 — happy path
    public function test_admin_puede_listar_aspirantes(): void
    {
        Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'GAAN000101MVZRNA00']), [
            'nombres' => 'Ana', 'apellido_paterno' => 'García',
            'email' => 'ana@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/aspirantes');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['data']]);
    }

    // S1-03 — 403 sin rol admin
    public function test_alumno_no_puede_listar_aspirantes(): void
    {
        $alumno = User::factory()->create();
        $alumno->assignRole('alumno');

        $response = $this->actingAs($alumno, 'sanctum')
            ->getJson('/api/aspirantes');

        $response->assertStatus(403);
    }

    // S1-03 — cambio de estatus
    public function test_admin_puede_cambiar_estatus_aspirante(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'TOLX000101HVZRRA01']), [
            'nombres' => 'Luis', 'apellido_paterno' => 'Torres',
            'email' => 'luis@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id,
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/aspirantes/{$aspirante->id}/estatus", [
                'estatus' => 'aceptado',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.estatus', 'aceptado');
    }

    // S1-04 — happy path inscripción via POST /api/inscripciones
    public function test_admin_puede_inscribir_aspirante_aceptado(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'LOPM000101MVZPRA02']), [
            'nombres' => 'María', 'apellido_paterno' => 'López',
            'email' => 'maria@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'aceptado',
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', [
                'aspirante_id' => $aspirante->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['numero_control', 'aspirante_id']]);

        // Verificar que se creó el expediente académico (alumno)
        $this->assertDatabaseHas('alumnos', [
            'numero_control' => $response->json('data.numero_control'),
        ]);

        // El aspirante transiciona a 'inscrito' — ya no aparece en lista de aspirantes
        $this->assertDatabaseHas('aspirantes', [
            'id'      => $aspirante->id,
            'estatus' => 'inscrito',
        ]);
    }

    // S1-04 — no se puede inscribir si estatus != aceptado
    public function test_no_se_puede_inscribir_aspirante_pendiente(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'RUIP000101HVZDRX03']), [
            'nombres' => 'Pedro', 'apellido_paterno' => 'Ruiz',
            'email' => 'pedro@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'pendiente',
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', [
                'aspirante_id' => $aspirante->id,
            ]);

        $response->assertStatus(422);
    }
}
