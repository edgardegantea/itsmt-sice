<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\DisponibilidadDocente;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GrupoHorarioPorDiaTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crea_grupo_con_horario_distinto_por_dia(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026', 'fecha_inicio' => now()->addDays(30)->toDateString(),
            'fecha_fin' => now()->addDays(120)->toDateString(), 'activo' => true, 'tipo' => 'ordinario',
            'fecha_limite_baja_parcial' => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);
        $carrera = Carrera::create(['nombre' => 'Ing. Test', 'clave' => 'IHD', 'codigo_it' => '13', 'activa' => true]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/grupos', [
                'carrera_id' => $carrera->id,
                'periodo_id' => $periodo->id,
                'clave'      => '1AH',
                'semestre'   => 1,
                'turno'      => 'matutino',
                'horarios_dias' => [
                    ['dia_semana' => 'lunes',  'hora_inicio' => '07:00', 'hora_fin' => '13:00'],
                    ['dia_semana' => 'sabado', 'hora_inicio' => '08:00', 'hora_fin' => '17:00'],
                ],
            ])
            ->assertStatus(201);

        $grupoId = $res->json('data.id');
        $this->assertCount(2, $res->json('data.horarios_dias'));

        // El horario devuelto debe venir en formato H:i (sin segundos), para
        // que reenviarlo tal cual en un update no falle la validación.
        $horariosDevueltos = $res->json('data.horarios_dias');
        $this->assertEquals('07:00', $horariosDevueltos[0]['hora_inicio']);

        // Editar el grupo sin tocar el horario, reenviando lo recibido tal
        // cual (como hace el frontend) — no debe dar 422.
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/grupos/{$grupoId}", [
                'capacidad'     => 40,
                'horarios_dias' => $horariosDevueltos,
            ])
            ->assertOk();

        // Docente con disponibilidad amplia todos los días
        Role::firstOrCreate(['name' => 'docente', 'guard_name' => 'web']);
        $docente = User::factory()->create();
        $docente->assignRole('docente');
        foreach (['lunes', 'martes', 'sabado'] as $dia) {
            DisponibilidadDocente::create(['docente_id' => $docente->id, 'periodo_id' => $periodo->id, 'dia_semana' => $dia, 'hora_inicio' => '07:00', 'hora_fin' => '20:00']);
        }
        $materia = Materia::create(['carrera_id' => $carrera->id, 'clave' => 'MH1', 'clave_oficial_tecnm' => 'MHM-1001', 'nombre' => 'M', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);

        // Lunes 07:00-08:00 cae dentro de la ventana del lunes (07:00-13:00) — sin conflicto de ventana
        $resLunes = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id' => $periodo->id, 'docente_id' => $docente->id, 'dia_semana' => 'lunes',
                'hora_inicio' => '07:00', 'hora_fin' => '08:00', 'grupo_ids' => [$grupoId], 'materia_id' => $materia->id,
            ])->assertOk();
        $tiposLunes = collect($resLunes->json('data.resultado.conflictos'))->pluck('tipo');
        $this->assertFalse($tiposLunes->contains('ventana_grupo'));

        // Martes no tiene ventana configurada para este grupo -> rechazado
        $resMartes = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id' => $periodo->id, 'docente_id' => $docente->id, 'dia_semana' => 'martes',
                'hora_inicio' => '07:00', 'hora_fin' => '08:00', 'grupo_ids' => [$grupoId], 'materia_id' => $materia->id,
            ])->assertOk();
        $tiposMartes = collect($resMartes->json('data.resultado.conflictos'))->pluck('tipo');
        $this->assertTrue($tiposMartes->contains('ventana_grupo'));

        // Sábado 16:00-18:00 excede la ventana del sábado (08:00-17:00)
        $resSabado = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id' => $periodo->id, 'docente_id' => $docente->id, 'dia_semana' => 'sabado',
                'hora_inicio' => '16:00', 'hora_fin' => '18:00', 'grupo_ids' => [$grupoId], 'materia_id' => $materia->id,
            ])->assertOk();
        $tiposSabado = collect($resSabado->json('data.resultado.conflictos'))->pluck('tipo');
        $this->assertTrue($tiposSabado->contains('ventana_grupo'));
    }

    public function test_admin_aplica_horario_por_lote_a_varios_grupos(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026', 'fecha_inicio' => now()->addDays(30)->toDateString(),
            'fecha_fin' => now()->addDays(120)->toDateString(), 'activo' => true, 'tipo' => 'ordinario',
            'fecha_limite_baja_parcial' => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);
        $carrera = Carrera::create(['nombre' => 'Ing. Lote', 'clave' => 'ILT', 'codigo_it' => '14', 'activa' => true]);

        $grupoA = Grupo::create(['carrera_id' => $carrera->id, 'periodo_id' => $periodo->id, 'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $grupoB = Grupo::create(['carrera_id' => $carrera->id, 'periodo_id' => $periodo->id, 'clave' => '1B', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/grupos/horarios-dias-bulk', [
                'grupo_ids' => [$grupoA->id, $grupoB->id],
                'horarios_dias' => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '07:00', 'hora_fin' => '13:00'],
                ],
            ])
            ->assertOk();

        $this->assertEquals(2, $res->json('data.grupos_afectados'));
        $this->assertDatabaseCount('grupo_horarios_dia', 2);
        $this->assertDatabaseHas('grupo_horarios_dia', ['grupo_id' => $grupoA->id, 'dia_semana' => 'lunes', 'hora_inicio' => '07:00']);
        $this->assertDatabaseHas('grupo_horarios_dia', ['grupo_id' => $grupoB->id, 'dia_semana' => 'lunes', 'hora_inicio' => '07:00']);

        // Reaplicar con array vacío limpia el horario (sin restricción) en ambos
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/grupos/horarios-dias-bulk', ['grupo_ids' => [$grupoA->id, $grupoB->id]])
            ->assertOk();

        $this->assertDatabaseCount('grupo_horarios_dia', 0);
    }
}
