<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── tipos_actividad ─────────────────────────────────────────────────────
        Schema::create('tipos_actividad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('clave', 30)->unique();
            $table->string('nombre', 150);
            $table->decimal('horas_requeridas', 6, 2)->default(20);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // ── actividades_complementarias ─────────────────────────────────────────
        Schema::create('actividades_complementarias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alumno_id');
            $table->uuid('tipo_id');
            $table->decimal('horas', 6, 2);
            $table->string('evidencia_url')->nullable();
            $table->enum('estatus', ['registrada', 'validada', 'rechazada'])->default('registrada');
            $table->enum('nivel_desempeno', ['excelente', 'notable', 'bueno', 'suficiente', 'insuficiente'])->nullable();
            $table->unsignedTinyInteger('semestre_alumno_al_registrar');
            $table->uuid('validado_por')->nullable();
            $table->text('observaciones_validacion')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->foreign('tipo_id')->references('id')->on('tipos_actividad');
            $table->foreign('validado_por')->references('id')->on('users')->nullOnDelete();
        });

        // ── evaluaciones_docentes ────────────────────────────────────────────────
        // Sin FK a alumno para garantizar anonimato (S5-03)
        Schema::create('evaluaciones_docentes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('grupo_id');
            $table->uuid('periodo_id');
            $table->json('respuestas'); // respuestas anónimas del instrumento
            $table->boolean('enviada')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
        });

        // ── alumno_evaluaciones_periodo ──────────────────────────────────────────
        // Rastrea quién evaluó sin vincular la respuesta específica (anonimato)
        Schema::create('alumno_evaluaciones_periodo', function (Blueprint $table) {
            $table->uuid('alumno_id');
            $table->uuid('grupo_id');
            $table->uuid('periodo_id');
            $table->timestamp('evaluado_en')->useCurrent();

            $table->primary(['alumno_id', 'grupo_id', 'periodo_id']);
            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumno_evaluaciones_periodo');
        Schema::dropIfExists('evaluaciones_docentes');
        Schema::dropIfExists('actividades_complementarias');
        Schema::dropIfExists('tipos_actividad');
    }
};
