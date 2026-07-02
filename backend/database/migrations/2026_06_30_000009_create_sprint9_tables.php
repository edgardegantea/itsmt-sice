<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Asignaciones Docentes (S9-01/S9-02) ──────────────────────────────
        Schema::create('asignaciones_docentes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('docente_id');
            $table->foreign('docente_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('materia_id');
            $table->foreign('materia_id')->references('id')->on('materias')->cascadeOnDelete();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
            $table->uuid('grupo_id')->nullable();
            $table->foreign('grupo_id')->references('id')->on('grupos')->nullOnDelete();
            $table->unsignedTinyInteger('horas_semana')->default(0);
            $table->uuid('asignado_por');
            $table->foreign('asignado_por')->references('id')->on('users');
            $table->boolean('notificado')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['docente_id', 'materia_id', 'carrera_id', 'periodo_id'], 'asig_docente_unique');
        });

        // ── Instrumentaciones Didácticas (S9-03/S9-04/S9-05) ─────────────────
        Schema::create('instrumentaciones_didacticas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('asignacion_id');
            $table->foreign('asignacion_id')->references('id')->on('asignaciones_docentes')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->text('objetivo_general')->nullable();
            $table->json('competencias')->nullable();
            // arreglo: nombre/objetivo/contenido/actividades/recursos/evaluacion
            $table->json('unidades')->nullable();
            $table->text('metodologia')->nullable();
            // json: parciales y porcentajes
            $table->json('criterios_evaluacion')->nullable();
            $table->text('bibliografia')->nullable();
            // borrador → enviada → observaciones/liberada → vigente
            $table->enum('estatus', ['borrador', 'enviada', 'observaciones', 'liberada', 'vigente'])
                  ->default('borrador');
            $table->text('observaciones_jefe')->nullable();
            $table->uuid('liberada_por')->nullable();
            $table->foreign('liberada_por')->references('id')->on('users')->nullOnDelete();
            $table->uuid('visto_bueno_por')->nullable();
            $table->foreign('visto_bueno_por')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instrumentaciones_didacticas');
        Schema::dropIfExists('asignaciones_docentes');
    }
};
