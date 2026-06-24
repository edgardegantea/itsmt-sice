<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Configuración de evaluación por carrera ──────────────────────────
        Schema::create('configuraciones_evaluacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('carrera_id')->constrained('carreras')->cascadeOnDelete();
            $table->unsignedTinyInteger('num_parciales')->default(3);
            $table->decimal('calificacion_minima', 4, 1)->default(70);
            $table->json('peso_parciales');          // [{parcial:1,peso:0.3},{parcial:2,peso:0.3},{parcial:3,peso:0.4}]
            $table->unsignedSmallInteger('creditos_carga_minima')->default(20);
            $table->unsignedSmallInteger('creditos_carga_maxima')->default(36);
            $table->unsignedTinyInteger('max_especiales_por_periodo')->default(2);
            $table->timestamps();
            $table->unique('carrera_id');
        });

        // ── Calificaciones por alumno/grupo ───────────────────────────────────
        Schema::create('calificaciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->json('parciales')->nullable();   // [{parcial:1,calificacion:85},{...}]
            $table->decimal('calificacion_final', 5, 2)->nullable();
            $table->decimal('promedio', 5, 2)->nullable();
            $table->boolean('acreditado')->nullable();
            $table->enum('tipo_curso', ['ordinario', 'repeticion', 'especial'])->default('ordinario');
            $table->unsignedTinyInteger('intento_numero')->default(1);
            $table->enum('oportunidad', ['primera_oportunidad', 'segunda_oportunidad'])->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['alumno_id', 'grupo_id']);
        });

        // ── Cierres de curso ──────────────────────────────────────────────────
        Schema::create('cierres_de_curso', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->foreignUuid('cerrado_por')->constrained('users');
            $table->timestamp('fecha_cierre')->useCurrent();
            $table->timestamps();
            $table->unique(['grupo_id', 'periodo_id']);
        });

        // ── Actas de calificaciones (retención PERMANENTE) ────────────────────
        Schema::create('actas_calificaciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->foreignUuid('docente_id')->constrained('users');
            $table->string('url_pdf')->nullable();
            $table->boolean('firmada')->default(false);
            $table->date('fecha_firma')->nullable();
            $table->foreignUuid('firmada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('integrada_libro_actas')->default(false);
            $table->timestamps();
            $table->unique(['grupo_id', 'periodo_id']); // ID TecNM = clave de grupo
        });

        // ── Alertas de baja definitiva (S4-06) ───────────────────────────────
        Schema::create('alertas_baja_definitiva', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('grupo_id')->constrained('grupos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('materia_nombre');
            $table->unsignedTinyInteger('intento_numero'); // siempre 3
            $table->boolean('revisada')->default(false);
            $table->foreignUuid('revisada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisada_en')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_baja_definitiva');
        Schema::dropIfExists('actas_calificaciones');
        Schema::dropIfExists('cierres_de_curso');
        Schema::dropIfExists('calificaciones');
        Schema::dropIfExists('configuraciones_evaluacion');
    }
};
