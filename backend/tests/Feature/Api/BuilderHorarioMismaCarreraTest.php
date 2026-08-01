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

class BuilderHorarioMismaCarreraTest extends TestCase
{
    use RefreshDatabase;

    public function test_builder_grid_marca_misma_carrera_por_slot(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'docente', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $periodo = Periodo::create([
            'nombre'                     => 'Ago-Dic 2026',
            'fecha_inicio'               => now()->addDays(30)->toDateString(),
            'fecha_fin'                  => now()->addDays(120)->toDateString(),
            'activo'                     => true,
            'tipo'                       => 'ordinario',
            'fecha_limite_baja_parcial'  => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);

        $carreraA = Carrera::create(['nombre' => 'Ingeniería A', 'clave' => 'IAA', 'codigo_it' => '01', 'activa' => true]);
        $carreraB = Carrera::create(['nombre' => 'Ingeniería B', 'clave' => 'IAB', 'codigo_it' => '02', 'activa' => true]);

        $docente = User::factory()->create();
        $docente->assignRole('docente');

        foreach (['lunes'] as $dia) {
            DisponibilidadDocente::create([
                'docente_id' => $docente->id, 'periodo_id' => $periodo->id,
                'dia_semana' => $dia, 'hora_inicio' => '07:00', 'hora_fin' => '20:00',
            ]);
        }

        $aula = Aula::create(['nombre' => 'Aula 1', 'capacidad' => 30, 'tipo' => 'salon', 'activa' => true]);

        $grupoA = Grupo::create(['carrera_id' => $carreraA->id, 'periodo_id' => $periodo->id, 'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $grupoB = Grupo::create(['carrera_id' => $carreraB->id, 'periodo_id' => $periodo->id, 'clave' => '1B', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);

        $materiaA = Materia::create(['carrera_id' => $carreraA->id, 'clave' => 'AA1', 'clave_oficial_tecnm' => 'AAA-1001', 'nombre' => 'Materia A', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 2, 'horas_practica' => 3, 'tipo' => 'obligatoria']);
        $materiaB = Materia::create(['carrera_id' => $carreraB->id, 'clave' => 'BB1', 'clave_oficial_tecnm' => 'BBB-1001', 'nombre' => 'Materia B', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 2, 'horas_practica' => 3, 'tipo' => 'obligatoria']);

        $cargaA = CargaAcademica::create(['docente_id' => $docente->id, 'materia_id' => $materiaA->id, 'periodo_id' => $periodo->id, 'aula_id' => $aula->id, 'horas_semana' => 5, 'estado' => 'pendiente']);
        $cargaA->grupos()->attach($grupoA->id);
        Horario::create(['carga_academica_id' => $cargaA->id, 'dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '09:00']);

        $cargaB = CargaAcademica::create(['docente_id' => $docente->id, 'materia_id' => $materiaB->id, 'periodo_id' => $periodo->id, 'aula_id' => $aula->id, 'horas_semana' => 5, 'estado' => 'pendiente']);
        $cargaB->grupos()->attach($grupoB->id);
        Horario::create(['carga_academica_id' => $cargaB->id, 'dia_semana' => 'lunes', 'hora_inicio' => '10:00', 'hora_fin' => '11:00']);

        $res = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/horarios/builder-grid?' . http_build_query([
                'periodo_id' => $periodo->id,
                'docente_id' => $docente->id,
                'carrera_id' => $carreraA->id,
            ]))
            ->assertOk();

        $dias = $res->json('data.dias');
        $lunes = collect($dias)->firstWhere('dia_semana', 'lunes');
        $horas = collect($lunes['horas']);

        $this->assertTrue($horas->firstWhere('hora', '08:00')['misma_carrera']);
        $this->assertFalse($horas->firstWhere('hora', '10:00')['misma_carrera']);
    }
}
