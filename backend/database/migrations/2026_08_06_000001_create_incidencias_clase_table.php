<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bitácora de rondas de prefectura: cada fila es una revisión puntual (una
        // "pasada" cada hora) a un grupo/aula para verificar que lo que ocurre
        // coincide con lo que dice el horario (docente, grupo, aula, asistencia).
        Schema::create('incidencias_clase', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();

            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();

            // La carga académica esperada según el horario (materia/docente/aula
            // programados) — nula si la ronda no encontró ninguna clase programada
            // en ese bloque (ej. aula vacía sin horario asignado).
            $table->uuid('carga_academica_id')->nullable();
            $table->foreign('carga_academica_id')->references('id')->on('cargas_academicas')->nullOnDelete();

            $table->uuid('docente_id')->nullable();
            $table->foreign('docente_id')->references('id')->on('users')->nullOnDelete();

            $table->uuid('aula_id')->nullable();
            $table->foreign('aula_id')->references('id')->on('aulas')->nullOnDelete();

            $table->uuid('registrado_por_id');
            $table->foreign('registrado_por_id')->references('id')->on('users')->cascadeOnDelete();

            $table->date('fecha');
            $table->time('hora_revision');
            $table->enum('dia_semana', ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'])->nullable();

            // Resultado de la ronda — 'sin_novedad' es el caso "todo en orden".
            $table->enum('estatus', [
                'sin_novedad', 'docente_ausente', 'aula_vacia', 'grupo_incorrecto',
                'aula_incorrecta', 'alumnos_incompletos', 'otro',
            ])->default('sin_novedad');

            $table->boolean('docente_presente')->nullable();
            $table->boolean('coincide_horario')->default(true);
            $table->unsignedSmallInteger('alumnos_presentes')->nullable();
            $table->text('observaciones')->nullable();

            $table->timestamps();

            $table->index(['periodo_id', 'grupo_id']);
            $table->index(['periodo_id', 'docente_id']);
            $table->index('fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidencias_clase');
    }
};
