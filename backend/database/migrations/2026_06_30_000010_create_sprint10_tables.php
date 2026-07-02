<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Tipos de Solicitud Personal (catálogo, sin soft-delete) ──────────
        Schema::create('tipos_solicitud_personal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 100)->unique();
            $table->json('documentos_requeridos')->nullable();
            $table->timestamps();
        });

        // Catálogo inicial TecNM
        $tipos = [
            ['id' => \Illuminate\Support\Str::uuid(), 'nombre' => 'Permiso con goce de sueldo',
             'documentos_requeridos' => json_encode(['Solicitud firmada', 'Justificante']),
             'created_at' => now(), 'updated_at' => now()],
            ['id' => \Illuminate\Support\Str::uuid(), 'nombre' => 'Permiso sin goce de sueldo',
             'documentos_requeridos' => json_encode(['Solicitud firmada']),
             'created_at' => now(), 'updated_at' => now()],
            ['id' => \Illuminate\Support\Str::uuid(), 'nombre' => 'Licencia médica',
             'documentos_requeridos' => json_encode(['Certificado médico ISSSTE/IMSS']),
             'created_at' => now(), 'updated_at' => now()],
            ['id' => \Illuminate\Support\Str::uuid(), 'nombre' => 'Licencia por maternidad/paternidad',
             'documentos_requeridos' => json_encode(['Acta de nacimiento', 'Solicitud']),
             'created_at' => now(), 'updated_at' => now()],
            ['id' => \Illuminate\Support\Str::uuid(), 'nombre' => 'Permiso por comisión oficial',
             'documentos_requeridos' => json_encode(['Oficio de comisión']),
             'created_at' => now(), 'updated_at' => now()],
        ];
        \Illuminate\Support\Facades\DB::table('tipos_solicitud_personal')->insert($tipos);

        // ── Solicitudes Personal (S10-01 / S10-02) ───────────────────────────
        Schema::create('solicitudes_personal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('solicitante_id');
            $table->foreign('solicitante_id')->references('id')->on('users');
            $table->uuid('tipo_id');
            $table->foreign('tipo_id')->references('id')->on('tipos_solicitud_personal');
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->text('motivo');
            $table->json('documentos')->nullable();
            $table->enum('estatus', ['pendiente', 'aprobada', 'rechazada'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->uuid('atendida_por')->nullable();
            $table->foreign('atendida_por')->references('id')->on('users')->nullOnDelete();
            $table->string('url_documento_oficial')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Comisiones (S10-03) ───────────────────────────────────────────────
        Schema::create('comisiones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('personal_id');
            $table->foreign('personal_id')->references('id')->on('users');
            $table->string('destino');
            $table->text('proposito');
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->boolean('con_viaticos')->default(false);
            $table->decimal('monto_viaticos', 10, 2)->nullable();
            $table->uuid('asignada_por');
            $table->foreign('asignada_por')->references('id')->on('users');
            $table->string('url_oficio')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Cursos de Capacitación AP/FD (S10-07) ────────────────────────────
        Schema::create('cursos_capacitacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre');
            $table->string('clave_registro_tecnm')->nullable();
            $table->enum('tipo', ['formacion_docente', 'actualizacion_profesional']);
            $table->enum('modalidad', ['presencial', 'distancia', 'mixto']);
            $table->enum('origen', ['interno', 'externo']);
            $table->string('instructor');
            $table->date('periodo_inicio');
            $table->date('periodo_fin');
            $table->unsignedSmallInteger('horas_totales');
            $table->string('horario')->nullable();
            $table->uuid('jefe_depto_id');
            $table->foreign('jefe_depto_id')->references('id')->on('users');
            $table->enum('estatus', ['planeado', 'en_curso', 'finalizado', 'cancelado'])
                  ->default('planeado');
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Cédulas de Inscripción (S10-08) ───────────────────────────────────
        Schema::create('cedulas_inscripcion_capacitacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('curso_id');
            $table->foreign('curso_id')->references('id')->on('cursos_capacitacion')->cascadeOnDelete();
            $table->uuid('usuario_id');
            $table->foreign('usuario_id')->references('id')->on('users');
            $table->string('rfc', 13);
            $table->string('curp', 18);
            $table->enum('sexo', ['H', 'M']);
            $table->string('grado_maximo_estudios');
            $table->string('nombre_carrera');
            $table->string('area_adscripcion');
            $table->string('puesto');
            $table->string('clave_presupuestal');
            $table->string('jefe_inmediato');
            $table->string('telefono_oficial');
            $table->string('ext', 10)->nullable();
            $table->string('horario_laboral');
            $table->enum('estatus', ['inscrito', 'completado', 'acreditado', 'no_acreditado'])
                  ->default('inscrito');
            $table->decimal('calificacion', 5, 2)->nullable();
            $table->unsignedSmallInteger('num_asistencias')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['curso_id', 'usuario_id'], 'cedula_curso_usuario_unique');
        });

        // ── Asistencias Capacitación (deferred S10-09, tabla creada) ─────────
        Schema::create('asistencias_capacitacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cedula_id');
            $table->foreign('cedula_id')->references('id')->on('cedulas_inscripcion_capacitacion')->cascadeOnDelete();
            $table->date('fecha');
            $table->boolean('presente')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['cedula_id', 'fecha'], 'asistencia_cedula_fecha_unique');
        });

        // ── Evaluaciones de Seguimiento (deferred S10-10, tabla creada) ──────
        Schema::create('evaluaciones_seguimiento_cap', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cedula_id');
            $table->foreign('cedula_id')->references('id')->on('cedulas_inscripcion_capacitacion')->cascadeOnDelete();
            $table->enum('tipo_evaluador', ['participante', 'jefe_inmediato']);
            $table->string('jefe_inmediato_nombre')->nullable();
            // 11 criterios en escala 1-4
            $table->json('respuestas_json');
            // 3 obstáculos
            $table->json('obstaculos_json')->nullable();
            $table->decimal('promedio', 4, 2)->nullable();
            $table->enum('resultado', ['correctivas', 'mejorar', 'favorable'])->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluaciones_seguimiento_cap');
        Schema::dropIfExists('asistencias_capacitacion');
        Schema::dropIfExists('cedulas_inscripcion_capacitacion');
        Schema::dropIfExists('cursos_capacitacion');
        Schema::dropIfExists('comisiones');
        Schema::dropIfExists('solicitudes_personal');
        Schema::dropIfExists('tipos_solicitud_personal');
    }
};
