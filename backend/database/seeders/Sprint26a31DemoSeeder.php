<?php

namespace Database\Seeders;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Aula;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\EncuestaSeguimientoEgresado;
use App\Domains\Academico\Models\Egresado;
use App\Domains\Academico\Models\HistorialLaboralEgresado;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Academico\Models\PostulacionBolsaTrabajo;
use App\Domains\Academico\Models\VacanteBolsaTrabajo;
use App\Domains\Calidad\Models\AutoevaluacionDocente;
use App\Domains\Calidad\Models\EvaluacionAreaDocente;
use App\Domains\Calidad\Models\PlanMejoraDocente;
use App\Domains\Infraestructura\Models\Inventario;
use App\Domains\Infraestructura\Models\PrestamoEquipo;
use App\Domains\Infraestructura\Models\ReservaEspacio;
use App\Domains\Infraestructura\Models\SolicitudMantenimiento;
use App\Domains\Investigacion\Models\CuerpoAcademico;
use App\Domains\Investigacion\Models\IntegranteCa;
use App\Domains\Investigacion\Models\Lgac;
use App\Domains\Investigacion\Models\ProduccionAcademica;
use App\Domains\Investigacion\Models\ProyectoInvestigacion;
use App\Domains\Seguridad\Models\IncidenteSeguridad;
use App\Models\User;
use Illuminate\Database\Seeder;

// Datos de demostración para los módulos de los Sprints 26-31 (Investigación,
// Infraestructura, Portal del Egresado, Evaluación Docente ampliada,
// Seguridad Informática). Estos módulos no tenían ningún seeder propio, por lo
// que sus pantallas de administración aparecían vacías al probar el sistema.
class Sprint26a31DemoSeeder extends Seeder
{
    public function run(): void
    {
        $docentes = User::role('docente')->get();
        $admin    = User::role('admin')->first() ?? User::role('superadmin')->first();
        $periodo  = Periodo::where('activo', true)->first() ?? Periodo::first();
        $carreras = Carrera::all();

        if ($docentes->isEmpty() || !$admin) {
            $this->command->error('Se requieren usuarios con rol docente/admin (corre RoleSeeder y DocentesCargasSeeder primero).');
            return;
        }

        $this->seedInvestigacion($docentes);
        $this->seedInfraestructura($docentes, $admin);
        $this->seedPortalEgresado($carreras, $admin);
        $this->seedEvaluacionDocente($docentes, $periodo);
        $this->seedSeguridad($admin);
    }

    // ── Sprint 26 — Cuerpos Académicos e Investigación ────────────────────────
    private function seedInvestigacion($docentes): void
    {
        if (CuerpoAcademico::count() > 0) {
            $this->command->warn('Investigación ya tiene datos, se omite.');
            return;
        }

        $definiciones = [
            ['clave' => 'CA-ISC-01', 'nombre' => 'Ingeniería de Software y Sistemas Inteligentes', 'lgac' => 'Desarrollo de Software', 'grado' => 'en_consolidacion'],
            ['clave' => 'CA-IND-01', 'nombre' => 'Procesos Industriales y Manufactura Avanzada', 'lgac' => 'Optimización de Procesos', 'grado' => 'en_formacion'],
            ['clave' => 'CA-AMB-01', 'nombre' => 'Sustentabilidad y Gestión Ambiental', 'lgac' => 'Manejo de Recursos Naturales', 'grado' => 'consolidado'],
        ];

        foreach ($definiciones as $i => $def) {
            $lider = $docentes[$i % $docentes->count()];

            $ca = CuerpoAcademico::create([
                'nombre'              => $def['nombre'],
                'clave'               => $def['clave'],
                'lgac_principal'      => $def['lgac'],
                'grado_consolidacion' => $def['grado'],
                'fecha_registro'      => now()->subYears(2)->subMonths($i),
                'lider_id'            => $lider->id,
                'activo'              => true,
            ]);

            Lgac::create(['cuerpo_academico_id' => $ca->id, 'nombre' => $def['lgac'], 'descripcion' => "Línea de generación y aplicación del conocimiento en {$def['lgac']}."]);
            Lgac::create(['cuerpo_academico_id' => $ca->id, 'nombre' => 'Vinculación con el sector productivo', 'descripcion' => 'Proyectos aplicados con empresas de la región.']);

            IntegranteCa::create(['cuerpo_academico_id' => $ca->id, 'docente_id' => $lider->id, 'rol' => 'lider', 'fecha_ingreso' => $ca->fecha_registro]);
            foreach ($docentes->reject(fn ($d) => $d->id === $lider->id)->take(2) as $integrante) {
                IntegranteCa::create(['cuerpo_academico_id' => $ca->id, 'docente_id' => $integrante->id, 'rol' => 'integrante', 'fecha_ingreso' => $ca->fecha_registro]);
            }

            foreach (range(1, 2) as $p) {
                $proyecto = ProyectoInvestigacion::create([
                    'cuerpo_academico_id'   => $ca->id,
                    'titulo'                => "Proyecto de investigación {$p} — {$def['nombre']}",
                    'tipo'                  => $p === 1 ? 'financiado' : 'interno',
                    'fuente_financiamiento' => $p === 1 ? 'TecNM — Convocatoria de Investigación' : null,
                    'monto'                 => $p === 1 ? 85000 : null,
                    'fecha_inicio'          => now()->subMonths(10 - $p * 3),
                    'estatus'               => $p === 1 ? 'en_proceso' : 'concluido',
                    'responsable_id'        => $lider->id,
                    'descripcion'           => 'Proyecto de demostración generado para pruebas del sistema.',
                ]);

                foreach (range(1, 2) as $prod) {
                    ProduccionAcademica::create([
                        'proyecto_id'         => $proyecto->id,
                        'cuerpo_academico_id' => $ca->id,
                        'tipo'                => $prod === 1 ? 'articulo' : 'ponencia',
                        'titulo'              => "Producción académica {$prod} del proyecto {$p}",
                        'autor_principal_id'  => $lider->id,
                        'medio_difusion'      => $prod === 1 ? 'Revista Iberoamericana de Ingeniería' : 'Congreso Nacional de Ingeniería',
                        'fecha_publicacion'   => now()->subMonths(3 + $prod),
                        'estatus'             => 'validada',
                    ]);
                }
            }
        }

        $this->command->info('✓ Investigación: cuerpos académicos, LGAC, proyectos y producciones creadas.');
    }

    // ── Sprint 27 — Infraestructura y Recursos ────────────────────────────────
    private function seedInfraestructura($docentes, User $admin): void
    {
        if (Inventario::count() > 0) {
            $this->command->warn('Infraestructura ya tiene datos, se omite.');
            return;
        }

        $aulas = Aula::all();
        if ($aulas->isEmpty()) {
            // BD recién migrada sin DocentesCargasSeeder: crea unas cuantas
            // aulas mínimas para poder generar inventario/reservas de prueba.
            foreach (['E101', 'E102', 'L-INF-1', 'T-IND'] as $nombre) {
                Aula::firstOrCreate(['nombre' => $nombre], ['tipo' => 'salon', 'capacidad' => 35, 'activa' => true]);
            }
            $aulas = Aula::all();
        }

        $items = [
            ['nombre' => 'Laptop Dell Latitude', 'categoria' => 'equipo_computo', 'valor' => 14500],
            ['nombre' => 'Proyector Epson PowerLite', 'categoria' => 'audiovisual', 'valor' => 8200],
            ['nombre' => 'Mesa de trabajo laboratorio', 'categoria' => 'mobiliario', 'valor' => 3200],
            ['nombre' => 'Microscopio digital', 'categoria' => 'laboratorio', 'valor' => 21000],
            ['nombre' => 'Impresora 3D Creality', 'categoria' => 'laboratorio', 'valor' => 12800],
            ['nombre' => 'Silla ergonómica', 'categoria' => 'mobiliario', 'valor' => 1800],
            ['nombre' => 'Pantalla interactiva 65"', 'categoria' => 'audiovisual', 'valor' => 32000],
            ['nombre' => 'Computadora de escritorio HP', 'categoria' => 'equipo_computo', 'valor' => 11500],
            ['nombre' => 'Kit de herramientas eléctricas', 'categoria' => 'laboratorio', 'valor' => 5400],
            ['nombre' => 'Router de red Cisco', 'categoria' => 'equipo_computo', 'valor' => 4300],
            ['nombre' => 'Pizarrón inteligente', 'categoria' => 'audiovisual', 'valor' => 9600],
            ['nombre' => 'Anaquel metálico', 'categoria' => 'mobiliario', 'valor' => 2100],
        ];

        $inventarios = collect();
        foreach ($items as $i => $item) {
            $inventarios->push(Inventario::create([
                'clave'             => sprintf('INV-%04d', $i + 1),
                'nombre'            => $item['nombre'],
                'categoria'         => $item['categoria'],
                'aula_id'           => $aulas->random()->id,
                'estado'            => 'activo',
                'fecha_adquisicion' => now()->subMonths(rand(2, 30)),
                'valor'             => $item['valor'],
                'responsable_id'    => $admin->id,
                'activo'            => true,
            ]));
        }

        foreach (range(1, 8) as $i) {
            $prestado = $i % 3 !== 0;
            PrestamoEquipo::create([
                'inventario_id'             => $inventarios->random()->id,
                'solicitante_id'            => $docentes->random()->id,
                'fecha_prestamo'            => now()->subDays(rand(5, 40)),
                'fecha_devolucion_prevista' => now()->addDays(rand(1, 10)),
                'fecha_devolucion_real'     => $prestado ? null : now()->subDays(rand(1, 4)),
                'estatus'                   => $prestado ? 'prestado' : 'devuelto',
            ]);
        }

        foreach (range(1, 8) as $i) {
            ReservaEspacio::create([
                'aula_id'        => $aulas->random()->id,
                'solicitante_id' => $docentes->random()->id,
                'fecha'          => now()->addDays(rand(1, 20)),
                'hora_inicio'    => sprintf('%02d:00', rand(7, 17)),
                'hora_fin'       => sprintf('%02d:00', rand(18, 20)),
                'motivo'         => ['Asesoría extraclase', 'Curso de capacitación', 'Reunión de academia', 'Evento institucional'][$i % 4],
                'estatus'        => ['pendiente', 'aprobada', 'aprobada', 'rechazada'][$i % 4],
                'aprobado_por'   => $i % 4 === 3 ? null : $admin->id,
            ]);
        }

        foreach (range(1, 6) as $i) {
            $resuelta = $i % 2 === 0;
            SolicitudMantenimiento::create([
                'inventario_id'    => $i % 3 === 0 ? null : $inventarios->random()->id,
                'aula_id'          => $i % 3 === 0 ? $aulas->random()->id : null,
                'reportado_por'    => $docentes->random()->id,
                'tipo'             => $i % 2 === 0 ? 'preventivo' : 'correctivo',
                'descripcion'      => 'Solicitud de mantenimiento generada para pruebas del sistema.',
                'prioridad'        => ['baja', 'media', 'alta'][$i % 3],
                'estatus'          => $resuelta ? 'resuelta' : 'abierta',
                'fecha_reporte'    => now()->subDays(rand(3, 25)),
                'fecha_resolucion' => $resuelta ? now()->subDays(rand(1, 2)) : null,
                'atendido_por'     => $resuelta ? $admin->id : null,
            ]);
        }

        $this->command->info('✓ Infraestructura: inventario, préstamos, reservas y mantenimientos creados.');
    }

    // ── Sprint 28 — Portal del Egresado (ampliación) ──────────────────────────
    private function seedPortalEgresado($carreras, User $admin): void
    {
        if (Egresado::count() > 0) {
            $this->command->warn('Portal del egresado ya tiene datos, se omite.');
            return;
        }

        $alumnosEgresados = Alumno::where('estatus', 'egresado')->whereNotNull('user_id')->limit(50)->get();
        if ($alumnosEgresados->isEmpty()) {
            $this->command->warn('No hay alumnos con estatus "egresado", se omite portal del egresado.');
            return;
        }

        $empresas = ['Grupo Bimbo', 'Cemex', 'Pemex', 'Soriana', 'Telcel', 'Coca-Cola FEMSA', 'Despacho independiente', 'Gobierno Municipal', 'Startup propia', 'IBM México'];
        $puestos  = ['Analista', 'Coordinador de proyecto', 'Ingeniero de procesos', 'Desarrollador de software', 'Supervisor de producción', 'Gerente de área'];
        $sectores = ['publico', 'privado', 'privado', 'emprendimiento'];

        $egresados = collect();
        foreach ($alumnosEgresados as $alumno) {
            $egresado = Egresado::create([
                'alumno_id'          => $alumno->user_id,
                'anio_egreso'        => (int) now()->subYears(rand(0, 4))->format('Y'),
                'titulado'           => fake()->boolean(55),
                'empresa_actual'     => fake()->randomElement($empresas),
                'puesto_actual'      => fake()->randomElement($puestos),
                'sector'             => fake()->randomElement($sectores),
                'correo_actualizado' => null,
            ]);
            $egresados->push($egresado);

            HistorialLaboralEgresado::create([
                'egresado_id'    => $egresado->id,
                'empresa'        => $egresado->empresa_actual,
                'puesto'         => $egresado->puesto_actual,
                'sector'         => $egresado->sector,
                'fecha_inicio'   => now()->subYears(1)->subMonths(rand(0, 6)),
                'activo'         => true,
                'rango_salarial' => fake()->randomElement(['$8,000 - $12,000', '$12,000 - $18,000', '$18,000 - $25,000']),
            ]);

            if (fake()->boolean(60)) {
                EncuestaSeguimientoEgresado::create([
                    'egresado_id'                => $egresado->id,
                    'periodo_aplicacion'         => 'Enero–Junio 2026',
                    'satisfaccion_formacion'     => rand(3, 5),
                    'pertinencia_plan_estudios'  => rand(3, 5),
                    'empleabilidad_meses'        => rand(1, 12),
                    'recomendaria'               => fake()->boolean(85),
                    'estatus'                    => 'respondida',
                    'fecha_respuesta'            => now()->subMonths(rand(1, 4)),
                ]);
            }
        }

        $vacantes = collect();
        foreach (range(1, 10) as $i) {
            $vacantes->push(VacanteBolsaTrabajo::create([
                'empresa'           => fake()->randomElement($empresas),
                'puesto'            => fake()->randomElement($puestos),
                'descripcion'       => 'Vacante de demostración generada para pruebas del sistema.',
                'carrera_id'        => $carreras->isNotEmpty() ? $carreras->random()->id : null,
                'modalidad'         => ['presencial', 'remoto', 'hibrido'][$i % 3],
                'contacto_email'    => "vacante{$i}@empresa-demo.com.mx",
                'fecha_publicacion' => now()->subDays(rand(1, 30)),
                'fecha_cierre'      => now()->addDays(rand(10, 45)),
                'activa'            => true,
                'publicado_por'     => $admin->id,
            ]));
        }

        foreach (range(1, 20) as $i) {
            PostulacionBolsaTrabajo::create([
                'vacante_id'        => $vacantes->random()->id,
                'egresado_id'       => $egresados->random()->id,
                'fecha_postulacion' => now()->subDays(rand(1, 20)),
                'estatus'           => ['postulado', 'en_proceso', 'contratado', 'rechazado'][$i % 4],
            ]);
        }

        $this->command->info('✓ Portal del egresado: egresados, historial laboral, encuestas, vacantes y postulaciones creados.');
    }

    // ── Sprint 29 — Evaluación Docente ampliada (esqueleto) ───────────────────
    private function seedEvaluacionDocente($docentes, ?Periodo $periodo): void
    {
        if (AutoevaluacionDocente::count() > 0) {
            $this->command->warn('Evaluación docente ampliada ya tiene datos, se omite.');
            return;
        }

        // Módulo intencionalmente mínimo — el diseño detallado quedó pendiente
        // de definir junto con el usuario. Solo se crean registros "pendiente"
        // para que las pantallas no aparezcan vacías durante las pruebas.
        foreach ($docentes as $docente) {
            AutoevaluacionDocente::create(['docente_id' => $docente->id, 'periodo_id' => $periodo?->id, 'estatus' => 'pendiente']);
            EvaluacionAreaDocente::create(['docente_id' => $docente->id, 'periodo_id' => $periodo?->id, 'estatus' => 'pendiente']);
        }
        PlanMejoraDocente::create(['docente_id' => $docentes->first()->id, 'periodo_id' => $periodo?->id, 'estatus' => 'abierto']);

        $this->command->info('✓ Evaluación docente ampliada: registros mínimos "pendiente" creados (módulo aún en diseño).');
    }

    // ── Sprint 31 — Seguridad Informática ─────────────────────────────────────
    private function seedSeguridad(User $admin): void
    {
        if (IncidenteSeguridad::count() > 0) {
            $this->command->warn('Incidentes de seguridad ya tienen datos, se omite.');
            return;
        }

        IncidenteSeguridad::create([
            'tipo'         => 'fuerza_bruta_sospechosa',
            'ip_address'   => '203.0.113.45',
            'descripcion'  => '5 intentos fallidos de inicio de sesión en menos de 2 minutos.',
            'severidad'    => 'alta',
            'estatus'      => 'cerrado',
            'detectado_en' => now()->subDays(10),
            'resuelto_en'  => now()->subDays(9),
            'resuelto_por' => $admin->id,
        ]);

        IncidenteSeguridad::create([
            'tipo'         => 'acceso_no_autorizado',
            'user_id'      => $admin->id,
            'ip_address'   => '198.51.100.22',
            'descripcion'  => 'Intento de acceso a un módulo restringido por rol.',
            'severidad'    => 'media',
            'estatus'      => 'en_revision',
            'detectado_en' => now()->subDays(2),
        ]);

        $this->command->info('✓ Seguridad: incidentes de demostración creados.');
    }
}
