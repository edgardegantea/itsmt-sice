<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Mail\ListaAsistenciaBlancoMail;
use App\Mail\ReporteAsistenciaGrupoMail;
use App\Mail\ResumenSesionAsistenciaMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AsistenciaEmailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docente;
    private CargaAcademica $carga;
    private SesionClase $sesion;
    private Periodo $periodo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'alumno', 'jefe_carrera'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $carrera = Carrera::create(['nombre' => 'ISC', 'clave' => 'ISC', 'codigo_it' => '06', 'activa' => true]);

        $this->periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026', 'fecha_inicio' => now()->subDays(10)->toDateString(),
            'fecha_fin' => now()->addDays(100)->toDateString(), 'activo' => true, 'tipo' => 'ordinario',
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create(['email' => 'docente.asist@test.com']);
        $this->docente->assignRole('docente');

        $materia = Materia::create([
            'carrera_id' => $carrera->id, 'clave' => 'MAT1', 'nombre' => 'Cálculo',
            'semestre' => 1, 'creditos' => 8, 'horas_teoria' => 3, 'horas_practica' => 2, 'tipo' => 'obligatoria',
        ]);

        $grupo = Grupo::create([
            'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id, 'clave' => '1A',
            'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30,
        ]);

        $this->carga = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $materia->id,
            'periodo_id' => $this->periodo->id, 'horas_semana' => 5,
        ]);
        $this->carga->grupos()->attach($grupo->id);

        $alumnoUser = User::factory()->create();
        $alumnoUser->assignRole('alumno');
        $aspirante = Aspirante::create([
            'nombres' => 'Ana', 'apellido_paterno' => 'Test', 'curp' => 'TEAA000101MDFRRN01',
            'fecha_nacimiento' => '2000-01-01', 'sexo' => 'femenino', 'municipio_procedencia' => 'X',
            'escuela_bachillerato' => 'Y', 'promedio_bachillerato' => 8, 'turno_preferido' => 'matutino',
            'email' => 'ana.asist@test.com', 'carrera_id' => $carrera->id, 'periodo_id' => $this->periodo->id,
        ]);
        $inscripcion = Inscripcion::create([
            'aspirante_id' => $aspirante->id, 'numero_control' => '26ISC0001', 'carrera_id' => $carrera->id,
            'periodo_id' => $this->periodo->id, 'semestre_ingreso' => 1, 'fecha_inscripcion' => now()->toDateString(),
        ]);
        $alumno = Alumno::create([
            'user_id' => $alumnoUser->id, 'inscripcion_id' => $inscripcion->id, 'numero_control' => '26ISC0001',
            'carrera_id' => $carrera->id, 'periodo_ingreso_id' => $this->periodo->id, 'semestre_actual' => 1, 'estatus' => 'activo',
        ]);
        $grupo->alumnos()->attach($alumno->id, [
            'id'               => \Illuminate\Support\Str::uuid()->toString(),
            'fecha_asignacion' => now()->toDateString(),
        ]);

        $this->sesion = SesionClase::create([
            'grupo_id' => $grupo->id, 'docente_id' => $this->docente->id,
            'fecha' => now()->toDateString(), 'hora_inicio' => '08:00', 'hora_fin' => '09:00',
        ]);
        Asistencia::create(['sesion_id' => $this->sesion->id, 'alumno_id' => $alumnoUser->id, 'estatus' => 'presente']);
    }

    public function test_admin_envia_lista_en_blanco(): void
    {
        Mail::fake();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/cargas-academicas/{$this->carga->id}/asistencia/enviar-lista-blanco")
            ->assertStatus(200);

        Mail::assertQueued(ListaAsistenciaBlancoMail::class, fn ($m) => $m->hasTo($this->docente->email));
    }

    public function test_admin_envia_reporte_acumulado(): void
    {
        Mail::fake();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/cargas-academicas/{$this->carga->id}/asistencia/enviar-reporte")
            ->assertStatus(200);

        Mail::assertQueued(ReporteAsistenciaGrupoMail::class, fn ($m) => $m->hasTo($this->docente->email));
    }

    public function test_admin_envia_resumen_de_sesion(): void
    {
        Mail::fake();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/sesiones-clase/{$this->sesion->id}/enviar-resumen")
            ->assertStatus(200);

        Mail::assertQueued(ResumenSesionAsistenciaMail::class, fn ($m) => $m->hasTo($this->docente->email));
    }

    public function test_docente_no_puede_enviar_de_otra_carga(): void
    {
        $otroDocente = User::factory()->create();
        $otroDocente->assignRole('docente');

        $this->actingAs($otroDocente, 'sanctum')
            ->postJson("/api/cargas-academicas/{$this->carga->id}/asistencia/enviar-lista-blanco")
            ->assertStatus(403);
    }

    public function test_admin_envio_masivo(): void
    {
        Mail::fake();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/asistencias/enviar-masivo', [
                'periodo_id' => $this->periodo->id,
                'tipo'       => 'blanco',
            ]);

        $response->assertStatus(200)->assertJsonPath('data.enviados', 1);
        Mail::assertQueued(ListaAsistenciaBlancoMail::class);
    }
}
