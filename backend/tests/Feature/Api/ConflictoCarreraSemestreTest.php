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

class ConflictoCarreraSemestreTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docenteA;
    private User $docenteB;
    private Carrera $carrera;
    private Periodo $periodo;
    private Grupo $grupoA;
    private Grupo $grupoB;
    private Materia $materiaX;
    private Materia $materiaY;
    private Aula $aula;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'docente'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->docenteA = User::factory()->create();
        $this->docenteA->assignRole('docente');
        $this->docenteB = User::factory()->create();
        $this->docenteB->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre' => 'Ago-Dic 2026',
            'fecha_inicio' => now()->addDays(30)->toDateString(),
            'fecha_fin' => now()->addDays(120)->toDateString(),
            'activo' => true,
            'tipo' => 'ordinario',
            'fecha_limite_baja_parcial' => now()->addDays(45)->toDateString(),
            'fecha_limite_baja_temporal' => now()->addDays(50)->toDateString(),
        ]);

        $this->carrera = Carrera::create(['nombre' => 'Ingeniería Test', 'clave' => 'ITT', 'codigo_it' => '09', 'activa' => true]);

        $this->grupoA = Grupo::create(['carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id, 'clave' => '1A', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);
        $this->grupoB = Grupo::create(['carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id, 'clave' => '1B', 'semestre' => 1, 'turno' => 'matutino', 'capacidad' => 30, 'activo' => true]);

        $this->materiaX = Materia::create(['carrera_id' => $this->carrera->id, 'clave' => 'MX1', 'clave_oficial_tecnm' => 'MXX-1001', 'nombre' => 'Materia X', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);
        $this->materiaY = Materia::create(['carrera_id' => $this->carrera->id, 'clave' => 'MY1', 'clave_oficial_tecnm' => 'MYY-1001', 'nombre' => 'Materia Y', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);

        $this->aula = Aula::create(['nombre' => 'Aula 1', 'capacidad' => 30, 'tipo' => 'salon', 'activa' => true]);

        foreach ([$this->docenteA, $this->docenteB] as $docente) {
            DisponibilidadDocente::create(['docente_id' => $docente->id, 'periodo_id' => $this->periodo->id, 'dia_semana' => 'lunes', 'hora_inicio' => '07:00', 'hora_fin' => '20:00']);
        }

        // Grupo A ya tiene Materia X lunes 08:00-09:00
        $cargaA = CargaAcademica::create(['docente_id' => $this->docenteA->id, 'materia_id' => $this->materiaX->id, 'periodo_id' => $this->periodo->id, 'aula_id' => $this->aula->id, 'horas_semana' => 4, 'estado' => 'pendiente']);
        $cargaA->grupos()->attach($this->grupoA->id);
        Horario::create(['carga_academica_id' => $cargaA->id, 'dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '09:00']);
    }

    public function test_otra_materia_en_grupo_paralelo_del_mismo_semestre_da_conflicto_carrera(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id'  => $this->periodo->id,
                'docente_id'  => $this->docenteB->id,
                'dia_semana'  => 'lunes',
                'hora_inicio' => '08:00',
                'hora_fin'    => '09:00',
                'grupo_ids'   => [$this->grupoB->id],
                'materia_id'  => $this->materiaY->id,
            ])
            ->assertOk();

        $tipos = collect($res->json('data.resultado.conflictos'))->pluck('tipo');
        $this->assertTrue($tipos->contains('carrera'));
    }

    public function test_misma_materia_en_grupo_paralelo_del_mismo_semestre_da_conflicto_asignatura(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id'  => $this->periodo->id,
                'docente_id'  => $this->docenteB->id,
                'dia_semana'  => 'lunes',
                'hora_inicio' => '08:00',
                'hora_fin'    => '09:00',
                'grupo_ids'   => [$this->grupoB->id],
                'materia_id'  => $this->materiaX->id,
            ])
            ->assertOk();

        $tipos = collect($res->json('data.resultado.conflictos'))->pluck('tipo');
        $this->assertTrue($tipos->contains('asignatura'));
    }

    public function test_asignar_horario_con_conflicto_de_carrera_es_rechazado(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios/asignar', [
                'periodo_id'  => $this->periodo->id,
                'docente_id'  => $this->docenteB->id,
                'materia_id'  => $this->materiaY->id,
                'grupo_ids'   => [$this->grupoB->id],
                'dia_semana'  => 'lunes',
                'hora_inicio' => '08:00',
                'hora_fin'    => '09:00',
            ])
            ->assertStatus(422);

        $this->assertDatabaseMissing('cargas_academicas', ['materia_id' => $this->materiaY->id]);
    }

    public function test_sin_traslape_no_hay_conflicto(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/horarios/verificar-disponibilidad', [
                'periodo_id'  => $this->periodo->id,
                'docente_id'  => $this->docenteB->id,
                'dia_semana'  => 'lunes',
                'hora_inicio' => '10:00',
                'hora_fin'    => '11:00',
                'grupo_ids'   => [$this->grupoB->id],
                'materia_id'  => $this->materiaY->id,
            ])
            ->assertOk();

        $this->assertEmpty($res->json('data.resultado.conflictos'));
    }

    public function test_editar_bloque_a_horario_libre_se_permite(): void
    {
        $horario = Horario::where('carga_academica_id', CargaAcademica::whereHas('grupos', fn($q) => $q->where('grupos.id', $this->grupoA->id))->first()->id)->first();

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/horarios/{$horario->id}", [
                'dia_semana'  => 'lunes',
                'hora_inicio' => '10:00',
                'hora_fin'    => '11:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.hora_inicio', '10:00');
    }

    public function test_editar_bloque_a_horario_ocupado_es_rechazado(): void
    {
        // Ocupar 10:00-11:00 con otra carga del mismo docenteA para forzar conflicto
        $otraMateria = Materia::create(['carrera_id' => $this->carrera->id, 'clave' => 'MZ1', 'clave_oficial_tecnm' => 'MZZ-1001', 'nombre' => 'Materia Z', 'semestre' => 1, 'creditos' => 5, 'horas_teoria' => 4, 'horas_practica' => 0, 'tipo' => 'obligatoria']);
        $otraCarga = CargaAcademica::create(['docente_id' => $this->docenteA->id, 'materia_id' => $otraMateria->id, 'periodo_id' => $this->periodo->id, 'aula_id' => $this->aula->id, 'horas_semana' => 4, 'estado' => 'pendiente']);
        $otraCarga->grupos()->attach($this->grupoA->id);
        Horario::create(['carga_academica_id' => $otraCarga->id, 'dia_semana' => 'lunes', 'hora_inicio' => '10:00', 'hora_fin' => '11:00']);

        $horario = Horario::where('carga_academica_id', CargaAcademica::where('materia_id', $this->materiaX->id)->first()->id)->first();

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/horarios/{$horario->id}", [
                'dia_semana'  => 'lunes',
                'hora_inicio' => '10:00',
                'hora_fin'    => '11:00',
            ])
            ->assertStatus(422);

        $this->assertSame('08:00', $horario->fresh()->hora_inicio);
    }
}
