<?php

namespace Tests\Feature\Api;

use App\Mail\ConfirmacionAspirante;
use App\Domains\Admision\Models\Aspirante;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
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
            'area_bachillerato'       => 'Físico-Matemático',
            'estado_civil'            => 'soltero',
            'medio_enterado'          => 'redes sociales',
            'tiene_equipo_computo'    => true,
            'constancia_bachillerato' => UploadedFile::fake()->create('constancia.pdf', 100, 'application/pdf'),
            'email'                   => 'laura@test.com',
            'carrera_id'              => $this->carrera->id,
            'periodo_id'              => $this->periodo->id,
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
        Storage::fake('local');
        Mail::fake();

        $this->post('/api/aspirantes', $this->datosAspirante(), ['Accept' => 'application/json'])
            ->assertStatus(201);

        Mail::assertSent(ConfirmacionAspirante::class, function ($mail) {
            return $mail->hasTo('laura@test.com');
        });
    }

    // S1-01 — happy path
    public function test_aspirante_puede_registrarse(): void
    {
        Storage::fake('local');
        Mail::fake();

        $response = $this->post('/api/aspirantes', $this->datosAspirante([
            'nombres'          => 'Juan',
            'apellido_paterno' => 'Pérez',
            'curp'             => 'PEPJ990101HVZRRA09',
            'email'            => 'juan@test.com',
            'constancia_bachillerato' => UploadedFile::fake()->create('constancia.pdf', 100, 'application/pdf'),
        ]), ['Accept' => 'application/json']);

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
        unset($datos['constancia_bachillerato']);

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

    // S1-04 — número de control tiene formato TecNM [AA][NNN][####]
    public function test_numero_control_tiene_formato_tecnm(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'NCFM000101HVZFMX01']), [
            'nombres' => 'Carlos', 'apellido_paterno' => 'Fuentes',
            'email' => 'carlos.nc@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'aceptado',
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', ['aspirante_id' => $aspirante->id])
            ->assertStatus(201);

        $nc = $response->json('data.numero_control');
        // Formato TecNM: [AA=2 dígitos año][NNN=3 dígitos código carrera][####=4 dígitos secuencia]
        $this->assertMatchesRegularExpression('/^\d{2}\d{3}\d{4}$/', $nc,
            "Número de control '{$nc}' no cumple el formato TecNM [AA][NNN][####]");
    }

    // S1-10 — alumno sin certificado_bachillerato queda con bandera activada
    public function test_inscripcion_sin_certificado_activa_bandera_pendiente(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'BOCM000101HVZBCX02']), [
            'nombres' => 'Mario', 'apellido_paterno' => 'Boca',
            'email' => 'mario.boca@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'aceptado',
            'documentos' => [], // sin certificado_bachillerato
        ]));

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', ['aspirante_id' => $aspirante->id])
            ->assertStatus(201);

        $this->assertDatabaseHas('alumnos', [
            'numero_control'                   => Aspirante::find($aspirante->id)->inscripcion->numero_control,
            'pendiente_certificado_bachillerato' => true,
        ]);
    }

    // S1-09 — autorizacion_consulta_expediente se guarda y aplica
    public function test_actualizacion_autorizacion_expediente(): void
    {
        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'AUTX000101HVZATX03']), [
            'nombres' => 'Ana', 'apellido_paterno' => 'Autor',
            'email' => 'ana.autor@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'aceptado',
        ]));

        $inscripcion = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', ['aspirante_id' => $aspirante->id])
            ->assertStatus(201);

        $alumno = \App\Domains\Academico\Models\Alumno::where('numero_control', $inscripcion->json('data.numero_control'))->first();

        // Cambiar a 'padre'
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/alumnos/{$alumno->id}/autorizacion-expediente", [
                'autorizacion_consulta_expediente' => 'padre',
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('alumnos', [
            'id'                               => $alumno->id,
            'autorizacion_consulta_expediente' => 'padre',
        ]);
    }

    // S1-09 — si autorizacion='nadie', jefe_carrera no puede ver el expediente
    public function test_jefe_carrera_bloqueado_si_autorizacion_nadie(): void
    {
        Role::firstOrCreate(['name' => 'jefe_carrera', 'guard_name' => 'web']);

        $aspirante = Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'NADX000101HVZNDX04']), [
            'nombres' => 'Juana', 'apellido_paterno' => 'Nadie',
            'email' => 'juana.nadie@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'estatus' => 'aceptado',
        ]));

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inscripciones', ['aspirante_id' => $aspirante->id]);

        $alumno = \App\Domains\Academico\Models\Alumno::where('email', 'juana.nadie@alumnos.itsmt.edu.mx')
            ->orWhereHas('inscripcion.aspirante', fn($q) => $q->where('email', 'juana.nadie@test.com'))
            ->first();
        $alumno->update(['autorizacion_consulta_expediente' => 'nadie']);

        $jefe = User::factory()->create(['carrera_id' => $this->carrera->id]);
        $jefe->assignRole('jefe_carrera');

        $this->actingAs($jefe, 'sanctum')
            ->getJson("/api/alumnos/{$alumno->id}")
            ->assertStatus(403);
    }

    // S1-01 — folio_exani y puntaje_exani se persisten en BD
    public function test_registro_persiste_datos_exani(): void
    {
        Storage::fake('local');
        Mail::fake();

        $this->post('/api/aspirantes', $this->datosAspirante([
            'curp'                     => 'EXNM990101HVZRNA10',
            'email'                    => 'exani@test.com',
            'folio_exani'              => 'EXANI-2026-001234',
            'puntaje_exani'            => 920.5,
            'folio_preinscripcion_tecnm' => 'PRE-2026-9876',
        ]), ['Accept' => 'application/json'])->assertStatus(201);

        $this->assertDatabaseHas('aspirantes', [
            'email'                    => 'exani@test.com',
            'folio_exani'              => 'EXANI-2026-001234',
            'folio_preinscripcion_tecnm' => 'PRE-2026-9876',
        ]);
    }

    // S1-01 — constancia_bachillerato subida se refleja en documentos JSON
    public function test_constancia_bachillerato_se_registra_en_documentos(): void
    {
        Storage::fake('public');
        Mail::fake();

        $this->post('/api/aspirantes', $this->datosAspirante([
            'curp'  => 'DOCM990101HVZDCX11',
            'email' => 'docs@test.com',
            'constancia_bachillerato' => UploadedFile::fake()->create('cert.pdf', 100, 'application/pdf'),
        ]), ['Accept' => 'application/json'])->assertStatus(201);

        $aspirante = \App\Domains\Admision\Models\Aspirante::where('email', 'docs@test.com')->first();
        $this->assertNotEmpty($aspirante->documentos['certificado_bachillerato'] ?? null,
            'documentos.certificado_bachillerato debe llenarse al subir el archivo');
    }

    // S1-03 — filtro por puntaje_min devuelve solo aspirantes con score >= umbral
    public function test_filtro_puntaje_min_aspirantes(): void
    {
        \App\Domains\Admision\Models\Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'ALTA000101HVZALX12']), [
            'nombres' => 'Alta', 'apellido_paterno' => 'Score',
            'email' => 'alta@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'puntaje_exani' => 950,
        ]));
        \App\Domains\Admision\Models\Aspirante::create(array_merge($this->extrasCamposModelo(['curp' => 'BAJA000101HVZBAX13']), [
            'nombres' => 'Baja', 'apellido_paterno' => 'Score',
            'email' => 'baja@test.com', 'carrera_id' => $this->carrera->id,
            'periodo_id' => $this->periodo->id, 'puntaje_exani' => 600,
        ]));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/aspirantes?puntaje_min=900')
            ->assertStatus(200);

        $emails = collect($response->json('data.data'))->pluck('email');
        $this->assertTrue($emails->contains('alta@test.com'));
        $this->assertFalse($emails->contains('baja@test.com'));
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
