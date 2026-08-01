<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DiagnosticoYBusquedaHorarioTest extends TestCase
{
    use RefreshDatabase;

    public function test_diagnostico_detecta_empalme_de_docente(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'docente', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026', 'fecha_inicio' => now()->addDays(30)->toDateString(),
            'fecha_fin' => now()->addDays(120)->toDateString(), 'activo' => true, 'tipo' => 'ordinario',
            'fecha_limite_baja_parcial' => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);
        $carrera = Carrera::create(['nombre' => 'Ing. Test', 'clave' => 'ITX', 'codigo_it' => '11', 'activa' => true]);
        $docente = User::factory()->create();
        $docente->assignRole('docente');
        $grupoA = Grupo::create(['carrera_id' => $carrera->id, 'periodo_id' => $periodo->id, 'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $grupoB = Grupo::create(['carrera_id' => $carrera->id, 'periodo_id' => $periodo->id, 'clave' => '1B', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $materiaA = Materia::create(['carrera_id' => $carrera->id, 'clave' => 'AA1', 'clave_oficial_tecnm' => 'AAA-1001', 'nombre' => 'A', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);
        $materiaB = Materia::create(['carrera_id' => $carrera->id, 'clave' => 'BB1', 'clave_oficial_tecnm' => 'BBB-1001', 'nombre' => 'B', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);

        // Dos cargas del mismo docente traslapadas — creadas directo en BD (fuera del flujo validado)
        $cargaA = CargaAcademica::create(['docente_id' => $docente->id, 'materia_id' => $materiaA->id, 'periodo_id' => $periodo->id, 'horas_semana' => 4]);
        $cargaA->grupos()->attach($grupoA->id);
        Horario::create(['carga_academica_id' => $cargaA->id, 'dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '09:00']);

        $cargaB = CargaAcademica::create(['docente_id' => $docente->id, 'materia_id' => $materiaB->id, 'periodo_id' => $periodo->id, 'horas_semana' => 4]);
        $cargaB->grupos()->attach($grupoB->id);
        Horario::create(['carga_academica_id' => $cargaB->id, 'dia_semana' => 'lunes', 'hora_inicio' => '08:30', 'hora_fin' => '09:30']);

        $res = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/horarios/diagnostico?periodo_id=' . $periodo->id)
            ->assertOk();

        $this->assertGreaterThan(0, $res->json('data.total'));
        $tipos = collect($res->json('data.empalmes'))->pluck('tipo');
        $this->assertTrue($tipos->contains('docente'));
    }

    public function test_buscar_disponibilidad_propone_huecos_libres(): void
    {
        foreach (['admin', 'docente', 'jefe_carrera', 'director_academico'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026', 'fecha_inicio' => now()->addDays(30)->toDateString(),
            'fecha_fin' => now()->addDays(120)->toDateString(), 'activo' => true, 'tipo' => 'ordinario',
            'fecha_limite_baja_parcial' => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);
        $carrera = Carrera::create(['nombre' => 'Ing. Test2', 'clave' => 'ITY', 'codigo_it' => '12', 'activa' => true]);
        $docente = User::factory()->create();
        $docente->assignRole('docente');
        $docente->carreras()->attach($carrera->id);

        foreach (['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as $dia) {
            DisponibilidadDocente::create(['docente_id' => $docente->id, 'periodo_id' => $periodo->id, 'dia_semana' => $dia, 'hora_inicio' => '07:00', 'hora_fin' => '15:00']);
        }

        Aula::create(['nombre' => 'Aula X', 'capacidad' => 30, 'tipo' => 'salon', 'activa' => true]);
        $grupo = Grupo::create(['carrera_id' => $carrera->id, 'periodo_id' => $periodo->id, 'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $materia = Materia::create(['carrera_id' => $carrera->id, 'clave' => 'MM1', 'clave_oficial_tecnm' => 'MMM-1001', 'nombre' => 'M', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/horarios/disponibilidad/buscar', [
                'periodo_id' => $periodo->id,
                'materia_id' => $materia->id,
                'grupo_ids'  => [$grupo->id],
                'carrera_id' => $carrera->id,
            ])
            ->assertOk();

        $this->assertNotEmpty($res->json('data.propuestas'));
    }
}
