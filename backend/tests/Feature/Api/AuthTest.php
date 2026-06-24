<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Admision\Models\Aspirante as AspiranteModel;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin',  'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'alumno', 'guard_name' => 'web']);
    }

    public function test_login_exitoso(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret123')]);
        $user->assignRole('admin');

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['token', 'user' => ['id', 'name', 'email', 'roles']],
                'message',
                'status',
            ]);
    }

    public function test_login_credenciales_invalidas(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'noexiste@itsmt.edu.mx',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401)
            ->assertJson(['status' => 401]);
    }

    public function test_me_retorna_usuario_autenticado(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonStructure(['data' => ['id', 'name', 'email', 'roles', 'permissions']]);
    }

    public function test_me_sin_autenticacion_retorna_401(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    // Login de alumno con número de control + CURP
    public function test_alumno_inicia_sesion_con_numero_de_control_y_curp(): void
    {
        $curp = 'GAAN000101MVZRNA00';
        $nc   = '26006 0001';

        $carrera = Carrera::create(['nombre' => 'ISC', 'clave' => 'ISC', 'codigo_it' => '06', 'activa' => true]);
        $periodo = Periodo::create(['nombre' => 'Ago-Dic 2026', 'fecha_inicio' => '2026-08-17', 'fecha_fin' => '2026-12-19', 'activo' => true, 'tipo' => 'ordinario']);

        $userAlumno = User::create([
            'name'     => 'Ana García Torres',
            'email'    => "{$nc}@alumnos.itsmt.edu.mx",
            'password' => Hash::make(strtoupper($curp)),
        ]);
        $userAlumno->assignRole('alumno');

        $aspirante = AspiranteModel::create([
            'nombres' => 'Ana', 'apellido_paterno' => 'García',
            'curp' => $curp, 'fecha_nacimiento' => '2000-01-01',
            'sexo' => 'femenino', 'municipio_procedencia' => 'Martínez de la Torre',
            'escuela_bachillerato' => 'CBTis 76', 'promedio_bachillerato' => 9.0,
            'turno_preferido' => 'matutino', 'email' => 'ana.garcia@test.com',
            'carrera_id' => $carrera->id, 'periodo_id' => $periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id'      => $aspirante->id,
            'numero_control'    => $nc,
            'carrera_id'        => $carrera->id,
            'periodo_id'        => $periodo->id,
            'semestre_ingreso'  => 1,
            'fecha_inscripcion' => now()->toDateString(),
        ]);

        Alumno::create([
            'user_id'            => $userAlumno->id,
            'inscripcion_id'     => $inscripcion->id,
            'numero_control'     => $nc,
            'carrera_id'         => $carrera->id,
            'periodo_ingreso_id' => $periodo->id,
        ]);

        // Login con número de control (sin @) y CURP como contraseña
        $response = $this->postJson('/api/auth/login', [
            'email'    => $nc,
            'password' => strtoupper($curp),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.user.numero_control', $nc)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'roles', 'numero_control']]]);
    }

    public function test_me_alumno_retorna_datos_academicos(): void
    {
        $carrera = Carrera::create(['nombre' => 'ISC', 'clave' => 'ISC', 'codigo_it' => '06', 'activa' => true]);
        $periodo = Periodo::create(['nombre' => 'Ago-Dic 2026', 'fecha_inicio' => '2026-08-17', 'fecha_fin' => '2026-12-19', 'activo' => true, 'tipo' => 'ordinario']);

        $userAlumno = User::create([
            'name'     => 'Test Alumno',
            'email'    => '26006-test@alumnos.itsmt.edu.mx',
            'password' => Hash::make('TESTCURP123'),
        ]);
        $userAlumno->assignRole('alumno');

        $aspirante = AspiranteModel::create([
            'nombres' => 'Test', 'apellido_paterno' => 'Alumno',
            'curp' => 'AATT000101HVZRST00', 'fecha_nacimiento' => '2000-01-01',
            'sexo' => 'masculino', 'municipio_procedencia' => 'Martínez',
            'escuela_bachillerato' => 'CBTis 76', 'promedio_bachillerato' => 8.0,
            'turno_preferido' => 'matutino', 'email' => 'test.alumno@test.com',
            'carrera_id' => $carrera->id, 'periodo_id' => $periodo->id,
        ]);

        $inscripcion = Inscripcion::create([
            'aspirante_id' => $aspirante->id, 'numero_control' => '26006-test',
            'carrera_id' => $carrera->id, 'periodo_id' => $periodo->id,
            'semestre_ingreso' => 1, 'fecha_inscripcion' => now()->toDateString(),
        ]);

        Alumno::create([
            'user_id' => $userAlumno->id, 'inscripcion_id' => $inscripcion->id,
            'numero_control' => '26006-test', 'carrera_id' => $carrera->id,
            'periodo_ingreso_id' => $periodo->id,
        ]);

        $response = $this->actingAs($userAlumno, 'sanctum')->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.estatus', 'activo')
            ->assertJsonStructure(['data' => ['numero_control', 'carrera', 'semestre', 'estatus', 'periodo_ingreso']]);
    }

    public function test_logout_revoca_token(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJsonPath('status', 200);
    }
}
