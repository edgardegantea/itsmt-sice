<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── S11-01: soft-deletes en aulas ────────────────────────────────────
        Schema::table('aulas', function (Blueprint $table) {
            $table->softDeletes();
        });

        // ── S11-02: activo en tabla pivote alumno_grupo ───────────────────────
        Schema::table('alumno_grupo', function (Blueprint $table) {
            $table->boolean('activo')->default(true)->after('fecha_asignacion');
        });

        // ── S11-03: Expediente académico extendido del alumno ─────────────────
        Schema::create('expedientes_alumnos_ext', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->unique()->constrained('alumnos')->cascadeOnDelete();
            $table->unsignedSmallInteger('generacion')->nullable()->comment('Año de ingreso al tecnológico');
            $table->enum('estatus', ['activo', 'baja_temporal', 'baja_definitiva', 'egresado'])->default('activo');
            $table->decimal('promedio_general', 5, 2)->nullable();
            $table->unsignedSmallInteger('creditos_acumulados')->default(0);
            $table->json('documentos_entregados')->nullable();
            $table->text('notas_admin')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── S11-04: Ficha docente con contrato y especialidad ─────────────────
        Schema::create('fichas_docentes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->enum('tipo_contrato', ['base', 'interino', 'hora_clase', 'medio_tiempo'])->default('hora_clase');
            $table->string('categoria', 100)->nullable();
            $table->json('especialidades')->nullable();
            $table->date('fecha_ingreso')->nullable();
            $table->json('titulos_academicos')->nullable();
            $table->json('horas_frente_grupo_por_periodo')->nullable()->comment('{ periodo_id: horas }');
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fichas_docentes');
        Schema::dropIfExists('expedientes_alumnos_ext');
        Schema::table('alumno_grupo', function (Blueprint $table) {
            $table->dropColumn('activo');
        });
        Schema::table('aulas', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
