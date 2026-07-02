<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tutores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique('docente_id');
        });

        Schema::create('asignaciones_tutoria', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tutor_id')->constrained('tutores')->cascadeOnDelete();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos')->cascadeOnDelete();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tutor_id', 'alumno_id', 'periodo_id']);
        });

        Schema::create('sesiones_tutoria', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tutor_id')->constrained('tutores')->cascadeOnDelete();
            $table->enum('tipo', ['individual', 'grupal'])->default('individual');
            $table->date('fecha');
            $table->unsignedInteger('duracion_minutos')->default(60);
            $table->text('temas_tratados');
            $table->text('observaciones')->nullable();
            $table->json('alumnos_atendidos_ids');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('planes_accion_tutorial', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tutor_id')->constrained('tutores')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos')->cascadeOnDelete();
            $table->text('objetivo_general');
            $table->json('actividades')->nullable();
            $table->json('metas')->nullable();
            $table->enum('estatus', ['borrador', 'enviado', 'aprobado'])->default('borrador');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tutor_id', 'periodo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_accion_tutorial');
        Schema::dropIfExists('sesiones_tutoria');
        Schema::dropIfExists('asignaciones_tutoria');
        Schema::dropIfExists('tutores');
    }
};
