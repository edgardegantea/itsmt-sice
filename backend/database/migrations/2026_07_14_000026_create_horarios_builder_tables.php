<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Disponibilidad docente ────────────────────────────────────────────
        Schema::create('disponibilidades_docente', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos')->cascadeOnDelete();
            $table->enum('dia_semana', ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();

            $table->index(['docente_id', 'periodo_id', 'dia_semana']);
        });

        // ── Días no laborables ────────────────────────────────────────────────
        Schema::create('dias_no_laborables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('fecha')->unique();
            $table->string('descripcion');
            $table->timestamps();
        });

        // ── Columnas en cargas_academicas ─────────────────────────────────────
        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->enum('estado', ['pendiente', 'confirmada', 'conflicto'])
                ->default('pendiente')
                ->after('horas_semana');
            $table->text('comentario_docente')->nullable()->after('estado');
        });

        // ── Módulo sabatino en materias ───────────────────────────────────────
        Schema::table('materias', function (Blueprint $table) {
            // 1 = módulo 1 (semanas impares), 2 = módulo 2 (semanas pares)
            // null = no es materia sabatina exclusiva de un módulo
            $table->unsignedTinyInteger('modulo_sabatino')->nullable()->after('activa');
        });
    }

    public function down(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->dropColumn('modulo_sabatino');
        });

        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->dropColumn(['estado', 'comentario_docente']);
        });

        Schema::dropIfExists('dias_no_laborables');
        Schema::dropIfExists('disponibilidades_docente');
    }
};
