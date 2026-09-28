<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fotografía semanal del "índice de salud" de cada carrera — sin esto no hay
        // forma de saber si algo mejora o empeora, solo un valor puntual del momento.
        Schema::create('salud_semestral_carrera', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras')->cascadeOnDelete();
            $table->date('semana'); // lunes de la semana del snapshot
            $table->unsignedTinyInteger('score'); // 0-100
            $table->unsignedTinyInteger('pct_riesgo_academico')->nullable();
            $table->unsignedTinyInteger('pct_ocupacion_aulas')->nullable();
            $table->unsignedTinyInteger('pct_cumplimiento_docente')->nullable();
            $table->unsignedTinyInteger('pct_incidencias_sin_novedad')->nullable();
            $table->timestamps();
            $table->unique(['periodo_id', 'carrera_id', 'semana']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salud_semestral_carrera');
    }
};
