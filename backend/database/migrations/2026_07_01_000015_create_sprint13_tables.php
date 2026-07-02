<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── S13-01: Padrón de egresados ──────────────────────────────────────
        Schema::create('egresados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->integer('anio_egreso');
            $table->boolean('titulado')->default(false);
            $table->date('fecha_titulacion')->nullable();
            $table->string('empresa_actual')->nullable();
            $table->string('puesto_actual')->nullable();
            $table->enum('sector', [
                'publico',
                'privado',
                'emprendimiento',
                'desempleado',
                'otro',
            ])->nullable();
            $table->string('correo_actualizado')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('alumno_id');
        });

        // ── S13-05: Vista materializada de asistencia institucional ──────────
        // En SQLite/tests se usa tabla normal; en PostgreSQL se refrescaría con Cron
        Schema::create('vm_asistencia_institucional', function (Blueprint $table) {
            $table->uuid('carrera_id');
            $table->uuid('periodo_id');
            $table->integer('total_sesiones')->default(0);
            $table->decimal('pct_asistencia_promedio', 5, 2)->default(0);
            $table->integer('grupos_en_alerta')->default(0);
            $table->integer('alumnos_en_alerta')->default(0);
            $table->timestamp('actualizado_en')->nullable();

            $table->primary(['carrera_id', 'periodo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vm_asistencia_institucional');
        Schema::dropIfExists('egresados');
    }
};
