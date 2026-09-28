<?php

namespace Tests\Feature\Api;

use App\Domains\Academico\Models\AlertaCorteCaptura;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\CorteCaptura;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Horario;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\SesionClase;
use App\Domains\Seguridad\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Cobertura para cuatro features de sesiones anteriores que llegaron a producción
 * verificadas solo a mano (tinker/navegador), sin ningún test automatizado: Torre
 * de Control, Gamificación (ranking docente), Pasaporte QR de docente, y el feed
 * de exportación BI (API keys + endpoints CSV).
 */
class Sprint27Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $docente;
    private Carrera $carrera;
    private Periodo $periodo;
    private Grupo $grupo;
    private Materia $materia;
    private Aula $aula;
    private CargaAcademica $carga;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create(['email' => 'admin.s27@test.com']);
        $this->admin->assignRole('admin');

        $this->docente = User::factory()->create(['email' => 'doc.s27@test.com']);
        $this->docente->assignRole('docente');

        $this->carrera = Carrera::create([
            'nombre' => 'Ingeniería en Sistemas', 'clave' => 'ISC27',
            'codigo_it' => 'ITSM-ISC27', 'vigente' => true, 'duracion_semestres' => 9,
        ]);

        $this->periodo = Periodo::create([
            'nombre' => '2025-A', 'fecha_inicio' => now()->subWeeks(4)->toDateString(),
            'fecha_fin' => now()->addMonths(3)->toDateString(), 'activo' => true,
        ]);

        $this->materia = Materia::create([
            'nombre' => 'Algoritmos', 'clave' => 'ALG27S', 'carrera_id' => $this->carrera->id,
            'semestre' => 1, 'creditos' => 5,
        ]);

        $this->grupo = Grupo::create([
            'carrera_id' => $this->carrera->id, 'periodo_id' => $this->periodo->id,
            'clave' => 'A', 'semestre' => 1, 'turno' => 'matutino',
        ]);

        $this->aula = Aula::create(['nombre' => 'E101', 'capacidad' => 35, 'tipo' => 'salon', 'activa' => true]);

        $this->carga = CargaAcademica::create([
            'docente_id' => $this->docente->id, 'materia_id' => $this->materia->id,
            'periodo_id' => $this->periodo->id, 'aula_id' => $this->aula->id, 'horas_semana' => 4,
        ]);
        $this->carga->grupos()->attach($this->grupo->id);
    }

    private function crearHorarioHoyAhora(): Horario
    {
        $dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return Horario::create([
            'carga_academica_id' => $this->carga->id,
            'dia_semana' => $dias[now()->dayOfWeek] === 'domingo' ? 'lunes' : $dias[now()->dayOfWeek],
            'hora_inicio' => now()->format('H:i'),
            'hora_fin' => now()->addHours(2)->format('H:i'),
        ]);
    }

    // ── Torre de Control ─────────────────────────────────────────────────────

    public function test_torre_control_requiere_periodo_id(): void
    {
        $this->actingAs($this->admin)->getJson('/api/torre-control')->assertStatus(422);
    }

    public function test_docente_no_puede_ver_torre_control(): void
    {
        $this->actingAs($this->docente)->getJson("/api/torre-control?periodo_id={$this->periodo->id}")->assertStatus(403);
    }

    public function test_torre_control_marca_aula_ocupada_con_clase_en_curso(): void
    {
        $this->crearHorarioHoyAhora();

        $r = $this->actingAs($this->admin)->getJson("/api/torre-control?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $aulaResumen = collect($r->json('data.aulas'))->firstWhere('id', $this->aula->id);
        $this->assertNotNull($aulaResumen);

        // Domingo no hay clases (horario no incluye domingo) — el resto de la
        // semana la carga creada arriba debe marcar el aula como ocupada ahora.
        if (now()->dayOfWeek !== 0) {
            $this->assertTrue($aulaResumen['ocupada']);
            $this->assertSame('Algoritmos', $aulaResumen['materia']);
        }
    }

    public function test_torre_control_cuenta_incidencias_de_hoy(): void
    {
        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'aula_id' => $this->aula->id, 'registrado_por_id' => $this->admin->id,
            'fecha' => now()->toDateString(), 'hora_revision' => '08:00', 'estatus' => 'docente_ausente',
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/torre-control?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertSame(1, $r->json('data.incidencias_hoy.total'));
        $this->assertSame(1, $r->json('data.incidencias_hoy.con_novedad'));
    }

    // ── Gamificación / ranking docente ───────────────────────────────────────

    public function test_docente_puede_ver_ranking_pero_no_es_de_solo_admin(): void
    {
        $this->actingAs($this->docente)
            ->getJson("/api/gamificacion/ranking-docentes?periodo_id={$this->periodo->id}")
            ->assertOk();
    }

    public function test_ranking_otorga_insignia_de_cumplimiento_ejemplar(): void
    {
        Horario::create([
            'carga_academica_id' => $this->carga->id, 'dia_semana' => 'lunes',
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);
        $corte = CorteCaptura::create([
            'periodo_id' => $this->periodo->id, 'numero' => 1, 'nombre' => 'Primer corte',
            'fecha_corte' => now()->toDateString(), 'fecha_limite_captura' => now()->addDays(3)->toDateString(),
        ]);
        AlertaCorteCaptura::create([
            'periodo_id' => $this->periodo->id, 'docente_id' => $this->docente->id,
            'carga_academica_id' => $this->carga->id, 'corte_captura_id' => $corte->id,
            'porcentaje_capturado' => 100,
        ]);

        $r = $this->actingAs($this->admin)->getJson("/api/gamificacion/ranking-docentes?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $fila = collect($r->json('data'))->firstWhere('docente_id', $this->docente->id);
        $this->assertNotNull($fila);
        $this->assertSame(1, $fila['posicion']);
        $iconos = collect($fila['insignias'])->pluck('icono');
        $this->assertTrue($iconos->contains('📝'));
    }

    public function test_ranking_no_pondera_señales_que_no_aplican(): void
    {
        // Sin horarios, sin alertas de captura, sin incidencias: el docente aparece
        // con pct_sin_novedad=100 (por defecto) y las demás señales en null, sin
        // castigarlo por datos que ni siquiera existen todavía.
        $r = $this->actingAs($this->admin)->getJson("/api/gamificacion/ranking-docentes?periodo_id={$this->periodo->id}");
        $r->assertOk();

        $fila = collect($r->json('data'))->firstWhere('docente_id', $this->docente->id);
        $this->assertNotNull($fila);
        $this->assertNull($fila['pct_captura']);
        $this->assertNull($fila['pct_asistencia']);
        $this->assertSame(100, $fila['pct_sin_novedad']);
    }

    // ── Pasaporte QR de docente ──────────────────────────────────────────────

    public function test_docente_puede_ver_su_propio_pasaporte(): void
    {
        $r = $this->actingAs($this->docente)
            ->getJson("/api/docentes/{$this->docente->id}/pasaporte?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $r->assertJsonPath('data.docente.id', $this->docente->id);
    }

    public function test_docente_no_puede_ver_pasaporte_de_otro_docente(): void
    {
        $otroDocente = User::factory()->create(['email' => 'otro.s27@test.com']);
        $otroDocente->assignRole('docente');

        $this->actingAs($this->docente)
            ->getJson("/api/docentes/{$otroDocente->id}/pasaporte?periodo_id={$this->periodo->id}")
            ->assertStatus(403);
    }

    public function test_admin_puede_ver_pasaporte_de_cualquier_docente(): void
    {
        SesionClase::create([
            'grupo_id' => $this->grupo->id, 'carga_academica_id' => $this->carga->id,
            'docente_id' => $this->docente->id, 'fecha' => now()->toDateString(),
            'hora_inicio' => '08:00', 'hora_fin' => '10:00',
        ]);

        $r = $this->actingAs($this->admin)
            ->getJson("/api/docentes/{$this->docente->id}/pasaporte?periodo_id={$this->periodo->id}");
        $r->assertOk();
        $this->assertSame(1, $r->json('data.asistencia.registradas'));
    }

    // ── Exportación BI (API keys + feed CSV) ─────────────────────────────────

    public function test_solo_admin_puede_generar_llaves_bi(): void
    {
        $this->actingAs($this->docente)->postJson('/api/admin/api-keys', ['nombre' => 'Power BI'])
            ->assertStatus(403);

        $r = $this->actingAs($this->admin)->postJson('/api/admin/api-keys', ['nombre' => 'Power BI']);
        $r->assertStatus(201);
        $this->assertNotEmpty($r->json('data.llave'));
        $this->assertStringStartsWith('sice_', $r->json('data.llave'));
    }

    public function test_llave_revocada_ya_no_pasa_el_middleware(): void
    {
        [$modelo, $llave] = ApiKey::generar('Looker Studio', $this->admin->id);

        $this->getJson('/api/bi/indicadores-carrera.csv', ['X-Api-Key' => $llave])->assertOk();

        $this->actingAs($this->admin)->patchJson("/api/admin/api-keys/{$modelo->id}/revocar")->assertOk();

        $this->getJson('/api/bi/indicadores-carrera.csv', ['X-Api-Key' => $llave])->assertStatus(401);
    }

    public function test_bi_feed_sin_llave_es_rechazado(): void
    {
        $this->getJson('/api/bi/indicadores-carrera.csv')->assertStatus(401);
    }

    public function test_bi_feed_de_incidencias_devuelve_csv_con_los_datos(): void
    {
        [, $llave] = ApiKey::generar('Test feed', $this->admin->id);

        IncidenciaClase::create([
            'periodo_id' => $this->periodo->id, 'grupo_id' => $this->grupo->id,
            'aula_id' => $this->aula->id, 'registrado_por_id' => $this->admin->id,
            'fecha' => now()->toDateString(), 'hora_revision' => '09:00', 'estatus' => 'aula_vacia',
        ]);

        $response = $this->get('/api/bi/incidencias.csv', ['X-Api-Key' => $llave]);
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $contenido = $response->streamedContent();
        $this->assertStringContainsString('aula_vacia', $contenido);
        $this->assertStringContainsString($this->aula->nombre, $contenido);
    }
}
