<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 17 — Educación a Distancia (TecNM Cap. 16)

        // Programa educativo en modalidad a distancia / mixta
        Schema::create('programas_distancia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('carrera_id')->constrained('carreras')->cascadeOnDelete();
            $table->enum('modalidad', ['no_escolarizada', 'mixta']);
            $table->integer('creditos_minimos_carga')->default(12);
            $table->integer('creditos_maximos_carga')->default(36);
            $table->integer('semestres_maximos')->default(16);
            $table->boolean('permite_trimestral')->default(true);
            $table->boolean('activo')->default(true);
            $table->timestamps();
            // No soft delete per spec
        });

        // Inscripción de alumno a un programa en modalidad a distancia
        Schema::create('inscripciones_distancia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('programa_id')->constrained('programas_distancia')->cascadeOnDelete();
            $table->foreignUuid('periodo_ingreso_id')->constrained('periodos')->cascadeOnDelete();
            $table->boolean('carga_trimestral')->default(false);
            // TecNM Cap. 16: debe acreditar Módulo de Competencias para el Aprendizaje a Distancia
            $table->boolean('modulo_competencias_acreditado')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['alumno_id', 'programa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscripciones_distancia');
        Schema::dropIfExists('programas_distancia');
    }
};
