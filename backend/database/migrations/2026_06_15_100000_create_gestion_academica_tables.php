<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Materias / Asignaturas ────────────────────────────────────────────
        Schema::create('materias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->string('clave', 20)->unique();
            $table->string('nombre', 150);
            $table->unsignedTinyInteger('semestre')->default(1);
            $table->unsignedTinyInteger('creditos')->default(0);
            $table->unsignedTinyInteger('horas_teoria')->default(0);
            $table->unsignedTinyInteger('horas_practica')->default(0);
            $table->string('tipo', 20)->default('obligatoria'); // obligatoria|optativa|taller|lab
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Grupos ────────────────────────────────────────────────────────────
        Schema::create('grupos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->string('clave', 20);           // p.e. "ISC-1A"
            $table->unsignedTinyInteger('semestre');
            $table->string('turno', 20)->default('matutino'); // matutino|vespertino|sabatino
            $table->unsignedSmallInteger('capacidad')->default(35);
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['carrera_id', 'periodo_id', 'clave']);
        });

        // ── Alumnos → Grupos (pivot) ──────────────────────────────────────────
        Schema::create('alumno_grupo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alumno_id');
            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->date('fecha_asignacion')->nullable();
            $table->timestamps();
            $table->unique(['alumno_id', 'grupo_id']);
        });

        // ── Cargas académicas (docente → materia + grupo) ─────────────────────
        Schema::create('cargas_academicas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('docente_id');
            $table->foreign('docente_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('materia_id');
            $table->foreign('materia_id')->references('id')->on('materias')->cascadeOnDelete();
            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->unsignedTinyInteger('horas_semana')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['docente_id', 'materia_id', 'grupo_id', 'periodo_id']);
        });

        // ── Tutorías ──────────────────────────────────────────────────────────
        Schema::create('tutorias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tutor_id');               // user con rol docente
            $table->foreign('tutor_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('alumno_id');
            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tutor_id', 'alumno_id', 'periodo_id']);
        });

        // ── Funciones de personal ─────────────────────────────────────────────
        Schema::create('funciones_personal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('funcion', 150);         // p.e. "Jefe de Área de Sistemas"
            $table->string('area', 100)->nullable();
            $table->text('descripcion')->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funciones_personal');
        Schema::dropIfExists('tutorias');
        Schema::dropIfExists('cargas_academicas');
        Schema::dropIfExists('alumno_grupo');
        Schema::dropIfExists('grupos');
        Schema::dropIfExists('materias');
    }
};
