<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Especialidades (S9-06) ─────────────────────────────────────────────
        Schema::create('especialidades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->enum('estatus', ['pendiente', 'activa', 'inactiva'])->default('pendiente');
            $table->unsignedTinyInteger('porcentaje_creditos_min')->default(80);
            $table->uuid('autorizada_por')->nullable();
            $table->foreign('autorizada_por')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Solicitudes de Apertura de Especialidad (S9-06) ───────────────────
        Schema::create('solicitudes_apertura_especialidad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->string('nombre_propuesto', 150);
            $table->text('justificacion');
            $table->uuid('solicitante_id');
            $table->foreign('solicitante_id')->references('id')->on('users');
            $table->enum('estatus', ['pendiente', 'aprobada', 'rechazada'])->default('pendiente');
            $table->uuid('dictaminada_por')->nullable();
            $table->foreign('dictaminada_por')->references('id')->on('users')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Programas de Estudio de Especialidad (S9-06) ──────────────────────
        Schema::create('programas_estudio_especialidad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('especialidad_id');
            $table->foreign('especialidad_id')->references('id')->on('especialidades')->cascadeOnDelete();
            $table->uuid('materia_id');
            $table->foreign('materia_id')->references('id')->on('materias');
            $table->unsignedTinyInteger('semestre')->default(7);
            $table->boolean('obligatoria')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['especialidad_id', 'materia_id'], 'prog_estudio_esp_unique');
        });

        // ── Alumno-Especialidad (S9-06) ────────────────────────────────────────
        Schema::create('alumno_especialidad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alumno_id');
            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->uuid('especialidad_id');
            $table->foreign('especialidad_id')->references('id')->on('especialidades');
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->enum('estatus', ['solicitada', 'inscrita', 'cancelada'])->default('solicitada');
            $table->timestamps();
            $table->unique(['alumno_id', 'especialidad_id'], 'alumno_especialidad_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumno_especialidad');
        Schema::dropIfExists('programas_estudio_especialidad');
        Schema::dropIfExists('solicitudes_apertura_especialidad');
        Schema::dropIfExists('especialidades');
    }
};
