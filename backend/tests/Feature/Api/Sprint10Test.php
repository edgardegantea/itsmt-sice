<?php

namespace Tests\Feature\Api;

use App\Domains\Capacitacion\Models\AsistenciaCapacitacion;
use App\Domains\Capacitacion\Models\CedulaInscripcion;
use App\Domains\Capacitacion\Models\CursoCapacitacion;
use App\Domains\Capacitacion\Models\EvaluacionSeguimientoCap;
use App\Domains\Personal\Models\Comision;
use App\Domains\Personal\Models\SolicitudPersonal;
use App\Domains\Personal\Models\TipoSolicitudPersonal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Sprint10Test extends TestCase
{
    use RefreshDatabase;

    private User   $director;
    private User   $docente;
    private User   $personal;
    private User   $alumno;
    private string $tipoId;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'admin', 'docente', 'jefe_carrera', 'alumno',
                  'director_academico', 'control_escolar', 'direccion_general',
                  'direccion_academica', 'subdireccion_academica', 'personal_administrativo'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->director = User::factory()->create(['email' => 'dir.s10@test.com']);
        $this->director->assignRole('director_academico');

        $this->docente = User::factory()->create(['email' => 'doc.s10@test.com']);
        $this->docente->assignRole('docente');

        $this->personal = User::factory()->create(['email' => 'adm.s10@test.com']);
        $this->personal->assignRole('personal_administrativo');

        $this->alumno = User::factory()->create(['email' => 'alu.s10@test.com']);
        $this->alumno->assignRole('alumno');

        // La migración siembra los tipos en up(); recuperamos el primero
        $tipo = TipoSolicitudPersonal::first()
            ?? TipoSolicitudPersonal::create([
                'nombre'               => 'Permiso con goce de sueldo',
                'documentos_requeridos'=> ['Solicitud firmada', 'Justificante'],
            ]);
        $this->tipoId = $tipo->id;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private function crearSolicitud(User $user, string $estatus = 'pendiente'): SolicitudPersonal
    {
        return SolicitudPersonal::create([
            'solicitante_id' => $user->id,
            'tipo_id'        => $this->tipoId,
            'fecha_inicio'   => now()->addDays(5)->toDateString(),
            'fecha_fin'      => now()->addDays(7)->toDateString(),
            'motivo'         => 'Asunto personal urgente',
            'estatus'        => $estatus,
        ]);
    }

    private function crearCurso(string $estatus = 'planeado'): CursoCapacitacion
    {
        return CursoCapacitacion::create([
            'nombre'          => 'Programación con IA',
            'tipo'            => 'formacion_docente',
            'modalidad'       => 'presencial',
            'origen'          => 'interno',
            'instructor'      => 'Mtro. José López',
            'periodo_inicio'  => now()->addDays(10)->toDateString(),
            'periodo_fin'     => now()->addDays(14)->toDateString(),
            'horas_totales'   => 20,
            'horario'         => '08:00 - 12:00',
            'jefe_depto_id'   => $this->personal->id,
            'estatus'         => $estatus,
        ]);
    }

    private function datosCedula(): array
    {
        return [
            'rfc'                   => 'LODJ900101ABC',
            'curp'                  => 'LODJ900101HVZPXR09',
            'sexo'                  => 'H',
            'grado_maximo_estudios' => 'Maestría',
            'nombre_carrera'        => 'Ingeniería en Sistemas',
            'area_adscripcion'      => 'Departamento de Sistemas',
            'puesto'                => 'Docente de tiempo completo',
            'clave_presupuestal'    => 'DTC-001',
            'jefe_inmediato'        => 'Mtro. Carlos Pérez',
            'telefono_oficial'      => '2369620250',
            'horario_laboral'       => '07:00-15:00',
        ];
    }

    // ── Catálogo tipos (S10-01) ──────────────────────────────────────────────────

    public function test_cualquier_autenticado_puede_ver_tipos_solicitud(): void
    {
        $r = $this->actingAs($this->docente)->getJson('/api/tipos-solicitud-personal');
        $r->assertOk();
        $this->assertGreaterThanOrEqual(1, count($r->json('data')));
    }

    // ── S10-01: Personal solicita permiso ────────────────────────────────────────

    public function test_docente_puede_solicitar_permiso(): void
    {
        $r = $this->actingAs($this->docente)->postJson('/api/solicitudes-personal', [
            'tipo_id'      => $this->tipoId,
            'fecha_inicio' => now()->addDays(3)->toDateString(),
            'fecha_fin'    => now()->addDays(4)->toDateString(),
            'motivo'       => 'Cita médica urgente',
        ]);

        $r->assertStatus(201);
        $this->assertEquals('pendiente', $r->json('data.estatus'));
        $this->assertDatabaseHas('solicitudes_personal', [
            'solicitante_id' => $this->docente->id,
            'estatus'        => 'pendiente',
        ]);
    }

    public function test_personal_administrativo_puede_solicitar_permiso(): void
    {
        $r = $this->actingAs($this->personal)->postJson('/api/solicitudes-personal', [
            'tipo_id'      => $this->tipoId,
            'fecha_inicio' => now()->addDays(1)->toDateString(),
            'fecha_fin'    => now()->addDays(1)->toDateString(),
            'motivo'       => 'Trámite personal',
        ]);

        $r->assertStatus(201);
    }

    public function test_alumno_no_puede_solicitar_permiso(): void
    {
        $this->actingAs($this->alumno)->postJson('/api/solicitudes-personal', [
            'tipo_id'      => $this->tipoId,
            'fecha_inicio' => now()->addDays(1)->toDateString(),
            'fecha_fin'    => now()->addDays(1)->toDateString(),
            'motivo'       => 'Test',
        ])->assertStatus(403);
    }

    public function test_fecha_fin_no_puede_ser_anterior_a_fecha_inicio(): void
    {
        $this->actingAs($this->docente)->postJson('/api/solicitudes-personal', [
            'tipo_id'      => $this->tipoId,
            'fecha_inicio' => now()->addDays(5)->toDateString(),
            'fecha_fin'    => now()->addDays(3)->toDateString(),
            'motivo'       => 'Test',
        ])->assertStatus(422);
    }

    // ── S10-02: Director resuelve ────────────────────────────────────────────────

    public function test_director_puede_aprobar_solicitud(): void
    {
        $sol = $this->crearSolicitud($this->docente);

        $r = $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-personal/{$sol->id}/resolver", [
                'estatus' => 'aprobada',
            ]);

        $r->assertOk();
        $this->assertEquals('aprobada', $r->json('data.estatus'));
        // atendida_por devuelve el objeto User (relación cargada), verificamos el id
        $this->assertDatabaseHas('solicitudes_personal', [
            'id'          => $sol->id,
            'estatus'     => 'aprobada',
            'atendida_por'=> $this->director->id,
        ]);
    }

    public function test_director_puede_rechazar_solicitud_con_observaciones(): void
    {
        $sol = $this->crearSolicitud($this->docente);

        $r = $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-personal/{$sol->id}/resolver", [
                'estatus'       => 'rechazada',
                'observaciones' => 'No hay personal de reemplazo disponible.',
            ]);

        $r->assertOk();
        $this->assertEquals('rechazada', $r->json('data.estatus'));
    }

    public function test_no_se_puede_resolver_dos_veces(): void
    {
        $sol = $this->crearSolicitud($this->docente, 'aprobada');

        $this->actingAs($this->director)
            ->patchJson("/api/solicitudes-personal/{$sol->id}/resolver", ['estatus' => 'rechazada'])
            ->assertStatus(422);
    }

    public function test_docente_no_puede_resolver_solicitud(): void
    {
        $sol = $this->crearSolicitud($this->docente);

        $this->actingAs($this->docente)
            ->patchJson("/api/solicitudes-personal/{$sol->id}/resolver", ['estatus' => 'aprobada'])
            ->assertStatus(403);
    }

    // ── S10-02: PDF documento oficial ────────────────────────────────────────────

    public function test_director_puede_descargar_pdf_de_permiso_aprobado(): void
    {
        $sol = $this->crearSolicitud($this->docente, 'aprobada');
        $sol->update(['atendida_por' => $this->director->id]);

        $r = $this->actingAs($this->director)
            ->get("/api/solicitudes-personal/{$sol->id}/documento/pdf");

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }

    public function test_no_se_puede_generar_pdf_de_solicitud_pendiente(): void
    {
        $sol = $this->crearSolicitud($this->docente, 'pendiente');

        $this->actingAs($this->director)
            ->get("/api/solicitudes-personal/{$sol->id}/documento/pdf")
            ->assertStatus(422);
    }

    // ── S10-04: Historial personal ────────────────────────────────────────────────

    public function test_personal_puede_ver_su_propio_historial(): void
    {
        $this->crearSolicitud($this->docente);

        $r = $this->actingAs($this->docente)
            ->getJson("/api/personal/{$this->docente->id}/historial");

        $r->assertOk();
        $this->assertCount(1, $r->json('data.solicitudes'));
        $this->assertCount(0, $r->json('data.comisiones'));
    }

    public function test_personal_no_puede_ver_historial_ajeno(): void
    {
        $this->actingAs($this->docente)
            ->getJson("/api/personal/{$this->personal->id}/historial")
            ->assertStatus(403);
    }

    public function test_director_puede_ver_historial_de_cualquier_persona(): void
    {
        $this->crearSolicitud($this->docente);

        $r = $this->actingAs($this->director)
            ->getJson("/api/personal/{$this->docente->id}/historial");

        $r->assertOk();
        $this->assertCount(1, $r->json('data.solicitudes'));
    }

    // ── S10-03: Comisiones ─────────────────────────────────────────────────────

    public function test_director_puede_registrar_comision(): void
    {
        $r = $this->actingAs($this->director)->postJson('/api/comisiones', [
            'personal_id'  => $this->docente->id,
            'destino'      => 'Ciudad de México',
            'proposito'    => 'Asistencia a congreso nacional de tecnología educativa',
            'fecha_inicio' => now()->addDays(10)->toDateString(),
            'fecha_fin'    => now()->addDays(12)->toDateString(),
            'con_viaticos' => true,
            'monto_viaticos'=> 3500.00,
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('comisiones', [
            'personal_id'  => $this->docente->id,
            'asignada_por' => $this->director->id,
        ]);
    }

    public function test_docente_no_puede_registrar_comision(): void
    {
        $this->actingAs($this->docente)->postJson('/api/comisiones', [
            'personal_id'  => $this->docente->id,
            'destino'      => 'CDMX',
            'proposito'    => 'Test',
            'fecha_inicio' => now()->addDays(1)->toDateString(),
            'fecha_fin'    => now()->addDays(2)->toDateString(),
        ])->assertStatus(403);
    }

    public function test_comision_sin_viaticos_no_requiere_monto(): void
    {
        $r = $this->actingAs($this->director)->postJson('/api/comisiones', [
            'personal_id'  => $this->docente->id,
            'destino'      => 'Xalapa',
            'proposito'    => 'Reunión técnica',
            'fecha_inicio' => now()->addDays(3)->toDateString(),
            'fecha_fin'    => now()->addDays(3)->toDateString(),
            'con_viaticos' => false,
        ]);

        $r->assertStatus(201);
        $this->assertNull($r->json('data.monto_viaticos'));
    }

    public function test_personal_solo_ve_sus_propias_comisiones(): void
    {
        Comision::create([
            'personal_id'  => $this->docente->id,
            'destino'      => 'CDMX',
            'proposito'    => 'Congreso',
            'fecha_inicio' => now()->addDays(5)->toDateString(),
            'fecha_fin'    => now()->addDays(7)->toDateString(),
            'con_viaticos' => false,
            'asignada_por' => $this->director->id,
        ]);
        Comision::create([
            'personal_id'  => $this->personal->id,
            'destino'      => 'Puebla',
            'proposito'    => 'Auditoría',
            'fecha_inicio' => now()->addDays(8)->toDateString(),
            'fecha_fin'    => now()->addDays(9)->toDateString(),
            'con_viaticos' => false,
            'asignada_por' => $this->director->id,
        ]);

        $r = $this->actingAs($this->docente)->getJson('/api/comisiones');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.data'));
    }

    public function test_director_puede_descargar_oficio_comision_pdf(): void
    {
        $com = Comision::create([
            'personal_id'  => $this->docente->id,
            'destino'      => 'Veracruz',
            'proposito'    => 'Visita institucional',
            'fecha_inicio' => now()->addDays(3)->toDateString(),
            'fecha_fin'    => now()->addDays(3)->toDateString(),
            'con_viaticos' => false,
            'asignada_por' => $this->director->id,
        ]);

        $r = $this->actingAs($this->director)
            ->get("/api/comisiones/{$com->id}/oficio/pdf");

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }

    // ── S10-07: Cursos AP/FD ──────────────────────────────────────────────────────

    public function test_jefe_puede_registrar_curso_capacitacion(): void
    {
        $r = $this->actingAs($this->personal)->postJson('/api/cursos-capacitacion', [
            'nombre'         => 'Uso didáctico de la IA',
            'tipo'           => 'formacion_docente',
            'modalidad'      => 'presencial',
            'origen'         => 'interno',
            'instructor'     => 'Dr. Ramón Díaz',
            'periodo_inicio' => now()->addDays(7)->toDateString(),
            'periodo_fin'    => now()->addDays(11)->toDateString(),
            'horas_totales'  => 20,
            'horario'        => '08:00-12:00',
        ]);

        $r->assertStatus(201);
        $this->assertEquals('planeado', $r->json('data.estatus'));
        $this->assertDatabaseHas('cursos_capacitacion', [
            'nombre'      => 'Uso didáctico de la IA',
            'jefe_depto_id'=> $this->personal->id,
        ]);
    }

    public function test_alumno_no_puede_registrar_curso(): void
    {
        $this->actingAs($this->alumno)->postJson('/api/cursos-capacitacion', [
            'nombre'        => 'Test',
            'tipo'          => 'formacion_docente',
            'modalidad'     => 'presencial',
            'origen'        => 'interno',
            'instructor'    => 'Test',
            'periodo_inicio'=> now()->addDays(1)->toDateString(),
            'periodo_fin'   => now()->addDays(2)->toDateString(),
            'horas_totales' => 8,
        ])->assertStatus(403);
    }

    public function test_jefe_puede_cambiar_estatus_del_curso(): void
    {
        $curso = $this->crearCurso('planeado');

        $r = $this->actingAs($this->personal)
            ->patchJson("/api/cursos-capacitacion/{$curso->id}", [
                'estatus' => 'en_curso',
            ]);

        $r->assertOk();
        $this->assertEquals('en_curso', $r->json('data.estatus'));
    }

    // ── S10-08: Inscripción docente ────────────────────────────────────────────────

    public function test_docente_puede_inscribirse_a_curso(): void
    {
        $curso = $this->crearCurso('planeado');

        $r = $this->actingAs($this->docente)
            ->postJson("/api/cursos-capacitacion/{$curso->id}/inscripciones", $this->datosCedula());

        $r->assertStatus(201);
        $this->assertEquals('inscrito', $r->json('data.estatus'));
        $this->assertDatabaseHas('cedulas_inscripcion_capacitacion', [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]);
    }

    public function test_no_se_puede_inscribir_dos_veces_al_mismo_curso(): void
    {
        $curso = $this->crearCurso();
        CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]));

        $this->actingAs($this->docente)
            ->postJson("/api/cursos-capacitacion/{$curso->id}/inscripciones", $this->datosCedula())
            ->assertStatus(422);
    }

    public function test_no_se_puede_inscribir_a_curso_finalizado(): void
    {
        $curso = $this->crearCurso('finalizado');

        $this->actingAs($this->docente)
            ->postJson("/api/cursos-capacitacion/{$curso->id}/inscripciones", $this->datosCedula())
            ->assertStatus(422);
    }

    public function test_inscripcion_requiere_rfc_y_curp(): void
    {
        $curso = $this->crearCurso();

        $this->actingAs($this->docente)
            ->postJson("/api/cursos-capacitacion/{$curso->id}/inscripciones", [
                'rfc' => 'LODJ900101ABC',
                // faltan campos obligatorios
            ])->assertStatus(422);
    }

    public function test_jefe_puede_listar_inscritos_a_curso(): void
    {
        $curso = $this->crearCurso();
        CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]));

        $r = $this->actingAs($this->personal)
            ->getJson("/api/cursos-capacitacion/{$curso->id}/inscripciones");

        $r->assertOk();
        $this->assertCount(1, $r->json('data'));
    }

    // ── PDF Cédula de Inscripción ──────────────────────────────────────────────────

    public function test_puede_descargar_pdf_cedula_inscripcion(): void
    {
        $curso = $this->crearCurso();
        $cedula = CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]));

        $r = $this->actingAs($this->personal)
            ->get("/api/cedulas-inscripcion/{$cedula->id}/pdf");

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }

    // ── Listado solicitudes ────────────────────────────────────────────────────────

    public function test_personal_solo_ve_sus_propias_solicitudes(): void
    {
        $this->crearSolicitud($this->docente);
        $this->crearSolicitud($this->personal);

        $r = $this->actingAs($this->docente)->getJson('/api/solicitudes-personal');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.data'));
    }

    public function test_director_puede_ver_todas_las_solicitudes(): void
    {
        $this->crearSolicitud($this->docente);
        $this->crearSolicitud($this->personal);

        $r = $this->actingAs($this->director)->getJson('/api/solicitudes-personal');
        $r->assertOk();
        $this->assertCount(2, $r->json('data.data'));
    }

    // ── S10-09: Asistencias de Capacitación ──────────────────────────────────

    public function test_jefe_puede_registrar_asistencia_capacitacion(): void
    {
        $curso  = $this->crearCurso('en_curso');
        $cedula = CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]));

        $r = $this->actingAs($this->personal)->postJson('/api/asistencias-capacitacion', [
            'cedula_id' => $cedula->id,
            'fecha'     => now()->toDateString(),
            'presente'  => true,
        ]);

        $r->assertStatus(201);
        $this->assertDatabaseHas('asistencias_capacitacion', [
            'cedula_id' => $cedula->id,
            'presente'  => true,
        ]);
    }

    public function test_segunda_asistencia_misma_fecha_actualiza_en_lugar_de_duplicar(): void
    {
        $curso  = $this->crearCurso('en_curso');
        $cedula = CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'inscrito',
        ]));

        $fecha = now()->toDateString();

        $this->actingAs($this->personal)->postJson('/api/asistencias-capacitacion', [
            'cedula_id' => $cedula->id, 'fecha' => $fecha, 'presente' => true,
        ]);

        $this->actingAs($this->personal)->postJson('/api/asistencias-capacitacion', [
            'cedula_id' => $cedula->id, 'fecha' => $fecha, 'presente' => false,
        ]);

        $this->assertDatabaseCount('asistencias_capacitacion', 1);
        $this->assertDatabaseHas('asistencias_capacitacion', [
            'cedula_id' => $cedula->id,
            'presente'  => 0,
        ]);
    }

    public function test_puede_descargar_lista_asistencia_pdf(): void
    {
        $curso = $this->crearCurso('en_curso');

        $r = $this->actingAs($this->personal)
            ->get("/api/cursos-capacitacion/{$curso->id}/lista-asistencia/pdf");

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }

    // ── S10-10: Evaluaciones de Seguimiento ───────────────────────────────────

    public function test_jefe_puede_registrar_evaluacion_seguimiento(): void
    {
        $curso  = $this->crearCurso('finalizado');
        $cedula = CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'completado',
        ]));

        $r = $this->actingAs($this->personal)->postJson('/api/evaluaciones-seguimiento-capacitacion', [
            'cedula_id'      => $cedula->id,
            'tipo_evaluador' => 'participante',
            'respuestas_json'=> [3, 4, 3, 4, 4, 3, 4, 4, 3, 4, 3],
        ]);

        $r->assertStatus(201);
        $this->assertNotNull($r->json('data.promedio'));
        $this->assertDatabaseHas('evaluaciones_seguimiento_cap', [
            'cedula_id'      => $cedula->id,
            'tipo_evaluador' => 'participante',
        ]);
    }

    public function test_evaluacion_resultado_correctivas_cuando_promedio_bajo(): void
    {
        $curso  = $this->crearCurso('finalizado');
        $cedula = CedulaInscripcion::create(array_merge($this->datosCedula(), [
            'curso_id'   => $curso->id,
            'usuario_id' => $this->docente->id,
            'estatus'    => 'completado',
        ]));

        $r = $this->actingAs($this->personal)->postJson('/api/evaluaciones-seguimiento-capacitacion', [
            'cedula_id'      => $cedula->id,
            'tipo_evaluador' => 'jefe_inmediato',
            'jefe_inmediato_nombre' => 'Ing. García',
            'respuestas_json'=> [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]);

        $r->assertStatus(201);
        $this->assertEquals('correctivas', $r->json('data.resultado'));
    }

    // ── S10-11: Registro General Capacitación ─────────────────────────────────

    public function test_jefe_puede_ver_registro_general_capacitacion(): void
    {
        $this->crearCurso('finalizado');
        $this->crearCurso('en_curso');

        $r = $this->actingAs($this->personal)->getJson('/api/registro-general-capacitacion');

        $r->assertOk();
        $this->assertCount(2, $r->json('data'));
    }

    public function test_puede_descargar_pdf_registro_general_capacitacion(): void
    {
        $this->crearCurso('finalizado');

        $r = $this->actingAs($this->personal)
            ->get('/api/registro-general-capacitacion/pdf');

        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type', ''));
    }

    public function test_alumno_no_puede_ver_registro_general(): void
    {
        $this->actingAs($this->alumno)
            ->getJson('/api/registro-general-capacitacion')
            ->assertStatus(403);
    }
}
