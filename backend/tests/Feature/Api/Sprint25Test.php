<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\Periodo;
use App\Domains\Calidad\Models\EvidenciaCalidad;
use App\Domains\Calidad\Models\NoConformidad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint25Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $director;
    private User $docente;
    private Periodo $periodo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo',
                  'coord_tutoria', 'coord_distancia'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s25@test.com']);
        $this->admin->assignRole('admin');

        $this->director = User::factory()->create(['email' => 'director.s25@test.com']);
        $this->director->assignRole('director_academico');

        $this->docente = User::factory()->create(['email' => 'docente.s25@test.com']);
        $this->docente->assignRole('docente');

        $this->periodo = Periodo::create([
            'nombre'       => '2027-1',
            'fecha_inicio' => '2027-01-08',
            'fecha_fin'    => '2027-06-15',
            'activo'       => true,
        ]);
    }

    // S25-01: registrar evidencia de calidad
    public function test_admin_puede_registrar_evidencia_calidad(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/evidencias-calidad', [
            'periodo_id'      => $this->periodo->id,
            'proceso'         => 'Docencia',
            'indicador'       => 'Índice de aprobación',
            'tipo_evidencia'  => 'reporte',
            'fecha_evidencia' => '2027-02-01',
            'descripcion'     => 'Reporte semestral de aprobación.',
        ]);

        $res->assertStatus(201)->assertJsonPath('data.proceso', 'Docencia');
        $this->assertDatabaseHas('evidencias_calidad', ['indicador' => 'Índice de aprobación']);
    }

    // S25-02: listar evidencias con filtros
    public function test_puede_listar_evidencias_filtradas(): void
    {
        EvidenciaCalidad::create([
            'periodo_id'      => $this->periodo->id,
            'proceso'         => 'Vinculación',
            'indicador'       => 'Empresas vinculadas',
            'tipo_evidencia'  => 'convenio',
            'fecha_evidencia' => '2027-01-15',
            'estatus'         => 'pendiente',
            'subido_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/evidencias-calidad?proceso=Vinculaci%C3%B3n");
        $res->assertOk()->assertJsonCount(1, 'data.data');
    }

    // S25-03: director valida evidencia
    public function test_director_puede_validar_evidencia(): void
    {
        $evidencia = EvidenciaCalidad::create([
            'periodo_id'      => $this->periodo->id,
            'proceso'         => 'Docencia',
            'indicador'       => 'Asistencia docente',
            'tipo_evidencia'  => 'lista',
            'fecha_evidencia' => '2027-01-08',
            'estatus'         => 'pendiente',
            'subido_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->director)->patchJson("/api/evidencias-calidad/{$evidencia->id}/validar", [
            'estatus' => 'validada',
        ]);

        $res->assertOk()->assertJsonPath('data.estatus', 'validada');
    }

    // S25-04: docente no puede validar evidencia
    public function test_docente_no_puede_validar_evidencia(): void
    {
        $evidencia = EvidenciaCalidad::create([
            'periodo_id'      => $this->periodo->id,
            'proceso'         => 'Docencia',
            'indicador'       => 'Asistencia',
            'tipo_evidencia'  => 'lista',
            'fecha_evidencia' => '2027-01-08',
            'estatus'         => 'pendiente',
            'subido_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->docente)->patchJson("/api/evidencias-calidad/{$evidencia->id}/validar", [
            'estatus' => 'validada',
        ]);

        $res->assertStatus(403);
    }

    // S25-05: registrar no conformidad
    public function test_admin_puede_registrar_no_conformidad(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/no-conformidades', [
            'tipo'                  => 'interna',
            'proceso'               => 'Docencia',
            'descripcion'           => 'No se cumple con el 90% de asistencia docente.',
            'clausula_iso'          => '7.2',
            'fecha_deteccion'       => '2027-02-01',
            'fecha_cierre_esperada' => '2027-03-01',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.proceso', 'Docencia')
            ->assertJsonStructure(['data' => ['folio']]);

        $this->assertDatabaseHas('no_conformidades', ['clausula_iso' => '7.2']);
    }

    // S25-06: agregar acción correctiva a no conformidad
    public function test_puede_agregar_accion_correctiva(): void
    {
        $nc = NoConformidad::create([
            'folio'           => 'NC-2027-001',
            'tipo'            => 'interna',
            'proceso'         => 'Docencia',
            'descripcion'     => 'Sin descripción',
            'estatus'         => 'abierta',
            'fecha_deteccion' => '2027-02-01',
            'detectado_por'   => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->postJson("/api/no-conformidades/{$nc->id}/acciones", [
            'descripcion'      => 'Capacitar al personal docente.',
            'fecha_compromiso' => now()->addDays(30)->toDateString(),
            'responsable_id'   => $this->director->id,
        ]);

        $res->assertStatus(201)->assertJsonPath('data.estatus', 'pendiente');
        $this->assertDatabaseHas('acciones_correctivas', ['no_conformidad_id' => $nc->id]);
    }

    // S25-07: cerrar no conformidad
    public function test_director_puede_cerrar_no_conformidad(): void
    {
        $nc = NoConformidad::create([
            'folio'           => 'NC-2027-002',
            'tipo'            => 'interna',
            'proceso'         => 'Servicios',
            'descripcion'     => 'Descripción de prueba',
            'estatus'         => 'abierta',
            'fecha_deteccion' => '2027-01-15',
            'detectado_por'   => $this->admin->id,
        ]);

        $res = $this->actingAs($this->director)->patchJson("/api/no-conformidades/{$nc->id}/cerrar", [
            'causa_raiz' => 'Falta de protocolo documentado.',
        ]);

        $res->assertOk()->assertJsonPath('data.estatus', 'cerrada');
        $this->assertDatabaseHas('no_conformidades', ['id' => $nc->id, 'estatus' => 'cerrada']);
    }

    // S25-08: indicadores de calidad por periodo
    public function test_admin_puede_ver_indicadores_calidad(): void
    {
        EvidenciaCalidad::create([
            'periodo_id'      => $this->periodo->id,
            'proceso'         => 'Docencia',
            'indicador'       => 'Asistencia',
            'tipo_evidencia'  => 'lista',
            'fecha_evidencia' => '2027-01-08',
            'estatus'         => 'validada',
            'subido_por'      => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/indicadores/calidad/{$this->periodo->id}");
        $res->assertOk()->assertJsonStructure(['data' => [
            'total_evidencias', 'evidencias_validadas', 'evidencias_pendientes',
            'no_conformidades_abiertas', 'no_conformidades_vencidas', 'por_proceso',
        ]]);
    }
}
