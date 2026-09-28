<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Prefectura ya podía reportar "aula vacía" o "grupo incorrecto" en su ronda,
        // pero no tenía forma de distinguir eso de un problema físico del espacio
        // (proyector roto, sin luz, mobiliario dañado) — que no es un problema de
        // horario, es un problema de mantenimiento que alguien tiene que atender.
        Schema::table('incidencias_clase', function (Blueprint $table) {
            $table->dropColumn('estatus');
        });
        Schema::table('incidencias_clase', function (Blueprint $table) {
            $table->enum('estatus', [
                'sin_novedad', 'docente_ausente', 'aula_vacia', 'grupo_incorrecto',
                'aula_incorrecta', 'alumnos_incompletos', 'problema_infraestructura', 'otro',
            ])->default('sin_novedad')->after('dia_semana');
        });

        // Un ticket por cada incidencia marcada como problema de infraestructura —
        // bitácora simple de seguimiento, no un sistema de mantenimiento completo.
        Schema::create('tickets_mantenimiento', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('incidencia_clase_id')->nullable();
            $table->foreign('incidencia_clase_id')->references('id')->on('incidencias_clase')->nullOnDelete();

            $table->uuid('aula_id');
            $table->foreign('aula_id')->references('id')->on('aulas')->cascadeOnDelete();

            $table->uuid('reportado_por_id');
            $table->foreign('reportado_por_id')->references('id')->on('users')->cascadeOnDelete();

            $table->uuid('atendido_por_id')->nullable();
            $table->foreign('atendido_por_id')->references('id')->on('users')->nullOnDelete();

            $table->text('descripcion');
            $table->enum('estatus', ['abierto', 'en_progreso', 'resuelto'])->default('abierto');
            $table->text('notas_resolucion')->nullable();
            $table->timestamp('resuelto_en')->nullable();

            $table->timestamps();

            $table->index(['aula_id', 'estatus']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets_mantenimiento');

        Schema::table('incidencias_clase', function (Blueprint $table) {
            $table->dropColumn('estatus');
        });
        Schema::table('incidencias_clase', function (Blueprint $table) {
            $table->enum('estatus', [
                'sin_novedad', 'docente_ausente', 'aula_vacia', 'grupo_incorrecto',
                'aula_incorrecta', 'alumnos_incompletos', 'otro',
            ])->default('sin_novedad')->after('dia_semana');
        });
    }
};
